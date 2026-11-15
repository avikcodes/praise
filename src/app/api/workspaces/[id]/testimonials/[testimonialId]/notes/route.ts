import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { logModerationActivity } from "@/lib/moderation/activity";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

/**
 * GET: Retrieves internal team notes for a testimonial.
 * Kept strictly private to authorized workspace members.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    // Verify testimonial belongs to workspace
    const testimonial = await prisma.testimonial.findFirst({
      where: { id: testimonialId, workspaceId },
      select: { id: true },
    });

    if (!testimonial) {
      return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });
    }

    const notes = await prisma.testimonialNote.findMany({
      where: {
        workspaceId,
        testimonialId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ notes });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to fetch internal notes.";
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST: Creates a new internal team note for a testimonial.
 * Records author identity and logs moderation activity.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    const { user } = await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "Note content cannot be empty." },
        { status: 400 },
      );
    }

    // Verify testimonial belongs to workspace
    const testimonial = await prisma.testimonial.findFirst({
      where: { id: testimonialId, workspaceId },
      select: { id: true },
    });

    if (!testimonial) {
      return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });
    }

    const note = await prisma.testimonialNote.create({
      data: {
        workspaceId,
        testimonialId,
        authorId: user?.id || null,
        authorName: user?.name || "Team Member",
        authorEmail: user?.email || null,
        content,
        isPrivate: true,
      },
    });

    // Log moderation activity
    await logModerationActivity({
      workspaceId,
      testimonialId,
      actorId: user?.id,
      actorName: user?.name,
      actorEmail: user?.email,
      action: "NOTE_ADDED",
      details: `Added internal team note: "${content.slice(0, 50)}${content.length > 50 ? "..." : ""}"`,
      metadata: { noteId: note.id },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to create internal note.";
    return NextResponse.json({ error: message }, { status });
  }
}
