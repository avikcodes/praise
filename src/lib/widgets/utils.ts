import { WallOfLoveConfig } from "@/types/widgets";

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
    return {
      slug: typeof parsed.slug === "string" && parsed.slug.trim() ? sanitizePublicSlug(parsed.slug) : base.slug,
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : base.title,
      description: typeof parsed.description === "string" ? parsed.description.trim() : base.description,
      layout: ["masonry", "grid", "adaptive"].includes(parsed.layout) ? parsed.layout : base.layout,
      theme: ["warm", "light", "dark", "auto"].includes(parsed.theme) ? parsed.theme : base.theme,
      accentColor: typeof parsed.accentColor === "string" && parsed.accentColor.trim() ? parsed.accentColor.trim() : base.accentColor,
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

