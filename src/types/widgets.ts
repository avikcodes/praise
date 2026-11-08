export type WidgetLayout = "masonry" | "grid" | "adaptive";
export type WidgetThemeMode = "warm" | "light" | "dark" | "auto";
export type WidgetOrdering = "featured_first" | "highest_rated" | "newest" | "oldest";

export type WallOfLoveConfig = {
  slug: string;
  title: string;
  description: string;
  layout: WidgetLayout;
  theme: WidgetThemeMode;
  accentColor: string;
  ordering: WidgetOrdering;
  showRatings: boolean;
  showCompany: boolean;
  showAvatar: boolean;
  showDate: boolean;
  showTags: boolean;
  showSource: boolean;
  showFeaturedBadge: boolean;
  minRating: number;
  ctaEnabled: boolean;
  ctaLabel: string;
  ctaUrl: string;
  ctaSecondaryEnabled: boolean;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  customLogoUrl?: string | null;
  allowVideoPlayback: boolean;
  cardsPerRow?: number;
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

