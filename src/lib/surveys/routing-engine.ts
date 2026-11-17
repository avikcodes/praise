import { prisma } from "../db/client.ts";
import type {
  RoutingActionType,
  RoutingLogStatus,
  ActionConfig,
} from "../../types/routing.ts";
import { isRuleMatching } from "../../types/routing.ts";
import type { SurveyType } from "../../types/surveys.ts";

export interface RoutingExecutionInput {
  workspaceId: string;
  surveyId: string;
  responseId: string;
}

export interface RoutingExecutionResult {
  executedRules: number;
  results: Array<{
    ruleId: string;
    ruleName: string;
    actionType: RoutingActionType;
    status: RoutingLogStatus;
    reason?: string;
  }>;
}

/**
 * Checks if a score is genuinely positive across survey methodologies.
 * Prevents turning negative or neutral feedback into testimonials.
 */
function isPositiveFeedback(type: SurveyType, score: number | null): boolean {
  if (score === null || score === undefined) return false;
  switch (type) {
    case "NPS":
      return score >= 9; // Only Promoters (9-10)
    case "CSAT":
      return score >= 4; // Satisfied (4-5)
    case "CES":
      return score >= 5; // Low Effort (5-7)
    case "FIVE_STAR":
      return score >= 4; // 4-5 Stars
    default:
      return score >= 70;
  }
}

/**
 * Core Survey Response Routing Engine.
 * Evaluates rules, enforces safety constraints, prevents duplicates, and logs execution history.
 * GUARANTEE: Never throws or fails the parent survey response submission.
 */
export async function executeSurveyRouting({
  workspaceId,
  surveyId,
  responseId,
}: RoutingExecutionInput): Promise<RoutingExecutionResult> {
  const result: RoutingExecutionResult = {
    executedRules: 0,
    results: [],
  };

  try {
    // 1. Fetch the survey and response
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
    });

    const response = await prisma.surveyResponse.findUnique({
      where: { id: responseId },
    });

    if (!survey || !response) {
      return result;
    }

    // 2. Fetch active routing rules (both survey-specific and workspace-wide)
    const rules = await prisma.surveyRoutingRule.findMany({
      where: {
        workspaceId,
        isEnabled: true,
        OR: [{ surveyId }, { surveyId: null }],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    if (rules.length === 0) {
      return result;
    }

    let parsedAnswers: Record<string, any> = {};
    try {
      parsedAnswers = response.answersJson ? JSON.parse(response.answersJson) : {};
    } catch {
      parsedAnswers = {};
    }

    // 3. Evaluate each rule in priority order
    for (const rule of rules) {
      // IDEMPOTENCY CHECK: Prevent duplicate actions for the same response
      const existingLog = await prisma.surveyRoutingLog.findUnique({
        where: {
          responseId_ruleId: {
            responseId: response.id,
            ruleId: rule.id,
          },
        },
      });

      if (existingLog) {
        result.results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actionType: rule.actionType,
          status: "SKIPPED",
          reason: "Duplicate prevented: Rule was already executed for this response.",
        });
        continue;
      }

      // Check if response matches rule condition
      const match = isRuleMatching(
        {
          isEnabled: rule.isEnabled,
          triggerCondition: rule.triggerCondition,
          minScore: rule.minScore,
          maxScore: rule.maxScore,
          requireFeedback: rule.requireFeedback,
          keywordContains: rule.keywordContains,
          requireEmail: rule.requireEmail,
        },
        {
          score: response.score,
          scoreType: response.scoreType as SurveyType,
          feedback: response.feedback,
          respondentEmail: response.respondentEmail,
          answers: parsedAnswers,
        }
      );

      if (!match.matched) {
        continue;
      }

      let actionConfig: ActionConfig = {};
      try {
        actionConfig = rule.actionConfigJson ? JSON.parse(rule.actionConfigJson) : {};
      } catch {
        actionConfig = {};
      }

      let logStatus: RoutingLogStatus = "SUCCESS";
      let logReason: string | undefined = undefined;
      const actionPayload: Record<string, any> = {
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: rule.actionType,
        score: response.score,
        scoreType: response.scoreType,
        respondentEmail: response.respondentEmail,
      };

      try {
        // =====================================================================
        // ACTION 1: ROUTE POSITIVE FEEDBACK TO TESTIMONIAL REQUEST
        // =====================================================================
        if (rule.actionType === "REQUEST_TESTIMONIAL") {
          // SAFETY GATE: Do not turn negative feedback into positive testimonials!
          if (!isPositiveFeedback(response.scoreType as SurveyType, response.score)) {
            logStatus = "SKIPPED";
            logReason = `Safety Block: Cannot turn non-positive feedback (score ${response.score}) into a testimonial request.`;
          } else {
            // Find target CollectionForm (or workspace default form)
            let collectionForm = null;
            if (actionConfig.targetCollectionFormId) {
              collectionForm = await prisma.collectionForm.findFirst({
                where: { id: actionConfig.targetCollectionFormId, workspaceId },
              });
            } else if (actionConfig.targetCollectionFormSlug) {
              collectionForm = await prisma.collectionForm.findFirst({
                where: { slug: actionConfig.targetCollectionFormSlug, workspaceId },
              });
            }

            if (!collectionForm) {
              collectionForm = await prisma.collectionForm.findFirst({
                where: { workspaceId, isPublished: true },
                orderBy: { createdAt: "asc" },
              });
            }

            const testimonialRequestUrl = collectionForm
              ? `/p/${collectionForm.slug}?utm_source=survey_routing&score=${response.score || ""}`
              : null;

            // If feedback text is substantial, create an UNAPPROVED DRAFT testimonial for founder review
            // SAFETY GATE: NEVER automatically publish survey responses! Status MUST be PENDING.
            let draftTestimonialId: string | null = null;
            if (response.feedback && response.feedback.trim().length > 10) {
              let linkedCustomerId: string | null = null;
              if (response.respondentEmail) {
                const customer = await prisma.customer.upsert({
                  where: {
                    workspaceId_email: {
                      workspaceId,
                      email: response.respondentEmail.toLowerCase(),
                    },
                  },
                  create: {
                    workspaceId,
                    email: response.respondentEmail.toLowerCase(),
                    name: response.respondentName || "Survey Respondent",
                    company: response.respondentCompany || null,
                  },
                  update: {},
                });
                linkedCustomerId = customer.id;
              }

              const draft = await prisma.testimonial.create({
                data: {
                  workspaceId,
                  formId: collectionForm?.id || null,
                  customerId: linkedCustomerId,
                  content: response.feedback.trim(),
                  rating: response.score && response.score <= 5 ? response.score : 5,
                  type: "TEXT",
                  status: "PENDING", // CRITICAL: NEVER automatically publish survey responses!
                  sourceType: "SURVEY_ROUTING",
                  isFeatured: false,
                },
              });
              draftTestimonialId = draft.id;
            }

            actionPayload.testimonialRequestUrl = testimonialRequestUrl;
            actionPayload.draftTestimonialId = draftTestimonialId;
            actionPayload.isApproved = false; // Auditable confirmation of draft state
            logReason = draftTestimonialId
              ? `Created unapproved draft testimonial (${draftTestimonialId}) pending review & invited to submit public testimonial.`
              : `Prepared testimonial collection invitation link.`;
          }
        }

        // =====================================================================
        // ACTION 2: ROUTE NEGATIVE FEEDBACK TO INTERNAL FEEDBACK INBOX
        // =====================================================================
        else if (rule.actionType === "INTERNAL_INBOX") {
          const priority = actionConfig.priority || "HIGH";

          // If respondent provided an email, associate with or create Customer in CRM
          let customerRecord = null;
          if (response.respondentEmail) {
            customerRecord = await prisma.customer.upsert({
              where: {
                workspaceId_email: {
                  workspaceId,
                  email: response.respondentEmail.toLowerCase(),
                },
              },
              create: {
                workspaceId,
                email: response.respondentEmail.toLowerCase(),
                name: response.respondentName || "Survey Respondent",
                company: response.respondentCompany || null,
              },
              update: {},
            });

            // Create internal CRM note flagged for negative feedback
            await prisma.customerNote.create({
              data: {
                workspaceId,
                customerId: customerRecord.id,
                authorId: "sys_routing_engine",
                authorName: "Praise Routing Engine",
                content: `[URGENT FEEDBACK INBOX] Negative score received on survey "${survey.title}" (Score: ${response.score}).\nFeedback: "${response.feedback || "None"}"\nPriority: ${priority}`,
              },
            });
          }

          actionPayload.priority = priority;
          actionPayload.flaggedInbox = true;
          actionPayload.customerId = customerRecord?.id || null;
          logReason = `Flagged feedback into internal priority inbox with ${priority} urgency.`;
        }

        // =====================================================================
        // ACTION 3: ROUTE TO CUSTOMER-SUCCESS FOLLOW-UP
        // =====================================================================
        else if (rule.actionType === "CUSTOMER_SUCCESS_FOLLOWUP") {
          // SAFETY GATE: Do not send a follow-up without the required customer consent and authorization!
          if (!response.respondentEmail) {
            logStatus = "SKIPPED";
            logReason = "Consent Gate: Follow-up requires respondent email address.";
          } else {
            const emailLower = response.respondentEmail.toLowerCase();

            // Check email suppression table
            const suppression = await prisma.emailSuppression.findFirst({
              where: {
                workspaceId,
                email: emailLower,
              },
            });

            if (suppression) {
              logStatus = "SKIPPED";
              logReason = `Consent Gate: Follow-up outreach blocked. Recipient ${emailLower} is in email suppression list (${suppression.reason}).`;
            } else {
              // Find or link Customer
              const customer = await prisma.customer.upsert({
                where: {
                  workspaceId_email: {
                    workspaceId,
                    email: emailLower,
                  },
                },
                create: {
                  workspaceId,
                  email: emailLower,
                  name: response.respondentName || "Survey Respondent",
                  company: response.respondentCompany || null,
                },
                update: {},
              });

              // Check consent records
              const consentRecord = await prisma.consentRecord.findFirst({
                where: {
                  workspaceId,
                  customerEmail: emailLower,
                },
                orderBy: { grantedAt: "desc" },
              });

              if (consentRecord && (!consentRecord.isConsentGranted || consentRecord.revokedAt)) {
                logStatus = "SKIPPED";
                logReason = `Consent Gate: Customer has explicitly revoked consent for follow-up outreach.`;
              } else {
                // Authorized for CS follow-up task
                await prisma.customerActivity.create({
                  data: {
                    workspaceId,
                    customerId: customer.id,
                    action: "SURVEY_FOLLOWUP",
                    actorName: "Survey Routing Engine",
                    details: `Assigned Customer Success follow-up task from survey "${survey.title}". Score: ${response.score}.`,
                    metadataJson: JSON.stringify({
                      surveyId: survey.id,
                      responseId: response.id,
                      score: response.score,
                      feedback: response.feedback,
                      priority: actionConfig.priority || "MEDIUM",
                      internalNote: actionConfig.internalNote || null,
                    }),
                  },
                });

                actionPayload.customerId = customer.id;
                actionPayload.csTaskCreated = true;
                logReason = `Customer Success follow-up task verified against consent and assigned in CRM for ${emailLower}.`;
              }
            }
          }
        }

        // =====================================================================
        // ACTION 4: NOTIFY TEAM ALERT
        // =====================================================================
        else if (rule.actionType === "NOTIFY_TEAM") {
          actionPayload.notifiedEmail = actionConfig.notificationEmail || "workspace_admins";
          actionPayload.alertSubject = `Survey Alert: Score ${response.score} on "${survey.title}"`;
          logReason = `Team alert queued for ${actionPayload.notifiedEmail}.`;
        }
      } catch (actionErr: any) {
        logStatus = "FAILED";
        logReason = `Action failed: ${actionErr?.message || "Internal error during action execution."}`;
      }

      // Record in permanent, auditable SurveyRoutingLog
      await prisma.surveyRoutingLog.create({
        data: {
          workspaceId,
          surveyId: survey.id,
          responseId: response.id,
          ruleId: rule.id,
          ruleName: rule.name,
          actionType: rule.actionType,
          status: logStatus,
          reason: logReason,
          actionPayloadJson: JSON.stringify(actionPayload),
        },
      });

      result.executedRules++;
      result.results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: rule.actionType,
        status: logStatus,
        reason: logReason,
      });
    }
  } catch (globalErr: any) {
    // Preserve survey results at all costs! Never throw or fail survey submission.
    console.error("[Survey Routing Engine Error]", globalErr);
  }

  return result;
}
