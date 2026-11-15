import os from "os";
import type {
  VideoExportOptions,
  SourceVideoCapability,
  VideoAspectRatio,
  VideoResolutionProfile,
} from "./types.ts";
import { validateSubtitleSegments } from "./subtitles.ts";

export class VideoExportValidationError extends Error {
  status: number;
  code: string;

  constructor(message: string, code = "VALIDATION_FAILED", status = 400) {
    super(message);
    this.name = "VideoExportValidationError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Analyzes source media attributes to assess true resolution capability.
 * Strictly prevents promising or attempting 4K upscaling on low-resolution source video.
 */
export function estimateSourceResolution({
  fileSizeBytes,
  durationSeconds = 60,
  width,
  height,
}: {
  fileSizeBytes: number;
  durationSeconds?: number | null;
  width?: number;
  height?: number;
}): SourceVideoCapability {
  const safeDuration = Math.max(1, durationSeconds || 30);
  const sizeBytes = Math.max(1, fileSizeBytes);

  // If explicit resolution dimensions are available
  if (width && height) {
    const minDim = Math.min(width, height);
    const maxDim = Math.max(width, height);

    if (minDim >= 2160 || maxDim >= 3840) {
      return {
        width,
        height,
        durationSeconds: safeDuration,
        fileSizeBytes: sizeBytes,
        estimatedResolution: "4K",
        canExport4K: true,
      };
    }

    if (minDim >= 1440 || maxDim >= 2560) {
      return {
        width,
        height,
        durationSeconds: safeDuration,
        fileSizeBytes: sizeBytes,
        estimatedResolution: "1440p",
        canExport4K: true,
      };
    }

    if (minDim >= 1080 || maxDim >= 1920) {
      return {
        width,
        height,
        durationSeconds: safeDuration,
        fileSizeBytes: sizeBytes,
        estimatedResolution: "1080p",
        canExport4K: false,
        fourKRestrictionReason:
          "Source video resolution (1080p) is insufficient for native 4K Ultra HD export. Artificial upscaling is disabled to maintain clean visual quality.",
      };
    }

    if (minDim >= 720 || maxDim >= 1280) {
      return {
        width,
        height,
        durationSeconds: safeDuration,
        fileSizeBytes: sizeBytes,
        estimatedResolution: "720p",
        canExport4K: false,
        fourKRestrictionReason:
          "Source video resolution (720p HD) is insufficient for native 4K Ultra HD export.",
      };
    }

    return {
      width,
      height,
      durationSeconds: safeDuration,
      fileSizeBytes: sizeBytes,
      estimatedResolution: "480p",
      canExport4K: false,
      fourKRestrictionReason:
        "Source video resolution (480p standard definition) is insufficient for 4K export.",
    };
  }

  // Bitrate heuristic analysis when dimensions are not stored in database:
  // (bytes * 8) / seconds = bits per second
  const bps = (sizeBytes * 8) / safeDuration;
  const mbps = bps / (1024 * 1024);

  // True 4K web recordings typically require at least 15 Mbps
  if (mbps >= 15 && sizeBytes >= 80 * 1024 * 1024) {
    return {
      durationSeconds: safeDuration,
      fileSizeBytes: sizeBytes,
      estimatedResolution: "4K",
      canExport4K: true,
    };
  }

  if (mbps >= 8 && sizeBytes >= 40 * 1024 * 1024) {
    return {
      durationSeconds: safeDuration,
      fileSizeBytes: sizeBytes,
      estimatedResolution: "1440p",
      canExport4K: true,
    };
  }

  if (mbps >= 3) {
    return {
      durationSeconds: safeDuration,
      fileSizeBytes: sizeBytes,
      estimatedResolution: "1080p",
      canExport4K: false,
      fourKRestrictionReason:
        "Source footage bitrate (~" +
        mbps.toFixed(1) +
        " Mbps) indicates 1080p Full HD recording. Native 4K Ultra HD export requires source video recorded at 1440p or 4K to prevent pixelated upscaling.",
    };
  }

  return {
    durationSeconds: safeDuration,
    fileSizeBytes: sizeBytes,
    estimatedResolution: "720p",
    canExport4K: false,
    fourKRestrictionReason:
      "Source footage indicates 720p HD recording. Native 4K Ultra HD export is unavailable for low-resolution source footage.",
  };
}

/**
 * Validates video export request parameters and processing resource availability.
 */
export function validateExportJobRequest(
  options: Partial<VideoExportOptions>,
  sourceCapability: SourceVideoCapability,
): { valid: true } {
  const allowedAspectRatios: VideoAspectRatio[] = [
    "ORIGINAL",
    "RATIO_16_9",
    "RATIO_9_16",
    "RATIO_1_1",
    "RATIO_4_5",
  ];

  const allowedResolutions: VideoResolutionProfile[] = [
    "RES_720P",
    "RES_1080P",
    "RES_4K",
  ];

  if (!options.aspectRatio || !allowedAspectRatios.includes(options.aspectRatio)) {
    throw new VideoExportValidationError(
      `Invalid aspect ratio '${options.aspectRatio}'. Supported: ${allowedAspectRatios.join(", ")}`,
      "INVALID_ASPECT_RATIO",
    );
  }

  if (!options.resolutionProfile || !allowedResolutions.includes(options.resolutionProfile)) {
    throw new VideoExportValidationError(
      `Invalid resolution profile '${options.resolutionProfile}'. Supported: ${allowedResolutions.join(", ")}`,
      "INVALID_RESOLUTION_PROFILE",
    );
  }

  // 1. Strict 4K Source Resolution Gate
  if (options.resolutionProfile === "RES_4K" && !sourceCapability.canExport4K) {
    throw new VideoExportValidationError(
      sourceCapability.fourKRestrictionReason ||
        "4K Ultra HD export is unavailable because source media resolution is insufficient.",
      "RESOLUTION_MISMATCH_4K",
      400,
    );
  }

  // 2. System Processing Resource Validation
  const freeMemoryBytes = os.freemem();
  const minMemoryThresholdBytes = 128 * 1024 * 1024; // 128MB free memory required
  if (freeMemoryBytes < minMemoryThresholdBytes) {
    throw new VideoExportValidationError(
      "Insufficient server memory to initialize video encoding pipeline. Please retry shortly.",
      "INSUFFICIENT_MEMORY",
      503,
    );
  }

  // 3. Max Source Duration Check (15 minutes)
  const MAX_DURATION_SECONDS = 900;
  if (
    sourceCapability.durationSeconds &&
    sourceCapability.durationSeconds > MAX_DURATION_SECONDS
  ) {
    throw new VideoExportValidationError(
      `Source video exceeds maximum allowed duration for export (${MAX_DURATION_SECONDS / 60} minutes).`,
      "DURATION_EXCEEDED",
    );
  }

  // 4. Subtitle styling and segments validation
  if (options.burnSubtitles) {
    if (options.subtitleStyle) {
      const allowedFonts = ["sans-serif", "serif", "monospace"];
      const allowedSizes = ["small", "medium", "large"];
      const allowedPositions = ["bottom", "middle", "top"];

      if (!allowedFonts.includes(options.subtitleStyle.font)) {
        throw new VideoExportValidationError(
          `Invalid subtitle font '${options.subtitleStyle.font}'. Supported: ${allowedFonts.join(", ")}`,
          "INVALID_SUBTITLE_FONT",
        );
      }

      if (!allowedSizes.includes(options.subtitleStyle.size)) {
        throw new VideoExportValidationError(
          `Invalid subtitle size '${options.subtitleStyle.size}'. Supported: ${allowedSizes.join(", ")}`,
          "INVALID_SUBTITLE_SIZE",
        );
      }

      if (!allowedPositions.includes(options.subtitleStyle.position)) {
        throw new VideoExportValidationError(
          `Invalid subtitle position '${options.subtitleStyle.position}'. Supported: ${allowedPositions.join(", ")}`,
          "INVALID_SUBTITLE_POSITION",
        );
      }
    }

    if (options.customSegments) {
      const segmentValidation = validateSubtitleSegments(options.customSegments);
      if (!segmentValidation.valid) {
        throw new VideoExportValidationError(
          `Subtitle segment validation failed: ${segmentValidation.errors.join("; ")}`,
          "INVALID_SUBTITLE_SEGMENTS",
        );
      }
    }
  }

  return { valid: true };
}
