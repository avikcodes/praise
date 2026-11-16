import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { duplicateWorkspaceWall } from "@/lib/walls/service";

type RouteParams = {
  params: Promise<{ id: string; wallId: string }>;
};

/**
 * POST /api/workspaces/[id]/walls/[wallId]/duplicate
 * Clones a Wall of Love into a new draft wall.
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, wallId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const duplicated = await duplicateWorkspaceWall(workspaceId, wallId);

    return NextResponse.json({
      success: true,
      wall: duplicated,
    });
  } catch (error: any) {
    console.error("Failed to duplicate wall of love:", error);
    return NextResponse.json(
      { error: error.message || "Failed to duplicate wall of love" },
      { status: error.status || 400 }
    );
  }
}
