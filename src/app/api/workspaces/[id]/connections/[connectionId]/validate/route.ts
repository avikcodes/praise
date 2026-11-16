import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { validateExistingConnection } from "@/lib/import/connectors/registry";

type RouteParams = {
  params: Promise<{ id: string; connectionId: string }>;
};

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, connectionId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const result = await validateExistingConnection(workspaceId, connectionId);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Failed to validate platform connection:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate platform connection" },
      { status: error.status || 400 }
    );
  }
}
