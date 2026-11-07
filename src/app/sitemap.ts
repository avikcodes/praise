import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Sitemap containing all public product, documentation, community,
 * and legal routes for Praise.
 *
 * `lastModified` is deliberately omitted: the build forbids
 * non-deterministic time like `new Date()` while prerendering, and there
 * is no content date to derive an honest one from. Adding it later from
 * a real source (a CMS, a git history) is the right fix.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/features",
    "/how-it-works",
    "/open-source",
    "/developers",
    "/ai-integrations",
    "/self-host",
    "/security",
    "/faq",
    "/get-started",
    "/docs",
    "/docs/getting-started",
    "/docs/api-reference",
    "/docs/widgets",
    "/docs/deployment",
    "/community",
    "/community/discussions",
    "/community/contributing",
    "/community/roadmap",
    "/community/changelog",
    "/privacy",
    "/terms",
    "/cookies",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
