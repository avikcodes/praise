import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { parseCustomerMeta } from "@/lib/customers/utils";
import { parseWidgetConfig } from "@/lib/widgets/utils";
import { PraiseLogo } from "@/components/brand";
import { WallOfLoveClient } from "./wall-of-love-client";
import { PublicTestimonialCard, PublicWallOfLoveData } from "@/types/widgets";
import { Prisma } from "@prisma/client";

type PageProps = {
  params: Promise<{ slug: string }>;
};

// Fallback demo data for testing locally when database is empty
const fallbackDevWall: PublicWallOfLoveData = {
  widgetId: "demo-wall",
  name: "Wall of Love",
  slug: "feedback",
  title: "Loved by teams worldwide",
  description:
    "See how founders, product leaders, and creators collect and share customer love using Praise.",
  config: {
    slug: "feedback",
    title: "Loved by teams worldwide",
    description:
      "See how founders, product leaders, and creators collect and share customer love using Praise.",
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
    ctaSecondaryEnabled: true,
    ctaSecondaryLabel: "Try Praise Free",
    ctaSecondaryUrl: "/",
    customLogoUrl: null,
    allowVideoPlayback: true,
  },
  project: {
    id: "proj-1",
    name: "Praise",
    slug: "praise",
    color: "#7049D8",
  },
  workspace: {
    id: "ws-1",
    name: "Acme",
    slug: "acme",
  },
  totalApproved: 3,
  testimonials: [
    {
      id: "t-1",
      content:
        "Praise completely transformed how we showcase social proof on our landing page. Conversion jumped 24% in our first two weeks after embedding the Wall of Love.",
      rating: 5,
      type: "TEXT",
      isFeatured: true,
      submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      customer: {
        name: "Sarah Chen",
        company: "HyperScale",
        title: "Head of Growth",
        avatarUrl: null,
        website: "https://hyperscale.so",
      },
      tags: ["High NPS", "Conversion"],
      source: "Verified Review",
      media: [],
    },
    {
      id: "t-2",
      content:
        "Self-hosting Praise was a breeze. We connected our custom domain, styled the widget to match our brand, and had our first 50 reviews live the same day.",
      rating: 5,
      type: "TEXT",
      isFeatured: false,
      submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      customer: {
        name: "David Kim",
        company: "VentureOS",
        title: "Founder & CEO",
        avatarUrl: null,
        website: "https://ventureos.dev",
      },
      tags: ["Self-host", "Developer"],
      source: "Verified Review",
      media: [],
    },
    {
      id: "t-3",
      content:
        "The video playback and masonry responsiveness look absolutely gorgeous on mobile. Our clients actually enjoy leaving reviews now.",
      rating: 5,
      type: "TEXT",
      isFeatured: true,
      submittedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      customer: {
        name: "Elena Rostova",
        company: "DesignCraft",
        title: "Creative Director",
        avatarUrl: null,
      },
      tags: ["Design", "Video"],
      source: "Verified Review",
      media: [],
    },
  ],
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug.toLowerCase().trim();

  try {
    const widget = await prisma.widget.findFirst({
      where: {
        OR: [
          { id: cleanSlug },
          { configJson: { contains: `"slug":"${cleanSlug}"` } },
        ],
      },
      select: { name: true, configJson: true },
    });

    if (widget) {
      const config = parseWidgetConfig(widget.configJson, widget.name);
      return {
        title: `${config.title || widget.name} — Praise Wall of Love`,
        description: config.description,
      };
    }
  } catch {
    // ignore
  }

  return {
    title: "Wall of Love — Praise",
    description: "Real customer testimonials and reviews.",
  };
}

export default async function PublicWallPage({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = slug.toLowerCase().trim();

  let wallData: PublicWallOfLoveData | null = null;

  try {
    // 1. Locate Widget by slug in configJson or widget ID
    let widget = await prisma.widget.findFirst({
      where: {
        OR: [
          { id: cleanSlug },
          { configJson: { contains: `"slug":"${cleanSlug}"` } },
        ],
      },
      include: {
        project: {
          select: { id: true, name: true, slug: true, color: true, logoUrl: true },
        },
        workspace: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });

    // 2. Fallback: match by project slug if no dedicated widget slug
    if (!widget) {
      const matchedProject = await prisma.project.findFirst({
        where: { slug: cleanSlug },
        include: {
          workspace: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      });

      if (matchedProject) {
        widget = await prisma.widget.findFirst({
          where: {
            projectId: matchedProject.id,
            workspaceId: matchedProject.workspaceId,
          },
          include: {
            project: {
              select: { id: true, name: true, slug: true, color: true, logoUrl: true },
            },
            workspace: {
              select: { id: true, name: true, slug: true, logoUrl: true },
            },
          },
        });

        // Virtual widget if not explicitly saved yet
        if (!widget) {
          widget = {
            id: `proj-${matchedProject.id}`,
            workspaceId: matchedProject.workspaceId,
            projectId: matchedProject.id,
            name: `${matchedProject.name} Wall of Love`,
            type: "WALL_OF_LOVE",
            theme: "WARM",
            configJson: JSON.stringify({
              slug: cleanSlug,
              title: `${matchedProject.name} Wall of Love`,
              description: `Real customer testimonials and feedback for ${matchedProject.name}.`,
              ctaEnabled: true,
              ctaLabel: `Share Praise for ${matchedProject.name}`,
              ctaUrl: `/p/${matchedProject.slug}`,
            }),
            createdAt: new Date(),
            updatedAt: new Date(),
            project: matchedProject,
            workspace: matchedProject.workspace,
          } as unknown as typeof widget;
        }
      }
    }

    if (widget) {
      const config = parseWidgetConfig(widget.configJson, widget.name);

      // Query ONLY APPROVED testimonials for public display
      const whereCondition: Prisma.TestimonialWhereInput = {
        workspaceId: widget.workspaceId,
        status: "APPROVED",
      };

      if (widget.projectId) {
        whereCondition.projectId = widget.projectId;
      }

      if (config.minRating > 0) {
        whereCondition.rating = { gte: config.minRating };
      }

      let orderBy: Prisma.TestimonialOrderByWithRelationInput[] = [
        { submittedAt: "desc" },
      ];

      if (config.ordering === "featured_first") {
        orderBy = [{ isFeatured: "desc" }, { submittedAt: "desc" }];
      } else if (config.ordering === "highest_rated") {
        orderBy = [{ rating: "desc" }, { submittedAt: "desc" }];
      } else if (config.ordering === "oldest") {
        orderBy = [{ submittedAt: "asc" }];
      }

      const testimonials = await prisma.testimonial.findMany({
        where: whereCondition,
        include: {
          customer: true,
          project: {
            select: { id: true, name: true, slug: true },
          },
          tags: {
            include: { tag: true },
          },
          mediaAssets: true,
        },
        orderBy,
      });

      const sanitizedCards: PublicTestimonialCard[] = testimonials.map((t) => {
        let customerMetaWebsite: string | null = null;
        if (t.customer?.socialHandle) {
          const meta = parseCustomerMeta(t.customer.socialHandle);
          customerMetaWebsite = meta.website;
        }

        return {
          id: t.id,
          content: t.content,
          rating: t.rating,
          type: t.type,
          isFeatured: t.isFeatured,
          submittedAt: t.submittedAt.toISOString(),
          customer: {
            name: t.customer?.name || "Anonymous",
            company: config.showCompany ? t.customer?.company || null : null,
            title: config.showCompany ? t.customer?.title || null : null,
            avatarUrl: config.showAvatar ? t.customer?.avatarUrl || null : null,
            website: customerMetaWebsite,
          },
          project: t.project,
          tags: config.showTags ? t.tags.map((tagRel) => tagRel.tag.name) : [],
          source: config.showSource ? "Verified Review" : null,
          media: t.mediaAssets.map((m) => ({
            id: m.id,
            type: m.type,
            url: m.url,
            mimeType: m.mimeType,
            fileSizeBytes: m.fileSizeBytes,
            durationSeconds: m.durationSeconds,
          })),
        };
      });

      wallData = {
        widgetId: widget.id,
        name: widget.name,
        slug: config.slug,
        title: config.title,
        description: config.description,
        config,
        project: widget.project,
        workspace: widget.workspace,
        totalApproved: sanitizedCards.length,
        testimonials: sanitizedCards,
      };
    }
  } catch (err) {
    console.error("Failed to query public wall:", err);
    if (process.env.NODE_ENV !== "production") {
      return <WallOfLoveClient data={{ ...fallbackDevWall, slug: cleanSlug }} />;
    }
  }

  // In local development, if database is empty or unseeded, render the fallback demo wall
  if (!wallData) {
    if (process.env.NODE_ENV !== "production") {
      return <WallOfLoveClient data={{ ...fallbackDevWall, slug: cleanSlug }} />;
    }

    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full rounded-2xl border border-[#E9E4DB] bg-white p-8 shadow-xs space-y-4">
          <div className="inline-flex items-center justify-center">
            <PraiseLogo size="md" decorative />
          </div>
          <h1 className="text-xl font-bold text-ink-900">
            Wall of Love Not Found
          </h1>
          <p className="text-xs text-ink-600 leading-relaxed">
            The public Wall of Love page you requested does not exist or may have been unlinked.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-warm-100 px-3.5 py-2 text-xs font-semibold text-ink-800 hover:bg-warm-200 transition-colors"
            >
              &larr; Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <WallOfLoveClient data={wallData} />;
}

