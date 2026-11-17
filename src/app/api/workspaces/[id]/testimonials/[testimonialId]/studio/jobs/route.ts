import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { getTestimonialExportJobs } from "@/lib/video/service";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

/**
 * GET: Lists all export jobs (with real-time progress and status) for this testimonial.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const jobs = await getTestimonialExportJobs(testimonialId, workspaceId);

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to fetch export jobs.";
    return NextResponse.json({ error: message }, { status });
  }
}
