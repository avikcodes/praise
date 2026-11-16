import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { processScheduledPlatformSyncs } from "@/lib/import/connectors/sync-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/workspaces/:id/connections/scheduler
 * Triggers background processing of any due scheduled platform syncs.
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json().catch(() => ({}));
    const { limit } = body;

    const report = await processScheduledPlatformSyncs({
      now: new Date(),
      limit: limit ? Number(limit) : 50,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("Platform sync scheduler error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process scheduled syncs" },
      { status: error.status || 500 }
    );
  }
}
