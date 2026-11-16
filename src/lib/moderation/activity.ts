import { prisma } from "../db/client.ts";

export type ModerationAction =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED"
  | "RESTORED"
  | "BULK_APPROVED"
  | "BULK_REJECTED"
  | "BULK_ARCHIVED"
  | "BULK_TAGGED"
  | "TAGS_UPDATED"
  | "NOTE_ADDED"
  | "NOTE_DELETED"
  | "EDITED"
  | "DUPLICATE_FLAGGED"
  | "DUPLICATE_DISMISSED"
  | "DUPLICATE_MERGED"
  | "SOURCE_UPDATED"
  | "THANK_YOU_SENT";

export interface LogModerationActivityInput {
  workspaceId: string;
  testimonialId: string;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  action: ModerationAction;
  previousStatus?: string | null;
  newStatus?: string | null;
  details?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Persists an immutable moderation or submission event into the activity history ledger.
 */
export async function logModerationActivity(
  {
    workspaceId,
    testimonialId,
    actorId,
    actorName,
    actorEmail,
    action,
    previousStatus,
    newStatus,
    details,
    metadata,
  }: LogModerationActivityInput,
  dbClient: any = prisma
) {
  try {
    return await dbClient.moderationActivity.create({
      data: {
        workspaceId,
        testimonialId,
        actorId: actorId || null,
        actorName: actorName || (actorId ? "Team Member" : "System"),
        actorEmail: actorEmail || null,
        action,
        previousStatus: previousStatus || null,
        newStatus: newStatus || null,
        details: details || null,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    // Non-blocking: fail-safe logging shouldn't crash primary user flow
    console.error("Failed to log moderation activity:", error);
    return null;
  }
}

/**
 * Retrieves the full submission and moderation history for a testimonial.
 */
export async function getTestimonialActivityHistory(
  workspaceId: string,
  testimonialId: string
) {
  return await prisma.moderationActivity.findMany({
    where: {
      workspaceId,
      testimonialId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
