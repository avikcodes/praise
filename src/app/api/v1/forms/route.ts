import { requireApiAuth } from "@/lib/api/auth";
import { formatForm } from "@/lib/api/formatters";
import { apiSuccess, apiError, buildPaginationMeta } from "@/lib/api/response";
import { parseJsonBody, parsePagination, parseSort } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";

/**
 * GET /api/v1/forms
 * Lists collection forms in the workspace with pagination and filters.
 */
export async function GET(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const url = new URL(request.url);

  const { page, limit, skip } = parsePagination(url);
  const { sortBy, order } = parseSort(url, ["title", "createdAt", "updatedAt"], "createdAt");
  const projectId = url.searchParams.get("project_id") || undefined;
  const searchQuery = url.searchParams.get("search") || url.searchParams.get("q") || "";

  const whereClause: Prisma.CollectionFormWhereInput = {
    workspaceId: auth.workspaceId,
    ...(projectId ? { projectId } : {}),
    ...(searchQuery
      ? {
          OR: [
            { title: { contains: searchQuery, mode: "insensitive" } },
            { slug: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const [total, forms] = await Promise.all([
      prisma.collectionForm.count({ where: whereClause }),
      prisma.collectionForm.findMany({
        where: whereClause,
        include: {
          fields: {
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return apiSuccess(forms.map(formatForm), meta, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve forms.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * POST /api/v1/forms
 * Creates a new collection form in the workspace.
 */
export async function POST(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const { data: body, error: bodyError } = await parseJsonBody<{
    title?: string;
    slug?: string;
    projectId?: string;
    headerPrompt?: string;
    thankYouMessage?: string;
    description?: string;
    allowVideo?: boolean;
    allowAudio?: boolean;
    allowText?: boolean;
    maxVideoDurationSeconds?: number;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  if (!body.title || !body.title.trim()) {
    return apiError("validation_error", "Field 'title' is required.", 400, undefined, rateLimitHeaders);
  }

  const title = body.title.trim();
  const slug = (
    body.slug ||
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  ).trim();

  // Validate projectId if supplied
  if (body.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, workspaceId: auth.workspaceId },
    });
    if (!project) {
      return apiError("project_not_found", "Specified project_id does not exist in this workspace.", 404, undefined, rateLimitHeaders);
    }
  }

  try {
    const existing = await prisma.collectionForm.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId: auth.workspaceId,
          slug,
        },
      },
    });

    if (existing) {
      return apiError("slug_conflict", `A form with the slug '${slug}' already exists.`, 409, undefined, rateLimitHeaders);
    }

    const form = await prisma.collectionForm.create({
      data: {
        workspaceId: auth.workspaceId,
        projectId: body.projectId || null,
        title,
        slug,
        headerPrompt: body.headerPrompt?.trim() || "We would love to hear your feedback!",
        thankYouMessage: body.thankYouMessage?.trim() || "Thank you for sharing your feedback!",
        description: body.description?.trim() || null,
        allowVideo: body.allowVideo ?? true,
        allowAudio: body.allowAudio ?? true,
        allowText: body.allowText ?? true,
        maxVideoDurationSeconds: body.maxVideoDurationSeconds || 120,
      },
      include: {
        fields: true,
      },
    });

    return apiSuccess(formatForm(form), undefined, 201, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to create collection form.", 500, error instanceof Error ? error.message : undefined);
  }
}

