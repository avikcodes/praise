import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  createVideoExportJob,
  getTestimonialExportJobs,
} from "@/lib/video/service";
import { VideoExportValidationError } from "@/lib/video/validation";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

/**
 * GET: Lists all video export jobs for this testimonial
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
      error instanceof Error ? error.message : "Failed to fetch video export jobs.";
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST: Queues a new video export job with optional burned subtitles and aspect ratio formatting
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN", "MEMBER"]);

    const body = await request.json();
    const {
      aspectRatio = "ORIGINAL",
      resolutionProfile = "RES_1080P",
      burnSubtitles = true,
      subtitleFont = "sans-serif",
      subtitleSize = "medium",
      subtitlePosition = "bottom",
      subtitleColor = "#ffffff",
      subtitleBgColor = "rgba(0,0,0,0.6)",
      customSegments,
    } = body;

    // Discover the primary video media asset for this testimonial
    const sourceVideoAsset = await prisma.mediaAsset.findFirst({
      where: {
        workspaceId,
        testimonialId,
        type: "VIDEO",
      },
      orderBy: { createdAt: "asc" },
    });

    if (!sourceVideoAsset) {
      return NextResponse.json(
        { error: "This testimonial does not contain a source video to export." },
        { status: 400 },
      );
    }

    const job = await createVideoExportJob({
      workspaceId,
      testimonialId,
      sourceMediaAssetId: sourceVideoAsset.id,
      aspectRatio,
      resolutionProfile,
      burnSubtitles: Boolean(burnSubtitles),
      subtitleFont,
      subtitleSize,
      subtitlePosition,
      subtitleColor,
      subtitleBgColor,
      customSegments,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Video export job queued successfully.",
        job,
      },
      { status: 201 },
    );
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
      error instanceof Error ? error.message : "Failed to queue video export job.";
    return NextResponse.json({ error: message }, { status });
  }
}
