import { requireApiAuth } from "@/lib/api/auth";
import { formatWidget } from "@/lib/api/formatters";
import { apiSuccess, apiError, buildPaginationMeta } from "@/lib/api/response";
import { parseJsonBody, parsePagination, parseSort } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { Prisma, WidgetTheme, WidgetType } from "@prisma/client";

/**
 * GET /api/v1/widgets
 * Lists widget configurations in the workspace.
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
  const projectId = url.searchParams.get("project_id") || undefined;

  const whereClause: Prisma.WidgetWhereInput = {
    workspaceId: auth.workspaceId,
    ...(projectId ? { projectId } : {}),
  };

  try {
    const [total, widgets] = await Promise.all([
      prisma.widget.count({ where: whereClause }),
      prisma.widget.findMany({
        where: whereClause,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return apiSuccess(widgets.map(formatWidget), meta, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve widgets.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * POST /api/v1/widgets
 * Creates a new widget configuration.
 */
export async function POST(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const { data: body, error: bodyError } = await parseJsonBody<{
    name?: string;
    type?: WidgetType;
    theme?: WidgetTheme;
    projectId?: string;
    config?: Record<string, unknown>;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  if (!body.name || !body.name.trim()) {
    return apiError("validation_error", "Field 'name' is required.", 400, undefined, rateLimitHeaders);
  }

  const type = body.type || WidgetType.GRID;
  const theme = body.theme || WidgetTheme.WARM;

  try {
    if (body.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: body.projectId, workspaceId: auth.workspaceId },
      });
      if (!project) {
        return apiError("project_not_found", "Specified project_id does not exist.", 404, undefined, rateLimitHeaders);
      }
    }

    const created = await prisma.widget.create({
      data: {
        workspaceId: auth.workspaceId,
        projectId: body.projectId || null,
        name: body.name.trim(),
        type,
        theme,
        configJson: body.config ? JSON.stringify(body.config) : null,
      },
    });

    return apiSuccess(formatWidget(created), undefined, 201, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to create widget.", 500, error instanceof Error ? error.message : undefined);
  }
}

