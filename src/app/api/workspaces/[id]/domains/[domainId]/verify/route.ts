import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { verifyCustomDomain } from "@/lib/domains/service";

type RouteParams = {
  params: Promise<{ id: string; domainId: string }>;
};

/**
 * POST /api/workspaces/[id]/domains/[domainId]/verify
 * Performs DNS verification challenge to prove domain ownership.
 */
export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, domainId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const result = await verifyCustomDomain(domainId, workspaceId);

    return NextResponse.json({
      ...result,
    });
  } catch (error: any) {
    console.error("Failed to verify custom domain:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify custom domain" },
      { status: error.status || 400 }
    );
  }
}
