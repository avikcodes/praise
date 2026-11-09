import { requireApiAuth } from "@/lib/api/auth";
import { apiSuccess, apiError, buildPaginationMeta } from "@/lib/api/response";
import { parseJsonBody, parsePagination, parseSort } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/v1/tags
 * Lists tags in the workspace with usage statistics.
 */
export async function GET(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const url = new URL(request.url);

  const { page, limit, skip } = parsePagination(url);
  const { sortBy, order } = parseSort(url, ["name", "createdAt"], "name");

  try {
    const [total, tags] = await Promise.all([
      prisma.tag.count({ where: { workspaceId: auth.workspaceId } }),
      prisma.tag.findMany({
        where: { workspaceId: auth.workspaceId },
        include: {
          _count: {
            select: { testimonials: true },
          },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
    ]);

    const formatted = tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      testimonialsCount: t._count.testimonials,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    const meta = buildPaginationMeta(total, page, limit);
    return apiSuccess(formatted, meta, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve tags.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * POST /api/v1/tags
 * Creates a new tag in the workspace.
 */
export async function POST(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const { data: body, error: bodyError } = await parseJsonBody<{
    name?: string;
    color?: string;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  if (!body.name || !body.name.trim()) {
    return apiError("validation_error", "Field 'name' is required.", 400, undefined, rateLimitHeaders);
  }

  const name = body.name.trim();

  try {
    const existing = await prisma.tag.findUnique({
      where: {
        workspaceId_name: {
          workspaceId: auth.workspaceId,
          name,
        },
      },
    });

    if (existing) {
      return apiError("name_conflict", `A tag with name '${name}' already exists.`, 409, undefined, rateLimitHeaders);
    }

    const created = await prisma.tag.create({
      data: {
        workspaceId: auth.workspaceId,
        name,
        color: body.color?.trim() || "#7049D8",
      },
    });

    return apiSuccess(
      {
        id: created.id,
        name: created.name,
        color: created.color,
        testimonialsCount: 0,
        createdAt: created.createdAt.toISOString(),
      },
      undefined,
      201,
      rateLimitHeaders
    );
  } catch (error) {
    return apiError("internal_error", "Failed to create tag.", 500, error instanceof Error ? error.message : undefined);
  }
}

