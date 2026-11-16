import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { syncConnectionReviews } from "@/lib/import/connectors/registry";

type RouteParams = {
  params: Promise<{ id: string; connectionId: string }>;
};

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, connectionId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json().catch(() => ({}));
    const { limit, autoImportPending, defaultProjectId } = body;

    const result = await syncConnectionReviews(workspaceId, connectionId, {
      limit: limit ? Number(limit) : undefined,
      autoImportPending: Boolean(autoImportPending),
      defaultProjectId: defaultProjectId || undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Failed to sync platform reviews:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync platform reviews" },
      { status: error.status || 500 }
    );
  }
}
