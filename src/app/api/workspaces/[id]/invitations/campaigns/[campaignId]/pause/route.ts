import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { pauseCampaign } from "@/lib/email/scheduler";

type RouteParams = {
  params: Promise<{ id: string; campaignId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const campaign = await pauseCampaign({
      workspaceId,
      campaignId,
      userId: member.user.id,
      userName: member.user.name || "Owner",
    });

    return NextResponse.json({
      success: true,
      message: "Campaign paused. Follow-ups temporarily suspended.",
      campaign,
    });
  } catch (error: any) {
    console.error("Failed to pause campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to pause campaign" },
      { status: error.status || 500 },
    );
  }
}
