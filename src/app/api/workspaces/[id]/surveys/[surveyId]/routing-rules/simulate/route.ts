import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { isRuleMatching } from "@/types/routing";
import { SurveyType } from "@/types/surveys";

type RouteParams = {
  params: Promise<{ id: string; surveyId: string }>;
};

/**
 * POST: Dry-run / simulate a routing rule against past survey responses.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, surveyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const { rule } = body;

    if (!rule) {
      return NextResponse.json({ error: "Rule definition required for simulation." }, { status: 400 });
    }

    // Load recent responses for this survey
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId, workspaceId },
      orderBy: { submittedAt: "desc" },
      take: 20,
    });

    const simulationResults = responses.map((r) => {
      const match = isRuleMatching(
        {
          isEnabled: true, // test as enabled
          triggerCondition: rule.triggerCondition,
          minScore: rule.minScore,
          maxScore: rule.maxScore,
          requireFeedback: rule.requireFeedback,
          keywordContains: rule.keywordContains,
          requireEmail: rule.requireEmail,
        },
        {
          score: r.score,
          scoreType: r.scoreType as SurveyType,
          feedback: r.feedback,
          respondentEmail: r.respondentEmail,
        }
      );

      return {
        responseId: r.id,
        score: r.score,
        scoreType: r.scoreType,
        feedback: r.feedback,
        respondentEmail: r.respondentEmail,
        matched: match.matched,
        reason: match.reason || (match.matched ? "Conditions matched successfully" : undefined),
      };
    });

    const totalMatched = simulationResults.filter((r) => r.matched).length;

    return NextResponse.json({
      success: true,
      totalTested: responses.length,
      totalMatched,
      results: simulationResults,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Simulation failed." },
      { status: error?.status || 500 }
    );
  }
}
