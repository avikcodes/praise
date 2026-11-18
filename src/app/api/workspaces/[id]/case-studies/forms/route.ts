import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { DEFAULT_QUESTIONS_CONFIG } from "@/lib/case-studies/templates";
import { CaseStudyFormDetail, CaseStudyQuestionsConfig } from "@/lib/case-studies/types";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * GET: Lists all case study forms for a workspace.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const brandId = searchParams.get("brandId");

    const where: any = { workspaceId };
    if (projectId) where.projectId = projectId;
    if (brandId) where.brandId = brandId;

    const forms = await prisma.caseStudyForm.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        _count: { select: { responses: true } },
      },
    });

    const formatted: CaseStudyFormDetail[] = forms.map((f) => {
      let questionsConfig: CaseStudyQuestionsConfig = DEFAULT_QUESTIONS_CONFIG;
      if (f.questionsConfigJson) {
        try {
          questionsConfig = {
            ...DEFAULT_QUESTIONS_CONFIG,
            ...JSON.parse(f.questionsConfigJson),
          };
        } catch {}
      }

      return {
        id: f.id,
        workspaceId: f.workspaceId,
        projectId: f.projectId,
        projectName: f.project?.name || null,
        brandId: f.brandId,
        brandName: f.brand?.name || null,
        templateId: f.templateId,
        templateName: f.template?.name || null,
        templateType: f.templateType,
        title: f.title,
        slug: f.slug,
        description: f.description,
        status: f.status as any,
        accentColor: f.accentColor || "#7049D8",
        theme: f.theme || "warm",
        customLogoUrl: f.customLogoUrl,
        showBranding: f.showBranding,
        welcomeHeading: f.welcomeHeading || "Share Your Success Story",
        welcomeText: f.welcomeText || "Help others understand how our product helped your team achieve real results.",
        thankYouHeading: f.thankYouHeading || "Thank You for Sharing Your Story!",
        thankYouText: f.thankYouText || "We appreciate your time and transparency. We will review your submission shortly.",
        redirectUrl: f.redirectUrl,
        collectCustomerBackground: f.collectCustomerBackground,
        collectCompanyRole: f.collectCompanyRole,
        collectInitialProblem: f.collectInitialProblem,
        collectPreviousSolution: f.collectPreviousSolution,
        collectProductImplementation: f.collectProductImplementation,
        collectExperience: f.collectExperience,
        collectResultsAchieved: f.collectResultsAchieved,
        collectMeasurableOutcomes: f.collectMeasurableOutcomes,
        collectQuotes: f.collectQuotes,
        allowImages: f.allowImages,
        allowVideo: f.allowVideo,
        collectConsent: f.collectConsent,
        consentRequired: f.consentRequired,
        consentText: f.consentText,
        questionsConfig,
        submissionsCount: f._count.responses,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ forms: formatted });
  } catch (error: any) {
    console.error("Error fetching case study forms:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch case study forms" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST: Create a new case study form.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const {
      title,
      slug: customSlug,
      description,
      projectId,
      brandId,
      templateId,
      templateType = "SAAS_GROWTH",
      accentColor = "#7049D8",
      theme = "warm",
      customLogoUrl,
      showBranding = true,
      welcomeHeading = "Share Your Success Story",
      welcomeText = "Help others understand how our product helped your team achieve real results.",
      thankYouHeading = "Thank You for Sharing Your Story!",
      thankYouText = "We appreciate your time and transparency. We will review your submission shortly.",
      redirectUrl,
      collectCustomerBackground = true,
      collectCompanyRole = true,
      collectInitialProblem = true,
      collectPreviousSolution = true,
      collectProductImplementation = true,
      collectExperience = true,
      collectResultsAchieved = true,
      collectMeasurableOutcomes = true,
      collectQuotes = true,
      allowImages = true,
      allowVideo = true,
      collectConsent = true,
      consentRequired = true,
      consentText = "I grant permission to publish this case study, business results, and company quotes for marketing purposes.",
      questionsConfig,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Form title is required" }, { status: 400 });
    }

    // Determine slug
    let baseSlug = customSlug ? generateSlug(customSlug) : generateSlug(title);
    if (!baseSlug) baseSlug = `case-study-${Date.now().toString().slice(-6)}`;

    // Ensure slug uniqueness within workspace
    let finalSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await prisma.caseStudyForm.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug: finalSlug,
          },
        },
      });
      if (!existing) break;
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Optional Project validation
    if (projectId) {
      const proj = await prisma.project.findFirst({
        where: { id: projectId, workspaceId },
      });
      if (!proj) {
        return NextResponse.json({ error: "Project not found in this workspace" }, { status: 400 });
      }
    }

    // Optional Brand validation
    if (brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: brandId, workspaceId },
      });
      if (!brand) {
        return NextResponse.json({ error: "Brand profile not found in this workspace" }, { status: 400 });
      }
    }

    const created = await prisma.caseStudyForm.create({
      data: {
        workspaceId,
        projectId: projectId || null,
        brandId: brandId || null,
        templateId: templateId || null,
        templateType,
        title: title.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        status: "ACTIVE",
        accentColor,
        theme,
        customLogoUrl: customLogoUrl || null,
        showBranding,
        welcomeHeading,
        welcomeText,
        thankYouHeading,
        thankYouText,
        redirectUrl: redirectUrl || null,
        collectCustomerBackground,
        collectCompanyRole,
        collectInitialProblem,
        collectPreviousSolution,
        collectProductImplementation,
        collectExperience,
        collectResultsAchieved,
        collectMeasurableOutcomes,
        collectQuotes,
        allowImages,
        allowVideo,
        collectConsent,
        consentRequired,
        consentText,
        questionsConfigJson: questionsConfig ? JSON.stringify(questionsConfig) : null,
      },
      include: {
        project: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      {
        form: {
          ...created,
          projectName: created.project?.name || null,
          brandName: created.brand?.name || null,
          templateName: created.template?.name || null,
          questionsConfig: questionsConfig || DEFAULT_QUESTIONS_CONFIG,
          submissionsCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating case study form:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create case study form" },
      { status: error.status || 500 }
    );
  }
}
