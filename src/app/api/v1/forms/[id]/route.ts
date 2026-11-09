import { requireApiAuth } from "@/lib/api/auth";
import { formatForm } from "@/lib/api/formatters";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { WorkspaceRole } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/forms/:id
 * Retrieves collection form details and configured fields.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const form = await prisma.collectionForm.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId,
      },
      include: {
        fields: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!form) {
      return apiError("form_not_found", "Collection form not found.", 404, undefined, rateLimitHeaders);
    }

    return apiSuccess(formatForm(form), undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve form.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * PATCH /api/v1/forms/:id
 * Updates an existing collection form.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const { data: body, error: bodyError } = await parseJsonBody<{
    title?: string;
    description?: string;
    headerPrompt?: string;
    thankYouMessage?: string;
    allowVideo?: boolean;
    allowAudio?: boolean;
    allowText?: boolean;
    maxVideoDurationSeconds?: number;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  try {
    const existing = await prisma.collectionForm.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("form_not_found", "Collection form not found.", 404, undefined, rateLimitHeaders);
    }

    const updated = await prisma.collectionForm.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.headerPrompt !== undefined && { headerPrompt: body.headerPrompt.trim() }),
        ...(body.thankYouMessage !== undefined && { thankYouMessage: body.thankYouMessage.trim() }),
        ...(body.allowVideo !== undefined && { allowVideo: body.allowVideo }),
        ...(body.allowAudio !== undefined && { allowAudio: body.allowAudio }),
        ...(body.allowText !== undefined && { allowText: body.allowText }),
        ...(body.maxVideoDurationSeconds !== undefined && { maxVideoDurationSeconds: body.maxVideoDurationSeconds }),
      },
      include: {
        fields: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    return apiSuccess(formatForm(updated), undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to update form.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * DELETE /api/v1/forms/:id
 * Deletes a collection form. Requires ADMIN or OWNER role.
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
    const existing = await prisma.collectionForm.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("form_not_found", "Collection form not found.", 404, undefined, rateLimitHeaders);
    }

    await prisma.collectionForm.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true, id }, undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to delete form.", 500, error instanceof Error ? error.message : undefined);
  }
}

