import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { revokeRewardClaim } from "@/lib/rewards/service";

type RouteParams = {
  params: Promise<{ id: string; claimId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, claimId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const claim = await revokeRewardClaim(claimId, workspaceId, reason);

    return NextResponse.json({
      success: true,
      claim,
      message: "Reward claim revoked.",
    });
  } catch (error: any) {
    console.error("Failed to revoke reward claim:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revoke reward claim" },
      { status: error.status || 500 }
    );
  }
}
