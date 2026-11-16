import type { Metadata } from "next";
import Link from "next/link";
import { resolveCustomDomainTarget } from "@/lib/domains/service";
import { resolvePublicWall } from "@/lib/walls/service";
import { resolvePublicBrand } from "@/lib/brands/service";
import { WallOfLoveClient } from "@/app/w/[slug]/wall-of-love-client";
import { BrandProfileClient } from "@/app/b/[slug]/brand-profile-client";
import {
  buildWallOfLoveMetadata,
  generateWallOfLoveJsonLd,
  buildBrandPageMetadata,
  generateBrandJsonLd,
} from "@/lib/seo/metadata";

type PageProps = {
  params: Promise<{ domain: string }>;
  searchParams?: Promise<{ preview?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { domain } = await params;
  const target = await resolveCustomDomainTarget(domain);

  if (!target) {
    return {
      title: `${domain} — Domain Not Configured | Praise`,
      description: `The custom domain ${domain} is not yet active or verified.`,
      robots: { index: false, follow: false },
    };
  }

  if (target.targetType === "WALL_OF_LOVE" && target.wallOfLove) {
    const { wallData } = await resolvePublicWall(target.wallOfLove.slug, { preview: true });
    if (!wallData) return { title: target.wallOfLove.name };
    const meta = buildWallOfLoveMetadata(wallData, target.wallOfLove.slug);
    // Canonical points to the custom domain root
    return {
      ...meta,
      alternates: {
        canonical: `https://${domain}/`,
      },
      openGraph: {
        ...meta.openGraph,
        url: `https://${domain}/`,
      },
    };
  }

  if (target.targetType === "BRAND_PAGE" && target.brand) {
    const { brandData } = await resolvePublicBrand(target.brand.slug, { preview: true });
    if (!brandData) return { title: target.brand.name };
    const meta = buildBrandPageMetadata(brandData, target.brand.slug);
    return {
      ...meta,
      alternates: {
        canonical: `https://${domain}/`,
      },
      openGraph: {
        ...meta.openGraph,
        url: `https://${domain}/`,
      },
    };
  }

  return { title: domain };
}

export default async function CustomDomainRouterPage({ params, searchParams }: PageProps) {
  const { domain } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = sParams.preview === "true";

  const target = await resolveCustomDomainTarget(domain);

  if (!target) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-lg w-full rounded-3xl border border-line bg-white p-8 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-bold">
            🌐
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink-900">Custom Domain Inactive</h1>
          <p className="text-sm text-ink-500 leading-relaxed">
            The domain <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs font-mono text-ink-800 font-bold">{domain}</code> is registered with Praise, but is either pending DNS verification or has not been activated yet.
          </p>
          <div className="rounded-2xl border border-line bg-sand-50/50 p-4 text-xs text-ink-600 text-left space-y-2">
            <div className="font-bold text-ink-900">Setup Verification Checklist:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your DNS records for the TXT verification challenge.</li>
              <li>Ensure your CNAME or reverse-proxy points to your Praise instance.</li>
              <li>Open your Praise workspace and click <strong>Verify Domain</strong>.</li>
            </ul>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-ink-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-black transition-colors"
            >
              Go to Praise Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 1. Target: Wall of Love
  if (target.targetType === "WALL_OF_LOVE" && target.wallOfLove) {
    const { wallData } = await resolvePublicWall(target.wallOfLove.slug, { preview: isPreview });
    if (!wallData) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <p className="text-sm text-ink-500">Wall of Love not found or unpublished.</p>
        </div>
      );
    }

    const jsonLd = generateWallOfLoveJsonLd(wallData, wallData.testimonials);
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

  // 2. Target: Brand Page
  if (target.targetType === "BRAND_PAGE" && target.brand) {
    const { brandData } = await resolvePublicBrand(target.brand.slug, { preview: isPreview });
    if (!brandData) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <p className="text-sm text-ink-500">Brand profile not found or unpublished.</p>
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
      canonicalUrl: `https://${domain}/`,
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-sm text-ink-500">Target type not supported.</p>
    </div>
  );
}
