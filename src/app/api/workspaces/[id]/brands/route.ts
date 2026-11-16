import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  listWorkspaceBrands,
  createWorkspaceBrand,
} from "@/lib/brands/service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/workspaces/[id]/brands
 * Lists all brands and brand profiles configured in a workspace.
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const isPublishedParam = searchParams.get("isPublished");
    const isPublished = isPublishedParam !== null ? isPublishedParam === "true" : undefined;

    const brands = await listWorkspaceBrands(workspaceId, { search, isPublished });

    return NextResponse.json({
      success: true,
      brands,
      total: brands.length,
    });
  } catch (error: any) {
    console.error("Failed to list brands:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list brands" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/workspaces/[id]/brands
 * Creates a new brand profile in the workspace.
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const brand = await createWorkspaceBrand({
      workspaceId,
      ...body,
    });

    return NextResponse.json(
      {
        success: true,
        brand,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create brand:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create brand" },
      { status: error.status || 400 }
    );
  }
}
