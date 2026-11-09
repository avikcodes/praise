import { requireApiAuth } from "@/lib/api/auth";
import { formatProject } from "@/lib/api/formatters";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { WorkspaceRole } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/projects/:id
 * Retrieves a single project by ID with workspace isolation.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const project = await prisma.project.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId,
      },
    });

    if (!project) {
      return apiError("project_not_found", "Project not found.", 404, undefined, rateLimitHeaders);
    }

    return apiSuccess(formatProject(project), undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve project.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * PATCH /api/v1/projects/:id
 * Updates an existing project.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const { data: body, error: bodyError } = await parseJsonBody<{
    name?: string;
    description?: string;
    color?: string;
    logoUrl?: string;
    brandId?: string | null;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  try {
    const existing = await prisma.project.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("project_not_found", "Project not found.", 404, undefined, rateLimitHeaders);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.color !== undefined && { color: body.color?.trim() || null }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl?.trim() || null }),
        ...(body.brandId !== undefined && { brandId: body.brandId }),
      },
    });

    return apiSuccess(formatProject(updated), undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to update project.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * DELETE /api/v1/projects/:id
 * Deletes a project. Requires ADMIN or OWNER role.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request, {
    allowedRoles: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
  });
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const existing = await prisma.project.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("project_not_found", "Project not found.", 404, undefined, rateLimitHeaders);
    }

    await prisma.project.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true, id }, undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to delete project.", 500, error instanceof Error ? error.message : undefined);
  }
}

