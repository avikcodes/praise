import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { DEFAULT_QUESTIONS_CONFIG } from "@/lib/case-studies/templates";
import { CaseStudyQuestionsConfig } from "@/lib/case-studies/types";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/**
 * GET: Fetches public case study form configuration by slug.
 * Public access: No registration or login required.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { slug } = await context.params;

    const form = await prisma.caseStudyForm.findFirst({
      where: { slug },
      include: {
        workspace: { select: { id: true, name: true, logoUrl: true } },
        brand: { select: { id: true, name: true, logoUrl: true, accentColor: true } },
        project: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Case study form not found" }, { status: 404 });
    }

    if (form.status === "PAUSED") {
      return NextResponse.json(
        { error: "This case study collection form is currently paused and not accepting new responses." },
        { status: 403 }
      );
    }

    if (form.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "This case study collection form has been archived." },
        { status: 410 }
      );
    }

    let questionsConfig: CaseStudyQuestionsConfig = DEFAULT_QUESTIONS_CONFIG;
    if (form.questionsConfigJson) {
      try {
        questionsConfig = {
          ...DEFAULT_QUESTIONS_CONFIG,
          ...JSON.parse(form.questionsConfigJson),
        };
      } catch {}
    }

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        slug: form.slug,
        description: form.description,
        templateType: form.templateType,
        accentColor: form.brand?.accentColor || form.accentColor || "#7049D8",
        theme: form.theme || "warm",
        customLogoUrl: form.customLogoUrl || form.brand?.logoUrl || form.workspace.logoUrl || null,
        showBranding: form.showBranding,
        welcomeHeading: form.welcomeHeading || "Share Your Success Story",
        welcomeText: form.welcomeText || "Help others understand how our product helped your team achieve real results.",
        thankYouHeading: form.thankYouHeading || "Thank You for Sharing Your Story!",
        thankYouText: form.thankYouText || "We appreciate your time and transparency. We will review your submission shortly.",
        redirectUrl: form.redirectUrl,
        workspaceName: form.workspace.name,
        brandName: form.brand?.name || null,
        projectName: form.project?.name || null,

        // Section Toggles
        collectCustomerBackground: form.collectCustomerBackground,
        collectCompanyRole: form.collectCompanyRole,
        collectInitialProblem: form.collectInitialProblem,
        collectPreviousSolution: form.collectPreviousSolution,
        collectProductImplementation: form.collectProductImplementation,
        collectExperience: form.collectExperience,
        collectResultsAchieved: form.collectResultsAchieved,
        collectMeasurableOutcomes: form.collectMeasurableOutcomes,
        collectQuotes: form.collectQuotes,
        allowImages: form.allowImages,
        allowVideo: form.allowVideo,
        collectConsent: form.collectConsent,
        consentRequired: form.consentRequired,
        consentText: form.consentText,

        questionsConfig,
      },
    });
  } catch (error: any) {
    console.error("Error fetching public case study form:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load case study form" },
      { status: 500 }
    );
  }
}
