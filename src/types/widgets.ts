export type WidgetDisplayType = "grid" | "carousel" | "single_quote" | "list";
export type WidgetLayout = "masonry" | "grid" | "carousel" | "single_quote" | "list" | "adaptive";
export type WidgetThemeMode = "warm" | "light" | "dark" | "auto" | "transparent";
export type WidgetOrdering = "featured_first" | "highest_rated" | "newest" | "oldest";
export type WidgetTypographyFamily = "sans" | "serif" | "mono" | "geometric" | "humanist";
export type WidgetTypographySize = "compact" | "normal" | "large";
export type WidgetSelectionMode = "all" | "manual";
export type WidgetCardBorder = "subtle" | "prominent" | "dashed" | "none";
export type WidgetCardRadius = "none" | "small" | "medium" | "large" | "full";
export type WidgetCardSpacing = "compact" | "normal" | "spacious";

export type WallOfLoveConfig = {
  slug: string;
  title: string;
  description: string;
  layout: WidgetLayout;
  widgetType?: WidgetDisplayType;
  theme: WidgetThemeMode;
  accentColor: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string | null;
  textColor?: string | null;
  cardBorder?: WidgetCardBorder;
  cardRadius?: WidgetCardRadius;
  cardSpacing?: WidgetCardSpacing;
  showPraiseBranding?: boolean;
  ordering: WidgetOrdering;
  showRatings: boolean;
  showCompany: boolean;
  showAvatar: boolean;
  showDate: boolean;
  showTags: boolean;
  showSource: boolean;
  showFeaturedBadge: boolean;
  minRating: number;
  selectionMode?: WidgetSelectionMode;
  selectedTestimonialIds?: string[];
  filterTags?: string[];
  typographyFamily?: WidgetTypographyFamily;
  typographySize?: WidgetTypographySize;
  ctaEnabled: boolean;
  ctaLabel: string;
  ctaUrl: string;
  ctaSecondaryEnabled: boolean;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  customLogoUrl?: string | null;
  allowVideoPlayback: boolean;
  cardsPerRow?: number;
  autoplay?: boolean;
  autoplayInterval?: number;
  maxItems?: number;
};

export type WidgetDetail = {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  name: string;
  type: "WALL_OF_LOVE" | "GRID" | "CAROUSEL" | "QUOTE_CARD";
  theme: "LIGHT" | "DARK" | "WARM" | "AUTO";
  config: WallOfLoveConfig;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
  } | null;
  approvedCount?: number;
  publicUrl: string;
};

export type PublicTestimonialMedia = {
  id: string;
  type: "IMAGE" | "VIDEO" | "AUDIO";
  url: string;
  mimeType: string;
  fileSizeBytes?: number | null;
  durationSeconds?: number | null;
};

export type PublicTestimonialCard = {
  id: string;
  status?: string;
  content: string;
  rating: number | null;
  type: "TEXT" | "VIDEO" | "AUDIO";
  isFeatured: boolean;
  submittedAt: string;
  customer: {
    name: string;
    company?: string | null;
    title?: string | null;
    avatarUrl?: string | null;
    website?: string | null;
  };
  project?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  tags: string[];
  source?: string | null;
  media: PublicTestimonialMedia[];
};

export type PublicWallOfLoveData = {
  widgetId: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  config: WallOfLoveConfig;
  project?: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
    logoUrl?: string | null;
  } | null;
  workspace: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
  totalApproved: number;
  testimonials: PublicTestimonialCard[];
};

