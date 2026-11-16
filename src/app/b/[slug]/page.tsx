import type { Metadata } from "next";
import Link from "next/link";
import { PraiseLogo } from "@/components/brand";
import { BrandProfileClient } from "./brand-profile-client";
import {
  buildBrandPageMetadata,
  generateBrandJsonLd,
  sanitizePublicSlug,
} from "@/lib/seo/metadata";
import { resolvePublicBrand } from "@/lib/brands/service";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { brandData } = await resolvePublicBrand(slug, { preview: true });

  if (!brandData) {
    return buildBrandPageMetadata(null, slug);
  }

  return buildBrandPageMetadata(
    {
      name: brandData.name,
      slug: brandData.slug,
      tagline: brandData.tagline,
      description: brandData.description,
      logoUrl: brandData.logoUrl,
      websiteUrl: brandData.websiteUrl,
      workspace: brandData.workspace,
      canonicalUrl: brandData.canonicalUrl,
      featuredTestimonials: brandData.featuredTestimonials.map((t) => ({
        id: t.id,
        content: t.content,
        rating: t.rating,
        submittedAt: t.submittedAt,
        customer: {
          name: t.customer.name,
          company: t.customer.company,
        },
      })),
    },
    slug
  );
}

export default async function PublicBrandPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = sParams.preview === "true";

  const { brandData, isUnpublished, brandRecord } = await resolvePublicBrand(slug, {
    preview: isPreview,
  });

  // Unpublished state notice
  if (isUnpublished && !isPreview) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full rounded-3xl border border-line bg-white p-8 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-xl">
            🔒
          </div>
          <h1 className="text-xl font-bold text-ink-900">Brand Page Unpublished</h1>
          <p className="text-sm text-ink-500 leading-relaxed">
            The brand profile for{" "}
            <span className="font-semibold text-ink-800">
              {brandRecord?.name || slug}
            </span>{" "}
            is currently set to draft. Only workspace owners can view unpublished profiles via preview mode.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-ink-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-black transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!brandData) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full rounded-3xl border border-line bg-white p-8 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto text-xl">
            🔍
          </div>
          <h1 className="text-xl font-bold text-ink-900">Brand Profile Not Found</h1>
          <p className="text-sm text-ink-500 leading-relaxed">
            No active brand page found matching slug{" "}
            <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs font-mono text-ink-700">
              {sanitizePublicSlug(slug)}
            </code>
            . It may have been unlinked, moved, or deleted.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-ink-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-black transition-colors"
            >
              Return to Praise
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const jsonLd = generateBrandJsonLd({
    name: brandData.name,
    slug: brandData.slug,
    tagline: brandData.tagline,
    description: brandData.description,
    logoUrl: brandData.logoUrl,
    websiteUrl: brandData.websiteUrl,
    workspace: brandData.workspace,
    canonicalUrl: brandData.canonicalUrl,
    featuredTestimonials: brandData.featuredTestimonials.map((t) => ({
      id: t.id,
      content: t.content,
      rating: t.rating,
      submittedAt: t.submittedAt,
      customer: {
        name: t.customer.name,
        company: t.customer.company,
      },
    })),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BrandProfileClient data={brandData} previewMode={isPreview} />
    </>
  );
}
