import { requireApiAuth } from "@/lib/api/auth";
import { formatTestimonialPrivate } from "@/lib/api/formatters";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { TestimonialStatus, WorkspaceRole } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/testimonials/:id
 * Retrieves full testimonial details with workspace scoping.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const testimonial = await prisma.testimonial.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId,
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

    if (!testimonial) {
      return apiError("testimonial_not_found", "Testimonial not found.", 404, undefined, rateLimitHeaders);
    }

    return apiSuccess(formatTestimonialPrivate(testimonial), undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve testimonial.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * PATCH /api/v1/testimonials/:id
 * Updates testimonial status (moderation), content, rating, or tags.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const { data: body, error: bodyError } = await parseJsonBody<{
    status?: TestimonialStatus;
    content?: string;
    rating?: number;
    isFeatured?: boolean;
    tagIds?: string[];
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  try {
    const existing = await prisma.testimonial.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("testimonial_not_found", "Testimonial not found.", 404, undefined, rateLimitHeaders);
    }

    // Update tags if provided
    if (body.tagIds !== undefined) {
      await prisma.testimonialTag.deleteMany({
        where: { testimonialId: id },
      });
      if (body.tagIds.length > 0) {
        await prisma.testimonialTag.createMany({
          data: body.tagIds.map((tagId) => ({
            testimonialId: id,
            tagId,
            workspaceId: auth.workspaceId,
          })),
        });
      }
    }

    const updated = await prisma.testimonial.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.content !== undefined && { content: body.content.trim() }),
        ...(body.rating !== undefined && { rating: Math.max(1, Math.min(body.rating, 5)) }),
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
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

    return apiSuccess(formatTestimonialPrivate(updated), undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to update testimonial.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * DELETE /api/v1/testimonials/:id
 * Permanently deletes a testimonial. Requires ADMIN or OWNER role.
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
    const existing = await prisma.testimonial.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("testimonial_not_found", "Testimonial not found.", 404, undefined, rateLimitHeaders);
    }

    await prisma.testimonial.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true, id }, undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to delete testimonial.", 500, error instanceof Error ? error.message : undefined);
  }
}

