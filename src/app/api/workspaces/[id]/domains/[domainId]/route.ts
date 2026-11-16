import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  updateCustomDomain,
  deleteCustomDomain,
  getDnsInstructions,
} from "@/lib/domains/service";

type RouteParams = {
  params: Promise<{ id: string; domainId: string }>;
};

/**
 * GET /api/workspaces/[id]/domains/[domainId]
 * Returns domain details with copyable DNS configuration and reverse proxy instructions.
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, domainId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const domain = await prisma.customDomain.findFirst({
      where: { id: domainId, workspaceId },
      include: {
        wallOfLove: { select: { id: true, name: true, slug: true, title: true } },
        brand: { select: { id: true, name: true, slug: true, tagline: true } },
      },
    });

    if (!domain) {
      return NextResponse.json({ error: "Custom domain not found" }, { status: 404 });
    }

    const instructions = getDnsInstructions(
      domain.domain,
      domain.verificationToken,
      domain.cnameTarget || undefined
    );

    return NextResponse.json({
      success: true,
      domain,
      instructions,
    });
  } catch (error: any) {
    console.error("Failed to get custom domain:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get custom domain" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH /api/workspaces/[id]/domains/[domainId]
 * Updates custom domain target or configuration.
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, domainId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const updated = await updateCustomDomain({
      id: domainId,
      workspaceId,
      ...body,
    });

    return NextResponse.json({
      success: true,
      domain: updated,
    });
  } catch (error: any) {
    console.error("Failed to update custom domain:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update custom domain" },
      { status: error.status || 400 }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]/domains/[domainId]
 * Removes custom domain and frees up hostname.
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, domainId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const result = await deleteCustomDomain(domainId, workspaceId);

    return NextResponse.json({
      ...result,
    });
  } catch (error: any) {
    console.error("Failed to delete custom domain:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete custom domain" },
      { status: error.status || 400 }
    );
  }
}
