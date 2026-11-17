import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  RoutingActionType,
  RoutingTriggerCondition,
  ActionConfig,
  SurveyRoutingRuleDetail,
} from "@/types/routing";

type RouteParams = {
  params: Promise<{ id: string; surveyId: string }>;
};

/**
 * GET: Lists routing rules for a specific survey and workspace-wide rules.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, surveyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const rules = await prisma.surveyRoutingRule.findMany({
      where: {
        workspaceId,
        OR: [{ surveyId }, { surveyId: null }],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: { logs: true },
        },
      },
    });

    const formatted: SurveyRoutingRuleDetail[] = rules.map((r) => {
      let actionConfig: ActionConfig | null = null;
      try {
        actionConfig = r.actionConfigJson ? JSON.parse(r.actionConfigJson) : null;
      } catch {
        actionConfig = null;
      }

      return {
        id: r.id,
        workspaceId: r.workspaceId,
        surveyId: r.surveyId,
        name: r.name,
        description: r.description,
        isEnabled: r.isEnabled,
        priority: r.priority,
        triggerCondition: r.triggerCondition as RoutingTriggerCondition,
        minScore: r.minScore,
        maxScore: r.maxScore,
        requireFeedback: r.requireFeedback,
        keywordContains: r.keywordContains,
        requireEmail: r.requireEmail,
        customFilterJson: r.customFilterJson,
        actionType: r.actionType as RoutingActionType,
        actionConfig,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, rules: formatted });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load routing rules." },
      { status: error?.status || 500 }
    );
  }
}

/**
 * POST: Creates a new feedback routing rule.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, surveyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const {
      name,
      description,
      isEnabled = true,
      priority = 0,
      triggerCondition = "NPS_PROMOTER",
      minScore,
      maxScore,
      requireFeedback = false,
      keywordContains,
      requireEmail = false,
      actionType = "REQUEST_TESTIMONIAL",
      actionConfig,
      applyToAllSurveys = false,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Rule name is required." }, { status: 400 });
    }

    const rule = await prisma.surveyRoutingRule.create({
      data: {
        workspaceId,
        surveyId: applyToAllSurveys ? null : surveyId,
        name: name.trim(),
        description: description?.trim() || null,
        isEnabled: Boolean(isEnabled),
        priority: Number(priority) || 0,
        triggerCondition: triggerCondition as RoutingTriggerCondition,
        minScore: minScore !== undefined && minScore !== null ? Number(minScore) : null,
        maxScore: maxScore !== undefined && maxScore !== null ? Number(maxScore) : null,
        requireFeedback: Boolean(requireFeedback),
        keywordContains: keywordContains?.trim() || null,
        requireEmail: Boolean(requireEmail),
        actionType: actionType as RoutingActionType,
        actionConfigJson: actionConfig ? JSON.stringify(actionConfig) : null,
      },
    });

    return NextResponse.json({
      success: true,
      rule: {
        ...rule,
        actionConfig: actionConfig || null,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create routing rule." },
      { status: error?.status || 500 }
    );
  }
}
