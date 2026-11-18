import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import type { CustomerStoryDetail } from "@/lib/customer-stories/types";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get("preview") === "true";

    const story = await prisma.customerStory.findUnique({
      where: { slug },
      include: {
        workspace: { select: { id: true, name: true, logoUrl: true } },
        project: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Customer story not found" }, { status: 404 });
    }

    // If story is not published, check if previewing with workspace session
    if (story.status !== "PUBLISHED") {
      if (!isPreview) {
        return NextResponse.json({ error: "Story is not published" }, { status: 404 });
      }
      const user = await getSessionUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized preview access" }, { status: 401 });
      }
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: story.workspaceId,
            userId: user.id,
          },
        },
      });
      if (!member) {
        return NextResponse.json({ error: "Unauthorized preview access" }, { status: 403 });
      }
    } else if (!isPreview) {
      // Increment views count non-blockingly
      prisma.customerStory
        .update({
          where: { id: story.id },
          data: { viewsCount: { increment: 1 } },
        })
        .catch(() => {});
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
    };

    return NextResponse.json({ story: detail });
  } catch (error: any) {
    console.error("Failed to fetch public customer story:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch customer story" }, { status: 500 });
  }
}
