import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  RoutingActionType,
  RoutingTriggerCondition,
  ActionConfig,
} from "@/types/routing";

type RouteParams = {
  params: Promise<{ id: string; surveyId: string; ruleId: string }>;
};

/**
 * PUT: Updates a routing rule (condition, actions, enabled toggle).
 */
export async function PUT(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, ruleId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const existing = await prisma.surveyRoutingRule.findFirst({
      where: { id: ruleId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Routing rule not found." }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      isEnabled,
      priority,
      triggerCondition,
      minScore,
      maxScore,
      requireFeedback,
      keywordContains,
      requireEmail,
      actionType,
      actionConfig,
      applyToAllSurveys,
    } = body;

    const updated = await prisma.surveyRoutingRule.update({
      where: { id: ruleId },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? description?.trim() || null : existing.description,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : existing.isEnabled,
        priority: priority !== undefined ? Number(priority) : existing.priority,
        triggerCondition:
          triggerCondition !== undefined
            ? (triggerCondition as RoutingTriggerCondition)
            : existing.triggerCondition,
        minScore: minScore !== undefined ? (minScore !== null ? Number(minScore) : null) : existing.minScore,
        maxScore: maxScore !== undefined ? (maxScore !== null ? Number(maxScore) : null) : existing.maxScore,
        requireFeedback:
          requireFeedback !== undefined ? Boolean(requireFeedback) : existing.requireFeedback,
        keywordContains:
          keywordContains !== undefined ? keywordContains?.trim() || null : existing.keywordContains,
        requireEmail: requireEmail !== undefined ? Boolean(requireEmail) : existing.requireEmail,
        actionType:
          actionType !== undefined ? (actionType as RoutingActionType) : existing.actionType,
        actionConfigJson:
          actionConfig !== undefined ? JSON.stringify(actionConfig) : existing.actionConfigJson,
        surveyId:
          applyToAllSurveys !== undefined
            ? applyToAllSurveys
              ? null
              : existing.surveyId
            : existing.surveyId,
      },
    });

    let parsedActionConfig: ActionConfig | null = null;
    try {
      parsedActionConfig = updated.actionConfigJson ? JSON.parse(updated.actionConfigJson) : null;
    } catch {
      parsedActionConfig = null;
    }

    return NextResponse.json({
      success: true,
      rule: {
        ...updated,
        actionConfig: parsedActionConfig,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update routing rule." },
      { status: error?.status || 500 }
    );
  }
}

/**
 * DELETE: Deletes a routing rule and preserves audit logs.
 */
export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, ruleId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const existing = await prisma.surveyRoutingRule.findFirst({
      where: { id: ruleId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Routing rule not found." }, { status: 404 });
    }

    await prisma.surveyRoutingRule.delete({
      where: { id: ruleId },
    });

    return NextResponse.json({ success: true, message: "Rule deleted successfully." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete rule." },
      { status: error?.status || 500 }
    );
  }
}
