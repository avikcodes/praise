import { requireApiAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/v1/workspaces
 * Returns the workspace associated with the authenticated API key.
 */
export async function GET(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: auth.workspaceId },
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
      return apiError("workspace_not_found", "Associated workspace was not found.", 404, undefined, rateLimitHeaders);
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

