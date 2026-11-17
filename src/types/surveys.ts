export type SurveyType = "NPS" | "CSAT" | "CES" | "FIVE_STAR" | "CUSTOM";

export type SurveyStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";

export type FollowUpQuestionType =
  | "TEXT"
  | "LONG_TEXT"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "RATING"
  | "BOOLEAN"
  | "DROPDOWN";

export interface FollowUpQuestion {
  id: string;
  label: string;
  description?: string;
  placeholder?: string;
  type: FollowUpQuestionType;
  isRequired: boolean;
  options?: string[];
  minRating?: number;
  maxRating?: number;
  orderIndex: number;
}

export interface ScoringConfig {
  minLabel?: string;
  maxLabel?: string;
  midLabel?: string;
  showNumericValues?: boolean;
}

export interface SurveyDetail {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  type: SurveyType;
  status: SurveyStatus;

  // Introductory & Branding Content
  welcomeHeading?: string | null;
  welcomeText?: string | null;
  primaryPrompt: string;
  feedbackPrompt?: string | null;
  feedbackRequired: boolean;
  thankYouHeading?: string | null;
  thankYouMessage?: string | null;
  redirectUrl?: string | null;

  // Appearance & Theme
  accentColor?: string | null;
  theme?: string | null;
  customLogoUrl?: string | null;
  showBranding: boolean;

  // Respondent Info Collection
  collectName: boolean;
  nameRequired: boolean;
  collectEmail: boolean;
  emailRequired: boolean;
  collectCompany: boolean;
  companyRequired: boolean;

  // Follow-up Questions & Scoring
  questions: FollowUpQuestion[];
  scoringConfig?: ScoringConfig | null;

  viewsCount: number;
  submissionsCount: number;
  averageScore?: number | null;
  totalResponses?: number;

  createdAt: string;
  updatedAt: string;
}

export interface SurveyResponseItem {
  id: string;
  surveyId: string;
  workspaceId: string;
  score: number | null;
  scoreType: SurveyType;
  feedback?: string | null;
  answers: Record<string, any>;
  respondentName?: string | null;
  respondentEmail?: string | null;
  respondentCompany?: string | null;
  metadata?: Record<string, any> | null;
  submittedAt: string;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  type: SurveyType;
  category: "Loyalty" | "Satisfaction" | "Effort" | "Review" | "Product";
  badge: string;
  primaryPrompt: string;
  feedbackPrompt: string;
  welcomeHeading: string;
  welcomeText: string;
  thankYouHeading: string;
  thankYouMessage: string;
  accentColor: string;
  theme: string;
  questions: Array<Omit<FollowUpQuestion, "id"> & { id?: string }>;
  scoringConfig?: ScoringConfig;
}

/**
 * Validates survey score ranges strictly according to industry metrics.
 */
export function validateScore(
  type: SurveyType,
  score: number | null | undefined
): { isValid: boolean; error?: string } {
  if (score === null || score === undefined || typeof score !== "number" || Number.isNaN(score)) {
    return { isValid: false, error: "A valid score rating is required." };
  }

  if (!Number.isInteger(score)) {
    return { isValid: false, error: "Score must be an integer." };
  }

  switch (type) {
    case "NPS":
      if (score < 0 || score > 10) {
        return { isValid: false, error: "NPS score must be an integer between 0 and 10." };
      }
      return { isValid: true };

    case "CSAT":
      if (score < 1 || score > 5) {
        return { isValid: false, error: "CSAT score must be an integer between 1 and 5." };
      }
      return { isValid: true };

    case "CES":
      if (score < 1 || score > 7) {
        return { isValid: false, error: "Customer Effort Score must be an integer between 1 and 7." };
      }
      return { isValid: true };

    case "FIVE_STAR":
      if (score < 1 || score > 5) {
        return { isValid: false, error: "Star rating must be an integer between 1 and 5." };
      }
      return { isValid: true };

    case "CUSTOM":
      if (score < 0 || score > 100) {
        return { isValid: false, error: "Score must be between 0 and 100." };
      }
      return { isValid: true };

    default:
      return { isValid: true };
  }
}

/**
 * Validates follow-up question responses against their definition and required constraints.
 */
export function validateFollowUpAnswers(
  questions: FollowUpQuestion[],
  answers: Record<string, any>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const q of questions) {
    const val = answers[q.id];

    if (q.isRequired) {
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
        errors[q.id] = `"${q.label}" is required.`;
        continue;
      }
    }

    if (val !== undefined && val !== null && val !== "") {
      switch (q.type) {
        case "SINGLE_CHOICE":
        case "DROPDOWN":
          if (q.options && q.options.length > 0 && typeof val === "string" && !q.options.includes(val)) {
            errors[q.id] = `Please select an option from the list.`;
          }
          break;

        case "MULTIPLE_CHOICE":
          if (Array.isArray(val) && q.options && q.options.length > 0) {
            const invalidOption = val.find((v) => !q.options?.includes(v));
            if (invalidOption) {
              errors[q.id] = `Invalid selection: ${invalidOption}`;
            }
          }
          break;

        case "RATING": {
          const num = Number(val);
          const min = q.minRating ?? 1;
          const max = q.maxRating ?? 5;
          if (Number.isNaN(num) || num < min || num > max) {
            errors[q.id] = `Rating must be between ${min} and ${max}.`;
          }
          break;
        }

        case "BOOLEAN":
          if (typeof val !== "boolean") {
            errors[q.id] = `Response must be Yes or No.`;
          }
          break;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculates Net Promoter Score (NPS = % Promoters - % Detractors).
 * Scale:
 * - Promoters: 9-10
 * - Passives: 7-8
 * - Detractors: 0-6
 */
export function calculateNps(scores: number[]): {
  nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  promoterPct: number;
  passivePct: number;
  detractorPct: number;
} {
  const validScores = scores.filter((s) => typeof s === "number" && s >= 0 && s <= 10);
  const total = validScores.length;

  if (total === 0) {
    return {
      nps: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      total: 0,
      promoterPct: 0,
      passivePct: 0,
      detractorPct: 0,
    };
  }

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const s of validScores) {
    if (s >= 9) promoters++;
    else if (s >= 7) passives++;
    else detractors++;
  }

  const promoterPct = Math.round((promoters / total) * 100);
  const passivePct = Math.round((passives / total) * 100);
  const detractorPct = Math.round((detractors / total) * 100);
  const nps = promoterPct - detractorPct;

  return {
    nps,
    promoters,
    passives,
    detractors,
    total,
    promoterPct,
    passivePct,
    detractorPct,
  };
}

/**
 * Calculates Customer Satisfaction (CSAT) percentage (ratings 4 and 5 out of 5).
 */
export function calculateCsat(scores: number[]): {
  csatPercentage: number;
  satisfied: number;
  total: number;
  average: number;
} {
  const valid = scores.filter((s) => typeof s === "number" && s >= 1 && s <= 5);
  const total = valid.length;

  if (total === 0) {
    return { csatPercentage: 0, satisfied: 0, total: 0, average: 0 };
  }

  const satisfied = valid.filter((s) => s >= 4).length;
  const csatPercentage = Math.round((satisfied / total) * 100);
  const sum = valid.reduce((acc, curr) => acc + curr, 0);
  const average = Number((sum / total).toFixed(1));

  return { csatPercentage, satisfied, total, average };
}

/**
 * Calculates Customer Effort Score (CES) average and distribution.
 */
export function calculateCes(scores: number[]): {
  average: number;
  lowEffortCount: number;
  total: number;
  lowEffortPct: number;
} {
  const valid = scores.filter((s) => typeof s === "number" && s >= 1 && s <= 7);
  const total = valid.length;

  if (total === 0) {
    return { average: 0, lowEffortCount: 0, total: 0, lowEffortPct: 0 };
  }

  // On standard CES scale (1-7), 5, 6, 7 represent "low effort" (agree the task was easy)
  const lowEffortCount = valid.filter((s) => s >= 5).length;
  const lowEffortPct = Math.round((lowEffortCount / total) * 100);
  const sum = valid.reduce((acc, curr) => acc + curr, 0);
  const average = Number((sum / total).toFixed(1));

  return { average, lowEffortCount, total, lowEffortPct };
}
