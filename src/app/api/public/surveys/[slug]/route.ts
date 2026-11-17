import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { FollowUpQuestion, ScoringConfig, SurveyType, SurveyStatus } from "@/types/surveys";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/**
 * GET: Retrieves a public survey by slug (or id) for respondents.
 * Does NOT require authentication. Increments viewsCount asynchronously.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json({ error: "Survey slug is required." }, { status: 400 });
    }

    // Lookup by slug or by cuid id
    const survey = await prisma.survey.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        slug: true,
        description: true,
        type: true,
        status: true,
        welcomeHeading: true,
        welcomeText: true,
        primaryPrompt: true,
        feedbackPrompt: true,
        feedbackRequired: true,
        thankYouHeading: true,
        thankYouMessage: true,
        redirectUrl: true,
        accentColor: true,
        theme: true,
        customLogoUrl: true,
        showBranding: true,
        collectName: true,
        nameRequired: true,
        collectEmail: true,
        emailRequired: true,
        collectCompany: true,
        companyRequired: true,
        questionsJson: true,
        scoringConfigJson: true,
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    }

    // Increment viewsCount in the background without blocking
    prisma.survey
      .update({
        where: { id: survey.id },
        data: { viewsCount: { increment: 1 } },
      })
      .catch(() => {});

    let questions: FollowUpQuestion[] = [];
    try {
      questions = survey.questionsJson ? JSON.parse(survey.questionsJson) : [];
    } catch {
      questions = [];
    }

    let scoringConfig: ScoringConfig | null = null;
    try {
      scoringConfig = survey.scoringConfigJson ? JSON.parse(survey.scoringConfigJson) : null;
    } catch {
      scoringConfig = null;
    }

    return NextResponse.json({
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        slug: survey.slug,
        description: survey.description,
        type: survey.type as SurveyType,
        status: survey.status as SurveyStatus,
        welcomeHeading: survey.welcomeHeading,
        welcomeText: survey.welcomeText,
        primaryPrompt: survey.primaryPrompt,
        feedbackPrompt: survey.feedbackPrompt,
        feedbackRequired: survey.feedbackRequired,
        thankYouHeading: survey.thankYouHeading,
        thankYouMessage: survey.thankYouMessage,
        redirectUrl: survey.redirectUrl,
        accentColor: survey.accentColor,
        theme: survey.theme,
        customLogoUrl: survey.customLogoUrl,
        showBranding: survey.showBranding,
        collectName: survey.collectName,
        nameRequired: survey.nameRequired,
        collectEmail: survey.collectEmail,
        emailRequired: survey.emailRequired,
        collectCompany: survey.collectCompany,
        companyRequired: survey.companyRequired,
        questions,
        scoringConfig,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load survey." },
      { status: 500 }
    );
  }
}
