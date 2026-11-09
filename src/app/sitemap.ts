import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { prisma } from "@/lib/db/client";
import { parseWidgetConfig } from "@/lib/widgets/utils";
import { sanitizePublicSlug } from "@/lib/seo/metadata";

/**
 * Dynamic sitemap containing all public product, documentation, community,
 * legal routes, plus approved Walls of Love, verified customer testimonials,
 * and published collection forms.
 *
 * Excludes private dashboard routes, unapproved testimonials, and internal APIs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const marketingRoutes: MetadataRoute.Sitemap = [
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
  ].map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "" ? 1 : 0.8,
  }));

  try {
    // 1. Query approved individual testimonials (do NOT index unapproved/draft)
    const approvedTestimonials = await prisma.testimonial.findMany({
      where: { status: "APPROVED" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 1000,
    });

    const testimonialEntries: MetadataRoute.Sitemap = approvedTestimonials.map((t) => ({
      url: `${SITE_URL}/t/${t.id}`,
      lastModified: t.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    // 2. Query indexable Walls of Love (deduplicated by slug)
    const seenWallSlugs = new Set<string>();
    const wallEntries: MetadataRoute.Sitemap = [];

    const widgets = await prisma.widget.findMany({
      where: {
        type: "WALL_OF_LOVE",
      },
      select: {
        name: true,
        configJson: true,
        updatedAt: true,
      },
    });

    for (const widget of widgets) {
      try {
        const config = parseWidgetConfig(widget.configJson, widget.name);
        const cleanSlug = sanitizePublicSlug(config.slug);
        if (cleanSlug && !seenWallSlugs.has(cleanSlug)) {
          seenWallSlugs.add(cleanSlug);
          wallEntries.push({
            url: `${SITE_URL}/w/${cleanSlug}`,
            lastModified: widget.updatedAt,
            changeFrequency: "daily" as const,
            priority: 0.7,
          });
        }
      } catch {
        // skip invalid widget config
      }
    }

    // Include projects that have approved testimonials as fallback Walls of Love
    const projectsWithApproved = await prisma.project.findMany({
      where: {
        testimonials: {
          some: { status: "APPROVED" },
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    for (const proj of projectsWithApproved) {
      const cleanSlug = sanitizePublicSlug(proj.slug);
      if (cleanSlug && !seenWallSlugs.has(cleanSlug)) {
        seenWallSlugs.add(cleanSlug);
        wallEntries.push({
          url: `${SITE_URL}/w/${cleanSlug}`,
          lastModified: proj.updatedAt,
          changeFrequency: "daily" as const,
          priority: 0.7,
        });
      }
    }

    // 3. Query published collection forms
    const publishedForms = await prisma.collectionForm.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });

    const formEntries: MetadataRoute.Sitemap = publishedForms.map((f) => ({
      url: `${SITE_URL}/p/${sanitizePublicSlug(f.slug)}`,
      lastModified: f.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

    return [...marketingRoutes, ...wallEntries, ...testimonialEntries, ...formEntries];
  } catch (err) {
    console.error("Failed to dynamically build sitemap entries:", err);
    return marketingRoutes;
  }
}
