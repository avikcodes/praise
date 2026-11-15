import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { logModerationActivity } from "@/lib/moderation/activity";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

/**
 * POST: Human confirmation to dismiss duplicate alert.
 * Confirms that the testimonial is legitimate/distinct from flagged duplicates.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    const { user } = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json().catch(() => ({}));
    const matchedTestimonialId = body.matchedTestimonialId;

    const testimonial = await prisma.testimonial.findFirst({
      where: { id: testimonialId, workspaceId },
    });

    if (!testimonial) {
      return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });
    }

    await prisma.testimonial.update({
      where: { id: testimonialId },
      data: {
        isFlaggedDuplicate: false,
        duplicateDismissedAt: new Date(),
        duplicateDismissedBy: user?.name || user?.email || "Team Member",
      },
    });

    await logModerationActivity({
      workspaceId,
      testimonialId,
      actorId: user?.id,
      actorName: user?.name,
      actorEmail: user?.email,
      action: "DUPLICATE_DISMISSED",
      details: matchedTestimonialId
        ? `Dismissed duplicate alert against testimonial #${matchedTestimonialId}. Confirmed distinct.`
        : "Dismissed duplicate alert. Confirmed record as distinct.",
      metadata: { matchedTestimonialId },
    });

    return NextResponse.json({
      success: true,
      message: "Duplicate alert dismissed successfully.",
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to dismiss duplicate alert.";
    return NextResponse.json({ error: message }, { status });
  }
}
