import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { SurveyType, SurveyStatus, FollowUpQuestion, ScoringConfig } from "@/types/surveys";

type RouteParams = {
  params: Promise<{ id: string; surveyId: string }>;
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
 * GET: Retrieves a survey by ID with response counts and statistics.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, surveyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        workspaceId,
      },
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

    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    }

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

    const scores = survey.responses
      .map((r) => r.score)
      .filter((s): s is number => typeof s === "number");

    const averageScore =
      scores.length > 0
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : null;

    return NextResponse.json({
      success: true,
      survey: {
        ...survey,
        type: survey.type as SurveyType,
        status: survey.status as SurveyStatus,
        questions,
        scoringConfig,
        totalResponses: survey.responses.length,
        averageScore,
        createdAt: survey.createdAt.toISOString(),
        updatedAt: survey.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve survey." },
      { status: error?.status || 500 }
    );
  }
}

/**
 * PUT: Updates survey configuration, introductory content, questions, and status.
 */
export async function PUT(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, surveyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const existing = await prisma.survey.findFirst({
      where: { id: surveyId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Survey not found in this workspace." }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      slug: requestedSlug,
      description,
      type,
      status,
      welcomeHeading,
      welcomeText,
      primaryPrompt,
      feedbackPrompt,
      feedbackRequired,
      thankYouHeading,
      thankYouMessage,
      redirectUrl,
      accentColor,
      theme,
      customLogoUrl,
      showBranding,
      collectName,
      nameRequired,
      collectEmail,
      emailRequired,
      collectCompany,
      companyRequired,
      questions,
      scoringConfig,
      projectId,
    } = body;

    // Slug validation / deduplication if changed
    let finalSlug = existing.slug;
    if (requestedSlug && requestedSlug !== existing.slug) {
      let candidateSlug = generateSlug(requestedSlug);
      if (!candidateSlug) candidateSlug = existing.slug;

      const slugClash = await prisma.survey.findFirst({
        where: {
          workspaceId,
          slug: candidateSlug,
          id: { not: surveyId },
        },
      });

      if (slugClash) {
        return NextResponse.json(
          { error: `The slug "${candidateSlug}" is already taken in this workspace.` },
          { status: 400 }
        );
      }
      finalSlug = candidateSlug;
    }

    const updated = await prisma.survey.update({
      where: { id: surveyId },
      data: {
        title: title !== undefined ? title.trim() : existing.title,
        slug: finalSlug,
        description: description !== undefined ? description?.trim() || null : existing.description,
        type: type !== undefined ? (type as SurveyType) : existing.type,
        status: status !== undefined ? (status as SurveyStatus) : existing.status,
        welcomeHeading: welcomeHeading !== undefined ? welcomeHeading : existing.welcomeHeading,
        welcomeText: welcomeText !== undefined ? welcomeText : existing.welcomeText,
        primaryPrompt: primaryPrompt !== undefined ? primaryPrompt : existing.primaryPrompt,
        feedbackPrompt: feedbackPrompt !== undefined ? feedbackPrompt : existing.feedbackPrompt,
        feedbackRequired:
          feedbackRequired !== undefined ? Boolean(feedbackRequired) : existing.feedbackRequired,
        thankYouHeading: thankYouHeading !== undefined ? thankYouHeading : existing.thankYouHeading,
        thankYouMessage: thankYouMessage !== undefined ? thankYouMessage : existing.thankYouMessage,
        redirectUrl: redirectUrl !== undefined ? redirectUrl?.trim() || null : existing.redirectUrl,
        accentColor: accentColor !== undefined ? accentColor : existing.accentColor,
        theme: theme !== undefined ? theme : existing.theme,
        customLogoUrl: customLogoUrl !== undefined ? customLogoUrl : existing.customLogoUrl,
        showBranding: showBranding !== undefined ? Boolean(showBranding) : existing.showBranding,
        collectName: collectName !== undefined ? Boolean(collectName) : existing.collectName,
        nameRequired: nameRequired !== undefined ? Boolean(nameRequired) : existing.nameRequired,
        collectEmail: collectEmail !== undefined ? Boolean(collectEmail) : existing.collectEmail,
        emailRequired: emailRequired !== undefined ? Boolean(emailRequired) : existing.emailRequired,
        collectCompany: collectCompany !== undefined ? Boolean(collectCompany) : existing.collectCompany,
        companyRequired:
          companyRequired !== undefined ? Boolean(companyRequired) : existing.companyRequired,
        questionsJson:
          questions !== undefined ? JSON.stringify(questions) : existing.questionsJson,
        scoringConfigJson:
          scoringConfig !== undefined ? JSON.stringify(scoringConfig) : existing.scoringConfigJson,
        projectId: projectId !== undefined ? projectId || null : existing.projectId,
      },
    });

    let parsedQuestions: FollowUpQuestion[] = [];
    try {
      parsedQuestions = updated.questionsJson ? JSON.parse(updated.questionsJson) : [];
    } catch {
      parsedQuestions = [];
    }

    let parsedScoringConfig: ScoringConfig | null = null;
    try {
      parsedScoringConfig = updated.scoringConfigJson
        ? JSON.parse(updated.scoringConfigJson)
        : null;
    } catch {
      parsedScoringConfig = null;
    }

    return NextResponse.json({
      success: true,
      survey: {
        ...updated,
        questions: parsedQuestions,
        scoringConfig: parsedScoringConfig,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update survey." },
      { status: error?.status || 500 }
    );
  }
}

/**
 * DELETE: Deletes a survey and cascades all responses.
 */
export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, surveyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const existing = await prisma.survey.findFirst({
      where: { id: surveyId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    }

    await prisma.survey.delete({
      where: { id: surveyId },
    });

    return NextResponse.json({ success: true, message: "Survey deleted successfully." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete survey." },
      { status: error?.status || 500 }
    );
  }
}
