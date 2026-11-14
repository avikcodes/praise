import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  retryTranscriptionJob,
  triggerMediaTranscription,
} from "@/lib/transcription/service";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

export async function POST(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN", "MEMBER"]);

    // Find the testimonial and associated video/audio media asset
    const testimonial = await prisma.testimonial.findFirst({
      where: {
        id: testimonialId,
        workspaceId,
      },
      include: {
        mediaAssets: {
          include: {
            transcription: true,
          },
        },
        transcriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!testimonial) {
      return NextResponse.json(
        { error: "Testimonial not found in this workspace." },
        { status: 404 },
      );
    }

    // Find the primary video or audio media asset
    const mediaAsset = testimonial.mediaAssets.find(
      (m) => m.type === "VIDEO" || m.type === "AUDIO",
    );

    if (!mediaAsset) {
      return NextResponse.json(
        { error: "This testimonial does not contain video or audio media to transcribe." },
        { status: 400 },
      );
    }

    const existingJob =
      mediaAsset.transcription || testimonial.transcriptions[0] || null;

    let job;
    if (existingJob) {
      job = await retryTranscriptionJob(existingJob.id, workspaceId);
    } else {
      job = await triggerMediaTranscription(
        testimonial.id,
        mediaAsset.id,
        workspaceId,
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transcription processing initiated in background.",
      transcription: job,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to initiate transcription.";
    return NextResponse.json({ error: message }, { status });
  }
}
