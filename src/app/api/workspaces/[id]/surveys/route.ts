import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { SurveyType, SurveyStatus, FollowUpQuestion, ScoringConfig } from "@/types/surveys";

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
 * GET: Lists all surveys for a workspace with response count and average score.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const surveys = await prisma.survey.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        responses: {
          select: {
            id: true,
            score: true,
            submittedAt: true,
          },
        },
      },
    });

    const formatted = surveys.map((s) => {
      let questions: FollowUpQuestion[] = [];
      try {
        questions = s.questionsJson ? JSON.parse(s.questionsJson) : [];
      } catch {
        questions = [];
      }

      let scoringConfig: ScoringConfig | null = null;
      try {
        scoringConfig = s.scoringConfigJson ? JSON.parse(s.scoringConfigJson) : null;
      } catch {
        scoringConfig = null;
      }

      const totalResponses = s.responses.length;
      const scores = s.responses
        .map((r) => r.score)
        .filter((score): score is number => typeof score === "number");

      const averageScore =
        scores.length > 0
          ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
          : null;

      return {
        id: s.id,
        workspaceId: s.workspaceId,
        projectId: s.projectId,
        title: s.title,
        slug: s.slug,
        description: s.description,
        type: s.type as SurveyType,
        status: s.status as SurveyStatus,
        welcomeHeading: s.welcomeHeading,
        welcomeText: s.welcomeText,
        primaryPrompt: s.primaryPrompt,
        feedbackPrompt: s.feedbackPrompt,
        feedbackRequired: s.feedbackRequired,
        thankYouHeading: s.thankYouHeading,
        thankYouMessage: s.thankYouMessage,
        redirectUrl: s.redirectUrl,
        accentColor: s.accentColor,
        theme: s.theme,
        customLogoUrl: s.customLogoUrl,
        showBranding: s.showBranding,
        collectName: s.collectName,
        nameRequired: s.nameRequired,
        collectEmail: s.collectEmail,
        emailRequired: s.emailRequired,
        collectCompany: s.collectCompany,
        companyRequired: s.companyRequired,
        questions,
        scoringConfig,
        viewsCount: s.viewsCount,
        submissionsCount: totalResponses > 0 ? totalResponses : s.submissionsCount,
        averageScore,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, surveys: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load surveys." },
      { status: error?.status || 500 }
    );
  }
}

/**
 * POST: Creates a new survey in the workspace.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const {
      title,
      slug: requestedSlug,
      description,
      type = "NPS",
      status = "ACTIVE",
      welcomeHeading,
      welcomeText,
      primaryPrompt,
      feedbackPrompt,
      feedbackRequired = false,
      thankYouHeading,
      thankYouMessage,
      redirectUrl,
      accentColor = "#7049D8",
      theme = "warm",
      customLogoUrl,
      showBranding = true,
      collectName = false,
      nameRequired = false,
      collectEmail = false,
      emailRequired = false,
      collectCompany = false,
      companyRequired = false,
      questions = [],
      scoringConfig,
      projectId,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Survey title is required." }, { status: 400 });
    }

    const basePrompt =
      primaryPrompt && typeof primaryPrompt === "string" && primaryPrompt.trim()
        ? primaryPrompt.trim()
        : type === "NPS"
        ? "How likely are you to recommend us to a friend or colleague?"
        : type === "CSAT"
        ? "How satisfied are you with your overall experience?"
        : type === "CES"
        ? "The company made it easy for me to handle my issue."
        : "How would you rate your experience?";

    // Generate unique slug for workspace
    let baseSlug = generateSlug(requestedSlug || title);
    if (!baseSlug) baseSlug = "survey";
    let finalSlug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await prisma.survey.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug: finalSlug,
          },
        },
        select: { id: true },
      });

      if (!existing) break;
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const survey = await prisma.survey.create({
      data: {
        workspaceId,
        projectId: projectId || null,
        title: title.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        type: (type as SurveyType) || "NPS",
        status: (status as SurveyStatus) || "ACTIVE",
        welcomeHeading: welcomeHeading || null,
        welcomeText: welcomeText || null,
        primaryPrompt: basePrompt,
        feedbackPrompt: feedbackPrompt || "What is the primary reason for your score?",
        feedbackRequired: Boolean(feedbackRequired),
        thankYouHeading: thankYouHeading || "Thank you for your feedback!",
        thankYouMessage: thankYouMessage || "Your response helps us improve our product and service.",
        redirectUrl: redirectUrl?.trim() || null,
        accentColor: accentColor || "#7049D8",
        theme: theme || "warm",
        customLogoUrl: customLogoUrl || null,
        showBranding: Boolean(showBranding),
        collectName: Boolean(collectName),
        nameRequired: Boolean(nameRequired),
        collectEmail: Boolean(collectEmail),
        emailRequired: Boolean(emailRequired),
        collectCompany: Boolean(collectCompany),
        companyRequired: Boolean(companyRequired),
        questionsJson: JSON.stringify(questions || []),
        scoringConfigJson: scoringConfig ? JSON.stringify(scoringConfig) : null,
      },
    });

    return NextResponse.json({
      success: true,
      survey: {
        ...survey,
        questions: questions || [],
        scoringConfig: scoringConfig || null,
        createdAt: survey.createdAt.toISOString(),
        updatedAt: survey.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create survey." },
      { status: error?.status || 500 }
    );
  }
}
