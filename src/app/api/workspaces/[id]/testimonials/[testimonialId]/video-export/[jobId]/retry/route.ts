import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { retryVideoExportJob } from "@/lib/video/service";
import { VideoExportValidationError } from "@/lib/video/validation";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string; jobId: string }>;
};

export async function POST(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, jobId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN", "MEMBER"]);

    const retriedJob = await retryVideoExportJob(jobId, workspaceId);

    return NextResponse.json({
      success: true,
      message: "Video export job re-queued for processing.",
      job: retriedJob,
    });
  } catch (error: unknown) {
    if (error instanceof VideoExportValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to retry video export job.";
    return NextResponse.json({ error: message }, { status });
  }
}
