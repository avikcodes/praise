import type { Metadata } from "next";
import Link from "next/link";
import { PraiseLogo } from "@/components/brand";
import { WallOfLoveClient } from "./wall-of-love-client";
import { PublicWallOfLoveData } from "@/types/widgets";
import {
  buildWallOfLoveMetadata,
  generateWallOfLoveJsonLd,
  sanitizePublicSlug,
} from "@/lib/seo/metadata";
import { resolvePublicWall } from "@/lib/walls/service";

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = sanitizePublicSlug(slug);

  try {
    const { wallData, isUnpublished } = await resolvePublicWall(cleanSlug, { preview: true });

    if (isUnpublished) {
      return {
        title: "Wall of Love Unpublished | Praise",
        robots: { index: false, follow: false },
      };
    }

    if (wallData) {
      return buildWallOfLoveMetadata(
        {
          slug: wallData.slug,
          title: wallData.title || wallData.name,
          description: wallData.description,
          customLogoUrl: wallData.config.customLogoUrl,
          project: wallData.project,
          workspace: wallData.workspace,
        },
        cleanSlug
      );
    }
  } catch (err) {
    console.error("Error generating Wall of Love metadata:", err);
  }

  // Not found / unlinked => noindex
  return buildWallOfLoveMetadata(null, cleanSlug);
}

export default async function PublicWallPage({ params }: PageProps) {
  const { slug } = await params;
  const cleanSlug = sanitizePublicSlug(slug);

  try {
    const { wallData, isUnpublished } = await resolvePublicWall(cleanSlug);

    // Unpublished wall notice
    if (isUnpublished) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full rounded-2xl border border-[#E9E4DB] bg-white p-8 shadow-xs space-y-4">
            <div className="inline-flex items-center justify-center">
              <PraiseLogo size="md" decorative />
            </div>
            <span className="inline-block rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              Draft / Unpublished
            </span>
            <h1 className="text-xl font-bold text-ink-900">
              This Wall of Love is Currently Unpublished
            </h1>
            <p className="text-xs text-ink-600 leading-relaxed">
              The owner of this Praise workspace has marked this wall as draft or private. If you are the owner, you can publish it in your Praise dashboard.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/walls"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600 transition-colors"
              >
                Open Wall Management
              </Link>
            </div>
          </div>
        </div>
      );
    }

    if (wallData) {
      const jsonLd = generateWallOfLoveJsonLd(
        {
          slug: wallData.slug,
          title: wallData.title,
          description: wallData.description,
          totalApproved: wallData.totalApproved,
          project: wallData.project,
          workspace: wallData.workspace,
        },
        wallData.testimonials
      );

      return (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <WallOfLoveClient data={wallData} />
        </>
      );
    }
  } catch (err) {
    console.error("Failed to query public wall:", err);
    if (process.env.NODE_ENV !== "production") {
      return <WallOfLoveClient data={{ ...fallbackDevWall, slug: cleanSlug }} />;
    }
  }

  // In local development, if database is unseeded, render the fallback demo wall
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
