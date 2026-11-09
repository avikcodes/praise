import { formatTestimonialPublic } from "@/lib/api/formatters";
import { authenticateApiKey, hashApiKey } from "@/lib/api/keys";
import { checkApiRateLimit, getClientIp } from "@/lib/api/rate-limit";
import { apiSuccess, apiError, buildPaginationMeta } from "@/lib/api/response";
import { parsePagination, parseSort } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { Prisma, TestimonialStatus, TestimonialType } from "@prisma/client";

/**
 * GET /api/v1/public/testimonials
 * Public, safe read-only endpoint returning approved testimonials.
 * 
 * Guarantees:
 * - Only returns testimonials where status = 'APPROVED'.
 * - Never returns private customer emails, internal notes, or consent tracking IP addresses.
 * - Supports publishable keys (praise_pk_...), secret keys, or workspace/project slugs.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientIp = getClientIp(request);

  // 1. Resolve Authentication or Public Workspace Scope
  const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key") || "";
  let rawKey = "";
  if (authHeader.startsWith("Bearer ")) {
    rawKey = authHeader.slice(7).trim();
  } else if (authHeader.trim().length > 0) {
    rawKey = authHeader.trim();
  }

  // Also accept api_key query param for frontend script tags
  if (!rawKey && url.searchParams.get("api_key")) {
    rawKey = url.searchParams.get("api_key")!.trim();
  }

  const rateLimitId = rawKey ? hashApiKey(rawKey) : clientIp;
  const rateLimit = checkApiRateLimit(rateLimitId, 300); // 300 requests per minute for public endpoints

  if (!rateLimit.allowed) {
    return apiError(
      "rate_limit_exceeded",
      "Public API rate limit exceeded. Please throttle your requests.",
      429,
      undefined,
      rateLimit.headers
    );
  }

  let targetWorkspaceId: string | null = null;

  if (rawKey) {
    const authContext = await authenticateApiKey(rawKey);
    if (!authContext) {
      return apiError("invalid_api_key", "Invalid or expired API key.", 401, undefined, rateLimit.headers);
    }
    targetWorkspaceId = authContext.workspaceId;
  } else {
    // If no API key provided, look up by workspace_slug or project_slug
    const workspaceSlug = url.searchParams.get("workspace_slug") || url.searchParams.get("workspace");
    const projectSlug = url.searchParams.get("project_slug");
    const projectIdParam = url.searchParams.get("project_id");

    if (workspaceSlug) {
      const ws = await prisma.workspace.findUnique({
        where: { slug: workspaceSlug },
        select: { id: true },
      });
      if (ws) targetWorkspaceId = ws.id;
    } else if (projectSlug) {
      const proj = await prisma.project.findFirst({
        where: { slug: projectSlug },
        select: { workspaceId: true },
      });
      if (proj) targetWorkspaceId = proj.workspaceId;
    } else if (projectIdParam) {
      const proj = await prisma.project.findUnique({
        where: { id: projectIdParam },
        select: { workspaceId: true },
      });
      if (proj) targetWorkspaceId = proj.workspaceId;
    }

    if (!targetWorkspaceId) {
      return apiError(
        "unauthorized",
        "Public requests must provide a publishable API key ('praise_pk_...') or a valid 'workspace' or 'project_slug' parameter.",
        401,
        undefined,
        rateLimit.headers
      );
    }
  }

  // 2. Query Parameters & Filters
  const { page, limit, skip } = parsePagination(url);
  const { sortBy, order } = parseSort(url, ["submittedAt", "rating"], "submittedAt");

  const projectId = url.searchParams.get("project_id") || undefined;
  const projectSlug = url.searchParams.get("project_slug") || undefined;
  const rawType = (url.searchParams.get("type") || url.searchParams.get("format") || "").toUpperCase();
  const minRatingStr = url.searchParams.get("min_rating");
  const tagFilter = url.searchParams.get("tag") || undefined;
  const featuredOnly = url.searchParams.get("featured") === "true";

  const type = Object.values(TestimonialType).includes(rawType as TestimonialType)
    ? (rawType as TestimonialType)
    : undefined;

  const minRating = minRatingStr ? parseInt(minRatingStr, 10) : undefined;

  // STRICT PRIVACY CLAUSE: status is ALWAYS hardcoded to APPROVED
  const whereClause: Prisma.TestimonialWhereInput = {
    workspaceId: targetWorkspaceId,
    status: TestimonialStatus.APPROVED,
    ...(projectId ? { projectId } : {}),
    ...(projectSlug ? { project: { slug: projectSlug } } : {}),
    ...(type ? { type } : {}),
    ...(minRating ? { rating: { gte: minRating } } : {}),
    ...(featuredOnly ? { isFeatured: true } : {}),
    ...(tagFilter
      ? {
          tags: {
            some: {
              tag: {
                name: { equals: tagFilter, mode: "insensitive" },
              },
            },
          },
        }
      : {}),
  };

  try {
    const [total, testimonials] = await Promise.all([
      prisma.testimonial.count({ where: whereClause }),
      prisma.testimonial.findMany({
        where: whereClause,
        include: {
          customer: true,
          mediaAssets: true,
          tags: {
            include: { tag: true },
          },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
    ]);

    const sanitizedData = testimonials.map(formatTestimonialPublic);
    const meta = buildPaginationMeta(total, page, limit);

    return apiSuccess(sanitizedData, meta, 200, {
      ...rateLimit.headers,
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    });
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve approved testimonials.", 500, error instanceof Error ? error.message : undefined);
  }
}

