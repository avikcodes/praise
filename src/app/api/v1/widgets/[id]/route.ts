import { requireApiAuth } from "@/lib/api/auth";
import { formatWidget } from "@/lib/api/formatters";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { WidgetTheme, WidgetType } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/widgets/:id
 * Retrieves widget configuration.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const widget = await prisma.widget.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!widget) {
      return apiError("widget_not_found", "Widget not found.", 404, undefined, rateLimitHeaders);
    }

    return apiSuccess(formatWidget(widget), undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve widget.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * PATCH /api/v1/widgets/:id
 * Updates widget configuration.
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
    type?: WidgetType;
    theme?: WidgetTheme;
    config?: Record<string, unknown>;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  try {
    const existing = await prisma.widget.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("widget_not_found", "Widget not found.", 404, undefined, rateLimitHeaders);
    }

    const updated = await prisma.widget.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.theme !== undefined && { theme: body.theme }),
        ...(body.config !== undefined && { configJson: JSON.stringify(body.config) }),
      },
    });

    return apiSuccess(formatWidget(updated), undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to update widget.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * DELETE /api/v1/widgets/:id
 * Deletes a widget.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const existing = await prisma.widget.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("widget_not_found", "Widget not found.", 404, undefined, rateLimitHeaders);
    }

    await prisma.widget.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true, id }, undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to delete widget.", 500, error instanceof Error ? error.message : undefined);
  }
}

