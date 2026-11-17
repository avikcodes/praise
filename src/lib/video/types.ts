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

export type VideoCropMode = "fit" | "fill" | "custom";

export interface VideoCropConfig {
  mode: VideoCropMode;
  x?: number; // 0 - 100 percentage
  y?: number; // 0 - 100 percentage
  width?: number; // 0 - 100 percentage
  height?: number; // 0 - 100 percentage
}

export interface VideoStudioClip {
  id: string;
  mediaAssetId: string;
  testimonialId: string;
  title: string;
  authorName?: string;
  authorCompany?: string;
  videoUrl: string;
  trimStart: number; // seconds
  trimEnd: number; // seconds
  duration: number; // original duration in seconds
  crop: VideoCropConfig;
  order: number;
}

export interface BrandedCardConfig {
  enabled: boolean;
  type?: "TEXT_BADGE" | "LOGO_STAMP" | "CTA_CARD";
  durationSeconds: number; // 1 to 5 seconds
  title: string;
  subtitle?: string;
  logoUrl?: string | null;
  backgroundColor: string;
  textColor: string;
}

export interface VideoStudioConfig {
  id?: string;
  name?: string;
  aspectRatio: VideoAspectRatio;
  resolutionProfile: VideoResolutionProfile;
  clips: VideoStudioClip[];
  intro: BrandedCardConfig;
  outro: BrandedCardConfig;
  burnSubtitles?: boolean;
  subtitleStyle?: SubtitleStyleConfig;
  updatedAt?: string;
}
