/**
 * Site-wide facts for metadata, structured data, `sitemap.xml` and
 * `robots.txt`. Keeping them in one place stops URLs and descriptions
 * drifting apart between those files.
 *
 * `NEXT_PUBLIC_SITE_URL` must be set to the production origin before
 * deploying (see `.env.example`). The localhost fallback only suits local
 * work — canonical URLs, the sitemap and social cards would be wrong if
 * it shipped.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const SITE_NAME = "Praise";

/** Browser tab title and social title. */
export const SITE_TITLE = "Praise — Collect customer love. Keep it yours.";

/** Search result description (~156 characters). */
export const SITE_DESCRIPTION =
  "Praise is a free, open-source, self-hosted platform for collecting text, video and audio testimonials, organizing them, and publishing them on your website.";

/** Longer description for structured data. */
export const SITE_SUMMARY =
  "Praise is a free, open-source, self-hosted testimonial platform. Share a collection link, receive text, video or audio testimonials, review and tag them in one library, and publish them on your website as a grid, carousel, quote cards or a Wall of Love.";

/**
 * Central repository and community URLs.
 * Loaded from environment variables when configured; undefined otherwise.
 * External links are hidden if their real URLs are not supplied.
 */
export const REPOSITORY_URL = process.env.NEXT_PUBLIC_GITHUB_REPO_URL || undefined;
export const ISSUES_URL = REPOSITORY_URL ? `${REPOSITORY_URL}/issues` : undefined;
export const RELEASES_URL = REPOSITORY_URL ? `${REPOSITORY_URL}/releases` : undefined;
export const DISCUSSIONS_URL = REPOSITORY_URL ? `${REPOSITORY_URL}/discussions` : undefined;

/**
 * Configurable contact and legal entity details for policies and support.
 * Configured via environment variables; keeps drafts realistic without inventing facts.
 */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined;
export const PRIVACY_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL || CONTACT_EMAIL || undefined;
export const LEGAL_ENTITY_NAME = process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME || undefined;

/**
 * Per-page metadata: canonical URL plus complete Open Graph and Twitter
 * tags. The root layout's shallow merge means a page that defines
 * `openGraph` or `alternates` replaces the layout's copy outright, so the
 * helper always returns the full objects rather than fragments.
 *
 * `title` is omitted for the home page: `title.template` in the root
 * layout does not apply to a `title` in the same route segment, so the
 * home page keeps `title.default` and passes the full social title
 * through `description`-aligned defaults instead.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  /** Segment title; the root layout's template renders it as "%s | Praise". */
  title?: string;
  description: string;
  /** Path relative to the origin, e.g. "/features". */
  path: string;
}) {
  const socialTitle = title ? `${title} | ${SITE_NAME}` : SITE_TITLE;

  return {
    ...(title ? { title } : {}),
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      url: path,
      title: socialTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
  };
}
