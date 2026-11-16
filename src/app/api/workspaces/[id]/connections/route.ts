import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  listWorkspaceConnections,
  connectPlatformAccount,
  getAvailableConnectorCatalog,
} from "@/lib/import/connectors/registry";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const connections = await listWorkspaceConnections(workspaceId);
    const catalog = getAvailableConnectorCatalog();

    return NextResponse.json({
      success: true,
      connections,
      catalog,
    });
  } catch (error: any) {
    console.error("Failed to list platform connections:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list platform connections" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const { platform, credentials } = body;

    if (!platform || !credentials) {
      return NextResponse.json(
        { error: "Platform and credentials are required." },
        { status: 400 }
      );
    }

    const connection = await connectPlatformAccount(workspaceId, platform, credentials);

    return NextResponse.json({
      success: true,
      connection,
    });
  } catch (error: any) {
    console.error("Failed to connect platform:", error);
    return NextResponse.json(
      { error: error.message || "Failed to establish platform connection" },
      { status: error.status || 400 }
    );
  }
}
