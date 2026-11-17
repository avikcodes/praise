export type MarketingAssetTemplate =
  | "modern_minimal"
  | "bold_gradient"
  | "social_proof"
  | "video_poster"
  | "editorial_serif"
  | "midnight_glass";

export type MarketingAspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

export type MarketingBackgroundType =
  | "gradient"
  | "mesh"
  | "solid"
  | "pattern"
  | "glass"
  | "video_backdrop";

export type MarketingLogoPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface MarketingAssetConfig {
  template: MarketingAssetTemplate;
  aspectRatio: MarketingAspectRatio;
  backgroundType: MarketingBackgroundType;
  customBgColor?: string;
  customGradientFrom?: string;
  customGradientTo?: string;
  typographyFamily: "sans" | "serif" | "mono" | "geometric" | "humanist";
  showLogo: boolean;
  logoPosition: MarketingLogoPosition;
  logoUrl?: string | null;
  showRating: boolean;
  showVerifiedBadge: boolean;
  showDate: boolean;
  showRole: boolean;
  showAvatar: boolean;
  editedQuote?: string;
  isEditedQuote: boolean;
  isVideoThumbnail: boolean;
  showPlayButton: boolean;
  videoDurationBadge?: string;
  accentColor: string;
  textColor: string;
  cardRadius: "none" | "small" | "medium" | "large" | "full";
}

export interface SavedMarketingAsset {
  id: string;
  testimonialId: string;
  workspaceId: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  fileSizeBytes: number;
  mimeType: string;
  createdAt: string;
}
