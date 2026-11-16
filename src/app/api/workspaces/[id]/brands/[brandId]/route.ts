import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  updateWorkspaceBrand,
  deleteWorkspaceBrand,
  parseIdArray,
  parseSocialLinks,
} from "@/lib/brands/service";

type RouteParams = {
  params: Promise<{ id: string; brandId: string }>;
};

/**
 * GET /api/workspaces/[id]/brands/[brandId]
 * Returns brand profile details along with available walls and approved testimonials for curation.
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, brandId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, workspaceId },
      include: {
        projects: { select: { id: true, name: true, slug: true } },
        customDomains: { select: { id: true, domain: true, status: true } },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Available walls of love in workspace
    const availableWalls = await prisma.wallOfLove.findMany({
      where: { workspaceId, isPublished: true },
      select: { id: true, name: true, slug: true, title: true, theme: true, layout: true },
      orderBy: { createdAt: "desc" },
    });

    // Available approved testimonials
    const availableTestimonials = await prisma.testimonial.findMany({
      where: { workspaceId, status: "APPROVED" },
      include: {
        customer: { select: { name: true, company: true, title: true, avatarUrl: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
      orderBy: [{ isFeatured: "desc" }, { submittedAt: "desc" }],
      take: 200,
    });

    const formattedTestimonials = availableTestimonials.map((t: any) => ({
      id: t.id,
      content: t.content,
      rating: t.rating,
      type: t.type,
      isFeatured: t.isFeatured,
      submittedAt: t.submittedAt ? new Date(t.submittedAt).toISOString() : new Date().toISOString(),
      customerName: t.customer?.name || "Customer",
      customerCompany: t.customer?.company || null,
      tags: (t.tags || []).map((item: any) => item.tag?.name).filter(Boolean),
    }));

    return NextResponse.json({
      success: true,
      brand: {
        ...brand,
        selectedWallIdList: parseIdArray(brand.selectedWallIds),
        featuredTestimonialIdList: parseIdArray(brand.featuredTestimonialIds),
        socialLinks: parseSocialLinks(brand.socialLinksJson),
        publicUrl: `/b/${brand.slug}`,
      },
      availableWalls,
      availableTestimonials: formattedTestimonials,
    });
  } catch (error: any) {
    console.error("Failed to get brand:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get brand" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH /api/workspaces/[id]/brands/[brandId]
 * Updates brand profile configuration.
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, brandId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const updated = await updateWorkspaceBrand({
      id: brandId,
      workspaceId,
      ...body,
    });

    return NextResponse.json({
      success: true,
      brand: updated,
    });
  } catch (error: any) {
    console.error("Failed to update brand:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update brand" },
      { status: error.status || 400 }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]/brands/[brandId]
 * Deletes a brand profile.
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, brandId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const result = await deleteWorkspaceBrand(workspaceId, brandId);

    return NextResponse.json({
      ...result,
    });
  } catch (error: any) {
    console.error("Failed to delete brand:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete brand" },
      { status: error.status || 400 }
    );
  }
}
