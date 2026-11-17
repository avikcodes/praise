import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { retryStudioExportJob } from "@/lib/video/service";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string; jobId: string }>;
};

/**
 * POST: Retries a failed Video Studio export job safely.
 */
export async function POST(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, jobId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN", "MEMBER"]);

    const job = await retryStudioExportJob(jobId, workspaceId);

    return NextResponse.json({
      success: true,
      message: "Export job re-queued for processing.",
      job,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to retry export job.";
    return NextResponse.json({ error: message }, { status });
  }
}
