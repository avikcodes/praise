import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { generateInvitationToken } from "@/lib/email/campaign-service";
import { logCampaignActivity } from "@/lib/email/scheduler";

type RouteParams = {
  params: Promise<{ id: string; campaignId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId, workspaceId },
      include: {
        form: {
          select: { id: true, title: true, slug: true },
        },
        steps: {
          orderBy: { stepNumber: "asc" },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        recipients: {
          include: {
            recipientLogs: {
              orderBy: { stepNumber: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    console.error("Failed to fetch campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch campaign" },
      { status: error.status || 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId, workspaceId },
      include: { steps: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.status === "SENDING") {
      return NextResponse.json(
        { error: "Cannot modify a campaign while it is currently sending." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const {
      name,
      formId,
      templateId,
      subject,
      bodyText,
      fromName,
      replyToEmail,
      timezone,
      scheduledAt,
      recurringInterval,
      status,
      steps,
      recipients,
    } = body;

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (formId !== undefined) data.formId = formId;
    if (templateId !== undefined) data.templateId = templateId;
    if (subject !== undefined) data.subject = subject.trim();
    if (bodyText !== undefined) data.bodyText = bodyText.trim();
    if (fromName !== undefined) data.fromName = fromName?.trim() || null;
    if (replyToEmail !== undefined) data.replyToEmail = replyToEmail?.trim() || null;
    if (timezone !== undefined) data.timezone = timezone;
    if (recurringInterval !== undefined) data.recurringInterval = recurringInterval.toUpperCase();
    if (status !== undefined) data.status = status;

    if (scheduledAt !== undefined) {
      data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      data.nextRunAt = data.scheduledAt;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If updating steps while campaign is DRAFT or SCHEDULED
      if (Array.isArray(steps) && steps.length > 0 && campaign.status === "DRAFT") {
        await tx.emailCampaignStep.deleteMany({
          where: { campaignId },
        });

        for (let i = 0; i < steps.length; i++) {
          const st = steps[i];
          await tx.emailCampaignStep.create({
            data: {
              campaignId,
              stepNumber: i + 1,
              delayDays: Math.max(0, st.delayDays || 0),
              delayHours: Math.max(0, st.delayHours || 0),
              subject: st.subject.trim(),
              bodyText: st.bodyText.trim(),
              templateId: st.templateId || null,
              status: "PENDING",
            },
          });
        }
        data.totalSteps = steps.length;
        data.isSequence = steps.length > 1;
      }

      // If new recipient list is passed and campaign is still DRAFT, replace/update recipients
      if (Array.isArray(recipients) && campaign.status === "DRAFT") {
        await tx.invitationRecipient.deleteMany({
          where: { campaignId },
        });

        const recipientMap = new Map<string, any>();
        for (const r of recipients) {
          if (!r.email) continue;
          const cleanEmail = r.email.trim().toLowerCase();
          if (!recipientMap.has(cleanEmail)) {
            recipientMap.set(cleanEmail, {
              campaignId,
              workspaceId,
              email: cleanEmail,
              name: r.name?.trim() || cleanEmail.split("@")[0],
              company: r.company?.trim() || null,
              title: r.title?.trim() || null,
              customerId: r.customerId || null,
              customFieldsJson: r.customFields ? JSON.stringify(r.customFields) : null,
              token: generateInvitationToken(),
              status: "PENDING",
              currentStepNumber: 1,
            });
          }
        }

        const newRecipients = Array.from(recipientMap.values());
        if (newRecipients.length > 0) {
          await tx.invitationRecipient.createMany({
            data: newRecipients,
          });
        }
        data.totalRecipients = newRecipients.length;
      }

      return tx.emailCampaign.update({
        where: { id: campaignId },
        data,
      });
    });

    await logCampaignActivity({
      campaignId,
      workspaceId,
      action: "STEP_UPDATED",
      actorId: member.user.id,
      actorName: member.user.name,
      details: `Campaign details updated by ${member.user.name}.`,
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (error: any) {
    console.error("Failed to update campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update campaign" },
      { status: error.status || 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    await prisma.emailCampaign.delete({
      where: { id: campaignId, workspaceId },
    });

    return NextResponse.json({ success: true, message: "Campaign deleted successfully." });
  } catch (error: any) {
    console.error("Failed to delete campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete campaign" },
      { status: error.status || 500 },
    );
  }
}
