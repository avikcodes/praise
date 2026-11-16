import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { getWorkspaceImportBatches } from "@/lib/import/external-importer";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const batches = await getWorkspaceImportBatches(workspaceId, limit);

    return NextResponse.json({
      success: true,
      batches,
    });
  } catch (error: any) {
    console.error("Failed to fetch import history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch import history" },
      { status: error.status || 500 }
    );
  }
}
