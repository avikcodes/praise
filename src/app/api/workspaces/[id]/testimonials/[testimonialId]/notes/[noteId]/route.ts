import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { logModerationActivity } from "@/lib/moderation/activity";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string; noteId: string }>;
};

/**
 * DELETE: Deletes an internal team note.
 * Permitted for the note's original author or workspace OWNER/ADMIN.
 */
export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId, noteId } = await context.params;
    const { user, role } = await requireWorkspaceMember(workspaceId);

    const note = await prisma.testimonialNote.findFirst({
      where: {
        id: noteId,
        testimonialId,
        workspaceId,
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    // Role check: author or OWNER or ADMIN
    const isAuthor = note.authorId && user?.id && note.authorId === user.id;
    const isPrivileged = role === "OWNER" || role === "ADMIN";

    if (!isAuthor && !isPrivileged) {
      return NextResponse.json(
        { error: "You do not have permission to delete this note." },
        { status: 403 },
      );
    }

    await prisma.testimonialNote.delete({
      where: { id: noteId },
    });

    await logModerationActivity({
      workspaceId,
      testimonialId,
      actorId: user?.id,
      actorName: user?.name,
      actorEmail: user?.email,
      action: "NOTE_DELETED",
      details: "Deleted internal team note",
      metadata: { deletedNoteId: noteId },
    });

    return NextResponse.json({ success: true, message: "Note deleted successfully." });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to delete internal note.";
    return NextResponse.json({ error: message }, { status });
  }
}
