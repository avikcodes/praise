import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Every page is public, so crawlers may index the whole site. The only
 * route kept out of the index is the 404 page, which opts out through
 * its own `robots` metadata.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/w/", "/t/", "/p/"],
      disallow: ["/dashboard/", "/api/", "/embed/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
