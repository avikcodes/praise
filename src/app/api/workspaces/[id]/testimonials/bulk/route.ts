import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { TestimonialStatus } from "@prisma/client";
import { getStorageEngine } from "@/lib/storage/engine";
import { recordTombstone } from "@/lib/privacy/consent";
import { logModerationActivity } from "@/lib/moderation/activity";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    const { user } = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { action, testimonialIds, restoreTo, tagIds } = body;

    if (!Array.isArray(testimonialIds) || testimonialIds.length === 0) {
      return NextResponse.json(
        { error: "No testimonial IDs provided for bulk action." },
        { status: 400 },
      );
    }

    // Ensure we only act on testimonials belonging to this workspace
    const baseWhere = {
      id: { in: testimonialIds },
      workspaceId,
    };

    // -------------------------------------------------------------------------
    // 1. BULK DELETE
    // -------------------------------------------------------------------------
    if (action === "DELETE") {
      // 1. Safe deletion of all associated media from disk
      const engine = getStorageEngine();
      const mediaAssets = await prisma.mediaAsset.findMany({
        where: {
          testimonialId: { in: testimonialIds },
          workspaceId,
        },
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

      // 2. Register tombstones for all deleted testimonials
      for (const tid of testimonialIds) {
        recordTombstone({
          type: "TESTIMONIAL",
          originalId: tid,
          workspaceId,
          reason: "CUSTOMER_REQUEST",
        });
      }

      const result = await prisma.testimonial.deleteMany({
        where: baseWhere,
      });

      return NextResponse.json({
        success: true,
        action: "DELETE",
        count: result.count,
        message: `Successfully deleted ${result.count} testimonials and purged associated media.`,
      });
    }

    // -------------------------------------------------------------------------
    // 2. BULK TAGGING
    // -------------------------------------------------------------------------
    if (action === "TAG") {
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return NextResponse.json(
          { error: "No tag IDs provided for bulk tagging." },
          { status: 400 },
        );
      }

      // Verify all tags belong to this workspace
      const validTags = await prisma.tag.findMany({
        where: {
          id: { in: tagIds },
          workspaceId,
        },
        select: { id: true, name: true },
      });

      if (validTags.length === 0) {
        return NextResponse.json(
          { error: "No valid tags found for this workspace." },
          { status: 400 },
        );
      }

      const validTagIds = validTags.map((t) => t.id);
      const tagNames = validTags.map((t) => t.name).join(", ");

      // Get target testimonials
      const targetTestimonials = await prisma.testimonial.findMany({
        where: baseWhere,
        select: { id: true },
      });

      let appliedCount = 0;
      for (const t of targetTestimonials) {
        for (const tId of validTagIds) {
          try {
            await prisma.testimonialTag.upsert({
              where: {
                testimonialId_tagId: {
                  testimonialId: t.id,
                  tagId: tId,
                },
              },
              create: {
                testimonialId: t.id,
                tagId: tId,
                workspaceId,
              },
              update: {},
            });
            appliedCount++;
          } catch {
            // Ignore unique constraint race conditions
          }
        }

        // Log activity
        await logModerationActivity({
          workspaceId,
          testimonialId: t.id,
          actorId: user?.id,
          actorName: user?.name,
          actorEmail: user?.email,
          action: "BULK_TAGGED",
          details: `Applied tags: ${tagNames}`,
          metadata: { tagIds: validTagIds, tagNames: validTags.map((t) => t.name) },
        });
      }

      return NextResponse.json({
        success: true,
        action: "TAG",
        count: targetTestimonials.length,
        message: `Successfully tagged ${targetTestimonials.length} testimonials with ${tagNames}.`,
      });
    }

    // -------------------------------------------------------------------------
    // 3. BULK UNTAG
    // -------------------------------------------------------------------------
    if (action === "UNTAG") {
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return NextResponse.json(
          { error: "No tag IDs provided for removing tags." },
          { status: 400 },
        );
      }

      const deleteResult = await prisma.testimonialTag.deleteMany({
        where: {
          workspaceId,
          testimonialId: { in: testimonialIds },
          tagId: { in: tagIds },
        },
      });

      for (const tid of testimonialIds) {
        await logModerationActivity({
          workspaceId,
          testimonialId: tid,
          actorId: user?.id,
          actorName: user?.name,
          actorEmail: user?.email,
          action: "TAGS_UPDATED",
          details: `Removed tags in bulk operation.`,
          metadata: { removedTagIds: tagIds },
        });
      }

      return NextResponse.json({
        success: true,
        action: "UNTAG",
        count: deleteResult.count,
        message: `Successfully removed selected tags from testimonials.`,
      });
    }

    // -------------------------------------------------------------------------
    // 4. BULK STATUS UPDATES (APPROVE, REJECT, ARCHIVE, RESTORE)
    // -------------------------------------------------------------------------
    let targetStatus: TestimonialStatus;
    let activityAction: "BULK_APPROVED" | "BULK_REJECTED" | "BULK_ARCHIVED" | "RESTORED";

    switch (action) {
      case "APPROVE":
        targetStatus = "APPROVED";
        activityAction = "BULK_APPROVED";
        break;
      case "REJECT":
        targetStatus = "REJECTED";
        activityAction = "BULK_REJECTED";
        break;
      case "ARCHIVE":
        targetStatus = "ARCHIVED";
        activityAction = "BULK_ARCHIVED";
        break;
      case "RESTORE":
        targetStatus = restoreTo === "APPROVED" ? "APPROVED" : "PENDING";
        activityAction = "RESTORED";
        break;
      default:
        return NextResponse.json(
          { error: `Invalid bulk action "${action}". Valid actions are APPROVE, REJECT, ARCHIVE, RESTORE, TAG, UNTAG, DELETE.` },
          { status: 400 },
        );
    }

    // Retrieve previous statuses to record accurate transitions
    const previousRecords = await prisma.testimonial.findMany({
      where: baseWhere,
      select: { id: true, status: true },
    });

    const result = await prisma.testimonial.updateMany({
      where: baseWhere,
      data: {
        status: targetStatus,
      },
    });

    // Record moderation activity history for each modified record
    for (const rec of previousRecords) {
      await logModerationActivity({
        workspaceId,
        testimonialId: rec.id,
        actorId: user?.id,
        actorName: user?.name,
        actorEmail: user?.email,
        action: activityAction,
        previousStatus: rec.status,
        newStatus: targetStatus,
        details: `Bulk updated status from ${rec.status} to ${targetStatus}`,
        metadata: { bulkAction: action, totalInBatch: testimonialIds.length },
      });
    }

    return NextResponse.json({
      success: true,
      action,
      targetStatus,
      count: result.count,
      message: `Successfully updated ${result.count} testimonials to ${targetStatus.toLowerCase()}.`,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to execute bulk action.";
    return NextResponse.json({ error: message }, { status });
  }
}
