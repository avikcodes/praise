import { requireApiAuth } from "@/lib/api/auth";
import { formatCustomer } from "@/lib/api/formatters";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { WorkspaceRole } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/customers/:id
 * Retrieves a customer profile with testimonials summary.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        workspaceId: auth.workspaceId,
      },
      include: {
        _count: {
          select: {
            testimonials: true,
          },
        },
      },
    });

    if (!customer) {
      return apiError("customer_not_found", "Customer not found.", 404, undefined, rateLimitHeaders);
    }

    return apiSuccess(
      {
        ...formatCustomer(customer),
        testimonialsCount: customer._count.testimonials,
      },
      undefined,
      200,
      rateLimitHeaders
    );
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve customer.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * PATCH /api/v1/customers/:id
 * Updates customer details.
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
    company?: string;
    title?: string;
    avatarUrl?: string;
    socialHandle?: string;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  try {
    const existing = await prisma.customer.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("customer_not_found", "Customer not found.", 404, undefined, rateLimitHeaders);
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.company !== undefined && { company: body.company?.trim() || null }),
        ...(body.title !== undefined && { title: body.title?.trim() || null }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl?.trim() || null }),
        ...(body.socialHandle !== undefined && { socialHandle: body.socialHandle?.trim() || null }),
      },
    });

    return apiSuccess(formatCustomer(updated), undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to update customer.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * DELETE /api/v1/customers/:id
 * Deletes customer profile. Requires ADMIN or OWNER.
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
    const existing = await prisma.customer.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!existing) {
      return apiError("customer_not_found", "Customer not found.", 404, undefined, rateLimitHeaders);
    }

    await prisma.customer.delete({
      where: { id },
    });

    return apiSuccess({ deleted: true, id }, undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to delete customer.", 500, error instanceof Error ? error.message : undefined);
  }
}

