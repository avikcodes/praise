import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { parseCustomerMeta } from "@/lib/customers/utils";
import { parseWidgetConfig } from "@/lib/widgets/utils";
import { PraiseLogo } from "@/components/brand";
import { TestimonialClient } from "./testimonial-client";
import { PublicIndividualTestimonial } from "@/types/public-testimonial";
import {
  buildTestimonialMetadata,
  generateTestimonialJsonLd,
} from "@/lib/seo/metadata";
import { canPublishTestimonial } from "@/lib/privacy/consent";

type PageProps = {
  params: Promise<{ id: string }>;
};

// Fallback demo for local development when DB is empty
const fallbackDevTestimonial: PublicIndividualTestimonial = {
  id: "demo-testimonial",
  content:
    "Praise completely transformed how our team highlights customer love. The responsive video player and sleek typography look stunning on mobile and converted more visitors in our first week than the previous quarter.",
  rating: 5,
  type: "TEXT",
  isFeatured: true,
  submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  customer: {
    name: "Alex Rivera",
    company: "Rivera Labs",
    title: "Founder & CTO",
    avatarUrl: null,
    website: "https://riveralabs.dev",
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
  tags: ["High NPS", "Founder", "Conversion"],
  media: [],
  wallUrl: "/w/feedback",
  collectionFormUrl: "/p/feedback",
  isVerified: true,
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const testimonial = await prisma.testimonial.findFirst({
      where: {
        id,
        status: "APPROVED",
      },
      include: {
        customer: { select: { name: true, company: true, title: true, avatarUrl: true } },
        project: { select: { name: true, slug: true, logoUrl: true } },
        workspace: { select: { name: true, slug: true, logoUrl: true } },
        mediaAssets: { select: { type: true, url: true } },
      },
    });

    if (testimonial) {
      return buildTestimonialMetadata(
        {
          id: testimonial.id,
          content: testimonial.content,
          rating: testimonial.rating,
          submittedAt: testimonial.submittedAt,
          customer: {
            name: testimonial.customer?.name || "Customer",
            company: testimonial.customer?.company || null,
            title: testimonial.customer?.title || null,
            avatarUrl: testimonial.customer?.avatarUrl || null,
          },
          project: testimonial.project,
          workspace: testimonial.workspace,
          mediaAssets: testimonial.mediaAssets,
          isApproved: true,
        },
        id
      );
    }
  } catch (err) {
    console.error("Error generating testimonial metadata:", err);
  }

  // Not found or unapproved => strictly noindex, nofollow
  return buildTestimonialMetadata(null, id);
}

export default async function PublicTestimonialPage({ params }: PageProps) {
  const { id } = await params;

  let testimonialData: PublicIndividualTestimonial | null = null;

  try {
    // 1. Strictly query ONLY APPROVED testimonials
    let testimonial = await prisma.testimonial.findFirst({
      where: {
        id,
        status: "APPROVED",
      },
      include: {
        customer: true,
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            logoUrl: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        tags: {
          include: { tag: true },
        },
        mediaAssets: true,
        consentRecords: {
          take: 1,
        },
      },
    });

    if (testimonial) {
      // 1b. Verify privacy and consent permissions before rendering public content
      const permissionCheck = canPublishTestimonial(testimonial);
      if (!permissionCheck.canPublish) {
        testimonial = null as unknown as typeof testimonial;
      }
    }

    if (testimonial) {
      const permissionCheck = canPublishTestimonial(testimonial);

      // 2. Discover related Wall of Love URL and branding configuration
      let wallUrl: string | null = null;
      let showPraiseBranding = true;
      if (testimonial.project) {
        const widget = await prisma.widget.findFirst({
          where: {
            projectId: testimonial.project.id,
            workspaceId: testimonial.workspaceId,
          },
        });
        if (widget) {
          const cfg = parseWidgetConfig(widget.configJson, widget.name);
          wallUrl = `/w/${cfg.slug}`;
          if (cfg.showPraiseBranding === false) {
            showPraiseBranding = false;
          }
        } else {
          wallUrl = `/w/${testimonial.project.slug}`;
        }
      }

      // 3. Discover related Collection Form URL
      let collectionFormUrl: string | null = null;
      if (testimonial.project) {
        const form = await prisma.collectionForm.findFirst({
          where: {
            projectId: testimonial.project.id,
            workspaceId: testimonial.workspaceId,
            isPublished: true,
          },
        });
        if (form) {
          collectionFormUrl = `/p/${form.slug}`;
        }
      }

      // 4. Sanitize customer profile: NEVER leak email or private internal notes
      let website: string | null = null;
      if (testimonial.customer?.socialHandle) {
        const meta = parseCustomerMeta(testimonial.customer.socialHandle);
        website = meta.website;
      }

      testimonialData = {
        id: testimonial.id,
        content: testimonial.content,
        rating: testimonial.rating,
        type: testimonial.type,
        isFeatured: testimonial.isFeatured,
        submittedAt: testimonial.submittedAt.toISOString(),
        customer: {
          name: permissionCheck.allowName ? (testimonial.customer?.name || "Verified Customer") : "Verified Customer",
          company: permissionCheck.allowCompany ? (testimonial.customer?.company || null) : null,
          title: permissionCheck.allowCompany ? (testimonial.customer?.title || null) : null,
          avatarUrl: permissionCheck.allowMedia ? (testimonial.customer?.avatarUrl || null) : null,
          website,
        },
        project: testimonial.project,
        workspace: testimonial.workspace,
        tags: testimonial.tags.map((t) => t.tag.name),
        media: permissionCheck.allowMedia
          ? testimonial.mediaAssets.map((m) => ({
              id: m.id,
              type: m.type,
              url: m.url,
              mimeType: m.mimeType,
              fileSizeBytes: m.fileSizeBytes,
              durationSeconds: m.durationSeconds,
            }))
          : [],
        wallUrl,
        collectionFormUrl,
        isVerified: testimonial.consentRecords.length > 0 && permissionCheck.canPublish,
        showPraiseBranding,
      };
    }
  } catch (err) {
    console.error("Error querying individual testimonial:", err);
    if (process.env.NODE_ENV !== "production") {
      return <TestimonialClient data={{ ...fallbackDevTestimonial, id }} />;
    }
  }

  // In local development when database is empty, return test demo
  if (!testimonialData) {
    if (process.env.NODE_ENV !== "production") {
      return <TestimonialClient data={{ ...fallbackDevTestimonial, id }} />;
    }

    // Production: clean not-found / unavailable page
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full rounded-3xl border border-[#E9E4DB] bg-white p-8 sm:p-10 shadow-xs space-y-4">
          <div className="inline-flex items-center justify-center">
            <PraiseLogo size="md" decorative />
          </div>
          <h1 className="text-xl font-bold text-ink-900">
            Testimonial Unavailable
          </h1>
          <p className="text-xs text-ink-600 leading-relaxed">
            This customer testimonial is private, unapproved, or does not exist. Only verified and approved feedback is publicly viewable.
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

  const jsonLd = generateTestimonialJsonLd({
    id: testimonialData.id,
    content: testimonialData.content,
    rating: testimonialData.rating,
    submittedAt: testimonialData.submittedAt,
    customer: testimonialData.customer,
    project: testimonialData.project,
    workspace: testimonialData.workspace,
    mediaAssets: testimonialData.media,
    isApproved: true,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TestimonialClient data={testimonialData} />
    </>
  );
}

