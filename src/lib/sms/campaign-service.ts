import crypto from "node:crypto";
import { prisma } from "../db/client.ts";
import { getSmsProvider, type SmsProvider } from "./provider.ts";
import {
  DEFAULT_SMS_TEMPLATES,
  interpolateSmsTemplate,
  calculateSmsSegments,
  type SmsPersonalizationContext,
} from "./templating.ts";

/**
 * Normalizes phone numbers to standard E.164 format.
 * Returns null if the number is fundamentally invalid.
 */
export function normalizePhoneNumber(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Strip whitespace, dashes, parentheses, dots
  const stripped = trimmed.replace(/[\s\-\(\)\.]/g, "");

  if (stripped.startsWith("+")) {
    const digits = stripped.slice(1);
    if (/^\d{7,15}$/.test(digits)) {
      return stripped;
    }
    return null;
  }

  // 10-digit number without country code (default to North American +1)
  if (/^\d{10}$/.test(stripped)) {
    return `+1${stripped}`;
  }

  // 11 to 15 digit number starting with country code without '+'
  if (/^\d{11,15}$/.test(stripped)) {
    return `+${stripped}`;
  }

  return null;
}

/**
 * Generates a cryptographically secure random token for SMS invitation links.
 */
export function generateSmsToken(): string {
  return crypto.randomBytes(20).toString("hex");
}

/**
 * Checks if a phone number is currently in the workspace SMS suppression list.
 */
export async function isPhoneSuppressed(workspaceId: string, rawPhone: string): Promise<boolean> {
  const normalized = normalizePhoneNumber(rawPhone) || rawPhone.trim();
  const entry = await prisma.smsSuppression.findUnique({
    where: {
      workspaceId_phoneNumber: {
        workspaceId,
        phoneNumber: normalized,
      },
    },
  });
  return Boolean(entry);
}

/**
 * Adds a phone number to the workspace SMS suppression list.
 */
export async function suppressPhoneNumber(
  workspaceId: string,
  rawPhone: string,
  reason = "STOP_REPLY",
  details?: string
) {
  const normalized = normalizePhoneNumber(rawPhone) || rawPhone.trim();
  return prisma.smsSuppression.upsert({
    where: {
      workspaceId_phoneNumber: {
        workspaceId,
        phoneNumber: normalized,
      },
    },
    create: {
      workspaceId,
      phoneNumber: normalized,
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
 * Removes a phone number from the workspace SMS suppression list (e.g. opt-in resubscription).
 */
export async function unsuppressPhoneNumber(workspaceId: string, rawPhone: string) {
  const normalized = normalizePhoneNumber(rawPhone) || rawPhone.trim();
  try {
    return await prisma.smsSuppression.delete({
      where: {
        workspaceId_phoneNumber: {
          workspaceId,
          phoneNumber: normalized,
        },
      },
    });
  } catch {
    return null;
  }
}

/**
 * Ensures built-in SMS templates exist in the workspace.
 */
export async function ensureDefaultSmsTemplates(workspaceId: string) {
  const existing = await prisma.smsTemplate.findMany({
    where: { workspaceId },
  });

  if (existing.length > 0) {
    return existing;
  }

  const created = [];
  for (const t of DEFAULT_SMS_TEMPLATES) {
    const tmpl = await prisma.smsTemplate.create({
      data: {
        workspaceId,
        name: t.name,
        category: t.category,
        messageBody: t.messageBody,
        isSystem: true,
      },
    });
    created.push(tmpl);
  }

  return created;
}

/**
 * Resolves the configured SMS provider for a workspace.
 */
export async function getSmsProviderForWorkspace(workspaceId: string): Promise<SmsProvider> {
  const config = await prisma.smsProviderConfig.findUnique({
    where: { workspaceId },
  });
  return getSmsProvider(config);
}

/**
 * Sends a single test SMS to verify provider connectivity and preview template interpolation.
 */
export async function sendTestSms(params: {
  workspaceId: string;
  toPhone: string;
  messageBody: string;
  formTitle?: string;
  formSlug?: string;
  workspaceName?: string;
  baseUrl?: string;
}) {
  const {
    workspaceId,
    toPhone,
    messageBody,
    formTitle = "Customer Feedback Form",
    formSlug = "feedback-preview",
    workspaceName = "Praise Workspace",
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  } = params;

  const normalized = normalizePhoneNumber(toPhone);
  if (!normalized) {
    throw new Error(`Invalid phone number: ${toPhone}. Please provide a valid phone number with country code.`);
  }

  const sampleInviteUrl = `${baseUrl}/p/${formSlug}?invite=sample-test-sms-token`;
  const context: SmsPersonalizationContext = {
    customer: {
      name: "Alex Taylor",
      firstName: "Alex",
      company: "Acme Labs",
      phoneNumber: normalized,
    },
    workspace: {
      name: workspaceName,
    },
    form: {
      title: formTitle,
    },
    invitation: {
      url: sampleInviteUrl,
      token: "sample-test-sms-token",
    },
    optout: {
      text: "Reply STOP to opt out",
    },
  };

  const interpolated = interpolateSmsTemplate(messageBody, context);
  const segments = calculateSmsSegments(interpolated);

  const provider = await getSmsProviderForWorkspace(workspaceId);
  const result = await provider.send({
    to: normalized,
    body: interpolated,
  });

  return {
    ...result,
    interpolatedMessage: interpolated,
    segments,
  };
}

export interface CreateSmsRecipientInput {
  phoneNumber: string;
  name?: string;
  email?: string;
  company?: string;
  customerId?: string;
}

/**
 * Creates a new SMS campaign with recipient deduplication and token generation.
 */
export async function createSmsCampaign(params: {
  workspaceId: string;
  createdById: string;
  name: string;
  messageBody: string;
  formId: string;
  templateId?: string;
  recipients: CreateSmsRecipientInput[];
}) {
  const { workspaceId, name, messageBody, formId, templateId, recipients } = params;

  if (!recipients || recipients.length === 0) {
    throw new Error("At least one recipient is required.");
  }

  // Deduplicate recipients by normalized phone number
  const seenPhones = new Set<string>();
  const validRecipients: Array<CreateSmsRecipientInput & { normalizedPhone: string; token: string }> = [];

  for (const r of recipients) {
    const norm = normalizePhoneNumber(r.phoneNumber);
    if (!norm) continue; // skip completely invalid numbers
    if (seenPhones.has(norm)) continue; // skip duplicates
    seenPhones.add(norm);

    validRecipients.push({
      ...r,
      normalizedPhone: norm,
      token: generateSmsToken(),
    });
  }

  if (validRecipients.length === 0) {
    throw new Error("No valid phone numbers found in the recipient list.");
  }

  const campaign = await prisma.smsCampaign.create({
    data: {
      workspaceId,
      name,
      messageBody,
      formId,
      templateId,
      totalRecipients: validRecipients.length,
      status: "DRAFT",
      recipients: {
        create: validRecipients.map((vr) => ({
          workspaceId,
          phoneNumber: vr.normalizedPhone,
          name: vr.name || "Customer",
          customerId: vr.customerId || null,
          token: vr.token,
          status: "PENDING",
        })),
      },
    },
    include: {
      recipients: true,
      form: { select: { id: true, title: true, slug: true } },
    },
  });

  return campaign;
}

/**
 * Dispatches an SMS campaign to its recipients.
 * Enforces explicit owner confirmation rule:
 * Will never send messages unless params.confirmedByUserId is provided.
 */
export async function dispatchSmsCampaign(params: {
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
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  } = params;

  if (!confirmedByUserId) {
    throw new Error("Explicit owner confirmation is required to dispatch SMS invitations.");
  }

  const campaign = await prisma.smsCampaign.findUnique({
    where: { id: campaignId, workspaceId },
    include: {
      form: { select: { id: true, title: true, slug: true } },
      workspace: { select: { id: true, name: true } },
      recipients: {
        where: { status: "PENDING" },
        include: {
          customer: true,
        },
      },
    },
  });

  if (!campaign) {
    throw new Error("SMS Campaign not found.");
  }

  if (campaign.status === "COMPLETED" || campaign.status === "SENDING") {
    throw new Error(`Campaign cannot be dispatched in its current status (${campaign.status}).`);
  }

  // Mark campaign SENDING with explicit confirmation tracking
  await prisma.smsCampaign.update({
    where: { id: campaignId },
    data: {
      status: "SENDING",
      confirmedAt: new Date(),
      confirmedBy: confirmedByUserId,
      startedAt: new Date(),
    },
  });

  const provider = await getSmsProviderForWorkspace(workspaceId);

  let sentCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;
  let optedOutCount = 0;

  for (const recipient of campaign.recipients) {
    // 1. Check workspace SMS suppression
    const isSuppressed = await isPhoneSuppressed(workspaceId, recipient.phoneNumber);
    if (isSuppressed) {
      await prisma.smsRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "OPTED_OUT",
          errorMessage: "Recipient phone number is opted out / suppressed",
        },
      });
      optedOutCount++;
      continue;
    }

    // 2. Build personalized invitation link and opt-out notice
    const inviteUrl = `${baseUrl}/p/${campaign.form.slug}?invite=${recipient.token}`;
    const context: SmsPersonalizationContext = {
      customer: {
        name: recipient.name,
        firstName: recipient.name ? recipient.name.trim().split(" ")[0] : "there",
        company: recipient.customer?.company || null,
        phoneNumber: recipient.phoneNumber,
        email: recipient.customer?.email || null,
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
      optout: {
        text: "Reply STOP to opt out",
      },
    };

    const interpolated = interpolateSmsTemplate(campaign.messageBody, context);
    const segCalc = calculateSmsSegments(interpolated);

    try {
      const sendResult = await provider.send({
        to: recipient.phoneNumber,
        body: interpolated,
      });

      if (sendResult.deliveryStatus === "OPTED_OUT") {
        // Automatically add to suppression list
        await suppressPhoneNumber(workspaceId, recipient.phoneNumber, "PROVIDER_REJECTED_OPTOUT", sendResult.error);
        await prisma.smsRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "OPTED_OUT",
            segmentCount: segCalc.segmentCount,
            providerMessageId: sendResult.providerMessageId || null,
            errorMessage: sendResult.error || "Recipient opted out",
          },
        });
        optedOutCount++;
      } else if (sendResult.deliveryStatus === "FAILED" || !sendResult.success) {
        await prisma.smsRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "FAILED",
            segmentCount: segCalc.segmentCount,
            providerMessageId: sendResult.providerMessageId || null,
            errorMessage: sendResult.error || "SMS provider failed delivery",
          },
        });
        failedCount++;
      } else {
        // DELIVERED or SENT
        await prisma.smsRecipient.update({
          where: { id: recipient.id },
          data: {
            status: sendResult.deliveryStatus,
            providerMessageId: sendResult.providerMessageId || null,
            segmentCount: segCalc.segmentCount,
            sentAt: new Date(),
            deliveredAt: sendResult.deliveryStatus === "DELIVERED" ? new Date() : null,
          },
        });
        sentCount++;
        if (sendResult.deliveryStatus === "DELIVERED") {
          deliveredCount++;
        }
      }
    } catch (err: any) {
      await prisma.smsRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "FAILED",
          segmentCount: segCalc.segmentCount,
          errorMessage: err?.message || "Unknown error during SMS dispatch",
        },
      });
      failedCount++;
    }
  }

  // Calculate overall campaign outcome status
  let finalStatus: "COMPLETED" | "PARTIAL_FAILURE" | "FAILED" = "COMPLETED";
  if (sentCount === 0 && (failedCount > 0 || optedOutCount > 0)) {
    finalStatus = "FAILED";
  } else if (failedCount > 0) {
    finalStatus = "PARTIAL_FAILURE";
  }

  const updatedCampaign = await prisma.smsCampaign.update({
    where: { id: campaignId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      sentCount: { increment: sentCount },
      deliveredCount: { increment: deliveredCount },
      failedCount: { increment: failedCount },
      optedOutCount: { increment: optedOutCount },
    },
    include: {
      recipients: true,
      form: { select: { id: true, title: true, slug: true } },
    },
  });

  return updatedCampaign;
}
