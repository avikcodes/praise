import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { calculateNps, calculateCsat, calculateCes, SurveyType } from "@/types/surveys";

type RouteParams = {
  params: Promise<{ id: string; surveyId: string }>;
};

/**
 * GET: Lists all responses and aggregate metrics for a survey.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, surveyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, workspaceId },
      select: {
        id: true,
        title: true,
        type: true,
        slug: true,
        questionsJson: true,
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const scoreFilter = searchParams.get("score");
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);

    const whereClause: any = {
      surveyId,
      workspaceId,
    };

    if (scoreFilter !== null && scoreFilter !== "") {
      whereClause.score = Number(scoreFilter);
    }

    const responses = await prisma.surveyResponse.findMany({
      where: whereClause,
      orderBy: { submittedAt: "desc" },
      take: limit,
    });

    // All scores for complete metric computation
    const allScoresRecords = await prisma.surveyResponse.findMany({
      where: { surveyId, workspaceId },
      select: { score: true },
    });

    const scores = allScoresRecords
      .map((r) => r.score)
      .filter((s): s is number => typeof s === "number");

    // Metrics computation based on survey type
    let metrics: any = {
      totalResponses: allScoresRecords.length,
      averageScore:
        scores.length > 0
          ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
          : 0,
    };

    if (survey.type === "NPS") {
      metrics.nps = calculateNps(scores);
    } else if (survey.type === "CSAT") {
      metrics.csat = calculateCsat(scores);
    } else if (survey.type === "CES") {
      metrics.ces = calculateCes(scores);
    }

    // Score distribution (frequency of each score)
    const scoreDistribution: Record<number, number> = {};
    for (const s of scores) {
      scoreDistribution[s] = (scoreDistribution[s] || 0) + 1;
    }
    metrics.scoreDistribution = scoreDistribution;

    const formattedResponses = responses.map((r) => {
      let answers: Record<string, any> = {};
      try {
        answers = r.answersJson ? JSON.parse(r.answersJson) : {};
      } catch {
        answers = {};
      }

      let metadata: Record<string, any> | null = null;
      try {
        metadata = r.metadataJson ? JSON.parse(r.metadataJson) : null;
      } catch {
        metadata = null;
      }

      return {
        id: r.id,
        surveyId: r.surveyId,
        score: r.score,
        scoreType: r.scoreType as SurveyType,
        feedback: r.feedback,
        answers,
        respondentName: r.respondentName,
        respondentEmail: r.respondentEmail,
        respondentCompany: r.respondentCompany,
        metadata,
        submittedAt: r.submittedAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      survey: {
        id: survey.id,
        title: survey.title,
        type: survey.type,
        slug: survey.slug,
      },
      metrics,
      responses: formattedResponses,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve responses." },
      { status: error?.status || 500 }
    );
  }
}
