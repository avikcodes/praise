import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  generateSrt,
  generateVtt,
  validateSubtitleSegments,
  buildEstimatedSegmentsFromText,
  SubtitleSegment,
} from "@/lib/video/subtitles";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

/**
 * GET: Fetches or downloads subtitle files (SRT / VTT / JSON)
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "json").toLowerCase();
    const isDownload = searchParams.get("download") === "1" || searchParams.get("download") === "true";

    // 1. Fetch transcription for this testimonial
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

    let segments: SubtitleSegment[] = [];

    if (transcription?.metadataJson) {
      try {
        const parsed = JSON.parse(transcription.metadataJson);
        if (Array.isArray(parsed?.segments) && parsed.segments.length > 0) {
          segments = parsed.segments;
        }
      } catch {
        // fallback
      }
    }

    // If no explicit segments in metadata, auto-generate estimated segments from text
    if (segments.length === 0 && transcription?.text) {
      const duration = transcription.durationSeconds || transcription.mediaAsset?.durationSeconds || 30;
      segments = buildEstimatedSegmentsFromText(transcription.text, duration);
    }

    const safeFilename = `testimonial-${testimonialId.slice(-8)}`;

    // Return SRT format
    if (format === "srt") {
      const srtText = generateSrt(segments);
      const headers = new Headers({
        "Content-Type": "application/x-subrip; charset=utf-8",
        "Cache-Control": "private, no-cache",
      });
      if (isDownload) {
        headers.set("Content-Disposition", `attachment; filename="${safeFilename}.srt"`);
      }
      return new NextResponse(srtText, { headers });
    }

    // Return VTT format
    if (format === "vtt") {
      const vttText = generateVtt(segments);
      const headers = new Headers({
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "private, no-cache",
      });
      if (isDownload) {
        headers.set("Content-Disposition", `attachment; filename="${safeFilename}.vtt"`);
      }
      return new NextResponse(vttText, { headers });
    }

    // Default: JSON response with segments and downloadable URLs
    return NextResponse.json({
      success: true,
      testimonialId,
      transcriptionId: transcription?.id || null,
      language: transcription?.language || "en",
      segments,
      srtUrl: `/api/workspaces/${workspaceId}/testimonials/${testimonialId}/subtitles?format=srt&download=1`,
      vttUrl: `/api/workspaces/${workspaceId}/testimonials/${testimonialId}/subtitles?format=vtt&download=1`,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to retrieve subtitles.";
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT: Updates subtitle segments with custom timings and text.
 */
export async function PUT(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { segments, syncToTranscript = true } = body;

    const validation = validateSubtitleSegments(segments);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.join("; ") },
        { status: 400 },
      );
    }

    // Find the active transcription record
    let transcription = await prisma.mediaTranscription.findFirst({
      where: {
        workspaceId,
        testimonialId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!transcription) {
      // Find video media asset to attach to
      const mediaAsset = await prisma.mediaAsset.findFirst({
        where: {
          workspaceId,
          testimonialId,
          type: "VIDEO",
        },
      });

      if (!mediaAsset) {
        return NextResponse.json(
          { error: "No video asset found on this testimonial to attach subtitles." },
          { status: 404 },
        );
      }

      const combinedText = segments.map((s: SubtitleSegment) => s.text.trim()).join(" ");
      transcription = await prisma.mediaTranscription.create({
        data: {
          workspaceId,
          testimonialId,
          mediaAssetId: mediaAsset.id,
          provider: "manual-subtitles",
          status: "COMPLETED",
          text: combinedText,
          rawText: combinedText,
          language: "en",
          metadataJson: JSON.stringify({ segments }),
          isEdited: true,
          editedAt: new Date(),
          editedByUserId: member.user.id,
        },
      });
    } else {
      const combinedText = segments.map((s: SubtitleSegment) => s.text.trim()).join(" ");

      let existingMeta: Record<string, unknown> = {};
      try {
        existingMeta = transcription.metadataJson ? JSON.parse(transcription.metadataJson) : {};
      } catch {
        // ignore
      }

      existingMeta.segments = segments;

      transcription = await prisma.mediaTranscription.update({
        where: { id: transcription.id },
        data: {
          metadataJson: JSON.stringify(existingMeta),
          ...(syncToTranscript ? { text: combinedText } : {}),
          status: "COMPLETED",
          isEdited: true,
          editedAt: new Date(),
          editedByUserId: member.user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Subtitles and timestamps updated successfully.",
      segments,
      transcription,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to update subtitles.";
    return NextResponse.json({ error: message }, { status });
  }
}
