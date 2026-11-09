import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { TestimonialStatus } from "@prisma/client";
import { getStorageEngine } from "@/lib/storage/engine";
import { recordTombstone } from "@/lib/privacy/consent";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { status, isFeatured, tagIds } = body;

    const data: { status?: TestimonialStatus; isFeatured?: boolean } = {};

    if (status && ["PENDING", "APPROVED", "REJECTED", "ARCHIVED"].includes(status)) {
      data.status = status as TestimonialStatus;
    }

    if (typeof isFeatured === "boolean") {
      data.isFeatured = isFeatured;
    }

    // Atomic update including tags if provided
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update basic testimonial fields
      await tx.testimonial.update({
        where: {
          id: testimonialId,
          workspaceId,
        },
        data,
      });

      // 2. Update tags if tagIds is provided
      if (Array.isArray(tagIds)) {
        // Validate that all tagIds belong to this workspace
        const validTags = await tx.tag.findMany({
          where: {
            id: { in: tagIds },
            workspaceId,
          },
          select: { id: true },
        });
        const validTagIdSet = new Set(validTags.map((t) => t.id));

        // Delete existing relations
        await tx.testimonialTag.deleteMany({
          where: {
            testimonialId,
            workspaceId,
          },
        });

        // Insert new relations
        if (validTagIdSet.size > 0) {
          await tx.testimonialTag.createMany({
            data: Array.from(validTagIdSet).map((tId) => ({
              testimonialId,
              tagId: tId,
              workspaceId,
            })),
          });
        }
      }

      // Return fully hydrated testimonial
      return tx.testimonial.findUnique({
        where: { id: testimonialId },
        include: {
          customer: true,
          form: {
            select: { id: true, title: true, slug: true },
          },
          project: {
            select: { id: true, name: true, slug: true, color: true },
          },
          tags: {
            include: { tag: true },
          },
          mediaAssets: true,
          consentRecords: {
            take: 1,
            orderBy: { grantedAt: "desc" },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      testimonial: updated
        ? {
            ...updated,
            consentRecord: updated.consentRecords[0] || null,
          }
        : null,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to update testimonial.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    // 1. Safe deletion of associated media files from storage disk
    const engine = getStorageEngine();
    const mediaAssets = await prisma.mediaAsset.findMany({
      where: { testimonialId, workspaceId },
      select: { id: true, localPath: true },
    });

    for (const asset of mediaAssets) {
      if (asset.localPath) {
        await engine.delete(asset.localPath).catch(() => {});
      }
      recordTombstone({
        type: "MEDIA",
        originalId: asset.id,
        workspaceId,
        reason: "CUSTOMER_REQUEST",
      });
    }

    // 2. Register tombstone to ensure restored backups never republish this content
    recordTombstone({
      type: "TESTIMONIAL",
      originalId: testimonialId,
      workspaceId,
      reason: "CUSTOMER_REQUEST",
    });

    // 3. Permanently remove testimonial from database
    await prisma.testimonial.delete({
      where: {
        id: testimonialId,
        workspaceId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Testimonial and associated media permanently deleted.",
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to delete testimonial.";
    return NextResponse.json({ error: message }, { status });
  }
}
