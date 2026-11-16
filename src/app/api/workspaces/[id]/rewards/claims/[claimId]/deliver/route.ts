import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { deliverManualReward } from "@/lib/rewards/service";

type RouteParams = {
  params: Promise<{ id: string; claimId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, claimId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json().catch(() => ({}));
    const { rewardCode, rewardUrl, notes } = body;

    const claim = await deliverManualReward({
      workspaceId,
      claimId,
      deliveredByUserId: member.user.id,
      rewardCode,
      rewardUrl,
      notes,
    });

    return NextResponse.json({
      success: true,
      claim,
      message: "Reward marked as delivered successfully.",
    });
  } catch (error: any) {
    console.error("Failed to deliver manual reward:", error);
    return NextResponse.json(
      { error: error.message || "Failed to deliver manual reward" },
      { status: error.status || 500 }
    );
  }
}
