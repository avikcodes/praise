import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { slugify } from "@/lib/customer-stories/generator";
import type { CustomerStoryDetail } from "@/lib/customer-stories/types";

type RouteParams = {
  params: Promise<{ id: string; storyId: string }>;
};

/**
 * GET: Retrieves a single customer story by ID.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, storyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const story = await prisma.customerStory.findFirst({
      where: { id: storyId, workspaceId },
      include: {
        project: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        customer: { select: { id: true, name: true, email: true } },
        response: {
          select: {
            id: true,
            customerName: true,
            companyName: true,
            consentGranted: true,
            consentText: true,
            consentTimestamp: true,
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Customer story not found" }, { status: 404 });
    }

    let measurableOutcomes = [];
    if (story.measurableOutcomesJson) {
      try {
        measurableOutcomes = JSON.parse(story.measurableOutcomesJson);
      } catch {
        measurableOutcomes = [];
      }
    }

    let keyTakeaways = [];
    if (story.keyTakeawaysJson) {
      try {
        keyTakeaways = JSON.parse(story.keyTakeawaysJson);
      } catch {
        keyTakeaways = [];
      }
    }

    let sections = [];
    if (story.sectionsJson) {
      try {
        sections = JSON.parse(story.sectionsJson);
      } catch {
        sections = [];
      }
    }

    let approvedMedia = [];
    if (story.approvedMediaJson) {
      try {
        approvedMedia = JSON.parse(story.approvedMediaJson);
      } catch {
        approvedMedia = [];
      }
    }

    const detail: CustomerStoryDetail = {
      id: story.id,
      workspaceId: story.workspaceId,
      responseId: story.responseId,
      projectId: story.projectId,
      brandId: story.brandId,
      customerId: story.customerId,
      slug: story.slug,
      status: story.status as any,
      publishedAt: story.publishedAt ? story.publishedAt.toISOString() : null,
      title: story.title,
      subtitle: story.subtitle,
      summary: story.summary,
      readingTimeMinutes: story.readingTimeMinutes,
      customerName: story.customerName,
      customerTitle: story.customerTitle,
      customerAvatarUrl: story.customerAvatarUrl,
      companyName: story.companyName,
      companyLogoUrl: story.companyLogoUrl,
      companyWebsite: story.companyWebsite,
      companyIndustry: story.companyIndustry,
      companySize: story.companySize,
      featuredQuote: story.featuredQuote,
      featuredQuoteAuthor: story.featuredQuoteAuthor,
      featuredQuoteRole: story.featuredQuoteRole,
      featuredQuoteAvatar: story.featuredQuoteAvatar,
      peerAdvice: story.peerAdvice,
      measurableOutcomes,
      keyTakeaways,
      sections,
      coverImageUrl: story.coverImageUrl,
      videoUrl: story.videoUrl,
      approvedMedia,
      theme: story.theme as any,
      accentColor: story.accentColor,
      customCtaText: story.customCtaText,
      customCtaUrl: story.customCtaUrl,
      seoTitle: story.seoTitle,
      seoDescription: story.seoDescription,
      ogImageUrl: story.ogImageUrl,
      permissionVerified: story.permissionVerified,
      permissionNotes: story.permissionNotes,
      viewsCount: story.viewsCount,
      createdAt: story.createdAt.toISOString(),
      updatedAt: story.updatedAt.toISOString(),
      project: story.project,
      brand: story.brand,
      customer: story.customer,
      response: story.response
        ? {
            ...story.response,
            consentTimestamp: story.response.consentTimestamp.toISOString(),
          }
        : null,
    };

    return NextResponse.json({ story: detail });
  } catch (error: any) {
    console.error("Failed to fetch customer story:", error);
    if (error?.status === 401 || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to fetch customer story" }, { status: 500 });
  }
}

/**
 * PATCH: Updates editorial sections, status, branding, and details.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, storyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const existing = await prisma.customerStory.findFirst({
      where: { id: storyId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Customer story not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Permission Verification Check when Publishing
    if (body.status === "PUBLISHED") {
      const willBeVerified =
        body.permissionVerified !== undefined ? Boolean(body.permissionVerified) : existing.permissionVerified;
      if (!willBeVerified) {
        return NextResponse.json(
          {
            error:
              "Cannot publish story: Customer publication consent is not verified or documented. Stories can only be published with explicit permission.",
          },
          { status: 400 }
        );
      }
      if (!existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
      updateData.status = "PUBLISHED";
    } else if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // Slug validation and uniqueness
    if (body.slug && body.slug !== existing.slug) {
      const cleanSlug = slugify(body.slug);
      const duplicate = await prisma.customerStory.findFirst({
        where: { slug: cleanSlug, id: { not: storyId } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `The slug "${cleanSlug}" is already taken by another published story.` },
          { status: 400 }
        );
      }
      updateData.slug = cleanSlug;
    }

    // Editorial fields
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle?.trim() || null;
    if (body.summary !== undefined) updateData.summary = body.summary?.trim() || null;
    if (body.readingTimeMinutes !== undefined) updateData.readingTimeMinutes = body.readingTimeMinutes;

    // Company & Customer details
    if (body.customerName !== undefined) updateData.customerName = body.customerName.trim();
    if (body.customerTitle !== undefined) updateData.customerTitle = body.customerTitle?.trim() || null;
    if (body.customerAvatarUrl !== undefined) updateData.customerAvatarUrl = body.customerAvatarUrl || null;
    if (body.companyName !== undefined) updateData.companyName = body.companyName.trim();
    if (body.companyLogoUrl !== undefined) updateData.companyLogoUrl = body.companyLogoUrl || null;
    if (body.companyWebsite !== undefined) updateData.companyWebsite = body.companyWebsite?.trim() || null;
    if (body.companyIndustry !== undefined) updateData.companyIndustry = body.companyIndustry?.trim() || null;
    if (body.companySize !== undefined) updateData.companySize = body.companySize?.trim() || null;

    // Quotes
    if (body.featuredQuote !== undefined) updateData.featuredQuote = body.featuredQuote?.trim() || null;
    if (body.featuredQuoteAuthor !== undefined) updateData.featuredQuoteAuthor = body.featuredQuoteAuthor?.trim() || null;
    if (body.featuredQuoteRole !== undefined) updateData.featuredQuoteRole = body.featuredQuoteRole?.trim() || null;
    if (body.peerAdvice !== undefined) updateData.peerAdvice = body.peerAdvice?.trim() || null;

    // JSON Arrays
    if (body.measurableOutcomes !== undefined) {
      updateData.measurableOutcomesJson =
        Array.isArray(body.measurableOutcomes) && body.measurableOutcomes.length > 0
          ? JSON.stringify(body.measurableOutcomes)
          : null;
    }
    if (body.keyTakeaways !== undefined) {
      updateData.keyTakeawaysJson =
        Array.isArray(body.keyTakeaways) && body.keyTakeaways.length > 0
          ? JSON.stringify(body.keyTakeaways)
          : null;
    }
    if (body.sections !== undefined) {
      updateData.sectionsJson = Array.isArray(body.sections) ? JSON.stringify(body.sections) : JSON.stringify([]);
    }
    if (body.approvedMedia !== undefined) {
      updateData.approvedMediaJson =
        Array.isArray(body.approvedMedia) && body.approvedMedia.length > 0
          ? JSON.stringify(body.approvedMedia)
          : null;
    }

    // Media & Visuals
    if (body.coverImageUrl !== undefined) updateData.coverImageUrl = body.coverImageUrl || null;
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl || null;
    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.accentColor !== undefined) updateData.accentColor = body.accentColor;
    if (body.customCtaText !== undefined) updateData.customCtaText = body.customCtaText || null;
    if (body.customCtaUrl !== undefined) updateData.customCtaUrl = body.customCtaUrl || null;

    // SEO
    if (body.seoTitle !== undefined) updateData.seoTitle = body.seoTitle?.trim() || null;
    if (body.seoDescription !== undefined) updateData.seoDescription = body.seoDescription?.trim() || null;
    if (body.ogImageUrl !== undefined) updateData.ogImageUrl = body.ogImageUrl || null;

    // Permissions
    if (body.permissionVerified !== undefined) updateData.permissionVerified = Boolean(body.permissionVerified);
    if (body.permissionNotes !== undefined) updateData.permissionNotes = body.permissionNotes || null;

    // Organization
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null;
    if (body.brandId !== undefined) updateData.brandId = body.brandId || null;

    const updated = await prisma.customerStory.update({
      where: { id: storyId },
      data: updateData,
      include: {
        project: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ story: updated });
  } catch (error: any) {
    console.error("Failed to update customer story:", error);
    if (error?.status === 401 || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to update customer story" }, { status: 500 });
  }
}

/**
 * DELETE: Deletes a customer story.
 */
export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, storyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const existing = await prisma.customerStory.findFirst({
      where: { id: storyId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Customer story not found" }, { status: 404 });
    }

    await prisma.customerStory.delete({
      where: { id: storyId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete customer story:", error);
    if (error?.status === 401 || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to delete customer story" }, { status: 500 });
  }
}
