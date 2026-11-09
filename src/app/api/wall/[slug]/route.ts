import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { parseCustomerMeta } from "@/lib/customers/utils";
import { parseWidgetConfig } from "@/lib/widgets/utils";
import { PublicTestimonialCard, PublicWallOfLoveData } from "@/types/widgets";
import { Prisma, WidgetEventType } from "@prisma/client";
import { canPublishTestimonial } from "@/lib/privacy/consent";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { slug } = await context.params;
    const cleanSlug = slug.toLowerCase().trim();

    // 1. Locate Widget by slug in configJson or widget ID
    let widget = await prisma.widget.findFirst({
      where: {
        OR: [
          { id: cleanSlug },
          { configJson: { contains: `"slug":"${cleanSlug}"` } },
        ],
      },
      include: {
        project: {
          select: { id: true, name: true, slug: true, color: true, logoUrl: true },
        },
        workspace: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });

    // 2. Fallback: match by project slug if no dedicated widget slug
    if (!widget) {
      const matchedProject = await prisma.project.findFirst({
        where: { slug: cleanSlug },
        include: {
          workspace: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      });

      if (matchedProject) {
        widget = await prisma.widget.findFirst({
          where: {
            projectId: matchedProject.id,
            workspaceId: matchedProject.workspaceId,
          },
          include: {
            project: {
              select: { id: true, name: true, slug: true, color: true, logoUrl: true },
            },
            workspace: {
              select: { id: true, name: true, slug: true, logoUrl: true },
            },
          },
        });

        // If no widget created yet for this project, create a virtual Wall representation
        if (!widget) {
          widget = {
            id: `proj-${matchedProject.id}`,
            workspaceId: matchedProject.workspaceId,
            projectId: matchedProject.id,
            name: `${matchedProject.name} Wall of Love`,
            type: "WALL_OF_LOVE",
            theme: "WARM",
            configJson: JSON.stringify({
              slug: cleanSlug,
              title: `${matchedProject.name} Wall of Love`,
              description: `Real customer testimonials and feedback for ${matchedProject.name}.`,
              ctaEnabled: true,
              ctaLabel: `Share Praise for ${matchedProject.name}`,
              ctaUrl: `/p/${matchedProject.slug}`,
            }),
            createdAt: new Date(),
            updatedAt: new Date(),
            project: matchedProject,
            workspace: matchedProject.workspace,
          } as unknown as typeof widget;
        }
      }
    }

    if (!widget) {
      return NextResponse.json(
        { error: "Wall of Love page not found." },
        { status: 404 }
      );
    }

    const config = parseWidgetConfig(widget.configJson, widget.name);

    // 3. Query ONLY APPROVED testimonials for public display
    const whereCondition: Prisma.TestimonialWhereInput = {
      workspaceId: widget.workspaceId,
      status: "APPROVED",
    };

    if (widget.projectId) {
      whereCondition.projectId = widget.projectId;
    }

    if (config.minRating > 0) {
      whereCondition.rating = { gte: config.minRating };
    }

    // Filter specific manual testimonials if configured
    if (
      config.selectionMode === "manual" &&
      config.selectedTestimonialIds &&
      config.selectedTestimonialIds.length > 0
    ) {
      whereCondition.id = { in: config.selectedTestimonialIds };
    }

    // Filter by tags if configured
    if (config.filterTags && config.filterTags.length > 0) {
      whereCondition.tags = {
        some: {
          tag: {
            name: { in: config.filterTags },
          },
        },
      };
    }

    // Determine ordering
    let orderBy: Prisma.TestimonialOrderByWithRelationInput[] = [
      { submittedAt: "desc" },
    ];

    if (config.ordering === "featured_first") {
      orderBy = [{ isFeatured: "desc" }, { submittedAt: "desc" }];
    } else if (config.ordering === "highest_rated") {
      orderBy = [{ rating: "desc" }, { submittedAt: "desc" }];
    } else if (config.ordering === "oldest") {
      orderBy = [{ submittedAt: "asc" }];
    }

    const testimonials = await prisma.testimonial.findMany({
      where: whereCondition,
      include: {
        customer: true,
        project: {
          select: { id: true, name: true, slug: true },
        },
        tags: {
          include: { tag: true },
        },
        mediaAssets: true,
        consentRecords: {
          take: 1,
          orderBy: { grantedAt: "desc" },
        },
      },
      orderBy,
    });

    // 4. Sanitize data & enforce privacy permissions (never publish withdrawn or unconsented content)
    const publishableTestimonials = testimonials.filter((t) => {
      const check = canPublishTestimonial(t);
      return check.canPublish;
    });

    const sanitizedCards: PublicTestimonialCard[] = publishableTestimonials.map((t) => {
      const permission = canPublishTestimonial(t);
      let customerMetaWebsite: string | null = null;
      if (t.customer?.socialHandle) {
        const meta = parseCustomerMeta(t.customer.socialHandle);
        customerMetaWebsite = meta.website;
      }

      const showCustName = permission.allowName;
      const showCustCompany = permission.allowCompany && config.showCompany;
      const showCustMedia = permission.allowMedia && config.showAvatar;

      return {
        id: t.id,
        content: t.content,
        rating: t.rating,
        type: t.type,
        isFeatured: t.isFeatured,
        submittedAt: t.submittedAt.toISOString(),
        customer: {
          name: showCustName ? (t.customer?.name || "Verified Customer") : "Verified Customer",
          company: showCustCompany ? t.customer?.company || null : null,
          title: showCustCompany ? t.customer?.title || null : null,
          avatarUrl: showCustMedia ? t.customer?.avatarUrl || null : null,
          website: customerMetaWebsite,
        },
        project: t.project,
        tags: config.showTags ? t.tags.map((tagRel) => tagRel.tag.name) : [],
        source: config.showSource ? "Verified Review" : null,
        media: permission.allowMedia
          ? t.mediaAssets.map((m) => ({
              id: m.id,
              type: m.type,
              url: m.url,
              mimeType: m.mimeType,
              fileSizeBytes: m.fileSizeBytes,
              durationSeconds: m.durationSeconds,
            }))
          : [],
      };
    });

    // 5. Track widget impression asynchronously without blocking response
    if (widget.id && !widget.id.startsWith("proj-")) {
      prisma.widgetEvent
        .create({
          data: {
            workspaceId: widget.workspaceId,
            widgetId: widget.id,
            eventType: WidgetEventType.IMPRESSION,
          },
        })
        .catch(() => {});
    }

    const responseData: PublicWallOfLoveData = {
      widgetId: widget.id,
      name: widget.name,
      slug: config.slug,
      title: config.title,
      description: config.description,
      config,
      project: widget.project,
      workspace: widget.workspace,
      totalApproved: sanitizedCards.length,
      testimonials: sanitizedCards,
    };

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: unknown) {
    console.error("Public wall error:", error);
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load Wall of Love.";
    return NextResponse.json({ error: message }, { status });
  }
}

