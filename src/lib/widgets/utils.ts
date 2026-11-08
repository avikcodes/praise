import { WallOfLoveConfig } from "@/types/widgets";
import { validateHexColor } from "@/lib/branding/utils";

export function defaultWallOfLoveConfig(
  name = "Wall of Love",
  slug = "wall-of-love"
): WallOfLoveConfig {
  return {
    slug,
    title: name,
    description: "Real customer testimonials and reviews from teams around the world.",
    layout: "masonry",
    theme: "warm",
    accentColor: "#7049D8",
    primaryColor: "#7049D8",
    secondaryColor: "#10B981",
    backgroundColor: null,
    textColor: null,
    cardBorder: "subtle",
    cardRadius: "medium",
    cardSpacing: "normal",
    showPraiseBranding: true,
    ordering: "featured_first",
    showRatings: true,
    showCompany: true,
    showAvatar: true,
    showDate: true,
    showTags: true,
    showSource: true,
    showFeaturedBadge: true,
    minRating: 0,
    ctaEnabled: true,
    ctaLabel: "Share Your Praise",
    ctaUrl: "#",
    ctaSecondaryEnabled: false,
    ctaSecondaryLabel: "Learn More",
    ctaSecondaryUrl: "#",
    customLogoUrl: null,
    allowVideoPlayback: true,
    cardsPerRow: 3,
  };
}

export function parseWidgetConfig(
  configJson?: string | null,
  fallbackName = "Wall of Love"
): WallOfLoveConfig {
  const base = defaultWallOfLoveConfig(fallbackName);
  if (!configJson) return base;

  try {
    const parsed = JSON.parse(configJson);
    const primary = typeof parsed.primaryColor === "string" && parsed.primaryColor.trim()
      ? validateHexColor(parsed.primaryColor)
      : typeof parsed.accentColor === "string" && parsed.accentColor.trim()
      ? validateHexColor(parsed.accentColor)
      : base.accentColor;

    return {
      slug: typeof parsed.slug === "string" && parsed.slug.trim() ? sanitizePublicSlug(parsed.slug) : base.slug,
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : base.title,
      description: typeof parsed.description === "string" ? parsed.description.trim() : base.description,
      layout: ["masonry", "grid", "carousel", "single_quote", "list", "adaptive"].includes(parsed.layout) ? parsed.layout : base.layout,
      widgetType: ["grid", "carousel", "single_quote", "list"].includes(parsed.widgetType) ? parsed.widgetType : undefined,
      theme: ["warm", "light", "dark", "auto", "transparent"].includes(parsed.theme) ? parsed.theme : base.theme,
      accentColor: primary,
      primaryColor: primary,
      secondaryColor: typeof parsed.secondaryColor === "string" && parsed.secondaryColor.trim()
        ? validateHexColor(parsed.secondaryColor, "#10B981")
        : base.secondaryColor,
      backgroundColor: typeof parsed.backgroundColor === "string" && parsed.backgroundColor.trim()
        ? validateHexColor(parsed.backgroundColor)
        : null,
      textColor: typeof parsed.textColor === "string" && parsed.textColor.trim()
        ? validateHexColor(parsed.textColor)
        : null,
      cardBorder: ["subtle", "prominent", "dashed", "none"].includes(parsed.cardBorder)
        ? parsed.cardBorder
        : "subtle",
      cardRadius: ["none", "small", "medium", "large", "full"].includes(parsed.cardRadius)
        ? parsed.cardRadius
        : "medium",
      cardSpacing: ["compact", "normal", "spacious"].includes(parsed.cardSpacing)
        ? parsed.cardSpacing
        : "normal",
      showPraiseBranding: typeof parsed.showPraiseBranding === "boolean"
        ? parsed.showPraiseBranding
        : true,
      ordering: ["featured_first", "highest_rated", "newest", "oldest"].includes(parsed.ordering) ? parsed.ordering : base.ordering,
      showRatings: typeof parsed.showRatings === "boolean" ? parsed.showRatings : base.showRatings,
      showCompany: typeof parsed.showCompany === "boolean" ? parsed.showCompany : base.showCompany,
      showAvatar: typeof parsed.showAvatar === "boolean" ? parsed.showAvatar : base.showAvatar,
      showDate: typeof parsed.showDate === "boolean" ? parsed.showDate : base.showDate,
      showTags: typeof parsed.showTags === "boolean" ? parsed.showTags : base.showTags,
      showSource: typeof parsed.showSource === "boolean" ? parsed.showSource : base.showSource,
      showFeaturedBadge: typeof parsed.showFeaturedBadge === "boolean" ? parsed.showFeaturedBadge : base.showFeaturedBadge,
      minRating: typeof parsed.minRating === "number" ? parsed.minRating : base.minRating,
      ctaEnabled: typeof parsed.ctaEnabled === "boolean" ? parsed.ctaEnabled : base.ctaEnabled,
      ctaLabel: typeof parsed.ctaLabel === "string" && parsed.ctaLabel.trim() ? parsed.ctaLabel.trim() : base.ctaLabel,
      ctaUrl: typeof parsed.ctaUrl === "string" ? parsed.ctaUrl.trim() : base.ctaUrl,
      ctaSecondaryEnabled: typeof parsed.ctaSecondaryEnabled === "boolean" ? parsed.ctaSecondaryEnabled : base.ctaSecondaryEnabled,
      ctaSecondaryLabel: typeof parsed.ctaSecondaryLabel === "string" && parsed.ctaSecondaryLabel.trim() ? parsed.ctaSecondaryLabel.trim() : base.ctaSecondaryLabel,
      ctaSecondaryUrl: typeof parsed.ctaSecondaryUrl === "string" ? parsed.ctaSecondaryUrl.trim() : base.ctaSecondaryUrl,
      customLogoUrl: typeof parsed.customLogoUrl === "string" && parsed.customLogoUrl.trim() ? parsed.customLogoUrl.trim() : null,
      allowVideoPlayback: typeof parsed.allowVideoPlayback === "boolean" ? parsed.allowVideoPlayback : base.allowVideoPlayback,
      cardsPerRow: typeof parsed.cardsPerRow === "number" ? parsed.cardsPerRow : 3,
      autoplay: typeof parsed.autoplay === "boolean" ? parsed.autoplay : false,
      autoplayInterval: typeof parsed.autoplayInterval === "number" ? parsed.autoplayInterval : 5000,
      maxItems: typeof parsed.maxItems === "number" ? parsed.maxItems : undefined,
      selectionMode: ["all", "manual"].includes(parsed.selectionMode) ? parsed.selectionMode : "all",
      selectedTestimonialIds: Array.isArray(parsed.selectedTestimonialIds)
        ? parsed.selectedTestimonialIds.filter((id: unknown) => typeof id === "string")
        : undefined,
      filterTags: Array.isArray(parsed.filterTags)
        ? parsed.filterTags.filter((tag: unknown) => typeof tag === "string")
        : undefined,
      typographyFamily: ["sans", "serif", "mono", "geometric", "humanist"].includes(parsed.typographyFamily) ? parsed.typographyFamily : "sans",
      typographySize: ["compact", "normal", "large"].includes(parsed.typographySize) ? parsed.typographySize : "normal",
    };
  } catch {
    return base;
  }
}

export function serializeWidgetConfig(config: Partial<WallOfLoveConfig>): string {
  return JSON.stringify(config);
}

export function sanitizePublicSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

