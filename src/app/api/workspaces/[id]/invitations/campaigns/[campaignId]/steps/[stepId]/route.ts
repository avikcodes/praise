import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { updateCampaignStep } from "@/lib/email/scheduler";

type RouteParams = {
  params: Promise<{ id: string; campaignId: string; stepId: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId, stepId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { subject, bodyText, delayDays, delayHours } = body;

    const step = await updateCampaignStep({
      workspaceId,
      campaignId,
      stepId,
      subject,
      bodyText,
      delayDays,
      delayHours,
      userId: member.user.id,
      userName: member.user.name || "Owner",
    });

    return NextResponse.json({
      success: true,
      message: `Step ${step.stepNumber} updated successfully.`,
      step,
    });
  } catch (error: any) {
    console.error("Failed to update campaign step:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update step" },
      { status: error.status || 500 },
    );
  }
}
