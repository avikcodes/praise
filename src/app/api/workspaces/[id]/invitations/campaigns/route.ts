import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { generateInvitationToken } from "@/lib/email/campaign-service";
import { logCampaignActivity } from "@/lib/email/scheduler";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const where: any = { workspaceId };
    if (search?.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }
    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }

    const campaigns = await prisma.emailCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        form: {
          select: { id: true, title: true, slug: true },
        },
        steps: {
          orderBy: { stepNumber: "asc" },
        },
      },
    });

    // Calculate aggregated metrics
    const stats = {
      totalCampaigns: campaigns.length,
      totalRecipients: campaigns.reduce((acc, c) => acc + c.totalRecipients, 0),
      totalSent: campaigns.reduce((acc, c) => acc + c.sentCount, 0),
      totalDelivered: campaigns.reduce((acc, c) => acc + c.deliveredCount, 0),
      totalOpened: campaigns.reduce((acc, c) => acc + c.openedCount, 0),
      totalClicked: campaigns.reduce((acc, c) => acc + c.clickedCount, 0),
      totalSubmitted: campaigns.reduce((acc, c) => acc + c.submittedCount, 0),
      totalBounced: campaigns.reduce((acc, c) => acc + c.bouncedCount, 0),
    };

    return NextResponse.json({
      success: true,
      campaigns,
      stats,
    });
  } catch (error: any) {
    console.error("Failed to fetch campaigns:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch campaigns" },
      { status: error.status || 500 },
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const {
      name,
      formId,
      templateId,
      subject,
      bodyText,
      fromName,
      replyToEmail,
      timezone = "UTC",
      scheduledAt,
      recurringInterval = "NONE",
      confirmed = false,
      steps = [],
      recipients = [],
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Campaign name is required." },
        { status: 400 },
      );
    }

    if (!formId?.trim()) {
      return NextResponse.json(
        { error: "Collection form selection is required." },
        { status: 400 },
      );
    }

    // Main subject/body from step 1 or root
    const rootSubject = (steps[0]?.subject || subject || "").trim();
    const rootBody = (steps[0]?.bodyText || bodyText || "").trim();

    if (!rootSubject || !rootBody) {
      return NextResponse.json(
        { error: "Subject and email body are required." },
        { status: 400 },
      );
    }

    // Verify form belongs to workspace
    const form = await prisma.collectionForm.findUnique({
      where: { id: formId, workspaceId },
    });
    if (!form) {
      return NextResponse.json(
        { error: "Collection form not found in this workspace." },
        { status: 404 },
      );
    }

    // Deduplicate recipients by email
    const recipientMap = new Map<string, any>();
    for (const r of recipients) {
      if (!r.email || typeof r.email !== "string") continue;
      const cleanEmail = r.email.trim().toLowerCase();
      if (!recipientMap.has(cleanEmail)) {
        recipientMap.set(cleanEmail, {
          email: cleanEmail,
          name: r.name?.trim() || cleanEmail.split("@")[0],
          company: r.company?.trim() || null,
          title: r.title?.trim() || null,
          customerId: r.customerId || null,
          customFieldsJson: r.customFields ? JSON.stringify(r.customFields) : null,
          token: generateInvitationToken(),
          status: "PENDING",
        });
      }
    }

    const uniqueRecipients = Array.from(recipientMap.values());

    // Prepare steps list
    const preparedSteps =
      steps.length > 0
        ? steps.map((s: any, idx: number) => ({
            stepNumber: idx + 1,
            delayDays: Math.max(0, s.delayDays || 0),
            delayHours: Math.max(0, s.delayHours || 0),
            subject: (s.subject || rootSubject).trim(),
            bodyText: (s.bodyText || rootBody).trim(),
            templateId: s.templateId || templateId || null,
            status: "PENDING",
          }))
        : [
            {
              stepNumber: 1,
              delayDays: 0,
              delayHours: 0,
              subject: rootSubject,
              bodyText: rootBody,
              templateId: templateId || null,
              status: "PENDING",
            },
          ];

    // Determine initial status & scheduling
    const isScheduled = Boolean(scheduledAt);
    let initialStatus = "DRAFT";
    let parsedScheduledAt: Date | null = null;
    let confirmedAt: Date | null = null;
    let confirmedBy: string | null = null;

    if (isScheduled && confirmed) {
      parsedScheduledAt = new Date(scheduledAt);
      initialStatus = "SCHEDULED";
      confirmedAt = new Date();
      confirmedBy = member.user.id;
    }

    // Create campaign, steps, and recipients inside transaction
    const campaign = await prisma.$transaction(async (tx) => {
      const createdCampaign = await tx.emailCampaign.create({
        data: {
          workspaceId,
          name: name.trim(),
          formId,
          templateId: templateId || null,
          subject: rootSubject,
          bodyText: rootBody,
          fromName: fromName?.trim() || null,
          replyToEmail: replyToEmail?.trim() || null,
          timezone,
          isSequence: preparedSteps.length > 1,
          totalSteps: preparedSteps.length,
          currentStepNumber: 1,
          status: initialStatus,
          scheduledAt: parsedScheduledAt,
          nextRunAt: parsedScheduledAt,
          recurringInterval: recurringInterval.toUpperCase(),
          confirmedAt,
          confirmedBy,
          totalRecipients: uniqueRecipients.length,
        },
      });

      // Create sequence steps
      for (const st of preparedSteps) {
        await tx.emailCampaignStep.create({
          data: {
            campaignId: createdCampaign.id,
            stepNumber: st.stepNumber,
            delayDays: st.delayDays,
            delayHours: st.delayHours,
            subject: st.subject,
            bodyText: st.bodyText,
            templateId: st.templateId,
            status: st.stepNumber === 1 && isScheduled && confirmed ? "SCHEDULED" : "PENDING",
            scheduledAt: st.stepNumber === 1 && isScheduled && confirmed ? parsedScheduledAt : null,
          },
        });
      }

      // Create recipients
      if (uniqueRecipients.length > 0) {
        await tx.invitationRecipient.createMany({
          data: uniqueRecipients.map((r) => ({
            campaignId: createdCampaign.id,
            workspaceId,
            email: r.email,
            name: r.name,
            company: r.company,
            title: r.title,
            customerId: r.customerId,
            customFieldsJson: r.customFieldsJson,
            token: r.token,
            status: "PENDING",
            currentStepNumber: 1,
          })),
        });
      }

      return createdCampaign;
    });

    // Log Activity
    await logCampaignActivity({
      campaignId: campaign.id,
      workspaceId,
      action: isScheduled && confirmed ? "SCHEDULED" : "CREATED",
      actorId: member.user.id,
      actorName: member.user.name,
      stepNumber: 1,
      details:
        isScheduled && confirmed
          ? `Campaign created and scheduled for ${parsedScheduledAt?.toISOString()} (${timezone}) with ${preparedSteps.length} sequence steps.`
          : `Campaign draft created with ${preparedSteps.length} sequence steps and ${uniqueRecipients.length} recipients.`,
    });

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create campaign" },
      { status: error.status || 500 },
    );
  }
}
