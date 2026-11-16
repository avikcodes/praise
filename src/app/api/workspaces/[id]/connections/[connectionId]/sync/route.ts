import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  executeConnectionSync,
  configureConnectionSync,
  getConnectionSyncLogs,
} from "@/lib/import/connectors/sync-service";

type RouteParams = {
  params: Promise<{ id: string; connectionId: string }>;
};

/**
 * GET: Retrieves synchronization history logs for this connection.
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, connectionId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 30;

    const logs = await getConnectionSyncLogs(workspaceId, connectionId, limit);

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error: any) {
    console.error("Failed to get sync history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get sync history" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST: Triggers an immediate manual sync or retry for this connection.
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, connectionId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json().catch(() => ({}));
    const { limit, defaultProjectId, triggerType = "MANUAL" } = body;

    const result = await executeConnectionSync({
      workspaceId,
      connectionId,
      triggerType: triggerType === "RETRY" ? "RETRY" : "MANUAL",
      limit: limit ? Number(limit) : undefined,
      defaultProjectId: defaultProjectId || undefined,
    });

    return NextResponse.json({
      ...result,
    });
  } catch (error: any) {
    console.error("Failed to execute platform sync:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute platform sync" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH: Configures scheduled synchronization settings (frequency, enable/disable, project).
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, connectionId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const { syncEnabled, syncFrequency, targetProjectId, maxRetries } = body;

    if (syncEnabled === undefined && !syncFrequency && targetProjectId === undefined) {
      return NextResponse.json(
        { error: "Provide syncEnabled, syncFrequency, or targetProjectId to update." },
        { status: 400 }
      );
    }

    const config = await configureConnectionSync({
      workspaceId,
      connectionId,
      syncEnabled: Boolean(syncEnabled),
      syncFrequency,
      targetProjectId,
      maxRetries,
    });

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error("Failed to update sync settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update sync settings" },
      { status: error.status || 500 }
    );
  }
}
