import crypto from "node:crypto";
import { prisma } from "../db/client.ts";
import { getEmailProvider } from "./provider.ts";
import {
  DEFAULT_INVITATION_TEMPLATES,
  interpolateEmailTemplate,
  buildHtmlEmail,
  type TemplateVariables,
} from "./templating.ts";
import { logCustomerActivity } from "../customers/crm.ts";

/**
 * Generates a cryptographically secure random token for invitation recipients.
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/**
 * Ensures built-in invitation templates exist in a workspace.
 */
export async function ensureDefaultInvitationTemplates(workspaceId: string) {
  const existing = await prisma.invitationTemplate.findMany({
    where: { workspaceId },
  });

  if (existing.length > 0) {
    return existing;
  }

  const created = [];
  for (const t of DEFAULT_INVITATION_TEMPLATES) {
    const tmpl = await prisma.invitationTemplate.create({
      data: {
        workspaceId,
        name: t.name,
        category: t.category,
        subject: t.subject,
        bodyText: t.bodyText,
        isSystem: true,
      },
    });
    created.push(tmpl);
  }

  return created;
}

/**
 * Checks if an email is suppressed (unsubscribed or bounced) in a workspace.
 */
export async function isEmailSuppressed(workspaceId: string, email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const suppression = await prisma.emailSuppression.findUnique({
    where: {
      workspaceId_email: {
        workspaceId,
        email: normalized,
      },
    },
  });
  return Boolean(suppression);
}

/**
 * Adds an email address to the workspace suppression list.
 */
export async function suppressEmail(
  workspaceId: string,
  email: string,
  reason: "UNSUBSCRIBE" | "BOUNCE" | "COMPLAINT" | "MANUAL" = "UNSUBSCRIBE",
  details?: string,
) {
  const normalized = email.trim().toLowerCase();
  return prisma.emailSuppression.upsert({
    where: {
      workspaceId_email: {
        workspaceId,
        email: normalized,
      },
    },
    create: {
      workspaceId,
      email: normalized,
      reason,
      details,
    },
    update: {
      reason,
      details,
    },
  });
}

/**
 * Sends a single test email preview to the requester's inbox.
 */
export async function sendTestInvitationEmail(params: {
  workspaceId: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  formTitle?: string;
  formSlug?: string;
  workspaceName?: string;
  baseUrl?: string;
}) {
  const {
    toEmail,
    subject,
    bodyText,
    formTitle = "Customer Feedback Form",
    formSlug = "sample-form",
    workspaceName = "Praise Workspace",
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  } = params;

  const sampleInviteUrl = `${baseUrl}/p/${formSlug}?invite=sample-test-token-preview`;
  const sampleUnsubUrl = `${baseUrl}/api/invitations/unsubscribe/sample-test-token-preview`;

  const sampleVars: TemplateVariables = {
    customer: {
      name: "Jane Smith (Test Preview)",
      firstName: "Jane",
      email: toEmail,
      company: "Acme Innovations",
      title: "VP of Product",
    },
    workspace: {
      name: workspaceName,
    },
    form: {
      title: formTitle,
    },
    invitation: {
      url: sampleInviteUrl,
    },
    unsubscribe: {
      url: sampleUnsubUrl,
    },
  };

  const interpolatedSubject = `[TEST] ${interpolateEmailTemplate(subject, sampleVars)}`;
  const interpolatedBody = interpolateEmailTemplate(bodyText, sampleVars);
  const html = buildHtmlEmail({
    subject: interpolatedSubject,
    bodyText: interpolatedBody,
    invitationUrl: sampleInviteUrl,
    unsubscribeUrl: sampleUnsubUrl,
    workspaceName,
  });

  const provider = getEmailProvider();
  return provider.send({
    to: toEmail,
    toName: "Test Recipient",
    subject: interpolatedSubject,
    text: interpolatedBody,
    html,
  });
}

/**
 * Dispatches an approved campaign to its recipients.
 * Enforces strict owner confirmation rule:
 * Must not send messages until the owner explicitly confirms the campaign.
 */
export async function dispatchCampaign(params: {
  workspaceId: string;
  campaignId: string;
  confirmedByUserId: string;
  confirmedByUserName?: string;
  baseUrl?: string;
}) {
  const {
    workspaceId,
    campaignId,
    confirmedByUserId,
    confirmedByUserName = "Owner",
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  } = params;

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId, workspaceId },
    include: {
      form: { select: { id: true, title: true, slug: true } },
      workspace: { select: { id: true, name: true } },
      recipients: {
        where: { status: "PENDING" },
      },
    },
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  // Update campaign to SENDING and mark confirmed
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: "SENDING",
      confirmedAt: new Date(),
      confirmedBy: confirmedByUserId,
      startedAt: new Date(),
    },
  });

  const provider = getEmailProvider();
  let sentCount = 0;
  let deliveredCount = 0;
  let bouncedCount = 0;
  let failedCount = 0;
  let unsubscribedCount = 0;

  for (const recipient of campaign.recipients) {
    // 1. Check unsubscribe suppression
    const isSuppressed = await isEmailSuppressed(workspaceId, recipient.email);
    if (isSuppressed) {
      await prisma.invitationRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "UNSUBSCRIBED",
          errorMessage: "Recipient has unsubscribed from testimonial invitations",
        },
      });
      unsubscribedCount++;
      continue;
    }

    // 2. Prepare personal submission link
    const inviteUrl = `${baseUrl}/p/${campaign.form.slug}?invite=${recipient.token}`;
    const unsubUrl = `${baseUrl}/api/invitations/unsubscribe/${recipient.token}`;

    let customFields = {};
    if (recipient.customFieldsJson) {
      try {
        customFields = JSON.parse(recipient.customFieldsJson);
      } catch {}
    }

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
      custom: customFields,
    };

    const finalSubject = interpolateEmailTemplate(campaign.subject, vars);
    const finalBodyText = interpolateEmailTemplate(campaign.bodyText, vars);
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
        await prisma.invitationRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "DELIVERED",
            sentAt: new Date(),
            deliveredAt: new Date(),
          },
        });

        // If recipient was linked to a CRM Customer, log the activity
        if (recipient.customerId) {
          await logCustomerActivity({
            workspaceId,
            customerId: recipient.customerId,
            action: "INVITATION_SENT" as any,
            actorId: confirmedByUserId,
            actorName: confirmedByUserName,
            details: `Sent testimonial invitation email for form "${campaign.form.title}"`,
            metadata: { campaignId, campaignName: campaign.name },
          });
        }
      } else {
        if (sendResult.deliveryStatus === "BOUNCED") {
          bouncedCount++;
          await prisma.invitationRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "BOUNCED",
              bounceReason: sendResult.error || "Mail server rejected message",
            },
          });
          // Add to suppression
          await suppressEmail(workspaceId, recipient.email, "BOUNCE", sendResult.error);
        } else {
          failedCount++;
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
      await prisma.invitationRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : "Unexpected send error",
        },
      });
    }
  }

  // Update campaign to COMPLETED
  const updatedCampaign = await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: "COMPLETED",
      sentCount: { increment: sentCount },
      deliveredCount: { increment: deliveredCount },
      bouncedCount: { increment: bouncedCount },
      failedCount: { increment: failedCount },
      unsubscribedCount: { increment: unsubscribedCount },
      completedAt: new Date(),
    },
  });

  return {
    campaign: updatedCampaign,
    sentCount,
    deliveredCount,
    bouncedCount,
    failedCount,
    unsubscribedCount,
  };
}
