import { requireApiAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/tags/:id
 * Retrieves tag details by ID.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const tag = await prisma.tag.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      include: {
        _count: {
          select: { testimonials: true },
        },
      },
    });

    if (!tag) {
      return apiError("tag_not_found", "Tag not found.", 404, undefined, rateLimitHeaders);
    }

    return apiSuccess(
      {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        testimonialsCount: tag._count.testimonials,
        createdAt: tag.createdAt.toISOString(),
      },
      undefined,
      200,
      rateLimitHeaders
    );
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve tag.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * PATCH /api/v1/tags/:id
 * Updates tag details.
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
    color?: string;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  try {
    const existing = await prisma.tag.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("tag_not_found", "Tag not found.", 404, undefined, rateLimitHeaders);
    }

    const updated = await prisma.tag.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.color !== undefined && { color: body.color.trim() }),
      },
      include: {
        _count: {
          select: { testimonials: true },
        },
      },
    });

    return apiSuccess(
      {
        id: updated.id,
        name: updated.name,
        color: updated.color,
        testimonialsCount: updated._count.testimonials,
      },
      undefined,
      200,
      rateLimitHeaders
    );
  } catch (error) {
    return apiError("internal_error", "Failed to update tag.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * DELETE /api/v1/tags/:id
 * Deletes a tag from the workspace.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const existing = await prisma.tag.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("tag_not_found", "Tag not found.", 404, undefined, rateLimitHeaders);
    }

    await prisma.tag.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true, id }, undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to delete tag.", 500, error instanceof Error ? error.message : undefined);
  }
}

