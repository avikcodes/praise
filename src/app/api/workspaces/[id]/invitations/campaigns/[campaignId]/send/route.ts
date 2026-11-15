import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { dispatchCampaignStep } from "@/lib/email/scheduler";

type RouteParams = {
  params: Promise<{ id: string; campaignId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json().catch(() => ({}));
    const { confirmed } = body;

    // Strict constraint: Do not send messages until the owner explicitly confirms the campaign.
    if (!confirmed) {
      return NextResponse.json(
        {
          error:
            "Explicit campaign confirmation is required. Please review recipients and confirm before dispatching.",
        },
        { status: 400 },
      );
    }

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId, workspaceId },
      include: {
        recipients: true,
        steps: { orderBy: { stepNumber: "asc" } },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    if (campaign.status === "SENDING") {
      return NextResponse.json(
        { error: "Campaign is already being dispatched." },
        { status: 400 },
      );
    }

    if (campaign.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Campaign has already completed sending." },
        { status: 400 },
      );
    }

    if (campaign.recipients.length === 0) {
      return NextResponse.json(
        { error: "Campaign has no recipients to send to." },
        { status: 400 },
      );
    }

    // Ensure at least step 1 exists
    if (campaign.steps.length === 0) {
      await prisma.emailCampaignStep.create({
        data: {
          campaignId,
          stepNumber: 1,
          delayDays: 0,
          delayHours: 0,
          subject: campaign.subject,
          bodyText: campaign.bodyText,
          templateId: campaign.templateId,
          status: "PENDING",
        },
      });
    }

    // Mark confirmed
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        confirmedAt: new Date(),
        confirmedBy: member.user.id,
      },
    });

    // Determine base url from request headers if available
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const result = await dispatchCampaignStep({
      workspaceId,
      campaignId,
      stepNumber: 1,
      actorId: member.user.id,
      actorName: member.user.name || "Workspace Owner",
      baseUrl,
    });

    return NextResponse.json({
      success: true,
      message: `Campaign step 1 dispatched to ${result.deliveredCount} recipients.`,
      result,
    });
  } catch (error: any) {
    console.error("Failed to dispatch campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch campaign" },
      { status: error.status || 500 },
    );
  }
}
