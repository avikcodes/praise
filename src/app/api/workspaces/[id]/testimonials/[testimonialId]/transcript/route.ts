import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { updateManualTranscript } from "@/lib/transcription/service";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const transcription = await prisma.mediaTranscription.findFirst({
      where: {
        workspaceId,
        testimonialId,
      },
      include: {
        mediaAsset: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!transcription) {
      return NextResponse.json(
        { error: "No transcription found for this testimonial." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      transcription,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to fetch transcription.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { text, language, syncToTestimonialContent } = body;

    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Transcript text cannot be empty." },
        { status: 400 },
      );
    }

    // Find the current transcription job for this testimonial
    let transcription = await prisma.mediaTranscription.findFirst({
      where: {
        workspaceId,
        testimonialId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!transcription) {
      // If none exists yet, look for a media asset to attach to
      const mediaAsset = await prisma.mediaAsset.findFirst({
        where: {
          workspaceId,
          testimonialId,
          type: { in: ["VIDEO", "AUDIO"] },
        },
      });

      if (!mediaAsset) {
        return NextResponse.json(
          { error: "No media asset found to attach corrected transcript." },
          { status: 400 },
        );
      }

      transcription = await prisma.mediaTranscription.create({
        data: {
          workspaceId,
          testimonialId,
          mediaAssetId: mediaAsset.id,
          provider: "manual",
          status: "COMPLETED",
          text: text.trim(),
          rawText: text.trim(),
          language: language?.trim() || "en",
          isEdited: true,
          editedAt: new Date(),
          editedByUserId: member.user.id,
        },
      });
    } else {
      transcription = await updateManualTranscript(
        transcription.id,
        workspaceId,
        text,
        language,
        member.user.id,
      );
    }

    // Optionally update the testimonial's primary text content with the corrected transcript
    if (syncToTestimonialContent) {
      await prisma.testimonial.update({
        where: {
          id: testimonialId,
          workspaceId,
        },
        data: {
          content: text.trim(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Transcript updated successfully.",
      transcription,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to update transcript.";
    return NextResponse.json({ error: message }, { status });
  }
}
