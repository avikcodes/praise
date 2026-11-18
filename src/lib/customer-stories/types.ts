export type StorySectionType =
  | "challenge"
  | "solution"
  | "results"
  | "quote"
  | "metrics"
  | "media"
  | "custom";

export interface StorySection {
  id: string;
  type: StorySectionType;
  title?: string;
  content?: string;
  quote?: string;
  quoteAuthor?: string;
  quoteRole?: string;
  mediaUrl?: string;
  caption?: string;
}

export interface StoryMeasurableOutcome {
  metric: string;
  before?: string;
  after?: string;
  improvement?: string;
  timeframe?: string;
}

export interface StoryMediaItem {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  caption?: string;
  isCover?: boolean;
}

export type StoryTheme = "light" | "warm" | "dark" | "editorial";

export interface CustomerStoryDetail {
  id: string;
  workspaceId: string;
  responseId?: string | null;
  projectId?: string | null;
  brandId?: string | null;
  customerId?: string | null;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt?: string | null;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  readingTimeMinutes: number;
  customerName: string;
  customerTitle?: string | null;
  customerAvatarUrl?: string | null;
  companyName: string;
  companyLogoUrl?: string | null;
  companyWebsite?: string | null;
  companyIndustry?: string | null;
  companySize?: string | null;
  featuredQuote?: string | null;
  featuredQuoteAuthor?: string | null;
  featuredQuoteRole?: string | null;
  featuredQuoteAvatar?: string | null;
  peerAdvice?: string | null;
  measurableOutcomes: StoryMeasurableOutcome[];
  keyTakeaways: string[];
  sections: StorySection[];
  coverImageUrl?: string | null;
  videoUrl?: string | null;
  approvedMedia: StoryMediaItem[];
  theme: StoryTheme;
  accentColor: string;
  customCtaText?: string | null;
  customCtaUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  permissionVerified: boolean;
  permissionNotes?: string | null;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; slug: string } | null;
  brand?: { id: string; name: string; slug: string } | null;
  customer?: { id: string; name: string; email: string } | null;
  response?: {
    id: string;
    customerName: string;
    companyName: string;
    consentGranted: boolean;
    consentText: string;
    consentTimestamp: string;
  } | null;
}
