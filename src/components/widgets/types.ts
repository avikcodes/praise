import {
  PublicTestimonialCard,
  WidgetCardBorder,
  WidgetCardRadius,
  WidgetCardSpacing,
  WidgetDisplayType,
  WidgetPosition,
  WidgetThemeMode,
  WidgetTypographyFamily,
  WidgetTypographySize,
} from "@/types/widgets";

export type WidgetPublicConfig = {
  slug?: string;
  theme?: WidgetThemeMode;
  accentColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string | null;
  textColor?: string | null;
  cardBorder?: WidgetCardBorder;
  cardRadius?: WidgetCardRadius;
  cardSpacing?: WidgetCardSpacing;
  showPraiseBranding?: boolean;
  customLogoUrl?: string | null;
  showRatings?: boolean;
  showCompany?: boolean;
  showAvatar?: boolean;
  showDate?: boolean;
  showTags?: boolean;
  showSource?: boolean;
  showFeaturedBadge?: boolean;
  allowVideoPlayback?: boolean;
  cardsPerRow?: number;
  autoplay?: boolean;
  autoplayInterval?: number;
  maxItems?: number;
  ctaEnabled?: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
  typographyFamily?: WidgetTypographyFamily;
  typographySize?: WidgetTypographySize;
  position?: WidgetPosition;
  displayDelay?: number;
  displayDuration?: number;
  displayInterval?: number;
  maxDisplayCount?: number;
  sessionFrequencyLimit?: number;
  hideOnMobile?: boolean;
  mobilePosition?: WidgetPosition;
  badgeStyle?: "pill" | "card" | "compact" | "minimal" | "glass";
  avatarCount?: number;
  avatarSize?: "sm" | "md" | "lg";
};

export type WidgetRendererProps = {
  type: WidgetDisplayType | "GRID" | "CAROUSEL" | "QUOTE_CARD" | "SINGLE_QUOTE" | "LIST" | "WALL_OF_LOVE" | string;
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

