import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { disconnectPlatformAccount } from "@/lib/import/connectors/registry";

type RouteParams = {
  params: Promise<{ id: string; connectionId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, connectionId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const result = await disconnectPlatformAccount(workspaceId, connectionId);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Failed to disconnect platform:", error);
    return NextResponse.json(
      { error: error.message || "Failed to disconnect platform" },
      { status: error.status || 500 }
    );
  }
}
