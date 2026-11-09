import { requireApiAuth } from "@/lib/api/auth";
import { formatProject } from "@/lib/api/formatters";
import { apiSuccess, apiError, buildPaginationMeta } from "@/lib/api/response";
import { parseJsonBody, parsePagination, parseSort } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";

/**
 * GET /api/v1/projects
 * Lists projects in the workspace with pagination, sorting, and search.
 */
export async function GET(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const url = new URL(request.url);

  const { page, limit, skip } = parsePagination(url);
  const { sortBy, order } = parseSort(url, ["name", "createdAt", "updatedAt"], "createdAt");
  const searchQuery = url.searchParams.get("search") || url.searchParams.get("q") || "";

  const whereClause: Prisma.ProjectWhereInput = {
    workspaceId: auth.workspaceId,
    ...(searchQuery
      ? {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            { slug: { contains: searchQuery, mode: "insensitive" } },
            { description: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const [total, projects] = await Promise.all([
      prisma.project.count({ where: whereClause }),
      prisma.project.findMany({
        where: whereClause,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return apiSuccess(projects.map(formatProject), meta, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve projects.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * POST /api/v1/projects
 * Creates a new project in the workspace.
 */
export async function POST(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const { data: body, error: bodyError } = await parseJsonBody<{
    name?: string;
    slug?: string;
    description?: string;
    color?: string;
    logoUrl?: string;
    brandId?: string;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  if (!body.name || !body.name.trim()) {
    return apiError("validation_error", "Field 'name' is required.", 400, undefined, rateLimitHeaders);
  }

  const name = body.name.trim();
  const slug = (
    body.slug ||
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  ).trim();

  try {
    // Check slug collision within the same workspace
    const existing = await prisma.project.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId: auth.workspaceId,
          slug,
        },
      },
    });

    if (existing) {
      return apiError(
        "slug_conflict",
        `A project with the slug '${slug}' already exists in this workspace.`,
        409,
        undefined,
        rateLimitHeaders
      );
    }

    const created = await prisma.project.create({
      data: {
        workspaceId: auth.workspaceId,
        name,
        slug,
        description: body.description?.trim() || null,
        color: body.color?.trim() || "#7049D8",
        logoUrl: body.logoUrl?.trim() || null,
        brandId: body.brandId?.trim() || null,
      },
    });

    return apiSuccess(formatProject(created), undefined, 201, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to create project.", 500, error instanceof Error ? error.message : undefined);
  }
}

