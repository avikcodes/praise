import { prisma } from "../db/client.ts";
import { getEmailProvider } from "../email/provider.ts";
import { logModerationActivity } from "../moderation/activity.ts";
import { logCustomerActivity } from "../customers/crm.ts";
import { interpolateThankYouTokens } from "./thank-you-tokens.ts";

export { interpolateThankYouTokens } from "./thank-you-tokens.ts";

export interface SendThankYouInput {
  workspaceId: string;
  testimonialId?: string | null;
  customerId?: string | null;
  recipientName: string;
  recipientEmail?: string | null;
  subject: string;
  message: string;
  channel?: "EMAIL" | "MANUAL_NOTE" | "VIDEO_MESSAGE" | string;
  videoUrl?: string | null;
  videoAssetId?: string | null;
  sentByUserId?: string | null;
  sentByName?: string | null;
}

/**
 * Builds HTML template for personal thank-you email with optional video attachment card.
 */
function buildThankYouHtml(params: {
  recipientName: string;
  message: string;
  workspaceName: string;
  videoUrl?: string | null;
  rewardCode?: string | null;
}): string {
  const { recipientName, message, workspaceName, videoUrl, rewardCode } = params;

  // Convert plain text newlines to clean paragraphs/linebreaks
  const formattedMessage = message
    .split("\n\n")
    .map((paragraph) => `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">${paragraph.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const videoSection = videoUrl
    ? `
    <div style="margin: 24px 0; padding: 20px; border-radius: 12px; background-color: #F8FAFC; border: 1px solid #E2E8F0; text-align: center;">
      <div style="font-size: 13px; font-weight: 600; color: #1E293B; margin-bottom: 8px;">
        🎥 A Personal Video Message from ${workspaceName}
      </div>
      <p style="font-size: 12px; color: #64748B; margin: 0 0 14px 0;">
        We recorded a short personal note to thank you for taking the time to share your review.
      </p>
      <a href="${videoUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 20px; border-radius: 8px; background-color: #2563EB; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: bold;">
        Watch Personal Thank-You Video &rarr;
      </a>
    </div>
  `
    : "";

  const rewardSection = rewardCode
    ? `
    <div style="margin: 20px 0; padding: 14px; border-radius: 8px; background-color: #EFF6FF; border: 1px dashed #93C5FD; text-align: center;">
      <span style="font-size: 11px; text-transform: uppercase; color: #1E40AF; font-weight: 600; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
        Your Appreciation Reward Code
      </span>
      <code style="font-size: 16px; font-weight: bold; color: #1D4ED8; font-family: monospace; letter-spacing: 1px;">
        ${rewardCode}
      </code>
    </div>
  `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Thank You from ${workspaceName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 32px 16px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="padding: 24px 32px; border-bottom: 1px solid #F1F5F9; background-color: #FFFFFF;">
      <span style="font-size: 15px; font-weight: bold; color: #0F172A;">${workspaceName}</span>
    </div>
    <div style="padding: 32px; font-size: 14px; color: #334155;">
      <div style="margin-bottom: 18px; font-weight: 600; font-size: 16px; color: #0F172A;">
        Dear ${recipientName},
      </div>
      ${formattedMessage}
      ${videoSection}
      ${rewardSection}
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 13px; color: #64748B;">
        Warm regards,<br/>
        <strong>${workspaceName}</strong>
      </div>
    </div>
    <div style="padding: 16px 32px; background-color: #F8FAFC; border-top: 1px solid #F1F5F9; text-align: center; font-size: 11px; color: #94A3B8;">
      This appreciation message was sent in connection with your recent review. Praise values authentic customer feedback.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Creates and delivers a personal thank-you to a customer.
 */
export async function sendCustomerThankYou(input: SendThankYouInput) {
  const {
    workspaceId,
    testimonialId,
    customerId,
    recipientName,
    recipientEmail,
    subject,
    message,
    channel = "EMAIL",
    videoUrl,
    videoAssetId,
    sentByUserId,
    sentByName = "Team Member",
  } = input;

  if (!recipientName?.trim()) {
    throw new Error("Recipient name is required.");
  }
  if (!subject?.trim()) {
    throw new Error("Subject line is required.");
  }
  if (!message?.trim()) {
    throw new Error("Thank-you message body is required.");
  }

  // Get workspace name for branding
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  const workspaceName = workspace?.name || "Our Team";

  // Check if testimonial has an associated reward code
  let rewardCode: string | null = null;
  if (testimonialId) {
    const claim = await prisma.rewardClaim.findUnique({
      where: { testimonialId },
      select: { rewardCode: true },
    });
    if (claim?.rewardCode) {
      rewardCode = claim.rewardCode;
    }
  }

  // Interpolate customer tokens
  const cleanSubject = interpolateThankYouTokens(subject, {
    customerName: recipientName,
    workspaceName,
    rewardCode,
  });

  const cleanMessage = interpolateThankYouTokens(message, {
    customerName: recipientName,
    workspaceName,
    rewardCode,
  });

  let deliveryStatus = "SENT";
  let errorMessage: string | null = null;

  // If email channel, dispatch via configured email provider
  if (channel === "EMAIL") {
    if (!recipientEmail?.trim()) {
      throw new Error("Recipient email address is required for email thank-yous.");
    }

    const emailProvider = getEmailProvider();
    const html = buildThankYouHtml({
      recipientName,
      message: cleanMessage,
      workspaceName,
      videoUrl: videoUrl?.trim() || null,
      rewardCode,
    });

    try {
      const result = await emailProvider.send({
        to: recipientEmail.trim(),
        toName: recipientName.trim(),
        subject: cleanSubject,
        text: cleanMessage,
        html,
      });

      if (!result.success) {
        deliveryStatus = "FAILED";
        errorMessage = result.error || "Failed to deliver email.";
      }
    } catch (err: unknown) {
      deliveryStatus = "FAILED";
      errorMessage = err instanceof Error ? err.message : "Email delivery error";
    }
  }

  // Record thank-you in database
  const thankYouRecord = await prisma.customerThankYou.create({
    data: {
      workspaceId,
      testimonialId: testimonialId || null,
      customerId: customerId || null,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail?.trim() || null,
      subject: cleanSubject,
      message: cleanMessage,
      channel,
      status: deliveryStatus,
      videoUrl: videoUrl?.trim() || null,
      videoAssetId: videoAssetId || null,
      sentByUserId: sentByUserId || null,
      sentByName: sentByName?.trim() || "Team Member",
      metadataJson: errorMessage ? JSON.stringify({ error: errorMessage }) : null,
      sentAt: new Date(),
    },
  });

  // Log moderation activity on testimonial if linked
  if (testimonialId) {
    logModerationActivity({
      workspaceId,
      testimonialId,
      actorName: sentByName || "Staff Member",
      action: "THANK_YOU_SENT",
      details:
        channel === "EMAIL"
          ? `Sent personal thank-you email to ${recipientName} (${recipientEmail}).`
          : `Recorded personal ${channel.toLowerCase()} appreciation for ${recipientName}.`,
      metadata: {
        thankYouId: thankYouRecord.id,
        channel,
        hasVideo: Boolean(videoUrl),
      },
    }).catch(() => {});
  }

  // Log CRM activity on customer if linked
  if (customerId) {
    logCustomerActivity({
      workspaceId,
      customerId,
      action: "THANK_YOU_SENT" as any,
      actorName: sentByName || "Staff Member",
      details:
        channel === "EMAIL"
          ? `Sent thank-you email: "${cleanSubject}"`
          : `Logged ${channel.toLowerCase()} thank you: "${cleanSubject}"`,
      metadata: {
        thankYouId: thankYouRecord.id,
        channel,
        hasVideo: Boolean(videoUrl),
      },
    }).catch(() => {});
  }

  return thankYouRecord;
}

/**
 * Retrieves thank-you history for a workspace.
 */
export async function getThankYous(
  workspaceId: string,
  filter?: {
    testimonialId?: string;
    customerId?: string;
    channel?: string;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = { workspaceId };
  if (filter?.testimonialId) where.testimonialId = filter.testimonialId;
  if (filter?.customerId) where.customerId = filter.customerId;
  if (filter?.channel && filter.channel !== "ALL") where.channel = filter.channel;

  const [records, count] = await Promise.all([
    prisma.customerThankYou.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: filter?.limit || 50,
      skip: filter?.offset || 0,
      include: {
        testimonial: {
          select: {
            id: true,
            rating: true,
            type: true,
            content: true,
            rewardClaim: {
              select: {
                id: true,
                rewardType: true,
                rewardCode: true,
                status: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
      },
    }),
    prisma.customerThankYou.count({ where }),
  ]);

  return { records, count };
}
