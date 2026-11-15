import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { logModerationActivity } from "@/lib/moderation/activity";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

/**
 * POST: Human-confirmed merge of two duplicate testimonials.
 * Never executes automatically; strictly requires explicit confirmation and target selection.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    const { user } = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const {
      duplicateId,
      mergeTags = true,
      mergeNotes = true,
      actionOnDuplicate = "ARCHIVE",
    } = body;

    const primaryId = testimonialId;

    if (!duplicateId || duplicateId === primaryId) {
      return NextResponse.json(
        { error: "A distinct duplicate testimonial ID must be provided." },
        { status: 400 },
      );
    }

    // Verify both testimonials belong to this workspace
    const [primary, duplicate] = await Promise.all([
      prisma.testimonial.findFirst({
        where: { id: primaryId, workspaceId },
        include: { tags: true },
      }),
      prisma.testimonial.findFirst({
        where: { id: duplicateId, workspaceId },
        include: { tags: true, notes: true },
      }),
    ]);

    if (!primary || !duplicate) {
      return NextResponse.json(
        { error: "One or both testimonials were not found in this workspace." },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Merge tags from duplicate into primary if requested
      if (mergeTags && duplicate.tags.length > 0) {
        const primaryTagSet = new Set(primary.tags.map((t) => t.tagId));
        for (const t of duplicate.tags) {
          if (!primaryTagSet.has(t.tagId)) {
            await tx.testimonialTag.create({
              data: {
                testimonialId: primaryId,
                tagId: t.tagId,
                workspaceId,
              },
            }).catch(() => {});
          }
        }
      }

      // 2. Re-parent internal team notes from duplicate to primary if requested
      if (mergeNotes && duplicate.notes.length > 0) {
        await tx.testimonialNote.updateMany({
          where: {
            testimonialId: duplicateId,
            workspaceId,
          },
          data: {
            testimonialId: primaryId,
          },
        });
      }

      // 3. Mark duplicate record with merge metadata and transition status
      const targetStatus = actionOnDuplicate === "REJECT" ? "REJECTED" : "ARCHIVED";
      await tx.testimonial.update({
        where: { id: duplicateId },
        data: {
          status: targetStatus,
          duplicateOfId: primaryId,
          isFlaggedDuplicate: false,
          duplicateConfirmedAt: new Date(),
          duplicateConfirmedBy: user?.name || user?.email || "Team Member",
        },
      });

      // 4. Update primary record to mark resolved duplicate status
      await tx.testimonial.update({
        where: { id: primaryId },
        data: {
          isFlaggedDuplicate: false,
        },
      });
    });

    // 5. Log activity on both records
    const actorInfo = {
      actorId: user?.id,
      actorName: user?.name,
      actorEmail: user?.email,
    };

    await logModerationActivity({
      workspaceId,
      testimonialId: primaryId,
      ...actorInfo,
      action: "DUPLICATE_MERGED",
      details: `Merged duplicate testimonial #${duplicateId} into this primary record.`,
      metadata: { mergedDuplicateId: duplicateId, mergeTags, mergeNotes },
    });

    await logModerationActivity({
      workspaceId,
      testimonialId: duplicateId,
      ...actorInfo,
      action: "DUPLICATE_MERGED",
      previousStatus: duplicate.status,
      newStatus: actionOnDuplicate === "REJECT" ? "REJECTED" : "ARCHIVED",
      details: `Confirmed as duplicate and merged into primary testimonial #${primaryId}.`,
      metadata: { primaryId },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully merged duplicate testimonial #${duplicateId} into primary #${primaryId}.`,
      primaryId,
      duplicateId,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to merge testimonials.";
    return NextResponse.json({ error: message }, { status });
  }
}
