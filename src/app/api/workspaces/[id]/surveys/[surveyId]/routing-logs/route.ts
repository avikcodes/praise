import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  RoutingActionType,
  RoutingLogStatus,
  SurveyRoutingLogItem,
} from "@/types/routing";

type RouteParams = {
  params: Promise<{ id: string; surveyId: string }>;
};

/**
 * GET: Lists auditable routing execution history for a survey.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, surveyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);

    const whereClause: any = {
      workspaceId,
      surveyId,
    };

    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    const logs = await prisma.surveyRoutingLog.findMany({
      where: whereClause,
      orderBy: { executedAt: "desc" },
      take: limit,
      include: {
        response: {
          select: {
            id: true,
            score: true,
            scoreType: true,
            feedback: true,
            respondentName: true,
            respondentEmail: true,
          },
        },
      },
    });

    const formatted: SurveyRoutingLogItem[] = logs.map((l) => {
      let actionPayload: Record<string, any> | null = null;
      try {
        actionPayload = l.actionPayloadJson ? JSON.parse(l.actionPayloadJson) : null;
      } catch {
        actionPayload = null;
      }

      return {
        id: l.id,
        workspaceId: l.workspaceId,
        surveyId: l.surveyId,
        responseId: l.responseId,
        ruleId: l.ruleId,
        ruleName: l.ruleName,
        actionType: l.actionType as RoutingActionType,
        status: l.status as RoutingLogStatus,
        reason: l.reason,
        actionPayload: {
          ...actionPayload,
          response: l.response,
        },
        executedAt: l.executedAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, logs: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load routing logs." },
      { status: error?.status || 500 }
    );
  }
}
