import crypto from "crypto";
import { prisma } from "@/lib/db/client";
import { getStorageEngine } from "@/lib/storage/engine";
import {
  VideoExportOptions,
  VideoAspectRatio,
  VideoResolutionProfile,
  SubtitleStyleConfig,
  VideoStudioConfig,
  VideoStudioClip,
} from "./types";
import {
  estimateSourceResolution,
  validateExportJobRequest,
  VideoExportValidationError,
} from "./validation";
import { processVideoExport, processStudioExport } from "./processor";
import { SubtitleSegment } from "./subtitles";
import { VideoExportStatus } from "@prisma/client";

export interface CreateVideoExportInput {
  workspaceId: string;
  testimonialId: string;
  sourceMediaAssetId: string;
  aspectRatio?: VideoAspectRatio;
  resolutionProfile?: VideoResolutionProfile;
  burnSubtitles?: boolean;
  subtitleFont?: "sans-serif" | "serif" | "monospace";
  subtitleSize?: "small" | "medium" | "large";
  subtitlePosition?: "bottom" | "middle" | "top";
  subtitleColor?: string;
  subtitleBgColor?: string;
  customSegments?: SubtitleSegment[];
}

/**
 * Creates and queues a video export job with subtitle burning and aspect ratio transformation.
 * Validates hardware/source resolution capability upfront before accepting the job.
 */
export async function createVideoExportJob({
  workspaceId,
  testimonialId,
  sourceMediaAssetId,
  aspectRatio = "ORIGINAL",
  resolutionProfile = "RES_1080P",
  burnSubtitles = true,
  subtitleFont = "sans-serif",
  subtitleSize = "medium",
  subtitlePosition = "bottom",
  subtitleColor = "#ffffff",
  subtitleBgColor = "rgba(0,0,0,0.6)",
  customSegments,
}: CreateVideoExportInput) {
  // 1. Verify source media asset exists and belongs to this workspace
  const sourceAsset = await prisma.mediaAsset.findFirst({
    where: {
      id: sourceMediaAssetId,
      workspaceId,
      testimonialId,
    },
  });

  if (!sourceAsset) {
    throw new VideoExportValidationError(
      "Source video asset not found or does not belong to this testimonial.",
      "SOURCE_NOT_FOUND",
      404,
    );
  }

  if (sourceAsset.type !== "VIDEO") {
    throw new VideoExportValidationError(
      "Target media asset is not a video file.",
      "NOT_A_VIDEO",
      400,
    );
  }

  // 2. Assess source resolution capability
  const capability = estimateSourceResolution({
    fileSizeBytes: sourceAsset.fileSizeBytes || 1024 * 1024,
    durationSeconds: sourceAsset.durationSeconds || 30,
  });

  const subtitleStyle: SubtitleStyleConfig = {
    font: subtitleFont,
    size: subtitleSize,
    position: subtitlePosition,
    color: subtitleColor,
    backgroundColor: subtitleBgColor,
  };

  const exportOptions: VideoExportOptions = {
    aspectRatio,
    resolutionProfile,
    burnSubtitles,
    subtitleStyle,
    customSegments,
  };

  // 3. Upfront Validation: Do not promise 4K output from low-res source
  validateExportJobRequest(exportOptions, capability);

  // 4. Create database job record in QUEUED status
  const job = await prisma.videoExportJob.create({
    data: {
      workspaceId,
      testimonialId,
      sourceMediaAssetId,
      status: VideoExportStatus.QUEUED,
      progress: 0,
      aspectRatio,
      resolutionProfile,
      burnSubtitles,
      subtitleFont,
      subtitleSize,
      subtitlePosition,
      subtitleColor,
      subtitleBgColor,
      customSegmentsJson: customSegments ? JSON.stringify(customSegments) : null,
      sourceResolution: capability.estimatedResolution,
    },
  });

  // 5. Dispatch background processing without blocking API response
  void executeVideoExportJob(job.id).catch((err) => {
    console.error(`[VideoExportJob Worker] Error in job ${job.id}:`, err);
  });

  return job;
}

/**
 * Worker execution for video export jobs.
 * Preserves original source media and creates a separate exported MediaAsset record.
 */
export async function executeVideoExportJob(jobId: string) {
  const job = await prisma.videoExportJob.findUnique({
    where: { id: jobId },
    include: {
      sourceMediaAsset: true,
    },
  });

  if (!job || !job.sourceMediaAsset) {
    console.error(`[VideoExportJob] Job or source asset not found for ${jobId}`);
    return;
  }

  // Update status to PROCESSING
  await prisma.videoExportJob.update({
    where: { id: jobId },
    data: {
      status: VideoExportStatus.PROCESSING,
      progress: 10,
      startedAt: new Date(),
      attempts: { increment: 1 },
      errorMessage: null,
    },
  });

  try {
    const sourceAsset = job.sourceMediaAsset;
    if (!sourceAsset.localPath) {
      throw new Error("Source media asset does not have a valid storage key.");
    }

    // Read original video buffer non-destructively
    const engine = getStorageEngine();
    const readResult = await engine.read(sourceAsset.localPath);
    if (!readResult || !readResult.buffer) {
      throw new Error(`Source video file could not be read from storage: ${sourceAsset.localPath}`);
    }

    let parsedSegments: SubtitleSegment[] | undefined;
    if (job.customSegmentsJson) {
      try {
        parsedSegments = JSON.parse(job.customSegmentsJson);
      } catch {
        // ignore parse error
      }
    }

    const exportOptions: VideoExportOptions = {
      aspectRatio: job.aspectRatio,
      resolutionProfile: job.resolutionProfile,
      burnSubtitles: job.burnSubtitles,
      subtitleStyle: {
        font: (job.subtitleFont as "sans-serif" | "serif" | "monospace") || "sans-serif",
        size: (job.subtitleSize as "small" | "medium" | "large") || "medium",
        position: (job.subtitlePosition as "bottom" | "middle" | "top") || "bottom",
        color: job.subtitleColor || "#ffffff",
        backgroundColor: job.subtitleBgColor || "rgba(0,0,0,0.6)",
      },
      customSegments: parsedSegments,
    };

    // Progress callback updater
    const onProgress = async (percent: number) => {
      await prisma.videoExportJob.update({
        where: { id: jobId },
        data: { progress: Math.min(99, Math.max(10, percent)) },
      });
    };

    // Process export and subtitle burn
    const exportResult = await processVideoExport({
      sourceBuffer: readResult.buffer,
      sourceMimeType: sourceAsset.mimeType,
      options: exportOptions,
      onProgress,
    });

    // Save exported video into storage engine under separate key
    const exportExt = exportResult.mimeType.includes("webm") ? ".webm" : ".mp4";
    const exportFilename = `export_${job.id}_${job.resolutionProfile.toLowerCase()}${exportExt}`;
    const exportStorageKey = `${job.workspaceId}/exports/${exportFilename}`;

    await engine.save(exportResult.buffer, exportStorageKey, exportResult.mimeType);

    const exportedAssetId = `med_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const exportedPublicUrl = `/api/media/${exportedAssetId}`;

    // Create separate MediaAsset in database
    const exportedMediaAsset = await prisma.mediaAsset.create({
      data: {
        id: exportedAssetId,
        workspaceId: job.workspaceId,
        testimonialId: job.testimonialId,
        type: "VIDEO",
        storageProvider: engine.provider,
        url: exportedPublicUrl,
        localPath: exportStorageKey,
        mimeType: exportResult.mimeType,
        fileSizeBytes: exportResult.fileSizeBytes,
        durationSeconds: exportResult.durationSeconds || sourceAsset.durationSeconds,
      },
    });

    // Mark job as COMPLETED
    await prisma.videoExportJob.update({
      where: { id: jobId },
      data: {
        status: VideoExportStatus.COMPLETED,
        progress: 100,
        exportedMediaAssetId: exportedMediaAsset.id,
        outputUrl: exportedPublicUrl,
        fileSizeBytes: exportResult.fileSizeBytes,
        durationSeconds: exportResult.durationSeconds,
        completedAt: new Date(),
        errorMessage: null,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error during video export processing.";

    await prisma.videoExportJob.update({
      where: { id: jobId },
      data: {
        status: VideoExportStatus.FAILED,
        errorMessage: message,
      },
    });
  }
}

/**
 * Retries a failed video export job.
 */
export async function retryVideoExportJob(jobId: string, workspaceId: string) {
  const job = await prisma.videoExportJob.findFirst({
    where: {
      id: jobId,
      workspaceId,
    },
  });

  if (!job) {
    throw new VideoExportValidationError("Video export job not found in this workspace.", "NOT_FOUND", 404);
  }

  await prisma.videoExportJob.update({
    where: { id: jobId },
    data: {
      status: VideoExportStatus.QUEUED,
      progress: 0,
      errorMessage: null,
    },
  });

  void executeVideoExportJob(jobId).catch((err) => {
    console.error(`[VideoExportJob Retry] Error in job ${jobId}:`, err);
  });

  return job;
}

/**
 * Fetches all video export jobs for a testimonial.
 */
export async function getTestimonialExportJobs(
  testimonialId: string,
  workspaceId: string,
) {
  return prisma.videoExportJob.findMany({
    where: {
      testimonialId,
      workspaceId,
    },
    include: {
      exportedMediaAsset: true,
      sourceMediaAsset: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves the saved Video Studio draft configuration for a testimonial.
 */
export async function getStudioConfig(
  testimonialId: string,
  workspaceId: string,
): Promise<VideoStudioConfig | null> {
  const testimonial = await prisma.testimonial.findFirst({
    where: {
      id: testimonialId,
      workspaceId,
    },
    select: {
      importSourceDetailsJson: true,
    },
  });

  if (!testimonial || !testimonial.importSourceDetailsJson) {
    return null;
  }

  try {
    const details = JSON.parse(testimonial.importSourceDetailsJson);
    return details.videoStudioConfig || null;
  } catch {
    return null;
  }
}

/**
 * Saves the Video Studio configuration draft non-destructively on the testimonial record.
 */
export async function saveStudioConfig(
  testimonialId: string,
  workspaceId: string,
  studioConfig: VideoStudioConfig,
): Promise<VideoStudioConfig> {
  const testimonial = await prisma.testimonial.findFirst({
    where: {
      id: testimonialId,
      workspaceId,
    },
    select: {
      id: true,
      importSourceDetailsJson: true,
    },
  });

  if (!testimonial) {
    throw new VideoExportValidationError(
      "Testimonial not found in this workspace.",
      "NOT_FOUND",
      404,
    );
  }

  let existingDetails: Record<string, unknown> = {};
  if (testimonial.importSourceDetailsJson) {
    try {
      existingDetails = JSON.parse(testimonial.importSourceDetailsJson);
    } catch {}
  }

  const updatedConfig: VideoStudioConfig = {
    ...studioConfig,
    updatedAt: new Date().toISOString(),
  };

  existingDetails.videoStudioConfig = updatedConfig;

  await prisma.testimonial.update({
    where: { id: testimonialId },
    data: {
      importSourceDetailsJson: JSON.stringify(existingDetails),
    },
  });

  return updatedConfig;
}

/**
 * Queues a Praise Video Studio sequence export job.
 * Validates workspace ownership of every clip, clip trimming limits, and settings.
 */
export async function createStudioExportJob({
  workspaceId,
  testimonialId,
  studioConfig,
}: {
  workspaceId: string;
  testimonialId: string;
  studioConfig: VideoStudioConfig;
}) {
  if (!studioConfig.clips || studioConfig.clips.length === 0) {
    throw new VideoExportValidationError(
      "At least one video clip is required to export a sequence.",
      "NO_CLIPS",
      400,
    );
  }

  // 1. Verify primary testimonial exists and belongs to workspace
  const primaryTestimonial = await prisma.testimonial.findFirst({
    where: { id: testimonialId, workspaceId },
  });

  if (!primaryTestimonial) {
    throw new VideoExportValidationError(
      "Primary testimonial not found or does not belong to this workspace.",
      "TESTIMONIAL_NOT_FOUND",
      404,
    );
  }

  // 2. Security validation: Verify every clip belongs to this workspace
  const clipAssetIds = studioConfig.clips.map((c) => c.mediaAssetId);
  const foundAssets = await prisma.mediaAsset.findMany({
    where: {
      id: { in: clipAssetIds },
      workspaceId,
      type: "VIDEO",
    },
  });

  if (foundAssets.length !== clipAssetIds.length) {
    throw new VideoExportValidationError(
      "One or more referenced video clips do not belong to your workspace or are invalid.",
      "UNAUTHORIZED_MEDIA_ACCESS",
      403,
    );
  }

  // 3. Trim validation: Ensure trimStart < trimEnd and within bounds
  for (const clip of studioConfig.clips) {
    if (clip.trimStart < 0) {
      throw new VideoExportValidationError(
        `Clip "${clip.title}" has an invalid negative trim start time.`,
        "INVALID_TRIM",
        400,
      );
    }
    if (clip.trimEnd <= clip.trimStart) {
      throw new VideoExportValidationError(
        `Clip "${clip.title}" has trim end earlier than or equal to trim start.`,
        "INVALID_TRIM",
        400,
      );
    }
  }

  // 4. Auto-save the studio config draft
  await saveStudioConfig(testimonialId, workspaceId, studioConfig);

  // 5. Create the database VideoExportJob record
  const primaryAsset = foundAssets.find((a) => a.id === studioConfig.clips[0].mediaAssetId) || foundAssets[0];

  const job = await prisma.videoExportJob.create({
    data: {
      workspaceId,
      testimonialId,
      sourceMediaAssetId: primaryAsset.id,
      status: VideoExportStatus.QUEUED,
      progress: 0,
      aspectRatio: studioConfig.aspectRatio || "ORIGINAL",
      resolutionProfile: studioConfig.resolutionProfile || "RES_1080P",
      burnSubtitles: Boolean(studioConfig.burnSubtitles),
      customSegmentsJson: JSON.stringify({
        isStudio: true,
        studioConfig,
      }),
      sourceResolution: "1080p",
    },
  });

  // 6. Dispatch background processing
  void executeStudioExportJob(job.id).catch((err) => {
    console.error(`[StudioExportJob Worker] Error in job ${job.id}:`, err);
  });

  return job;
}

/**
 * Worker execution for Praise Video Studio sequence exports.
 */
export async function executeStudioExportJob(jobId: string) {
  const job = await prisma.videoExportJob.findUnique({
    where: { id: jobId },
    include: {
      sourceMediaAsset: true,
    },
  });

  if (!job) {
    console.error(`[StudioExportJob] Job not found for ${jobId}`);
    return;
  }

  // Update status to PROCESSING
  await prisma.videoExportJob.update({
    where: { id: jobId },
    data: {
      status: VideoExportStatus.PROCESSING,
      progress: 10,
      startedAt: new Date(),
      attempts: { increment: 1 },
      errorMessage: null,
    },
  });

  try {
    let studioConfig: VideoStudioConfig;
    try {
      const payload = JSON.parse(job.customSegmentsJson || "{}");
      studioConfig = payload.studioConfig || payload;
    } catch {
      throw new Error("Invalid studio configuration payload in job.");
    }

    if (!studioConfig.clips || studioConfig.clips.length === 0) {
      throw new Error("No clips provided in studio configuration.");
    }

    const engine = getStorageEngine();
    const clipBuffers: Array<{
      clip: VideoStudioClip;
      buffer: Buffer;
      mimeType: string;
    }> = [];

    // Read and verify all clip media buffers from storage engine
    for (const clip of studioConfig.clips) {
      const asset = await prisma.mediaAsset.findFirst({
        where: {
          id: clip.mediaAssetId,
          workspaceId: job.workspaceId,
        },
      });

      if (!asset || !asset.localPath) {
        throw new Error(`Media asset ${clip.mediaAssetId} could not be resolved in workspace.`);
      }

      const readResult = await engine.read(asset.localPath);
      if (!readResult || !readResult.buffer) {
        throw new Error(`Media asset file could not be read: ${asset.localPath}`);
      }

      clipBuffers.push({
        clip,
        buffer: readResult.buffer,
        mimeType: asset.mimeType || "video/mp4",
      });
    }

    const onProgress = async (percent: number) => {
      await prisma.videoExportJob.update({
        where: { id: jobId },
        data: { progress: Math.min(99, Math.max(10, percent)) },
      });
    };

    // Execute sequence processing
    const exportResult = await processStudioExport({
      studioConfig,
      clipBuffers,
      onProgress,
    });

    // Save processed export into storage engine under separate key
    const exportExt = exportResult.mimeType.includes("webm") ? ".webm" : ".mp4";
    const exportFilename = `studio_export_${job.id}_${studioConfig.aspectRatio.toLowerCase()}${exportExt}`;
    const exportStorageKey = `${job.workspaceId}/exports/${exportFilename}`;

    await engine.save(exportResult.buffer, exportStorageKey, exportResult.mimeType);

    const exportedAssetId = `med_studio_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
    const exportedPublicUrl = `/api/media/${exportedAssetId}`;

    // Create a new separate MediaAsset associated with the testimonial
    const exportedMediaAsset = await prisma.mediaAsset.create({
      data: {
        id: exportedAssetId,
        workspaceId: job.workspaceId,
        testimonialId: job.testimonialId,
        type: "VIDEO",
        storageProvider: engine.provider,
        url: exportedPublicUrl,
        localPath: exportStorageKey,
        mimeType: exportResult.mimeType,
        fileSizeBytes: exportResult.fileSizeBytes,
        durationSeconds: exportResult.durationSeconds,
      },
    });

    // Mark job as COMPLETED
    await prisma.videoExportJob.update({
      where: { id: jobId },
      data: {
        status: VideoExportStatus.COMPLETED,
        progress: 100,
        exportedMediaAssetId: exportedMediaAsset.id,
        outputUrl: exportedPublicUrl,
        fileSizeBytes: exportResult.fileSizeBytes,
        durationSeconds: exportResult.durationSeconds,
        completedAt: new Date(),
        errorMessage: null,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error during video studio export processing.";

    await prisma.videoExportJob.update({
      where: { id: jobId },
      data: {
        status: VideoExportStatus.FAILED,
        errorMessage: message,
      },
    });
  }
}

/**
 * Retries a failed studio export job safely.
 */
export async function retryStudioExportJob(jobId: string, workspaceId: string) {
  const job = await prisma.videoExportJob.findFirst({
    where: {
      id: jobId,
      workspaceId,
    },
  });

  if (!job) {
    throw new VideoExportValidationError(
      "Video export job not found in this workspace.",
      "NOT_FOUND",
      404,
    );
  }

  await prisma.videoExportJob.update({
    where: { id: jobId },
    data: {
      status: VideoExportStatus.QUEUED,
      progress: 0,
      errorMessage: null,
    },
  });

  void executeStudioExportJob(jobId).catch((err) => {
    console.error(`[StudioExportJob Retry] Error in job ${jobId}:`, err);
  });

  return job;
}
