import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { resumeCampaign } from "@/lib/email/scheduler";

type RouteParams = {
  params: Promise<{ id: string; campaignId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const campaign = await resumeCampaign({
      workspaceId,
      campaignId,
      userId: member.user.id,
      userName: member.user.name || "Owner",
    });

    return NextResponse.json({
      success: true,
      message: "Campaign resumed successfully.",
      campaign,
    });
  } catch (error: any) {
    console.error("Failed to resume campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resume campaign" },
      { status: error.status || 500 },
    );
  }
}
