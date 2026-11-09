import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Resolves any relative or local media path to a fully qualified absolute URL for metadata.
 */
export function toAbsoluteUrl(urlOrPath?: string | null): string {
  if (!urlOrPath) {
    return `${SITE_URL}/opengraph-image`;
  }
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    return urlOrPath;
  }
  const cleanPath = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  return `${SITE_URL}${cleanPath}`;
}

/**
 * Truncates text cleanly at word boundaries with an ellipsis.
 */
export function cleanExcerpt(text: string, maxLength = 155): string {
  if (!text) return "";
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const truncated = normalized.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.7) {
    return `${truncated.slice(0, lastSpace)}...`;
  }
  return `${truncated}...`;
}

/**
 * Normalizes and sanitizes a URL slug for public indexable routes.
 */
export function sanitizePublicSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Robots directive configuration.
 * Disallows indexing and snippet caching for private or unapproved records.
 */
export const ROBOTS_DIRECTIVES = {
  indexable: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
    },
  },
  noindex: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export type TestimonialMetadataInput = {
  id: string;
  content: string;
  rating?: number | null;
  submittedAt?: string | Date | null;
  customer: {
    name: string;
    company?: string | null;
    title?: string | null;
    avatarUrl?: string | null;
  };
  project?: {
    name: string;
    slug?: string;
    logoUrl?: string | null;
  } | null;
  workspace: {
    name: string;
    slug?: string;
    logoUrl?: string | null;
  };
  mediaAssets?: {
    type: string;
    url: string;
  }[];
  isApproved?: boolean;
};

/**
 * Generates SEO metadata for a single public customer testimonial page.
 */
export function buildTestimonialMetadata(
  testimonial: TestimonialMetadataInput | null,
  id: string
): Metadata {
  if (!testimonial || testimonial.isApproved === false) {
    return {
      title: "Testimonial Unavailable — Praise",
      description: "This customer testimonial is private, unapproved, or does not exist.",
      robots: ROBOTS_DIRECTIVES.noindex,
    };
  }

  const { customer, project, workspace, content, mediaAssets } = testimonial;
  const author = customer.name || "Customer";
  const orgName = project?.name || workspace.name;
  const companyAffiliation = customer.company ? ` (${customer.company})` : "";
  const roleAffiliation = customer.title ? ` • ${customer.title}` : "";

  const title = `${author}${companyAffiliation} on ${orgName} — Customer Review | ${SITE_NAME}`;
  const excerpt = cleanExcerpt(content, 155);
  const description = `"${excerpt}" — ${author}${customer.company ? `, ${customer.company}` : ""}${roleAffiliation}. Authentic customer testimonial for ${orgName}.`;

  const canonicalUrl = `${SITE_URL}/t/${id}`;

  // Find relevant preview image: attached media photo > avatar > project logo > workspace logo > default OG
  const primaryMediaImage = mediaAssets?.find((m) => m.type === "IMAGE")?.url;
  const previewImageUrl = toAbsoluteUrl(
    primaryMediaImage || customer.avatarUrl || project?.logoUrl || workspace.logoUrl
  );

  const hasMediaImage = Boolean(primaryMediaImage);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: ROBOTS_DIRECTIVES.indexable,
    openGraph: {
      type: "article",
      locale: "en_US",
      siteName: SITE_NAME,
      url: canonicalUrl,
      title,
      description,
      images: [
        {
          url: previewImageUrl,
          alt: `${author}'s testimonial for ${orgName}`,
        },
      ],
    },
    twitter: {
      card: hasMediaImage ? "summary_large_image" : "summary",
      title,
      description,
      images: [previewImageUrl],
    },
  };
}

export type WallOfLoveMetadataInput = {
  slug: string;
  title?: string | null;
  description?: string | null;
  customLogoUrl?: string | null;
  totalApproved?: number;
  project?: {
    name: string;
    slug?: string;
    logoUrl?: string | null;
  } | null;
  workspace: {
    name: string;
    slug?: string;
    logoUrl?: string | null;
  };
};

/**
 * Generates SEO metadata for a public Wall of Love page.
 */
export function buildWallOfLoveMetadata(
  wall: WallOfLoveMetadataInput | null,
  rawSlug: string
): Metadata {
  const cleanSlug = sanitizePublicSlug(rawSlug);

  if (!wall) {
    return {
      title: "Wall of Love Not Found — Praise",
      description: "The requested Wall of Love does not exist or may have been unlinked.",
      robots: ROBOTS_DIRECTIVES.noindex,
    };
  }

  const { title: customTitle, description: customDescription, project, workspace, customLogoUrl } = wall;
  const orgName = project?.name || workspace.name;
  const displayTitle = customTitle || `${orgName} Wall of Love`;
  const pageTitle = `${displayTitle} — Customer Testimonials & Reviews | ${SITE_NAME}`;

  const description =
    customDescription ||
    `Read authentic reviews, ratings, and customer testimonials for ${orgName}. Discover genuine experiences and feedback from real users.`;

  const canonicalUrl = `${SITE_URL}/w/${cleanSlug}`;

  const previewImageUrl = toAbsoluteUrl(
    customLogoUrl || project?.logoUrl || workspace.logoUrl
  );

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: ROBOTS_DIRECTIVES.indexable,
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      url: canonicalUrl,
      title: pageTitle,
      description,
      images: [
        {
          url: previewImageUrl,
          alt: `${orgName} Wall of Love`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [previewImageUrl],
    },
  };
}

/**
 * Builds Schema.org Review structured data (JSON-LD) for a single testimonial.
 * Strictly adheres to schema standards: never fabricates ratings when not present.
 */
export function generateTestimonialJsonLd(testimonial: TestimonialMetadataInput) {
  const canonicalUrl = `${SITE_URL}/t/${testimonial.id}`;
  const orgName = testimonial.project?.name || testimonial.workspace.name;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Review",
    "@id": `${canonicalUrl}#review`,
    url: canonicalUrl,
    datePublished: testimonial.submittedAt
      ? new Date(testimonial.submittedAt).toISOString()
      : undefined,
    reviewBody: testimonial.content,
    author: {
      "@type": "Person",
      name: testimonial.customer.name || "Anonymous Customer",
      ...(testimonial.customer.title ? { jobTitle: testimonial.customer.title } : {}),
      ...(testimonial.customer.company
        ? {
            worksFor: {
              "@type": "Organization",
              name: testimonial.customer.company,
            },
          }
        : {}),
      ...(testimonial.customer.avatarUrl
        ? { image: toAbsoluteUrl(testimonial.customer.avatarUrl) }
        : {}),
    },
    itemReviewed: {
      "@type": testimonial.project ? "Product" : "Organization",
      name: orgName,
      ...(testimonial.project?.logoUrl
        ? { image: toAbsoluteUrl(testimonial.project.logoUrl) }
        : testimonial.workspace.logoUrl
        ? { image: toAbsoluteUrl(testimonial.workspace.logoUrl) }
        : {}),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  // Only include rating if an actual rating exists (> 0). Never invent fake ratings.
  if (testimonial.rating && testimonial.rating > 0) {
    jsonLd.reviewRating = {
      "@type": "Rating",
      ratingValue: testimonial.rating,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return jsonLd;
}

export type WallTestimonialSummary = {
  id: string;
  content: string;
  rating?: number | null;
  submittedAt?: string;
  customer: {
    name: string;
    company?: string | null;
    title?: string | null;
  };
};

/**
 * Builds Schema.org CollectionPage structured data for a public Wall of Love.
 */
export function generateWallOfLoveJsonLd(
  wall: WallOfLoveMetadataInput,
  testimonials: WallTestimonialSummary[]
) {
  const cleanSlug = sanitizePublicSlug(wall.slug);
  const canonicalUrl = `${SITE_URL}/w/${cleanSlug}`;
  const orgName = wall.project?.name || wall.workspace.name;
  const title = wall.title || `${orgName} Wall of Love`;
  const description =
    wall.description || `Real customer testimonials and reviews for ${orgName}.`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: title,
    description,
    publisher: {
      "@type": "Organization",
      name: orgName,
      ...(wall.workspace.logoUrl ? { logo: toAbsoluteUrl(wall.workspace.logoUrl) } : {}),
    },
    mainEntity: {
      "@type": "ItemList",
      name: `${orgName} Customer Testimonials`,
      numberOfItems: wall.totalApproved || testimonials.length,
      itemListElement: testimonials.slice(0, 50).map((t, idx) => {
        const item: Record<string, unknown> = {
          "@type": "Review",
          url: `${SITE_URL}/t/${t.id}`,
          datePublished: t.submittedAt,
          reviewBody: t.content,
          author: {
            "@type": "Person",
            name: t.customer.name,
            ...(t.customer.company
              ? { worksFor: { "@type": "Organization", name: t.customer.company } }
              : {}),
          },
          itemReviewed: {
            "@type": "Organization",
            name: orgName,
          },
        };

        if (t.rating && t.rating > 0) {
          item.reviewRating = {
            "@type": "Rating",
            ratingValue: t.rating,
            bestRating: 5,
            worstRating: 1,
          };
        }

        return {
          "@type": "ListItem",
          position: idx + 1,
          item,
        };
      }),
    },
  };
}

