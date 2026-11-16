import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  updateWorkspaceWall,
  deleteWorkspaceWall,
  parseTagsList,
  parseIdList,
} from "@/lib/walls/service";
import { prisma } from "@/lib/db/client";

type RouteParams = {
  params: Promise<{ id: string; wallId: string }>;
};

/**
 * GET /api/workspaces/[id]/walls/[wallId]
 * Retrieves wall details and workspace approved testimonials for selection.
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, wallId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const wall = await prisma.wallOfLove.findFirst({
      where: { id: wallId, workspaceId },
      include: {
        project: { select: { id: true, name: true, slug: true, color: true } },
      },
    });

    if (!wall) {
      return NextResponse.json(
        { error: "Wall of Love not found" },
        { status: 404 }
      );
    }

    // Fetch approved testimonials in workspace to allow manual curation
    const whereTestimonials: any = {
      workspaceId,
      status: "APPROVED",
    };
    if (wall.projectId) {
      whereTestimonials.projectId = wall.projectId;
    }

    const availableTestimonials = await prisma.testimonial.findMany({
      where: whereTestimonials,
      include: {
        customer: {
          select: { name: true, company: true, title: true, avatarUrl: true },
        },
        tags: { select: { tag: { select: { name: true } } } },
      },
      orderBy: { submittedAt: "desc" },
      take: 200,
    });

    const formattedTestimonials = availableTestimonials.map((t: any) => {
      const tags: string[] = [];
      if (Array.isArray(t.tags)) {
        for (const item of t.tags) if (item.tag?.name) tags.push(item.tag.name);
      }

      return {
        id: t.id,
        content: t.content,
        rating: t.rating,
        type: t.type,
        isFeatured: t.isFeatured,
        sourceType: t.sourceType,
        submittedAt: t.submittedAt ? new Date(t.submittedAt).toISOString() : new Date().toISOString(),
        customerName: t.customer?.name || "Customer",
        customerCompany: t.customer?.company || null,
        tags,
      };
    });

    return NextResponse.json({
      success: true,
      wall: {
        ...wall,
        tagFilterList: parseTagsList(wall.tagFilter),
        selectedTestimonialIdList: parseIdList(wall.selectedTestimonialIds),
        publicUrl: `/w/${wall.slug}`,
      },
      availableTestimonials: formattedTestimonials,
    });
  } catch (error: any) {
    console.error("Failed to get wall of love:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get wall of love" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH /api/workspaces/[id]/walls/[wallId]
 * Updates wall configuration.
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, wallId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const updated = await updateWorkspaceWall({
      id: wallId,
      workspaceId,
      ...body,
    });

    return NextResponse.json({
      success: true,
      wall: updated,
    });
  } catch (error: any) {
    console.error("Failed to update wall of love:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update wall of love" },
      { status: error.status || 400 }
    );
  }
}

/**
 * DELETE /api/workspaces/[id]/walls/[wallId]
 * Deletes a Wall of Love.
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId, wallId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const result = await deleteWorkspaceWall(workspaceId, wallId);

    return NextResponse.json({
      ...result,
    });
  } catch (error: any) {
    console.error("Failed to delete wall of love:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete wall of love" },
      { status: error.status || 400 }
    );
  }
}
