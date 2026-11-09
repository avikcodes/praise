import { requireApiAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { WorkspaceRole } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/workspaces/:id
 * Retrieves workspace details with strict multi-tenant boundary checks.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  // Enforce strict workspace isolation
  if (auth.workspaceId !== id) {
    return apiError("workspace_not_found", "Workspace not found.", 404, undefined, rateLimitHeaders);
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            projects: true,
            testimonials: true,
            customers: true,
            widgets: true,
          },
        },
      },
    });

    if (!workspace) {
      return apiError("workspace_not_found", "Workspace not found.", 404, undefined, rateLimitHeaders);
    }

    return apiSuccess(
      {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        logoUrl: workspace.logoUrl,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
        stats: {
          projectsCount: workspace._count.projects,
          testimonialsCount: workspace._count.testimonials,
          customersCount: workspace._count.customers,
          widgetsCount: workspace._count.widgets,
        },
      },
      undefined,
      200,
      rateLimitHeaders
    );
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve workspace.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * PATCH /api/v1/workspaces/:id
 * Updates workspace properties. Requires ADMIN or OWNER role.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request, {
    allowedRoles: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
  });
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  if (auth.workspaceId !== id) {
    return apiError("workspace_not_found", "Workspace not found.", 404, undefined, rateLimitHeaders);
  }

  const { data: body, error: bodyError } = await parseJsonBody<{
    name?: string;
    logoUrl?: string;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  try {
    const updated = await prisma.workspace.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl?.trim() || null }),
      },
    });

    return apiSuccess(
      {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logoUrl: updated.logoUrl,
        updatedAt: updated.updatedAt.toISOString(),
      },
      undefined,
      200,
      rateLimitHeaders
    );
  } catch (error) {
    return apiError("internal_error", "Failed to update workspace.", 500, error instanceof Error ? error.message : undefined);
  }
}

