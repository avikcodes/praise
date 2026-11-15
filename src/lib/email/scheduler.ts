import { prisma } from "../db/client.ts";
import { getEmailProvider } from "./provider.ts";
import {
  interpolateEmailTemplate,
  buildHtmlEmail,
  type TemplateVariables,
} from "./templating.ts";
import { isEmailSuppressed, suppressEmail } from "./campaign-service.ts";
import { logCustomerActivity } from "../customers/crm.ts";

export type CampaignActivityAction =
  | "CREATED"
  | "SCHEDULED"
  | "STEP_STARTED"
  | "STEP_DISPATCHED"
  | "PAUSED"
  | "RESUMED"
  | "CANCELLED"
  | "STEP_UPDATED"
  | "RECURRING_SCHEDULED"
  | "COMPLETED";

/**
 * Logs an immutable activity record in the campaign audit trail.
 */
export async function logCampaignActivity(params: {
  campaignId: string;
  workspaceId: string;
  action: CampaignActivityAction;
  actorId?: string | null;
  actorName?: string | null;
  stepNumber?: number | null;
  details: string;
  metadata?: Record<string, unknown>;
}) {
  const {
    campaignId,
    workspaceId,
    action,
    actorId,
    actorName,
    stepNumber,
    details,
    metadata,
  } = params;

  return prisma.emailCampaignActivity.create({
    data: {
      campaignId,
      workspaceId,
      action,
      actorId: actorId || null,
      actorName: actorName || "System Scheduler",
      stepNumber: stepNumber ?? null,
      details,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

/**
 * Calculates the next date for a recurring campaign interval.
 */
export function calculateNextRecurringDate(
  baseDate: Date,
  interval: "WEEKLY" | "MONTHLY" | "QUARTERLY" | string,
): Date {
  const next = new Date(baseDate);
  switch (interval.toUpperCase()) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    default:
      next.setDate(next.getDate() + 30);
  }
  return next;
}

/**
 * Schedules a campaign for future delivery with explicit owner approval.
 */
export async function scheduleCampaign(params: {
  workspaceId: string;
  campaignId: string;
  scheduledAt: Date;
  timezone?: string;
  recurringInterval?: string;
  confirmedByUserId: string;
  confirmedByUserName?: string;
}) {
  const {
    workspaceId,
    campaignId,
    scheduledAt,
    timezone = "UTC",
    recurringInterval = "NONE",
    confirmedByUserId,
    confirmedByUserName = "Workspace Owner",
  } = params;

  if (!confirmedByUserId) {
    throw new Error(
      "Explicit campaign approval is required. Cannot schedule messages without owner confirmation.",
    );
  }

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  if (!campaign) throw new Error("Campaign not found.");

  // Update campaign
  const updated = await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: "SCHEDULED",
      scheduledAt,
      nextRunAt: scheduledAt,
      timezone,
      recurringInterval: recurringInterval.toUpperCase(),
      confirmedAt: new Date(),
      confirmedBy: confirmedByUserId,
    },
  });

  // If sequence steps exist, schedule step 1
  if (campaign.steps.length > 0) {
    const firstStep = campaign.steps[0];
    await prisma.emailCampaignStep.update({
      where: { id: firstStep.id },
      data: {
        status: "SCHEDULED",
        scheduledAt,
      },
    });
  }

  // Audit activity
  await logCampaignActivity({
    campaignId,
    workspaceId,
    action: "SCHEDULED",
    actorId: confirmedByUserId,
    actorName: confirmedByUserName,
    stepNumber: 1,
    details: `Campaign scheduled for delivery at ${scheduledAt.toISOString()} (${timezone}). Recurring: ${recurringInterval}`,
    metadata: { scheduledAt: scheduledAt.toISOString(), timezone, recurringInterval },
  });

  return updated;
}

/**
 * Pauses an active or scheduled campaign.
 */
export async function pauseCampaign(params: {
  workspaceId: string;
  campaignId: string;
  userId?: string;
  userName?: string;
}) {
  const { workspaceId, campaignId, userId, userName = "Owner" } = params;

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
  });
  if (!campaign) throw new Error("Campaign not found.");

  if (campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
    throw new Error(`Cannot pause a campaign that is already ${campaign.status.toLowerCase()}.`);
  }

  const updated = await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status: "PAUSED" },
  });

  await logCampaignActivity({
    campaignId,
    workspaceId,
    action: "PAUSED",
    actorId: userId,
    actorName: userName,
    details: `Campaign paused by ${userName}. Follow-ups and scheduled dispatches temporarily suspended.`,
  });

  return updated;
}

/**
 * Resumes a paused campaign.
 */
export async function resumeCampaign(params: {
  workspaceId: string;
  campaignId: string;
  userId?: string;
  userName?: string;
}) {
  const { workspaceId, campaignId, userId, userName = "Owner" } = params;

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
  });
  if (!campaign) throw new Error("Campaign not found.");

  if (campaign.status !== "PAUSED") {
    throw new Error("Campaign is not paused.");
  }

  // If next run was in the past, reschedule to now so worker picks it up
  const now = new Date();
  const nextRunAt = campaign.nextRunAt && campaign.nextRunAt > now ? campaign.nextRunAt : now;

  const updated = await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: "SCHEDULED",
      nextRunAt,
    },
  });

  await logCampaignActivity({
    campaignId,
    workspaceId,
    action: "RESUMED",
    actorId: userId,
    actorName: userName,
    details: `Campaign resumed by ${userName}. Next scheduled run: ${nextRunAt.toISOString()}`,
  });

  return updated;
}

/**
 * Cancels a campaign.
 */
export async function cancelCampaign(params: {
  workspaceId: string;
  campaignId: string;
  userId?: string;
  userName?: string;
}) {
  const { workspaceId, campaignId, userId, userName = "Owner" } = params;

  const updated = await prisma.emailCampaign.update({
    where: { id: campaignId, workspaceId },
    data: {
      status: "CANCELLED",
      nextRunAt: null,
    },
  });

  await logCampaignActivity({
    campaignId,
    workspaceId,
    action: "CANCELLED",
    actorId: userId,
    actorName: userName,
    details: `Campaign cancelled by ${userName}.`,
  });

  return updated;
}

/**
 * Edits an upcoming scheduled message / step before it is dispatched.
 */
export async function updateCampaignStep(params: {
  workspaceId: string;
  campaignId: string;
  stepId: string;
  subject?: string;
  bodyText?: string;
  delayDays?: number;
  delayHours?: number;
  userId?: string;
  userName?: string;
}) {
  const {
    workspaceId,
    campaignId,
    stepId,
    subject,
    bodyText,
    delayDays,
    delayHours,
    userId,
    userName = "Owner",
  } = params;

  const step = await prisma.emailCampaignStep.findFirst({
    where: { id: stepId, campaignId, campaign: { workspaceId } },
  });

  if (!step) throw new Error("Step not found in this campaign.");
  if (step.status === "COMPLETED" || step.status === "SENDING") {
    throw new Error("Cannot edit a step that is already sending or completed.");
  }

  const data: any = {};
  if (subject !== undefined) data.subject = subject.trim();
  if (bodyText !== undefined) data.bodyText = bodyText.trim();
  if (delayDays !== undefined) data.delayDays = Math.max(0, delayDays);
  if (delayHours !== undefined) data.delayHours = Math.max(0, delayHours);

  const updated = await prisma.emailCampaignStep.update({
    where: { id: stepId },
    data,
  });

  await logCampaignActivity({
    campaignId,
    workspaceId,
    action: "STEP_UPDATED",
    actorId: userId,
    actorName: userName,
    stepNumber: step.stepNumber,
    details: `Step ${step.stepNumber} updated by ${userName}. Subject: "${updated.subject}"`,
  });

  return updated;
}

/**
 * Dispatches a single sequence step (Initial or Follow-up) with:
 * - Strict owner approval enforcement
 * - Idempotency controls (@@unique([recipientId, stepNumber]))
 * - Stop follow-up rules (submissions, unsubscriptions, bounces, failures)
 * - Automatic scheduling of the next follow-up step
 */
export async function dispatchCampaignStep(params: {
  workspaceId: string;
  campaignId: string;
  stepNumber: number;
  baseUrl?: string;
  actorId?: string | null;
  actorName?: string | null;
}) {
  const {
    workspaceId,
    campaignId,
    stepNumber,
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    actorId,
    actorName = "System Scheduler",
  } = params;

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
    include: {
      form: { select: { id: true, title: true, slug: true } },
      workspace: { select: { id: true, name: true } },
      recipients: true,
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });

  if (!campaign) throw new Error("Campaign not found.");

  // Strict Rule: Never send messages without explicit campaign approval
  if (!campaign.confirmedAt || !campaign.confirmedBy) {
    throw new Error(
      "Campaign has not been explicitly confirmed by an owner. Sending aborted.",
    );
  }

  if (campaign.status === "PAUSED" || campaign.status === "CANCELLED") {
    return {
      success: false,
      skipped: true,
      reason: `Campaign is currently ${campaign.status}.`,
    };
  }

  // Find target step
  const step = campaign.steps.find((s) => s.stepNumber === stepNumber);
  if (!step) {
    throw new Error(`Step ${stepNumber} not found in campaign.`);
  }

  // Mark step and campaign as SENDING
  await prisma.emailCampaignStep.update({
    where: { id: step.id },
    data: { status: "SENDING", sentAt: new Date() },
  });
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status: "SENDING", currentStepNumber: stepNumber },
  });

  await logCampaignActivity({
    campaignId,
    workspaceId,
    action: "STEP_STARTED",
    actorId,
    actorName,
    stepNumber,
    details: `Step ${stepNumber} started sending to eligible recipients.`,
  });

  const provider = getEmailProvider();
  let sentCount = 0;
  let deliveredCount = 0;
  let skippedSubmittedCount = 0;
  let skippedUnsubscribedCount = 0;
  let skippedFailedCount = 0;
  let bouncedCount = 0;
  let failedCount = 0;

  for (const recipient of campaign.recipients) {
    // ------------------------------------------------------------------------
    // Idempotency Control 1: Check if this step was already sent to recipient
    // ------------------------------------------------------------------------
    const idempotencyKey = `${recipient.id}_step_${stepNumber}`;
    const existingLog = await prisma.campaignRecipientLog.findUnique({
      where: { idempotencyKey },
    });

    if (existingLog) {
      // Already processed idempotently; avoid duplicate sends
      continue;
    }

    // ------------------------------------------------------------------------
    // Stop Rule 1: Stop follow-ups after a submission
    // ------------------------------------------------------------------------
    if (recipient.status === "SUBMITTED" || recipient.testimonialId) {
      skippedSubmittedCount++;
      await prisma.campaignRecipientLog.create({
        data: {
          campaignId,
          stepId: step.id,
          stepNumber,
          recipientId: recipient.id,
          idempotencyKey,
          email: recipient.email,
          status: "SKIPPED_SUBMITTED",
          errorMessage: "Follow-up stopped: recipient already submitted testimonial.",
        },
      });
      continue;
    }

    // ------------------------------------------------------------------------
    // Stop Rule 2: Stop follow-ups after unsubscribe or consent revocation
    // ------------------------------------------------------------------------
    if (recipient.status === "UNSUBSCRIBED") {
      skippedUnsubscribedCount++;
      await prisma.campaignRecipientLog.create({
        data: {
          campaignId,
          stepId: step.id,
          stepNumber,
          recipientId: recipient.id,
          idempotencyKey,
          email: recipient.email,
          status: "SKIPPED_UNSUBSCRIBED",
          errorMessage: "Follow-up stopped: recipient is unsubscribed.",
        },
      });
      continue;
    }

    const isSuppressed = await isEmailSuppressed(workspaceId, recipient.email);
    if (isSuppressed) {
      skippedUnsubscribedCount++;
      await prisma.invitationRecipient.update({
        where: { id: recipient.id },
        data: { status: "UNSUBSCRIBED" },
      });
      await prisma.campaignRecipientLog.create({
        data: {
          campaignId,
          stepId: step.id,
          stepNumber,
          recipientId: recipient.id,
          idempotencyKey,
          email: recipient.email,
          status: "SKIPPED_UNSUBSCRIBED",
          errorMessage: "Follow-up stopped: recipient on workspace suppression list.",
        },
      });
      continue;
    }

    // ------------------------------------------------------------------------
    // Stop Rule 3: Stop follow-ups after delivery failure or bounce
    // ------------------------------------------------------------------------
    if (recipient.status === "BOUNCED" || recipient.status === "FAILED") {
      skippedFailedCount++;
      await prisma.campaignRecipientLog.create({
        data: {
          campaignId,
          stepId: step.id,
          stepNumber,
          recipientId: recipient.id,
          idempotencyKey,
          email: recipient.email,
          status: "SKIPPED_FAILED",
          errorMessage: `Follow-up stopped: prior delivery status was ${recipient.status}.`,
        },
      });
      continue;
    }

    // ------------------------------------------------------------------------
    // Prepare & Send Message for this Step
    // ------------------------------------------------------------------------
    const inviteUrl = `${baseUrl}/p/${campaign.form.slug}?invite=${recipient.token}`;
    const unsubUrl = `${baseUrl}/api/invitations/unsubscribe/${recipient.token}`;

    const vars: TemplateVariables = {
      customer: {
        name: recipient.name,
        firstName: recipient.name.split(" ")[0],
        email: recipient.email,
        company: recipient.company,
        title: recipient.title,
      },
      workspace: {
        name: campaign.workspace.name,
      },
      form: {
        title: campaign.form.title,
      },
      invitation: {
        url: inviteUrl,
        token: recipient.token,
      },
      unsubscribe: {
        url: unsubUrl,
      },
    };

    const finalSubject = interpolateEmailTemplate(step.subject, vars);
    const finalBodyText = interpolateEmailTemplate(step.bodyText, vars);
    const finalHtml = buildHtmlEmail({
      subject: finalSubject,
      bodyText: finalBodyText,
      invitationUrl: inviteUrl,
      unsubscribeUrl: unsubUrl,
      workspaceName: campaign.workspace.name,
    });

    try {
      const sendResult = await provider.send({
        to: recipient.email,
        toName: recipient.name,
        subject: finalSubject,
        text: finalBodyText,
        html: finalHtml,
      });

      if (sendResult.success) {
        sentCount++;
        deliveredCount++;

        // Idempotent log creation
        await prisma.campaignRecipientLog.create({
          data: {
            campaignId,
            stepId: step.id,
            stepNumber,
            recipientId: recipient.id,
            idempotencyKey,
            email: recipient.email,
            status: "DELIVERED",
            deliveredAt: new Date(),
          },
        });

        // Update recipient step pointer
        await prisma.invitationRecipient.update({
          where: { id: recipient.id },
          data: {
            status: recipient.status === "PENDING" ? "DELIVERED" : recipient.status,
            currentStepNumber: stepNumber + 1,
            lastStepSentAt: new Date(),
            deliveredAt: recipient.deliveredAt || new Date(),
          },
        });

        // If CRM contact linked, log activity
        if (recipient.customerId) {
          logCustomerActivity({
            workspaceId,
            customerId: recipient.customerId,
            action: "INVITATION_SENT" as any,
            actorId,
            actorName: actorName || "Praise Campaign",
            details: `Sent Step ${stepNumber} (${stepNumber === 1 ? "Initial Invitation" : "Follow-up"}) for form "${campaign.form.title}"`,
            metadata: { campaignId, stepNumber, subject: finalSubject },
          }).catch(() => {});
        }
      } else {
        if (sendResult.deliveryStatus === "BOUNCED") {
          bouncedCount++;
          await prisma.campaignRecipientLog.create({
            data: {
              campaignId,
              stepId: step.id,
              stepNumber,
              recipientId: recipient.id,
              idempotencyKey,
              email: recipient.email,
              status: "BOUNCED",
              errorMessage: sendResult.error || "Mail server rejected message",
            },
          });
          await prisma.invitationRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "BOUNCED",
              bounceReason: sendResult.error || "Mail server bounce",
            },
          });
          await suppressEmail(workspaceId, recipient.email, "BOUNCE", sendResult.error);
        } else {
          failedCount++;
          await prisma.campaignRecipientLog.create({
            data: {
              campaignId,
              stepId: step.id,
              stepNumber,
              recipientId: recipient.id,
              idempotencyKey,
              email: recipient.email,
              status: "FAILED",
              errorMessage: sendResult.error || "Delivery failed",
            },
          });
          await prisma.invitationRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "FAILED",
              errorMessage: sendResult.error || "Delivery failed",
            },
          });
        }
      }
    } catch (err: unknown) {
      failedCount++;
      const errMsg = err instanceof Error ? err.message : "Send exception";
      await prisma.campaignRecipientLog.create({
        data: {
          campaignId,
          stepId: step.id,
          stepNumber,
          recipientId: recipient.id,
          idempotencyKey,
          email: recipient.email,
          status: "FAILED",
          errorMessage: errMsg,
        },
      });
      await prisma.invitationRecipient.update({
        where: { id: recipient.id },
        data: { status: "FAILED", errorMessage: errMsg },
      });
    }
  }

  // ------------------------------------------------------------------------
  // Mark current step COMPLETED and update counters
  // ------------------------------------------------------------------------
  await prisma.emailCampaignStep.update({
    where: { id: step.id },
    data: {
      status: "COMPLETED",
      sentCount: { increment: sentCount },
      deliveredCount: { increment: deliveredCount },
      sentAt: new Date(),
    },
  });

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount: { increment: sentCount },
      deliveredCount: { increment: deliveredCount },
      bouncedCount: { increment: bouncedCount },
      failedCount: { increment: failedCount },
    },
  });

  // ------------------------------------------------------------------------
  // Determine Next Action: Next Follow-Up Step vs Completion vs Recurring
  // ------------------------------------------------------------------------
  const nextStep = campaign.steps.find((s) => s.stepNumber === stepNumber + 1);

  if (nextStep) {
    const delayTotalMs =
      (nextStep.delayDays * 24 * 60 + nextStep.delayHours * 60) * 60 * 1000;
    const nextRunAt = new Date(Date.now() + Math.max(delayTotalMs, 1000));

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: "SCHEDULED",
        currentStepNumber: nextStep.stepNumber,
        nextRunAt,
      },
    });

    await prisma.emailCampaignStep.update({
      where: { id: nextStep.id },
      data: {
        status: "SCHEDULED",
        scheduledAt: nextRunAt,
      },
    });

    await logCampaignActivity({
      campaignId,
      workspaceId,
      action: "STEP_DISPATCHED",
      actorId,
      actorName,
      stepNumber,
      details: `Step ${stepNumber} dispatched (${deliveredCount} delivered, ${skippedSubmittedCount} skipped submitted). Step ${nextStep.stepNumber} scheduled for ${nextRunAt.toISOString()}`,
      metadata: {
        stepNumber,
        deliveredCount,
        skippedSubmittedCount,
        nextStepNumber: nextStep.stepNumber,
        nextRunAt: nextRunAt.toISOString(),
      },
    });
  } else {
    // No more follow-up steps in this cycle
    if (campaign.recurringInterval && campaign.recurringInterval !== "NONE") {
      const recurringNextAt = calculateNextRecurringDate(
        new Date(),
        campaign.recurringInterval,
      );

      // Reschedule for next recurring cycle
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: "SCHEDULED",
          nextRunAt: recurringNextAt,
          recurringNextAt,
          currentStepNumber: 1,
        },
      });

      // Reset steps to PENDING for next run
      await prisma.emailCampaignStep.updateMany({
        where: { campaignId },
        data: { status: "PENDING" },
      });

      await logCampaignActivity({
        campaignId,
        workspaceId,
        action: "RECURRING_SCHEDULED",
        actorId,
        actorName,
        details: `All sequence steps finished. Next recurring cycle (${campaign.recurringInterval}) scheduled for ${recurringNextAt.toISOString()}`,
        metadata: { recurringInterval: campaign.recurringInterval, recurringNextAt: recurringNextAt.toISOString() },
      });
    } else {
      // Completed permanently
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          nextRunAt: null,
        },
      });

      await logCampaignActivity({
        campaignId,
        workspaceId,
        action: "COMPLETED",
        actorId,
        actorName,
        details: "All invitation and follow-up steps completed successfully.",
      });
    }
  }

  return {
    success: true,
    stepNumber,
    sentCount,
    deliveredCount,
    skippedSubmittedCount,
    skippedUnsubscribedCount,
    skippedFailedCount,
    bouncedCount,
    failedCount,
  };
}

/**
 * Background Scheduler Worker:
 * Processes any campaigns or sequence follow-ups that are scheduled and due for execution.
 * Built for self-hosted deployments: runs on top of the existing PostgreSQL database.
 */
export async function processScheduledEmailCampaigns(params: {
  now?: Date;
  baseUrl?: string;
  limit?: number;
} = {}) {
  const {
    now = new Date(),
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    limit = 20,
  } = params;

  // Find due campaigns
  const dueCampaigns = await prisma.emailCampaign.findMany({
    where: {
      status: "SCHEDULED",
      confirmedAt: { not: null },
      confirmedBy: { not: null },
      OR: [
        { nextRunAt: { lte: now } },
        { scheduledAt: { lte: now }, nextRunAt: null },
      ],
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
    take: limit,
  });

  const results = [];

  for (const campaign of dueCampaigns) {
    try {
      if (campaign.steps.length > 0) {
        // Multi-step sequence or follow-up campaign
        const currentStep =
          campaign.steps.find((s) => s.stepNumber === campaign.currentStepNumber) ||
          campaign.steps[0];

        const stepResult = await dispatchCampaignStep({
          workspaceId: campaign.workspaceId,
          campaignId: campaign.id,
          stepNumber: currentStep.stepNumber,
          baseUrl,
          actorName: "Background Scheduler Worker",
        });

        results.push({
          campaignId: campaign.id,
          type: "STEP_DISPATCH",
          stepNumber: currentStep.stepNumber,
          result: stepResult,
        });
      } else {
        // Fallback: single legacy message campaign
        const { dispatchCampaign } = await import("./campaign-service.ts");
        const singleResult = await dispatchCampaign({
          workspaceId: campaign.workspaceId,
          campaignId: campaign.id,
          confirmedByUserId: campaign.confirmedBy!,
          confirmedByUserName: "Scheduled Dispatch",
          baseUrl,
        });

        results.push({
          campaignId: campaign.id,
          type: "SINGLE_DISPATCH",
          result: singleResult,
        });
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Execution failure";
      results.push({
        campaignId: campaign.id,
        type: "ERROR",
        error,
      });
      // Pause or log failure so scheduler doesn't infinite loop on crash
      await logCampaignActivity({
        campaignId: campaign.id,
        workspaceId: campaign.workspaceId,
        action: "PAUSED",
        details: `Scheduled run failed with error: ${error}. Campaign paused for investigation.`,
      }).catch(() => {});
      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { status: "PAUSED" },
      }).catch(() => {});
    }
  }

  return {
    processedCount: dueCampaigns.length,
    results,
    executedAt: now.toISOString(),
  };
}
