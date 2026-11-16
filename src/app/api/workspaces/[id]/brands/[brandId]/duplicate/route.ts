import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { duplicateWorkspaceBrand } from "@/lib/brands/service";

type RouteParams = {
  params: Promise<{ id: string; brandId: string }>;
};

/**
 * POST /api/workspaces/[id]/brands/[brandId]/duplicate
 * Clones a brand profile into a new draft.
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, brandId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const duplicated = await duplicateWorkspaceBrand(workspaceId, brandId);

    return NextResponse.json({
      success: true,
      brand: duplicated,
    });
  } catch (error: any) {
    console.error("Failed to duplicate brand:", error);
    return NextResponse.json(
      { error: error.message || "Failed to duplicate brand" },
      { status: error.status || 400 }
    );
  }
}
