import { formatTestimonialPublic } from "@/lib/api/formatters";
import { checkApiRateLimit, getClientIp } from "@/lib/api/rate-limit";
import { apiSuccess, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/db/client";
import { Prisma, TestimonialStatus } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/v1/public/widgets/:id
 * Public endpoint returning widget layout configuration and matching approved testimonials.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const clientIp = getClientIp(request);
  const rateLimit = checkApiRateLimit(`public_widget_${clientIp}`, 300);

  if (!rateLimit.allowed) {
    return apiError(
      "rate_limit_exceeded",
      "Rate limit exceeded.",
      429,
      undefined,
      rateLimit.headers
    );
  }

  try {
    const widget = await prisma.widget.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!widget) {
      return apiError("widget_not_found", "Widget not found.", 404, undefined, rateLimit.headers);
    }

    let parsedConfig: Record<string, unknown> = {};
    if (widget.configJson) {
      try {
        parsedConfig = JSON.parse(widget.configJson);
      } catch {
        // Ignore parse error
      }
    }

    // Extract optional filters from widget configuration
    const minRating = typeof parsedConfig.minRating === "number" ? parsedConfig.minRating : undefined;
    const tagFilter = typeof parsedConfig.tag === "string" ? parsedConfig.tag : undefined;
    const maxItems = typeof parsedConfig.maxItems === "number" ? Math.min(parsedConfig.maxItems, 50) : 20;

    // STRICT PRIVACY: Query ONLY approved testimonials
    const whereClause: Prisma.TestimonialWhereInput = {
      workspaceId: widget.workspaceId,
      status: TestimonialStatus.APPROVED,
      ...(widget.projectId ? { projectId: widget.projectId } : {}),
      ...(minRating ? { rating: { gte: minRating } } : {}),
      ...(tagFilter
        ? {
            tags: {
              some: {
                tag: {
                  name: { equals: tagFilter, mode: "insensitive" },
                },
              },
            },
          }
        : {}),
    };

    const testimonials = await prisma.testimonial.findMany({
      where: whereClause,
      include: {
        customer: true,
        mediaAssets: true,
        tags: {
          include: { tag: true },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: maxItems,
    });

    return apiSuccess(
      {
        widget: {
          id: widget.id,
          name: widget.name,
          type: widget.type,
          theme: widget.theme,
          project: widget.project,
          config: parsedConfig,
        },
        testimonials: testimonials.map(formatTestimonialPublic),
      },
      undefined,
      200,
      {
        ...rateLimit.headers,
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      }
    );
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve widget.", 500, error instanceof Error ? error.message : undefined);
  }
}

