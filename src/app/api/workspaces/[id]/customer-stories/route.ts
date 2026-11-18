import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { generateStoryFromResponse, slugify } from "@/lib/customer-stories/generator";
import type { CustomerStoryDetail } from "@/lib/customer-stories/types";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET: Lists customer stories for a workspace.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");
    const brandId = searchParams.get("brandId");
    const search = searchParams.get("search");

    const where: any = { workspaceId };
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (projectId) where.projectId = projectId;
    if (brandId) where.brandId = brandId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const stories = await prisma.customerStory.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

    const formatted: CustomerStoryDetail[] = stories.map((s) => {
      let measurableOutcomes = [];
      if (s.measurableOutcomesJson) {
        try {
          measurableOutcomes = JSON.parse(s.measurableOutcomesJson);
        } catch {
          measurableOutcomes = [];
        }
      }

      let keyTakeaways = [];
      if (s.keyTakeawaysJson) {
        try {
          keyTakeaways = JSON.parse(s.keyTakeawaysJson);
        } catch {
          keyTakeaways = [];
        }
      }

      let sections = [];
      if (s.sectionsJson) {
        try {
          sections = JSON.parse(s.sectionsJson);
        } catch {
          sections = [];
        }
      }

      let approvedMedia = [];
      if (s.approvedMediaJson) {
        try {
          approvedMedia = JSON.parse(s.approvedMediaJson);
        } catch {
          approvedMedia = [];
        }
      }

      return {
        id: s.id,
        workspaceId: s.workspaceId,
        responseId: s.responseId,
        projectId: s.projectId,
        brandId: s.brandId,
        customerId: s.customerId,
        slug: s.slug,
        status: s.status as any,
        publishedAt: s.publishedAt ? s.publishedAt.toISOString() : null,
        title: s.title,
        subtitle: s.subtitle,
        summary: s.summary,
        readingTimeMinutes: s.readingTimeMinutes,
        customerName: s.customerName,
        customerTitle: s.customerTitle,
        customerAvatarUrl: s.customerAvatarUrl,
        companyName: s.companyName,
        companyLogoUrl: s.companyLogoUrl,
        companyWebsite: s.companyWebsite,
        companyIndustry: s.companyIndustry,
        companySize: s.companySize,
        featuredQuote: s.featuredQuote,
        featuredQuoteAuthor: s.featuredQuoteAuthor,
        featuredQuoteRole: s.featuredQuoteRole,
        featuredQuoteAvatar: s.featuredQuoteAvatar,
        peerAdvice: s.peerAdvice,
        measurableOutcomes,
        keyTakeaways,
        sections,
        coverImageUrl: s.coverImageUrl,
        videoUrl: s.videoUrl,
        approvedMedia,
        theme: s.theme as any,
        accentColor: s.accentColor,
        customCtaText: s.customCtaText,
        customCtaUrl: s.customCtaUrl,
        seoTitle: s.seoTitle,
        seoDescription: s.seoDescription,
        ogImageUrl: s.ogImageUrl,
        permissionVerified: s.permissionVerified,
        permissionNotes: s.permissionNotes,
        viewsCount: s.viewsCount,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        project: s.project,
        brand: s.brand,
        customer: s.customer,
        response: s.response
          ? {
              ...s.response,
              consentTimestamp: s.response.consentTimestamp.toISOString(),
            }
          : null,
      };
    });

    return NextResponse.json({ stories: formatted });
  } catch (error: any) {
    console.error("Failed to list customer stories:", error);
    if (error?.status === 401 || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to list customer stories" }, { status: 500 });
  }
}

/**
 * POST: Creates a new customer story.
 * Can create from an approved CaseStudyResponse or from manual input.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();

    let createData: any = null;

    if (body.responseId) {
      // 1. Fetch the source case study response
      const response = await prisma.caseStudyResponse.findFirst({
        where: { id: body.responseId, workspaceId },
        include: { form: true },
      });

      if (!response) {
        return NextResponse.json({ error: "Case study submission not found in this workspace" }, { status: 404 });
      }

      // INTEGRITY CHECK: Only publish / create stories when permission is recorded
      if (!response.consentGranted) {
        return NextResponse.json(
          {
            error: "Cannot create customer story: The customer did not grant publication consent.",
          },
          { status: 400 }
        );
      }

      // Convert response into story payload
      createData = generateStoryFromResponse(response as any, {
        customSlug: body.slug,
        theme: body.theme,
        accentColor: body.accentColor,
      });

      // Override project or brand if explicitly provided
      if (body.projectId !== undefined) createData.projectId = body.projectId;
      if (body.brandId !== undefined) createData.brandId = body.brandId;
    } else {
      // Manual creation payload
      if (!body.title?.trim() || !body.companyName?.trim()) {
        return NextResponse.json({ error: "Title and Company Name are required" }, { status: 400 });
      }

      const permissionVerified = Boolean(body.permissionVerified);

      // INTEGRITY CHECK: If attempting to publish directly, verify permission
      if (body.status === "PUBLISHED" && !permissionVerified) {
        return NextResponse.json(
          { error: "Cannot publish story: Customer publication consent is not verified or documented." },
          { status: 400 }
        );
      }

      const baseSlug = body.slug ? slugify(body.slug) : slugify(`${body.companyName}-story`);

      createData = {
        workspaceId,
        projectId: body.projectId || null,
        brandId: body.brandId || null,
        customerId: body.customerId || null,
        slug: baseSlug,
        status: body.status || "DRAFT",
        publishedAt: body.status === "PUBLISHED" ? new Date() : null,
        title: body.title.trim(),
        subtitle: body.subtitle?.trim() || null,
        summary: body.summary?.trim() || null,
        readingTimeMinutes: body.readingTimeMinutes || 4,
        customerName: body.customerName?.trim() || "Customer Advocate",
        customerTitle: body.customerTitle?.trim() || null,
        customerAvatarUrl: body.customerAvatarUrl || null,
        companyName: body.companyName.trim(),
        companyLogoUrl: body.companyLogoUrl || null,
        companyWebsite: body.companyWebsite || null,
        companyIndustry: body.companyIndustry || null,
        companySize: body.companySize || null,
        featuredQuote: body.featuredQuote?.trim() || null,
        featuredQuoteAuthor: body.featuredQuoteAuthor?.trim() || body.customerName?.trim() || null,
        featuredQuoteRole: body.featuredQuoteRole?.trim() || body.customerTitle?.trim() || null,
        peerAdvice: body.peerAdvice?.trim() || null,
        measurableOutcomesJson:
          body.measurableOutcomes && Array.isArray(body.measurableOutcomes) && body.measurableOutcomes.length > 0
            ? JSON.stringify(body.measurableOutcomes)
            : null,
        keyTakeawaysJson:
          body.keyTakeaways && Array.isArray(body.keyTakeaways) && body.keyTakeaways.length > 0
            ? JSON.stringify(body.keyTakeaways)
            : null,
        sectionsJson:
          body.sections && Array.isArray(body.sections) && body.sections.length > 0
            ? JSON.stringify(body.sections)
            : JSON.stringify([]),
        coverImageUrl: body.coverImageUrl || null,
        videoUrl: body.videoUrl || null,
        approvedMediaJson:
          body.approvedMedia && Array.isArray(body.approvedMedia) && body.approvedMedia.length > 0
            ? JSON.stringify(body.approvedMedia)
            : null,
        theme: body.theme || "warm",
        accentColor: body.accentColor || "#4f46e5",
        customCtaText: body.customCtaText || null,
        customCtaUrl: body.customCtaUrl || null,
        seoTitle: body.seoTitle || `${body.title} | ${body.companyName}`,
        seoDescription: body.seoDescription || body.subtitle || body.summary || null,
        permissionVerified,
        permissionNotes: body.permissionNotes || (permissionVerified ? "Manually verified consent." : null),
      };
    }

    // Ensure Slug Uniqueness
    let finalSlug = createData.slug;
    let counter = 1;
    while (true) {
      const existing = await prisma.customerStory.findUnique({
        where: { slug: finalSlug },
      });
      if (!existing) break;
      finalSlug = `${createData.slug}-${counter}`;
      counter++;
    }
    createData.slug = finalSlug;

    const newStory = await prisma.customerStory.create({
      data: createData,
      include: {
        project: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ story: newStory }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create customer story:", error);
    if (error?.status === 401 || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to create customer story" }, { status: 500 });
  }
}
