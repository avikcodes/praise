import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { exportStoryToMarkdown, exportStoryToHtml } from "@/lib/customer-stories/export";
import type { CustomerStoryDetail } from "@/lib/customer-stories/types";

type RouteParams = {
  params: Promise<{ id: string; storyId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, storyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "markdown";

    const story = await prisma.customerStory.findFirst({
      where: { id: storyId, workspaceId },
      include: {
        project: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
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
    };

    if (format === "html") {
      const html = exportStoryToHtml(detail);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${story.slug}.html"`,
        },
      });
    }

    // Default: Markdown
    const markdown = exportStoryToMarkdown(detail);
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${story.slug}.md"`,
      },
    });
  } catch (error: any) {
    console.error("Failed to export customer story:", error);
    if (error?.status === 401 || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to export customer story" }, { status: 500 });
  }
}
