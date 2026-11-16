import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { dispatchSmsCampaign } from "@/lib/sms/campaign-service";

type RouteParams = {
  params: Promise<{ id: string; campaignId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json().catch(() => ({}));
    const { confirmed } = body;

    // Strict requirement: Only send messages after explicit owner confirmation
    if (confirmed !== true) {
      return NextResponse.json(
        {
          error:
            "Explicit owner confirmation is required to dispatch SMS invitations. Please confirm dispatch.",
        },
        { status: 400 }
      );
    }

    const updatedCampaign = await dispatchSmsCampaign({
      workspaceId,
      campaignId,
      confirmedByUserId: member.user.id,
      confirmedByUserName: member.user?.name || "Workspace Owner",
    });

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
      message: `SMS campaign dispatched successfully. Sent: ${updatedCampaign.sentCount}, Failed: ${updatedCampaign.failedCount}, Opted-out: ${updatedCampaign.optedOutCount}`,
    });
  } catch (error: any) {
    console.error("Failed to dispatch SMS campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch SMS campaign" },
      { status: error.status || 500 }
    );
  }
}
