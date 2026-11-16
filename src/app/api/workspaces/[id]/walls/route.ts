import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  listWorkspaceWalls,
  createWorkspaceWall,
} from "@/lib/walls/service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/workspaces/[id]/walls
 * Lists all Walls of Love configured in the workspace.
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;
    const isPublishedParam = searchParams.get("isPublished");
    const isPublished = isPublishedParam !== null ? isPublishedParam === "true" : undefined;
    const search = searchParams.get("search") || undefined;

    const walls = await listWorkspaceWalls(workspaceId, {
      projectId,
      isPublished,
      search,
    });

    return NextResponse.json({
      success: true,
      walls,
    });
  } catch (error: any) {
    console.error("Failed to list walls of love:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list walls of love" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/workspaces/[id]/walls
 * Creates a new Wall of Love in the workspace.
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const wall = await createWorkspaceWall({
      workspaceId,
      ...body,
    });

    return NextResponse.json({
      success: true,
      wall,
    });
  } catch (error: any) {
    console.error("Failed to create wall of love:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create wall of love" },
      { status: error.status || 400 }
    );
  }
}
