import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  listWorkspaceDomains,
  createCustomDomain,
} from "@/lib/domains/service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/workspaces/[id]/domains
 * Lists all custom domains registered in the workspace.
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const domains = await listWorkspaceDomains(workspaceId);

    return NextResponse.json({
      success: true,
      domains,
      total: domains.length,
    });
  } catch (error: any) {
    console.error("Failed to list domains:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list domains" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/workspaces/[id]/domains
 * Registers a new custom domain with unique ownership challenge.
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const result = await createCustomDomain({
      workspaceId,
      ...body,
    });

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to register custom domain:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register custom domain" },
      { status: error.status || 400 }
    );
  }
}
