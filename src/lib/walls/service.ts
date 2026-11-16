import { prisma } from "../db/client.ts";
import { sanitizePublicSlug } from "../seo/metadata.ts";
import { parseWidgetConfig } from "../widgets/utils.ts";
import { parseCustomerMeta } from "../customers/utils.ts";
import { SITE_URL } from "../site.ts";
import type {
  PublicWallOfLoveData,
  PublicTestimonialCard,
  WallOfLoveConfig,
} from "../../types/widgets.ts";

export type WallTheme =
  | "WARM"
  | "LIGHT"
  | "DARK"
  | "MIDNIGHT"
  | "EMERALD"
  | "SUNSET"
  | "MINIMAL";

export type WallLayout = "MASONRY" | "GRID" | "CAROUSEL" | "LIST";

export type WallOrdering =
  | "FEATURED_FIRST"
  | "NEWEST"
  | "HIGHEST_RATED"
  | "OLDEST"
  | "RANDOM";

export interface CreateWallInput {
  workspaceId: string;
  projectId?: string | null;
  name: string;
  slug: string;
  title?: string | null;
  description?: string | null;
  theme?: WallTheme | string;
  layout?: WallLayout | string;
  ordering?: WallOrdering | string;
  isPublished?: boolean;
  tagFilter?: string[] | string | null;
  selectedTestimonialIds?: string[] | string | null;
  minRating?: number;
  primaryColor?: string | null;
  customLogoUrl?: string | null;
  ctaEnabled?: boolean;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  ctaSecondaryEnabled?: boolean;
  ctaSecondaryLabel?: string | null;
  ctaSecondaryUrl?: string | null;
  showRatings?: boolean;
  showCompany?: boolean;
  showAvatar?: boolean;
  showDate?: boolean;
  showTags?: boolean;
  showSource?: boolean;
  showFeaturedBadge?: boolean;
  allowVideoPlayback?: boolean;
  showStats?: boolean;
}

export interface UpdateWallInput extends Partial<CreateWallInput> {
  id: string;
  workspaceId: string;
}

/**
 * Normalizes an array of tags or JSON string into clean string array.
 */
export function parseTagsList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim()).filter(Boolean);
    } catch {
      return raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/**
 * Normalizes an array of testimonial IDs or JSON string into clean string array.
 */
export function parseIdList(raw: unknown): string[] {
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
 * Resolves a Wall of Love by public slug.
 *
 * PRESERVATION GUARANTEE:
 * 1. Checks first-class `WallOfLove` by slug.
 * 2. If not found, falls back to Version 1 `Widget` (by ID or configJson slug).
 * 3. If not found, falls back to Version 1 `Project` by slug.
 * 4. STRICT RULE: Only testimonials approved for public display (`status: "APPROVED"`) are included.
 */
export async function resolvePublicWall(
  slug: string,
  options: { preview?: boolean } = {},
  dbClient: any = prisma
): Promise<{
  wallData: PublicWallOfLoveData | null;
  source: "WALL_OF_LOVE" | "V1_WIDGET" | "V1_PROJECT" | null;
  isUnpublished?: boolean;
  wallRecord?: any;
}> {
  const cleanSlug = sanitizePublicSlug(slug);

  // ---------------------------------------------------------------------------
  // 1. Check first-class WallOfLove model
  // ---------------------------------------------------------------------------
  if (dbClient.wallOfLove) {
    const wall = await dbClient.wallOfLove.findFirst({
      where: { slug: cleanSlug },
      include: {
        project: {
          select: { id: true, name: true, slug: true, color: true, logoUrl: true },
        },
        workspace: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        customDomains: {
          where: { status: "ACTIVE" },
          select: { domain: true, status: true, canonicalRedirect: true },
        },
      },
    });

    if (wall) {
      // Check publication state
      if (!wall.isPublished && !options.preview) {
        return {
          wallData: null,
          source: "WALL_OF_LOVE",
          isUnpublished: true,
          wallRecord: wall,
        };
      }

      // Query ONLY APPROVED testimonials for public display
      const whereCondition: any = {
        workspaceId: wall.workspaceId,
        status: "APPROVED", // Strict moderation guarantee
      };

      if (wall.projectId) {
        whereCondition.projectId = wall.projectId;
      }

      if (wall.minRating && wall.minRating > 0) {
        whereCondition.rating = { gte: wall.minRating };
      }

      const selectedIds = parseIdList(wall.selectedTestimonialIds);
      if (selectedIds.length > 0) {
        whereCondition.id = { in: selectedIds };
      }

      let orderBy: any[] = [{ submittedAt: "desc" }];
      const ordering = (wall.ordering || "FEATURED_FIRST").toUpperCase();
      if (ordering === "FEATURED_FIRST") {
        orderBy = [{ isFeatured: "desc" }, { submittedAt: "desc" }];
      } else if (ordering === "HIGHEST_RATED") {
        orderBy = [{ rating: "desc" }, { submittedAt: "desc" }];
      } else if (ordering === "OLDEST") {
        orderBy = [{ submittedAt: "asc" }];
      }

      const rawTestimonials = await dbClient.testimonial.findMany({
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

      // Filter by tags if configured
      const tagFilters = parseTagsList(wall.tagFilter);
      let filtered = rawTestimonials;
      if (tagFilters.length > 0) {
        filtered = rawTestimonials.filter((t: any) => {
          const tTags: string[] = [];
          if (Array.isArray(t.tags)) {
            for (const item of t.tags) {
              if (item.tag?.name) tTags.push(item.tag.name);
            }
          }
          return tagFilters.some((tf) =>
            tTags.some((tName) => tName.toLowerCase() === tf.toLowerCase())
          );
        });
      }

      // Random ordering if requested
      if (ordering === "RANDOM") {
        filtered = [...filtered].sort(() => Math.random() - 0.5);
      }

      const publicTestimonials: PublicTestimonialCard[] = filtered.map((t: any) => {
        const meta = parseCustomerMeta(t.customer?.socialHandle);
        const tags: string[] = [];
        if (Array.isArray(t.tags)) {
          for (const item of t.tags) {
            if (item.tag?.name) tags.push(item.tag.name);
          }
        }

        return {
          id: t.id,
          content: t.content,
          rating: t.rating ?? null,
          type: t.type || "TEXT",
          isFeatured: Boolean(t.isFeatured),
          submittedAt: t.submittedAt
            ? new Date(t.submittedAt).toISOString()
            : new Date(t.createdAt).toISOString(),
          customer: {
            name: t.customer?.name || "Customer",
            company: t.customer?.company || null,
            title: t.customer?.title || null,
            avatarUrl: t.customer?.avatarUrl || null,
            website: meta.website || null,
          },
          project: t.project
            ? { id: t.project.id, name: t.project.name, slug: t.project.slug }
            : null,
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

      const wallConfig: WallOfLoveConfig = {
        slug: wall.slug,
        title: wall.title || wall.name,
        description: wall.description || "",
        layout: (wall.layout?.toLowerCase() as any) || "masonry",
        theme: (wall.theme?.toLowerCase() as any) || "warm",
        accentColor: wall.primaryColor || "#7049D8",
        primaryColor: wall.primaryColor || "#7049D8",
        ordering: (wall.ordering?.toLowerCase() as any) || "featured_first",
        showRatings: wall.showRatings ?? true,
        showCompany: wall.showCompany ?? true,
        showAvatar: wall.showAvatar ?? true,
        showDate: wall.showDate ?? true,
        showTags: wall.showTags ?? true,
        showSource: wall.showSource ?? true,
        showFeaturedBadge: wall.showFeaturedBadge ?? true,
        minRating: wall.minRating ?? 0,
        ctaEnabled: wall.ctaEnabled ?? true,
        ctaLabel: wall.ctaLabel || "Share Your Praise",
        ctaUrl: wall.ctaUrl || `/p/${wall.project?.slug || cleanSlug}`,
        ctaSecondaryEnabled: wall.ctaSecondaryEnabled ?? false,
        ctaSecondaryLabel: wall.ctaSecondaryLabel || "Try Praise Free",
        ctaSecondaryUrl: wall.ctaSecondaryUrl || "/",
        customLogoUrl: wall.customLogoUrl || null,
        allowVideoPlayback: wall.allowVideoPlayback ?? true,
      };

      // Asynchronously bump view count if not in preview mode
      if (!options.preview && typeof dbClient.wallOfLove.update === "function") {
        dbClient.wallOfLove
          .update({
            where: { id: wall.id },
            data: { viewsCount: { increment: 1 } },
          })
          .catch(() => {});
      }

      const activeCustomDomain = (wall.customDomains || [])[0];
      const canonicalUrl = activeCustomDomain
        ? `https://${activeCustomDomain.domain}/`
        : `${SITE_URL}/w/${wall.slug}`;

      return {
        wallData: {
          widgetId: wall.id,
          name: wall.name,
          slug: wall.slug,
          title: wall.title || wall.name,
          description: wall.description || "",
          config: wallConfig,
          project: wall.project || null,
          workspace: wall.workspace,
          totalApproved: publicTestimonials.length,
          testimonials: publicTestimonials,
          isPublished: wall.isPublished,
          canonicalUrl,
          customDomain: activeCustomDomain
            ? { domain: activeCustomDomain.domain, status: activeCustomDomain.status }
            : null,
        },
        source: "WALL_OF_LOVE",
        wallRecord: wall,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 2. V1 Fallback: Locate Widget by slug in configJson or widget ID
  // ---------------------------------------------------------------------------
  let widget = await dbClient.widget.findFirst({
    where: {
      OR: [{ id: cleanSlug }, { configJson: { contains: `"slug":"${cleanSlug}"` } }],
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

  let fallbackSource: "V1_WIDGET" | "V1_PROJECT" = "V1_WIDGET";

  // ---------------------------------------------------------------------------
  // 3. V1 Fallback: Match by project slug
  // ---------------------------------------------------------------------------
  if (!widget) {
    const matchedProject = await dbClient.project.findFirst({
      where: { slug: cleanSlug },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });

    if (matchedProject) {
      fallbackSource = "V1_PROJECT";
      widget = await dbClient.widget.findFirst({
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

      // Virtual widget fallback
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
          project: matchedProject,
          workspace: matchedProject.workspace,
        };
      }
    }
  }

  if (widget) {
    const config = parseWidgetConfig(widget.configJson, widget.name);
    const whereCondition: any = {
      workspaceId: widget.workspaceId,
      status: "APPROVED",
    };

    if (widget.projectId) {
      whereCondition.projectId = widget.projectId;
    }

    if (config.minRating > 0) {
      whereCondition.rating = { gte: config.minRating };
    }

    let orderBy: any[] = [{ submittedAt: "desc" }];
    if (config.ordering === "featured_first") {
      orderBy = [{ isFeatured: "desc" }, { submittedAt: "desc" }];
    } else if (config.ordering === "highest_rated") {
      orderBy = [{ rating: "desc" }, { submittedAt: "desc" }];
    } else if (config.ordering === "oldest") {
      orderBy = [{ submittedAt: "asc" }];
    }

    const testimonials = await dbClient.testimonial.findMany({
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

    const publicTestimonials: PublicTestimonialCard[] = testimonials.map((t: any) => {
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
          : new Date(t.createdAt).toISOString(),
        customer: {
          name: t.customer?.name || "Customer",
          company: t.customer?.company || null,
          title: t.customer?.title || null,
          avatarUrl: t.customer?.avatarUrl || null,
          website: meta.website || null,
        },
        project: t.project
          ? { id: t.project.id, name: t.project.name, slug: t.project.slug }
          : null,
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

    return {
      wallData: {
        widgetId: widget.id,
        name: widget.name,
        slug: config.slug || cleanSlug,
        title: config.title || widget.name,
        description: config.description,
        config,
        project: widget.project || null,
        workspace: widget.workspace,
        totalApproved: publicTestimonials.length,
        testimonials: publicTestimonials,
        isPublished: true,
      },
      source: fallbackSource,
    };
  }

  return { wallData: null, source: null };
}

/**
 * Lists all Walls of Love in a workspace with computed metrics.
 */
export async function listWorkspaceWalls(
  workspaceId: string,
  options: {
    projectId?: string;
    isPublished?: boolean;
    search?: string;
  } = {},
  dbClient: any = prisma
) {
  if (!dbClient.wallOfLove) return [];

  const where: any = { workspaceId };
  if (options.projectId) where.projectId = options.projectId;
  if (options.isPublished !== undefined) where.isPublished = options.isPublished;

  const walls = await dbClient.wallOfLove.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, slug: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate live count of approved testimonials matching each wall's criteria
  const results = [];
  for (const wall of walls) {
    let approvedCount = 0;
    try {
      const whereCondition: any = {
        workspaceId,
        status: "APPROVED",
      };
      if (wall.projectId) whereCondition.projectId = wall.projectId;
      if (wall.minRating > 0) whereCondition.rating = { gte: wall.minRating };

      const selectedIds = parseIdList(wall.selectedTestimonialIds);
      if (selectedIds.length > 0) {
        whereCondition.id = { in: selectedIds };
      }

      const matching = await dbClient.testimonial.findMany({
        where: whereCondition,
        select: {
          id: true,
          tags: { select: { tag: { select: { name: true } } } },
        },
      });

      const tagFilters = parseTagsList(wall.tagFilter);
      if (tagFilters.length > 0) {
        approvedCount = matching.filter((t: any) => {
          const tTags: string[] = [];
          if (Array.isArray(t.tags)) {
            for (const item of t.tags) if (item.tag?.name) tTags.push(item.tag.name);
          }
          return tagFilters.some((tf) =>
            tTags.some((tName) => tName.toLowerCase() === tf.toLowerCase())
          );
        }).length;
      } else {
        approvedCount = matching.length;
      }
    } catch {
      approvedCount = 0;
    }

    results.push({
      ...wall,
      tagFilterList: parseTagsList(wall.tagFilter),
      selectedTestimonialIdList: parseIdList(wall.selectedTestimonialIds),
      approvedCount,
      publicUrl: `/w/${wall.slug}`,
    });
  }

  if (options.search?.trim()) {
    const q = options.search.toLowerCase().trim();
    return results.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.slug.toLowerCase().includes(q) ||
        (w.title && w.title.toLowerCase().includes(q))
    );
  }

  return results;
}

/**
 * Creates a new Wall of Love in a workspace.
 */
export async function createWorkspaceWall(
  input: CreateWallInput,
  dbClient: any = prisma
) {
  const {
    workspaceId,
    projectId,
    name,
    slug,
    title,
    description,
    theme = "WARM",
    layout = "MASONRY",
    ordering = "FEATURED_FIRST",
    isPublished = true,
    tagFilter,
    selectedTestimonialIds,
    minRating = 0,
    primaryColor = "#7049D8",
    customLogoUrl,
    ctaEnabled = true,
    ctaLabel = "Share Your Praise",
    ctaUrl,
    ctaSecondaryEnabled = false,
    ctaSecondaryLabel,
    ctaSecondaryUrl,
    showRatings = true,
    showCompany = true,
    showAvatar = true,
    showDate = true,
    showTags = true,
    showSource = true,
    showFeaturedBadge = true,
    allowVideoPlayback = true,
    showStats = true,
  } = input;

  if (!name || !name.trim()) {
    throw new Error("Wall name is required.");
  }

  const cleanSlug = sanitizePublicSlug(slug || name);
  if (!cleanSlug) {
    throw new Error("A valid URL slug is required.");
  }

  // Ensure slug uniqueness within workspace
  const existing = await dbClient.wallOfLove.findFirst({
    where: { workspaceId, slug: cleanSlug },
  });

  if (existing) {
    throw new Error(`A Wall of Love with the slug "${cleanSlug}" already exists in this workspace.`);
  }

  const tagsJson = tagFilter ? JSON.stringify(parseTagsList(tagFilter)) : null;
  const idsJson = selectedTestimonialIds
    ? JSON.stringify(parseIdList(selectedTestimonialIds))
    : null;

  const wall = await dbClient.wallOfLove.create({
    data: {
      workspaceId,
      projectId: projectId || null,
      name: name.trim(),
      slug: cleanSlug,
      title: title?.trim() || name.trim(),
      description: description?.trim() || null,
      theme: (theme || "WARM").toUpperCase(),
      layout: (layout || "MASONRY").toUpperCase(),
      ordering: (ordering || "FEATURED_FIRST").toUpperCase(),
      isPublished: Boolean(isPublished),
      tagFilter: tagsJson,
      selectedTestimonialIds: idsJson,
      minRating: Number(minRating) || 0,
      primaryColor: primaryColor || "#7049D8",
      customLogoUrl: customLogoUrl || null,
      ctaEnabled: Boolean(ctaEnabled),
      ctaLabel: ctaLabel || "Share Your Praise",
      ctaUrl: ctaUrl || null,
      ctaSecondaryEnabled: Boolean(ctaSecondaryEnabled),
      ctaSecondaryLabel: ctaSecondaryLabel || null,
      ctaSecondaryUrl: ctaSecondaryUrl || null,
      showRatings: Boolean(showRatings),
      showCompany: Boolean(showCompany),
      showAvatar: Boolean(showAvatar),
      showDate: Boolean(showDate),
      showTags: Boolean(showTags),
      showSource: Boolean(showSource),
      showFeaturedBadge: Boolean(showFeaturedBadge),
      allowVideoPlayback: Boolean(allowVideoPlayback),
      showStats: Boolean(showStats),
    },
    include: {
      project: { select: { id: true, name: true, slug: true, color: true } },
    },
  });

  return {
    ...wall,
    publicUrl: `/w/${wall.slug}`,
  };
}

/**
 * Updates an existing Wall of Love.
 */
export async function updateWorkspaceWall(
  input: UpdateWallInput,
  dbClient: any = prisma
) {
  const { id, workspaceId, ...updates } = input;

  const existing = await dbClient.wallOfLove.findFirst({
    where: { id, workspaceId },
  });

  if (!existing) {
    throw new Error("Wall of Love not found.");
  }

  const dataToUpdate: any = {};

  if (updates.name !== undefined) dataToUpdate.name = updates.name.trim();
  if (updates.slug !== undefined) {
    const cleanSlug = sanitizePublicSlug(updates.slug);
    if (cleanSlug !== existing.slug) {
      // Check collision
      const collision = await dbClient.wallOfLove.findFirst({
        where: { workspaceId, slug: cleanSlug, NOT: { id } },
      });
      if (collision) {
        throw new Error(`Slug "${cleanSlug}" is already taken by another Wall.`);
      }
      dataToUpdate.slug = cleanSlug;
    }
  }

  if (updates.title !== undefined) dataToUpdate.title = updates.title;
  if (updates.description !== undefined) dataToUpdate.description = updates.description;
  if (updates.projectId !== undefined) dataToUpdate.projectId = updates.projectId || null;
  if (updates.theme !== undefined) dataToUpdate.theme = updates.theme.toUpperCase();
  if (updates.layout !== undefined) dataToUpdate.layout = updates.layout.toUpperCase();
  if (updates.ordering !== undefined) dataToUpdate.ordering = updates.ordering.toUpperCase();
  if (updates.isPublished !== undefined) dataToUpdate.isPublished = Boolean(updates.isPublished);
  if (updates.tagFilter !== undefined) {
    dataToUpdate.tagFilter = updates.tagFilter
      ? JSON.stringify(parseTagsList(updates.tagFilter))
      : null;
  }
  if (updates.selectedTestimonialIds !== undefined) {
    dataToUpdate.selectedTestimonialIds = updates.selectedTestimonialIds
      ? JSON.stringify(parseIdList(updates.selectedTestimonialIds))
      : null;
  }
  if (updates.minRating !== undefined) dataToUpdate.minRating = Number(updates.minRating) || 0;
  if (updates.primaryColor !== undefined) dataToUpdate.primaryColor = updates.primaryColor;
  if (updates.customLogoUrl !== undefined) dataToUpdate.customLogoUrl = updates.customLogoUrl;
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
  if (updates.showRatings !== undefined) dataToUpdate.showRatings = Boolean(updates.showRatings);
  if (updates.showCompany !== undefined) dataToUpdate.showCompany = Boolean(updates.showCompany);
  if (updates.showAvatar !== undefined) dataToUpdate.showAvatar = Boolean(updates.showAvatar);
  if (updates.showDate !== undefined) dataToUpdate.showDate = Boolean(updates.showDate);
  if (updates.showTags !== undefined) dataToUpdate.showTags = Boolean(updates.showTags);
  if (updates.showSource !== undefined) dataToUpdate.showSource = Boolean(updates.showSource);
  if (updates.showFeaturedBadge !== undefined) {
    dataToUpdate.showFeaturedBadge = Boolean(updates.showFeaturedBadge);
  }
  if (updates.allowVideoPlayback !== undefined) {
    dataToUpdate.allowVideoPlayback = Boolean(updates.allowVideoPlayback);
  }
  if (updates.showStats !== undefined) dataToUpdate.showStats = Boolean(updates.showStats);

  const updated = await dbClient.wallOfLove.update({
    where: { id },
    data: dataToUpdate,
    include: {
      project: { select: { id: true, name: true, slug: true, color: true } },
    },
  });

  return {
    ...updated,
    publicUrl: `/w/${updated.slug}`,
  };
}

/**
 * Duplicates a Wall of Love.
 */
export async function duplicateWorkspaceWall(
  workspaceId: string,
  wallId: string,
  dbClient: any = prisma
) {
  const original = await dbClient.wallOfLove.findFirst({
    where: { id: wallId, workspaceId },
  });

  if (!original) {
    throw new Error("Wall of Love not found.");
  }

  const randSuffix = Math.random().toString(36).substring(2, 6);
  const newSlug = `${original.slug}-copy-${randSuffix}`;
  const newName = `${original.name} (Copy)`;

  const cloned = await dbClient.wallOfLove.create({
    data: {
      workspaceId,
      projectId: original.projectId,
      name: newName,
      slug: newSlug,
      title: original.title,
      description: original.description,
      theme: original.theme,
      layout: original.layout,
      ordering: original.ordering,
      isPublished: false, // Duplicates start as draft
      tagFilter: original.tagFilter,
      selectedTestimonialIds: original.selectedTestimonialIds,
      minRating: original.minRating,
      primaryColor: original.primaryColor,
      customLogoUrl: original.customLogoUrl,
      ctaEnabled: original.ctaEnabled,
      ctaLabel: original.ctaLabel,
      ctaUrl: original.ctaUrl,
      ctaSecondaryEnabled: original.ctaSecondaryEnabled,
      ctaSecondaryLabel: original.ctaSecondaryLabel,
      ctaSecondaryUrl: original.ctaSecondaryUrl,
      showRatings: original.showRatings,
      showCompany: original.showCompany,
      showAvatar: original.showAvatar,
      showDate: original.showDate,
      showTags: original.showTags,
      showSource: original.showSource,
      showFeaturedBadge: original.showFeaturedBadge,
      allowVideoPlayback: original.allowVideoPlayback,
      showStats: original.showStats,
    },
    include: {
      project: { select: { id: true, name: true, slug: true, color: true } },
    },
  });

  return {
    ...cloned,
    publicUrl: `/w/${cloned.slug}`,
  };
}

/**
 * Deletes a Wall of Love.
 */
export async function deleteWorkspaceWall(
  workspaceId: string,
  wallId: string,
  dbClient: any = prisma
) {
  const wall = await dbClient.wallOfLove.findFirst({
    where: { id: wallId, workspaceId },
  });

  if (!wall) {
    throw new Error("Wall of Love not found.");
  }

  await dbClient.wallOfLove.delete({
    where: { id: wallId },
  });

  return { success: true, id: wallId, slug: wall.slug };
}
