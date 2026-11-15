import type { SubtitleSegment } from "./subtitles";

export type VideoAspectRatio =
  | "ORIGINAL"
  | "RATIO_16_9"
  | "RATIO_9_16"
  | "RATIO_1_1"
  | "RATIO_4_5";

export type VideoResolutionProfile = "RES_720P" | "RES_1080P" | "RES_4K";

export interface SubtitleStyleConfig {
  font: "sans-serif" | "serif" | "monospace";
  size: "small" | "medium" | "large";
  position: "bottom" | "middle" | "top";
  color: string;
  backgroundColor: string;
}

export interface VideoExportOptions {
  aspectRatio: VideoAspectRatio;
  resolutionProfile: VideoResolutionProfile;
  burnSubtitles: boolean;
  subtitleStyle: SubtitleStyleConfig;
  customSegments?: SubtitleSegment[];
}

export interface SourceVideoCapability {
  width?: number;
  height?: number;
  durationSeconds?: number;
  fileSizeBytes: number;
  estimatedResolution: "480p" | "720p" | "1080p" | "1440p" | "4K" | "unknown";
  canExport4K: boolean;
  fourKRestrictionReason?: string;
}

export interface VideoExportResult {
  outputKey: string;
  url: string;
  fileSizeBytes: number;
  durationSeconds: number;
  resolution: string;
}
