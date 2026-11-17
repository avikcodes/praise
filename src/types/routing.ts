import type { SurveyType } from "./surveys.ts";

export type RoutingActionType =
  | "REQUEST_TESTIMONIAL"
  | "INTERNAL_INBOX"
  | "CUSTOMER_SUCCESS_FOLLOWUP"
  | "NOTIFY_TEAM";

export type RoutingTriggerCondition =
  | "NPS_PROMOTER"
  | "NPS_PASSIVE"
  | "NPS_DETRACTOR"
  | "CSAT_SATISFIED"
  | "CSAT_NEUTRAL"
  | "CSAT_DISSATISFIED"
  | "CES_LOW_EFFORT"
  | "CES_HIGH_EFFORT"
  | "FIVE_STAR_HIGH"
  | "FIVE_STAR_LOW"
  | "SCORE_BETWEEN"
  | "ALWAYS";

export type RoutingLogStatus = "SUCCESS" | "SKIPPED" | "FAILED";

export interface ActionConfig {
  targetCollectionFormSlug?: string;
  targetCollectionFormId?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  tags?: string[];
  notificationEmail?: string;
  internalNote?: string;
  redirectUrl?: string;
  testimonialPrompt?: string;
}

export interface SurveyRoutingRuleDetail {
  id: string;
  workspaceId: string;
  surveyId?: string | null;
  name: string;
  description?: string | null;
  isEnabled: boolean;
  priority: number;

  // Condition
  triggerCondition: RoutingTriggerCondition;
  minScore?: number | null;
  maxScore?: number | null;
  requireFeedback: boolean;
  keywordContains?: string | null;
  requireEmail: boolean;
  customFilterJson?: string | null;

  // Action
  actionType: RoutingActionType;
  actionConfig?: ActionConfig | null;

  createdAt: string;
  updatedAt: string;
}

export interface SurveyRoutingLogItem {
  id: string;
  workspaceId: string;
  surveyId: string;
  responseId: string;
  ruleId?: string | null;
  ruleName: string;
  actionType: RoutingActionType;
  status: RoutingLogStatus;
  reason?: string | null;
  actionPayload?: Record<string, any> | null;
  executedAt: string;
}

/**
 * Checks if a response matches a routing rule's conditions.
 */
export function isRuleMatching(
  rule: Partial<SurveyRoutingRuleDetail>,
  response: {
    score: number | null;
    scoreType: SurveyType;
    feedback?: string | null;
    respondentEmail?: string | null;
    answers?: Record<string, any>;
  }
): { matched: boolean; reason?: string } {
  if (rule.isEnabled === false) {
    return { matched: false, reason: "Rule is disabled." };
  }

  const score = response.score;
  const condition = rule.triggerCondition || "ALWAYS";

  // 1. Condition check based on score & methodology
  switch (condition) {
    case "NPS_PROMOTER":
      if (score === null || score < 9) {
        return { matched: false, reason: `NPS score (${score}) is not a promoter (requires >= 9).` };
      }
      break;

    case "NPS_PASSIVE":
      if (score === null || score < 7 || score > 8) {
        return { matched: false, reason: `NPS score (${score}) is not passive (requires 7 or 8).` };
      }
      break;

    case "NPS_DETRACTOR":
      if (score === null || score > 6) {
        return { matched: false, reason: `NPS score (${score}) is not a detractor (requires <= 6).` };
      }
      break;

    case "CSAT_SATISFIED":
      if (score === null || score < 4) {
        return { matched: false, reason: `CSAT rating (${score}) is not satisfied (requires >= 4).` };
      }
      break;

    case "CSAT_NEUTRAL":
      if (score === null || score !== 3) {
        return { matched: false, reason: `CSAT rating (${score}) is not neutral (requires 3).` };
      }
      break;

    case "CSAT_DISSATISFIED":
      if (score === null || score > 2) {
        return { matched: false, reason: `CSAT rating (${score}) is not dissatisfied (requires <= 2).` };
      }
      break;

    case "CES_LOW_EFFORT":
      if (score === null || score < 5) {
        return { matched: false, reason: `CES score (${score}) is not low-effort (requires >= 5).` };
      }
      break;

    case "CES_HIGH_EFFORT":
      if (score === null || score > 3) {
        return { matched: false, reason: `CES score (${score}) is not high-effort (requires <= 3).` };
      }
      break;

    case "FIVE_STAR_HIGH":
      if (score === null || score < 4) {
        return { matched: false, reason: `Star rating (${score}) is below positive threshold (requires >= 4).` };
      }
      break;

    case "FIVE_STAR_LOW":
      if (score === null || score > 2) {
        return { matched: false, reason: `Star rating (${score}) is not negative (requires <= 2).` };
      }
      break;

    case "SCORE_BETWEEN":
      if (score === null) {
        return { matched: false, reason: "No score provided." };
      }
      if (rule.minScore !== undefined && rule.minScore !== null && score < rule.minScore) {
        return { matched: false, reason: `Score (${score}) is below minimum (${rule.minScore}).` };
      }
      if (rule.maxScore !== undefined && rule.maxScore !== null && score > rule.maxScore) {
        return { matched: false, reason: `Score (${score}) exceeds maximum (${rule.maxScore}).` };
      }
      break;

    case "ALWAYS":
      break;
  }

  // 2. Require written feedback check
  if (rule.requireFeedback) {
    if (!response.feedback || !response.feedback.trim()) {
      return { matched: false, reason: "Rule requires written feedback, none was provided." };
    }
  }

  // 3. Keyword contains check
  if (rule.keywordContains && rule.keywordContains.trim()) {
    const feedbackLower = (response.feedback || "").toLowerCase();
    const keywords = rule.keywordContains
      .toLowerCase()
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const hasMatch = keywords.some((k) => feedbackLower.includes(k));
    if (!hasMatch) {
      return {
        matched: false,
        reason: `Feedback does not contain required keywords: ${rule.keywordContains}`,
      };
    }
  }

  // 4. Require email check
  if (rule.requireEmail) {
    if (!response.respondentEmail || !response.respondentEmail.trim()) {
      return { matched: false, reason: "Rule requires respondent email address." };
    }
  }

  return { matched: true };
}
