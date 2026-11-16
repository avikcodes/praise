import { prisma } from "../db/client.ts";
import { sanitizePublicSlug } from "../seo/metadata.ts";
import { parseCustomerMeta } from "../customers/utils.ts";
import { SITE_URL } from "../site.ts";
import type {
  PublicBrandProfileData,
  PublicBrandWallSummary,
  BrandSocialLinks,
  BrandTheme,
  CreateBrandInput,
  UpdateBrandInput,
} from "../../types/brands.ts";
import type { PublicTestimonialCard } from "../../types/widgets.ts";

/**
 * Parses a JSON string or array of IDs into a clean string array.
 */
export function parseIdArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((id) => String(id).trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((id) => String(id).trim()).filter(Boolean);
    } catch {
      return raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/**
 * Parses social links JSON safely.
 */
export function parseSocialLinks(raw: unknown): BrandSocialLinks {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as BrandSocialLinks;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Resolves a public Brand Page profile by slug for public consumption.
 * STRICT MODERATION GUARANTEE:
 * - Only testimonials with status="APPROVED" are returned.
 * - Handles canonical URL rewriting when a verified custom domain is assigned.
 */
export async function resolvePublicBrand(
  slug: string,
  options: { preview?: boolean } = {},
  dbClient: any = prisma
): Promise<{
  brandData: PublicBrandProfileData | null;
  isUnpublished?: boolean;
  brandRecord?: any;
}> {
  const cleanSlug = sanitizePublicSlug(slug);

  if (!dbClient.brand) return { brandData: null };

  const brand = await dbClient.brand.findFirst({
    where: { slug: cleanSlug },
    include: {
      workspace: { select: { id: true, name: true, slug: true, logoUrl: true } },
      projects: { select: { id: true, name: true, slug: true } },
      customDomains: {
        where: { status: "ACTIVE" },
        select: { domain: true, status: true, canonicalRedirect: true },
      },
    },
  });

  if (!brand) {
    return { brandData: null };
  }

  // Publication state gating
  if (!brand.isPublished && !options.preview) {
    return {
      brandData: null,
      isUnpublished: true,
      brandRecord: brand,
    };
  }

  const projectIds = (brand.projects || []).map((p: any) => p.id);
  const selectedWallIds = parseIdArray(brand.selectedWallIds);
  const featuredIds = parseIdArray(brand.featuredTestimonialIds);

  // 1. Fetch Selected Walls of Love
  let wallsQuery: any = {
    workspaceId: brand.workspaceId,
    isPublished: true,
  };
  if (selectedWallIds.length > 0) {
    wallsQuery.id = { in: selectedWallIds };
  } else if (projectIds.length > 0) {
    wallsQuery.OR = [
      { projectId: { in: projectIds } },
      { projectId: null },
    ];
  }

  const rawWalls = await dbClient.wallOfLove.findMany({
    where: wallsQuery,
    select: {
      id: true,
      name: true,
      slug: true,
      title: true,
      description: true,
      theme: true,
      layout: true,
      tagFilter: true,
      selectedTestimonialIds: true,
      projectId: true,
    },
    take: 6,
    orderBy: { viewsCount: "desc" },
  });

  const wallSummaries: PublicBrandWallSummary[] = rawWalls.map((w: any) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    title: w.title || w.name,
    description: w.description || null,
    theme: w.theme || "WARM",
    layout: w.layout || "MASONRY",
    approvedCount: 0, // Computed live or aggregate
    publicUrl: `/w/${w.slug}`,
  }));

  // 2. Fetch Featured & Approved Testimonials (Strict moderation: status = APPROVED)
  const testimonialWhere: any = {
    workspaceId: brand.workspaceId,
    status: "APPROVED",
  };

  if (featuredIds.length > 0) {
    testimonialWhere.id = { in: featuredIds };
  } else if (projectIds.length > 0) {
    testimonialWhere.projectId = { in: projectIds };
  }

  const rawTestimonials = await dbClient.testimonial.findMany({
    where: testimonialWhere,
    include: {
      customer: true,
      project: { select: { id: true, name: true, slug: true } },
      tags: { include: { tag: true } },
      mediaAssets: true,
    },
    orderBy: [{ isFeatured: "desc" }, { rating: "desc" }, { submittedAt: "desc" }],
    take: 24,
  });

  const featuredTestimonials: PublicTestimonialCard[] = rawTestimonials.map((t: any) => {
    const meta = parseCustomerMeta(t.customer?.socialHandle);
    const tags: string[] = (t.tags || []).map((item: any) => item.tag?.name).filter(Boolean);

    return {
      id: t.id,
      content: t.content,
      rating: t.rating ?? null,
      type: t.type || "TEXT",
      isFeatured: Boolean(t.isFeatured),
      submittedAt: t.submittedAt
        ? new Date(t.submittedAt).toISOString()
        : new Date(t.createdAt || Date.now()).toISOString(),
      customer: {
        name: t.customer?.name || "Customer",
        company: t.customer?.company || null,
        title: t.customer?.title || null,
        avatarUrl: t.customer?.avatarUrl || null,
        website: meta.website || null,
      },
      project: t.project ? { id: t.project.id, name: t.project.name, slug: t.project.slug } : null,
      tags,
      source: t.sourceType || "Verified Review",
      media: (t.mediaAssets || []).map((m: any) => ({
        id: m.id,
        type: m.type,
        url: m.url,
        mimeType: m.mimeType,
        fileSizeBytes: m.fileSizeBytes,
        durationSeconds: m.durationSeconds,
      })),
    };
  });

  // Calculate statistics
  const totalApproved = featuredTestimonials.length;
  const ratingSum = featuredTestimonials.reduce((sum, t) => sum + (t.rating || 5), 0);
  const averageRating = totalApproved > 0 ? Number((ratingSum / totalApproved).toFixed(1)) : 5.0;

  // Canonical URL calculation:
  // If brand has an active custom domain, canonical URL points to that domain!
  const activeCustomDomain = (brand.customDomains || [])[0];
  const canonicalUrl = activeCustomDomain
    ? `https://${activeCustomDomain.domain}/`
    : `${SITE_URL}/b/${brand.slug}`;

  // Increment view counter if not preview
  if (!options.preview && typeof dbClient.brand.update === "function") {
    dbClient.brand
      .update({
        where: { id: brand.id },
        data: { viewsCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  const brandData: PublicBrandProfileData = {
    brandId: brand.id,
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logoUrl || null,
    accentColor: brand.accentColor || "#7049D8",
    websiteUrl: brand.websiteUrl || null,
    tagline: brand.tagline || null,
    description: brand.description || null,
    theme: (brand.theme || "WARM").toUpperCase() as BrandTheme,
    isPublished: brand.isPublished,
    ctaEnabled: brand.ctaEnabled ?? true,
    ctaLabel: brand.ctaLabel || "Visit Website",
    ctaUrl: brand.ctaUrl || brand.websiteUrl || "#",
    ctaSecondaryEnabled: brand.ctaSecondaryEnabled ?? false,
    ctaSecondaryLabel: brand.ctaSecondaryLabel || "Share Praise",
    ctaSecondaryUrl: brand.ctaSecondaryUrl || `/p/${brand.slug}`,
    socialLinks: parseSocialLinks(brand.socialLinksJson),
    workspace: brand.workspace,
    walls: wallSummaries,
    featuredTestimonials,
    stats: {
      totalWalls: wallSummaries.length,
      totalApprovedTestimonials: totalApproved,
      averageRating,
    },
    canonicalUrl,
    customDomain: activeCustomDomain
      ? { domain: activeCustomDomain.domain, status: activeCustomDomain.status }
      : null,
  };

  return {
    brandData,
    brandRecord: brand,
  };
}

/**
 * Lists all brands for a workspace with computed metrics.
 */
export async function listWorkspaceBrands(
  workspaceId: string,
  options: { search?: string; isPublished?: boolean } = {},
  dbClient: any = prisma
) {
  if (!dbClient.brand) return [];

  const where: any = { workspaceId };
  if (options.isPublished !== undefined) where.isPublished = options.isPublished;

  const brands = await dbClient.brand.findMany({
    where,
    include: {
      projects: { select: { id: true, name: true, slug: true } },
      customDomains: {
        select: { id: true, domain: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const results = [];
  for (const b of brands) {
    const projectIds = (b.projects || []).map((p: any) => p.id);
    let approvedCount = 0;
    try {
      const whereTestimonial: any = {
        workspaceId,
        status: "APPROVED",
      };
      if (projectIds.length > 0) {
        whereTestimonial.projectId = { in: projectIds };
      }
      approvedCount = await dbClient.testimonial.count({ where: whereTestimonial });
    } catch {
      approvedCount = 0;
    }

    const selectedWallIdList = parseIdArray(b.selectedWallIds);
    const featuredIdList = parseIdArray(b.featuredTestimonialIds);

    results.push({
      ...b,
      selectedWallIdList,
      featuredIdList,
      socialLinks: parseSocialLinks(b.socialLinksJson),
      approvedCount,
      projectCount: b.projects?.length || 0,
      activeDomain: b.customDomains?.[0]?.domain || null,
      publicUrl: `/b/${b.slug}`,
    });
  }

  if (options.search?.trim()) {
    const q = options.search.toLowerCase().trim();
    return results.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.tagline && b.tagline.toLowerCase().includes(q))
    );
  }

  return results;
}

/**
 * Creates a new Brand in a workspace.
 */
export async function createWorkspaceBrand(
  input: CreateBrandInput,
  dbClient: any = prisma
) {
  const {
    workspaceId,
    name,
    slug,
    logoUrl,
    accentColor = "#7049D8",
    websiteUrl,
    tagline,
    description,
    theme = "WARM",
    isPublished = true,
    selectedWallIds,
    featuredTestimonialIds,
    ctaEnabled = true,
    ctaLabel = "Visit Website",
    ctaUrl,
    ctaSecondaryEnabled = false,
    ctaSecondaryLabel = "Share Praise",
    ctaSecondaryUrl,
    socialLinks,
  } = input;

  if (!name || !name.trim()) {
    throw new Error("Brand name is required.");
  }

  const cleanSlug = sanitizePublicSlug(slug || name);
  if (!cleanSlug) {
    throw new Error("A valid URL slug is required.");
  }

  // Ensure slug uniqueness within workspace
  const existing = await dbClient.brand.findFirst({
    where: { workspaceId, slug: cleanSlug },
  });

  if (existing) {
    throw new Error(`A Brand with the slug "${cleanSlug}" already exists in this workspace.`);
  }

  const brand = await dbClient.brand.create({
    data: {
      workspaceId,
      name: name.trim(),
      slug: cleanSlug,
      logoUrl: logoUrl || null,
      accentColor: accentColor || "#7049D8",
      websiteUrl: websiteUrl || null,
      tagline: tagline?.trim() || null,
      description: description?.trim() || null,
      theme: (theme || "WARM").toUpperCase(),
      isPublished: Boolean(isPublished),
      selectedWallIds: selectedWallIds ? JSON.stringify(parseIdArray(selectedWallIds)) : null,
      featuredTestimonialIds: featuredTestimonialIds
        ? JSON.stringify(parseIdArray(featuredTestimonialIds))
        : null,
      ctaEnabled: Boolean(ctaEnabled),
      ctaLabel: ctaLabel || "Visit Website",
      ctaUrl: ctaUrl || websiteUrl || null,
      ctaSecondaryEnabled: Boolean(ctaSecondaryEnabled),
      ctaSecondaryLabel: ctaSecondaryLabel || "Share Praise",
      ctaSecondaryUrl: ctaSecondaryUrl || null,
      socialLinksJson: socialLinks ? JSON.stringify(parseSocialLinks(socialLinks)) : null,
    },
    include: {
      projects: { select: { id: true, name: true, slug: true } },
    },
  });

  return {
    ...brand,
    publicUrl: `/b/${brand.slug}`,
  };
}

/**
 * Updates an existing Brand profile.
 */
export async function updateWorkspaceBrand(
  input: UpdateBrandInput,
  dbClient: any = prisma
) {
  const { id, workspaceId, ...updates } = input;

  const existing = await dbClient.brand.findFirst({
    where: { id, workspaceId },
  });

  if (!existing) {
    throw new Error("Brand not found in this workspace.");
  }

  const dataToUpdate: any = {};

  if (updates.name !== undefined) dataToUpdate.name = updates.name.trim();
  if (updates.slug !== undefined) {
    const cleanSlug = sanitizePublicSlug(updates.slug);
    if (cleanSlug !== existing.slug) {
      const collision = await dbClient.brand.findFirst({
        where: { workspaceId, slug: cleanSlug, NOT: { id } },
      });
      if (collision) {
        throw new Error(`Slug "${cleanSlug}" is already taken by another brand.`);
      }
      dataToUpdate.slug = cleanSlug;
    }
  }

  if (updates.logoUrl !== undefined) dataToUpdate.logoUrl = updates.logoUrl;
  if (updates.accentColor !== undefined) dataToUpdate.accentColor = updates.accentColor;
  if (updates.websiteUrl !== undefined) dataToUpdate.websiteUrl = updates.websiteUrl;
  if (updates.tagline !== undefined) dataToUpdate.tagline = updates.tagline;
  if (updates.description !== undefined) dataToUpdate.description = updates.description;
  if (updates.theme !== undefined) dataToUpdate.theme = updates.theme.toUpperCase();
  if (updates.isPublished !== undefined) dataToUpdate.isPublished = Boolean(updates.isPublished);

  if (updates.selectedWallIds !== undefined) {
    dataToUpdate.selectedWallIds = updates.selectedWallIds
      ? JSON.stringify(parseIdArray(updates.selectedWallIds))
      : null;
  }
  if (updates.featuredTestimonialIds !== undefined) {
    dataToUpdate.featuredTestimonialIds = updates.featuredTestimonialIds
      ? JSON.stringify(parseIdArray(updates.featuredTestimonialIds))
      : null;
  }

  if (updates.ctaEnabled !== undefined) dataToUpdate.ctaEnabled = Boolean(updates.ctaEnabled);
  if (updates.ctaLabel !== undefined) dataToUpdate.ctaLabel = updates.ctaLabel;
  if (updates.ctaUrl !== undefined) dataToUpdate.ctaUrl = updates.ctaUrl;
  if (updates.ctaSecondaryEnabled !== undefined) {
    dataToUpdate.ctaSecondaryEnabled = Boolean(updates.ctaSecondaryEnabled);
  }
  if (updates.ctaSecondaryLabel !== undefined) {
    dataToUpdate.ctaSecondaryLabel = updates.ctaSecondaryLabel;
  }
  if (updates.ctaSecondaryUrl !== undefined) {
    dataToUpdate.ctaSecondaryUrl = updates.ctaSecondaryUrl;
  }
  if (updates.socialLinks !== undefined) {
    dataToUpdate.socialLinksJson = updates.socialLinks
      ? JSON.stringify(parseSocialLinks(updates.socialLinks))
      : null;
  }

  const updated = await dbClient.brand.update({
    where: { id },
    data: dataToUpdate,
    include: {
      projects: { select: { id: true, name: true, slug: true } },
      customDomains: { select: { id: true, domain: true, status: true } },
    },
  });

  return {
    ...updated,
    publicUrl: `/b/${updated.slug}`,
  };
}

/**
 * Duplicates a Brand into a new draft.
 */
export async function duplicateWorkspaceBrand(
  workspaceId: string,
  brandId: string,
  dbClient: any = prisma
) {
  const original = await dbClient.brand.findFirst({
    where: { id: brandId, workspaceId },
  });

  if (!original) {
    throw new Error("Brand not found.");
  }

  const randSuffix = Math.random().toString(36).substring(2, 6);
  const newSlug = `${original.slug}-copy-${randSuffix}`;
  const newName = `${original.name} (Copy)`;

  const cloned = await dbClient.brand.create({
    data: {
      workspaceId,
      name: newName,
      slug: newSlug,
      logoUrl: original.logoUrl,
      accentColor: original.accentColor,
      websiteUrl: original.websiteUrl,
      tagline: original.tagline,
      description: original.description,
      theme: original.theme,
      isPublished: false, // Starts as draft
      selectedWallIds: original.selectedWallIds,
      featuredTestimonialIds: original.featuredTestimonialIds,
      ctaEnabled: original.ctaEnabled,
      ctaLabel: original.ctaLabel,
      ctaUrl: original.ctaUrl,
      ctaSecondaryEnabled: original.ctaSecondaryEnabled,
      ctaSecondaryLabel: original.ctaSecondaryLabel,
      ctaSecondaryUrl: original.ctaSecondaryUrl,
      socialLinksJson: original.socialLinksJson,
    },
  });

  return {
    ...cloned,
    publicUrl: `/b/${cloned.slug}`,
  };
}

/**
 * Deletes a Brand.
 */
export async function deleteWorkspaceBrand(
  workspaceId: string,
  brandId: string,
  dbClient: any = prisma
) {
  const brand = await dbClient.brand.findFirst({
    where: { id: brandId, workspaceId },
  });

  if (!brand) {
    throw new Error("Brand not found.");
  }

  await dbClient.brand.delete({
    where: { id: brandId },
  });

  return { success: true, id: brandId, slug: brand.slug };
}
