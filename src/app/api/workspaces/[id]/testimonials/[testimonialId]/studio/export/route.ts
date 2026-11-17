import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { createStudioExportJob } from "@/lib/video/service";
import { VideoStudioConfig } from "@/lib/video/types";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

/**
 * POST: Queues a new Praise Video Studio export job.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN", "MEMBER"]);

    const body = await request.json();
    const studioConfig = body.studioConfig as VideoStudioConfig;

    if (!studioConfig || !studioConfig.clips || studioConfig.clips.length === 0) {
      return NextResponse.json(
        { error: "At least one video clip is required to export." },
        { status: 400 },
      );
    }

    const job = await createStudioExportJob({
      workspaceId,
      testimonialId,
      studioConfig,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Video Studio export job queued successfully.",
        job,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to queue studio export job.";
    return NextResponse.json({ error: message }, { status });
  }
}
