import type { PublicTestimonialCard } from "./widgets.ts";

export type BrandTheme =
  | "WARM"
  | "LIGHT"
  | "DARK"
  | "MIDNIGHT"
  | "EMERALD"
  | "SUNSET"
  | "MINIMAL";

export interface BrandSocialLinks {
  twitter?: string;
  x?: string;
  linkedin?: string;
  github?: string;
  youtube?: string;
  instagram?: string;
  facebook?: string;
  threads?: string;
  mastodon?: string;
  [key: string]: string | undefined;
}

export interface PublicBrandWallSummary {
  id: string;
  name: string;
  slug: string;
  title: string | null;
  description: string | null;
  theme: string;
  layout: string;
  approvedCount: number;
  publicUrl: string;
}

export interface PublicBrandProfileData {
  brandId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  accentColor: string;
  websiteUrl: string | null;
  tagline: string | null;
  description: string | null;
  theme: BrandTheme;
  isPublished: boolean;
  ctaEnabled: boolean;
  ctaLabel: string | null;
  ctaUrl: string | null;
  ctaSecondaryEnabled: boolean;
  ctaSecondaryLabel: string | null;
  ctaSecondaryUrl: string | null;
  socialLinks: BrandSocialLinks;
  workspace: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
  walls: PublicBrandWallSummary[];
  featuredTestimonials: PublicTestimonialCard[];
  stats: {
    totalWalls: number;
    totalApprovedTestimonials: number;
    averageRating: number;
  };
  canonicalUrl: string;
  customDomain?: {
    domain: string;
    status: string;
  } | null;
}

export interface CreateBrandInput {
  workspaceId: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  accentColor?: string | null;
  websiteUrl?: string | null;
  tagline?: string | null;
  description?: string | null;
  theme?: BrandTheme | string;
  isPublished?: boolean;
  selectedWallIds?: string[] | string | null;
  featuredTestimonialIds?: string[] | string | null;
  ctaEnabled?: boolean;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  ctaSecondaryEnabled?: boolean;
  ctaSecondaryLabel?: string | null;
  ctaSecondaryUrl?: string | null;
  socialLinks?: BrandSocialLinks | string | null;
}

export interface UpdateBrandInput extends Partial<CreateBrandInput> {
  id: string;
  workspaceId: string;
}
