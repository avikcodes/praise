import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { getTestimonialActivityHistory } from "@/lib/moderation/activity";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

/**
 * GET: Retrieves the full submission and moderation activity history timeline.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    // Verify testimonial belongs to workspace
    const testimonial = await prisma.testimonial.findFirst({
      where: { id: testimonialId, workspaceId },
      include: {
        customer: true,
        form: {
          select: { id: true, title: true, slug: true },
        },
        consentRecords: {
          take: 1,
          orderBy: { grantedAt: "desc" },
        },
      },
    });

    if (!testimonial) {
      return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });
    }

    const activities = await getTestimonialActivityHistory(workspaceId, testimonialId);

    return NextResponse.json({
      submissionDetails: {
        submittedAt: testimonial.submittedAt,
        sourceType: testimonial.sourceType,
        sourceUrl: testimonial.sourceUrl,
        importBatchId: testimonial.importBatchId,
        importSourceDetailsJson: testimonial.importSourceDetailsJson,
        customer: testimonial.customer,
        form: testimonial.form,
        consent: testimonial.consentRecords[0] || null,
      },
      activities,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to fetch activity history.";
    return NextResponse.json({ error: message }, { status });
  }
}
