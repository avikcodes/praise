import { requireApiAuth } from "@/lib/api/auth";
import { formatTestimonialPrivate } from "@/lib/api/formatters";
import { apiSuccess, apiError, buildPaginationMeta } from "@/lib/api/response";
import { parseJsonBody, parsePagination, parseSort } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { Prisma, TestimonialStatus, TestimonialType, WorkspaceRole } from "@prisma/client";

/**
 * GET /api/v1/testimonials
 * Lists testimonials in the workspace with pagination, sorting, and multi-field filters.
 */
export async function GET(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const url = new URL(request.url);

  const { page, limit, skip } = parsePagination(url);
  const { sortBy, order } = parseSort(url, ["submittedAt", "rating", "createdAt", "updatedAt"], "submittedAt");

  // Query filters
  const projectId = url.searchParams.get("project_id") || undefined;
  const rawStatus = (url.searchParams.get("status") || "").toUpperCase();
  const rawType = (url.searchParams.get("type") || url.searchParams.get("format") || "").toUpperCase();
  const minRatingStr = url.searchParams.get("min_rating");
  const tagFilter = url.searchParams.get("tag") || undefined;
  const featuredStr = url.searchParams.get("featured");
  const searchQuery = url.searchParams.get("search") || url.searchParams.get("q") || "";

  const status = Object.values(TestimonialStatus).includes(rawStatus as TestimonialStatus)
    ? (rawStatus as TestimonialStatus)
    : undefined;

  const type = Object.values(TestimonialType).includes(rawType as TestimonialType)
    ? (rawType as TestimonialType)
    : undefined;

  const minRating = minRatingStr ? parseInt(minRatingStr, 10) : undefined;
  const isFeatured = featuredStr === "true" ? true : featuredStr === "false" ? false : undefined;

  const whereClause: Prisma.TestimonialWhereInput = {
    workspaceId: auth.workspaceId,
    ...(projectId ? { projectId } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(minRating ? { rating: { gte: minRating } } : {}),
    ...(isFeatured !== undefined ? { isFeatured } : {}),
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
    ...(searchQuery
      ? {
          OR: [
            { content: { contains: searchQuery, mode: "insensitive" } },
            { customer: { name: { contains: searchQuery, mode: "insensitive" } } },
            { customer: { company: { contains: searchQuery, mode: "insensitive" } } },
          ],
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
          project: true,
          tags: {
            include: { tag: true },
          },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return apiSuccess(testimonials.map(formatTestimonialPrivate), meta, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve testimonials.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * POST /api/v1/testimonials
 * Submits or creates a new testimonial in the workspace.
 */
export async function POST(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const { data: body, error: bodyError } = await parseJsonBody<{
    content?: string;
    rating?: number;
    type?: TestimonialType;
    status?: TestimonialStatus;
    projectId?: string;
    formId?: string;
    isFeatured?: boolean;
    customerId?: string;
    customer?: {
      name: string;
      email: string;
      company?: string;
      title?: string;
      avatarUrl?: string;
      socialHandle?: string;
    };
    tagIds?: string[];
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  if (!body.content || !body.content.trim()) {
    return apiError("validation_error", "Field 'content' is required.", 400, undefined, rateLimitHeaders);
  }

  const rating = body.rating !== undefined ? Math.max(1, Math.min(body.rating, 5)) : 5;
  const type = body.type || TestimonialType.TEXT;

  // Non-admins always default to PENDING status
  let status: TestimonialStatus = TestimonialStatus.PENDING;
  if (
    body.status &&
    (auth.role === WorkspaceRole.OWNER || auth.role === WorkspaceRole.ADMIN)
  ) {
    status = body.status;
  }

  try {
    let resolvedCustomerId = body.customerId || null;

    // Create or link customer profile if inline customer data provided
    if (body.customer && body.customer.name && body.customer.email) {
      const email = body.customer.email.trim().toLowerCase();
      const customer = await prisma.customer.upsert({
        where: {
          workspaceId_email: {
            workspaceId: auth.workspaceId,
            email,
          },
        },
        update: {
          name: body.customer.name.trim(),
          ...(body.customer.company && { company: body.customer.company.trim() }),
          ...(body.customer.title && { title: body.customer.title.trim() }),
          ...(body.customer.avatarUrl && { avatarUrl: body.customer.avatarUrl.trim() }),
          ...(body.customer.socialHandle && { socialHandle: body.customer.socialHandle.trim() }),
        },
        create: {
          workspaceId: auth.workspaceId,
          name: body.customer.name.trim(),
          email,
          company: body.customer.company?.trim() || null,
          title: body.customer.title?.trim() || null,
          avatarUrl: body.customer.avatarUrl?.trim() || null,
          socialHandle: body.customer.socialHandle?.trim() || null,
        },
      });
      resolvedCustomerId = customer.id;
    }

    const created = await prisma.testimonial.create({
      data: {
        workspaceId: auth.workspaceId,
        projectId: body.projectId || null,
        formId: body.formId || null,
        customerId: resolvedCustomerId,
        content: body.content.trim(),
        rating,
        type,
        status,
        isFeatured: body.isFeatured || false,
        ...(body.tagIds && body.tagIds.length > 0
          ? {
              tags: {
                create: body.tagIds.map((tagId) => ({
                  tagId,
                  workspaceId: auth.workspaceId,
                })),
              },
            }
          : {}),
      },
      include: {
        customer: true,
        mediaAssets: true,
        project: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    return apiSuccess(formatTestimonialPrivate(created), undefined, 201, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to create testimonial.", 500, error instanceof Error ? error.message : undefined);
  }
}

