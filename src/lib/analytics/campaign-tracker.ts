import { prisma } from "../db/client.ts";
import { getPeriodDateRange } from "./tracker.ts";
import { METRIC_DEFINITIONS } from "./types.ts";
import type {
  AnalyticsPeriod,
  CampaignAnalyticsResponse,
  CampaignAnalyticsSummary,
  CampaignChannel,
  CampaignDailyTrend,
  CampaignPerformanceItem,
  CampaignSummaryChannelMetrics,
  RecipientStatusItem,
  TemplatePerformanceItem,
} from "./types.ts";
import { Prisma } from "@prisma/client";

export async function getWorkspaceCampaignAnalytics({
  workspaceId,
  period = "30d",
  channel = "ALL",
  projectId,
  startDate,
  endDate,
  campaignId,
}: {
  workspaceId: string;
  period?: AnalyticsPeriod;
  channel?: CampaignChannel;
  projectId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  campaignId?: string | null;
}): Promise<CampaignAnalyticsResponse> {
  const effectivePeriod = startDate && endDate ? "custom" : period;
  const { start, end, days } = getPeriodDateRange(effectivePeriod, startDate, endDate);

  // 1. Prepare campaign where clauses
  const emailWhere: Prisma.EmailCampaignWhereInput = {
    workspaceId,
  };
  const smsWhere: Prisma.SmsCampaignWhereInput = {
    workspaceId,
  };

  if (campaignId) {
    emailWhere.id = campaignId;
    smsWhere.id = campaignId;
  }

  if (effectivePeriod !== "all") {
    emailWhere.createdAt = { gte: start, lte: end };
    smsWhere.createdAt = { gte: start, lte: end };
  }

  // 2. Fetch Email Campaigns & Recipients
  let emailCampaigns: any[] = [];
  let emailRecipients: any[] = [];
  if (channel === "ALL" || channel === "EMAIL") {
    try {
      emailCampaigns = await prisma.emailCampaign.findMany({
        where: emailWhere,
        include: {
          form: { select: { id: true, title: true, slug: true } },
          template: { select: { id: true, name: true, category: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const campaignIds = emailCampaigns.map((c) => c.id);
      if (campaignIds.length > 0) {
        emailRecipients = await prisma.invitationRecipient.findMany({
          where: {
            campaignId: { in: campaignIds },
            workspaceId,
          },
          select: {
            id: true,
            campaignId: true,
            name: true,
            email: true,
            company: true,
            status: true,
            sentAt: true,
            deliveredAt: true,
            clickedAt: true,
            submittedAt: true,
            errorMessage: true,
            bounceReason: true,
            testimonialId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 500, // Safe upper limit for recipient-level table
        });
      }
    } catch (err) {
      console.error("Failed to query email campaigns:", err);
    }
  }

  // 3. Fetch SMS Campaigns & Recipients
  let smsCampaigns: any[] = [];
  let smsRecipients: any[] = [];
  if (channel === "ALL" || channel === "SMS") {
    try {
      smsCampaigns = await prisma.smsCampaign.findMany({
        where: smsWhere,
        include: {
          form: { select: { id: true, title: true, slug: true } },
          template: { select: { id: true, name: true, category: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const campaignIds = smsCampaigns.map((c) => c.id);
      if (campaignIds.length > 0) {
        smsRecipients = await prisma.smsRecipient.findMany({
          where: {
            campaignId: { in: campaignIds },
            workspaceId,
          },
          select: {
            id: true,
            campaignId: true,
            name: true,
            phoneNumber: true,
            status: true,
            sentAt: true,
            deliveredAt: true,
            clickedAt: true,
            submittedAt: true,
            errorMessage: true,
            testimonialId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        });
      }
    } catch (err) {
      console.error("Failed to query SMS campaigns:", err);
    }
  }

  // 4. Construct Campaign Performance Items
  const emailCampaignMap = new Map<string, string>();
  const campaignPerformance: CampaignPerformanceItem[] = [];

  for (const c of emailCampaigns) {
    emailCampaignMap.set(c.id, c.name);
    const sent = c.sentCount || 0;
    const delivered = c.deliveredCount || 0;
    const clicks = c.clickedCount || 0;
    const submissions = c.submittedCount || 0;

    const deliverabilityRate = sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0;
    const clickRate = delivered > 0 ? Math.round((clicks / delivered) * 1000) / 10 : 0;
    const responseRate = sent > 0 ? Math.round((submissions / sent) * 1000) / 10 : 0;

    campaignPerformance.push({
      id: c.id,
      name: c.name,
      channel: "EMAIL",
      status: c.status,
      formId: c.formId,
      formTitle: c.form?.title || "Default Form",
      templateId: c.templateId,
      templateName: c.template?.name || "Custom Content",
      createdAt: c.createdAt.toISOString(),
      scheduledAt: c.scheduledAt?.toISOString() || null,
      startedAt: c.startedAt?.toISOString() || null,
      completedAt: c.completedAt?.toISOString() || null,
      recipientsCount: c.totalRecipients || 0,
      sentCount: sent,
      deliveredCount: delivered,
      failedCount: c.failedCount || 0,
      bouncedCount: c.bouncedCount || 0,
      optedOutCount: c.unsubscribedCount || 0,
      clickedCount: clicks,
      submittedCount: submissions,
      deliverabilityRate,
      clickRate,
      responseRate,
    });
  }

  const smsCampaignMap = new Map<string, string>();
  for (const c of smsCampaigns) {
    smsCampaignMap.set(c.id, c.name);
    const sent = c.sentCount || 0;
    const delivered = c.deliveredCount || 0;
    const clicks = c.clickedCount || 0;
    const submissions = c.submittedCount || 0;

    const deliverabilityRate = sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0;
    const clickRate = delivered > 0 ? Math.round((clicks / delivered) * 1000) / 10 : 0;
    const responseRate = sent > 0 ? Math.round((submissions / sent) * 1000) / 10 : 0;

    campaignPerformance.push({
      id: c.id,
      name: c.name,
      channel: "SMS",
      status: c.status,
      formId: c.formId,
      formTitle: c.form?.title || "Default Form",
      templateId: c.templateId,
      templateName: c.template?.name || "Custom SMS",
      createdAt: c.createdAt.toISOString(),
      startedAt: c.startedAt?.toISOString() || null,
      completedAt: c.completedAt?.toISOString() || null,
      recipientsCount: c.totalRecipients || 0,
      sentCount: sent,
      deliveredCount: delivered,
      failedCount: c.failedCount || 0,
      bouncedCount: 0,
      optedOutCount: c.optedOutCount || 0,
      clickedCount: clicks,
      submittedCount: submissions,
      deliverabilityRate,
      clickRate,
      responseRate,
    });
  }

  // Sort campaigns by created desc
  campaignPerformance.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 5. Aggregate Summary by Channel
  const emailMetrics: CampaignSummaryChannelMetrics = {
    recipients: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    bounces: 0,
    optedOut: 0,
    clicks: 0,
    submissions: 0,
    deliverabilityRate: 0,
    clickRate: 0,
    responseRate: 0,
  };

  for (const c of emailCampaigns) {
    emailMetrics.recipients += c.totalRecipients || 0;
    emailMetrics.sent += c.sentCount || 0;
    emailMetrics.delivered += c.deliveredCount || 0;
    emailMetrics.failed += c.failedCount || 0;
    emailMetrics.bounces += c.bouncedCount || 0;
    emailMetrics.optedOut += c.unsubscribedCount || 0;
    emailMetrics.clicks += c.clickedCount || 0;
    emailMetrics.submissions += c.submittedCount || 0;
  }
  emailMetrics.deliverabilityRate =
    emailMetrics.sent > 0 ? Math.round((emailMetrics.delivered / emailMetrics.sent) * 1000) / 10 : 0;
  emailMetrics.clickRate =
    emailMetrics.delivered > 0 ? Math.round((emailMetrics.clicks / emailMetrics.delivered) * 1000) / 10 : 0;
  emailMetrics.responseRate =
    emailMetrics.sent > 0 ? Math.round((emailMetrics.submissions / emailMetrics.sent) * 1000) / 10 : 0;

  const smsMetrics: CampaignSummaryChannelMetrics = {
    recipients: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    optedOut: 0,
    clicks: 0,
    submissions: 0,
    deliverabilityRate: 0,
    clickRate: 0,
    responseRate: 0,
  };

  for (const c of smsCampaigns) {
    smsMetrics.recipients += c.totalRecipients || 0;
    smsMetrics.sent += c.sentCount || 0;
    smsMetrics.delivered += c.deliveredCount || 0;
    smsMetrics.failed += c.failedCount || 0;
    smsMetrics.optedOut += c.optedOutCount || 0;
    smsMetrics.clicks += c.clickedCount || 0;
    smsMetrics.submissions += c.submittedCount || 0;
  }
  smsMetrics.deliverabilityRate =
    smsMetrics.sent > 0 ? Math.round((smsMetrics.delivered / smsMetrics.sent) * 1000) / 10 : 0;
  smsMetrics.clickRate =
    smsMetrics.delivered > 0 ? Math.round((smsMetrics.clicks / smsMetrics.delivered) * 1000) / 10 : 0;
  smsMetrics.responseRate =
    smsMetrics.sent > 0 ? Math.round((smsMetrics.submissions / smsMetrics.sent) * 1000) / 10 : 0;

  const totalCampaigns = campaignPerformance.length;
  const totalRecipients = emailMetrics.recipients + smsMetrics.recipients;
  const totalSent = emailMetrics.sent + smsMetrics.sent;
  const totalDelivered = emailMetrics.delivered + smsMetrics.delivered;
  const totalFailed = emailMetrics.failed + smsMetrics.failed;
  const totalBounced = emailMetrics.bounces || 0;
  const totalOptedOut = (emailMetrics.optedOut || 0) + (smsMetrics.optedOut || 0);
  const totalClicks = emailMetrics.clicks + smsMetrics.clicks;
  const totalSubmissions = emailMetrics.submissions + smsMetrics.submissions;

  const deliverabilityRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 1000) / 10 : 0;
  const clickRate = totalDelivered > 0 ? Math.round((totalClicks / totalDelivered) * 1000) / 10 : 0;
  const responseRate = totalSent > 0 ? Math.round((totalSubmissions / totalSent) * 1000) / 10 : 0;

  const summary: CampaignAnalyticsSummary = {
    totalCampaigns,
    totalRecipients,
    totalSent,
    totalDelivered,
    totalFailed,
    totalBounced,
    totalOptedOut,
    deliverabilityRate,
    totalClicks,
    clickRate,
    totalSubmissions,
    responseRate,
    emailMetrics,
    smsMetrics,
  };

  // 6. Aggregate Performance by Invitation Template
  const templateMap = new Map<string, TemplatePerformanceItem>();

  for (const c of campaignPerformance) {
    const tId = c.templateId || (c.channel === "EMAIL" ? "tmpl-custom-email" : "tmpl-custom-sms");
    const tName = c.templateName || (c.channel === "EMAIL" ? "Custom Email Template" : "Custom SMS Template");
    const category = c.channel === "EMAIL" ? "EMAIL" : "SMS";

    const existing = templateMap.get(tId) || {
      templateId: tId,
      templateName: tName,
      channel: c.channel,
      category,
      campaignsCount: 0,
      sentCount: 0,
      deliveredCount: 0,
      clickedCount: 0,
      submittedCount: 0,
      deliverabilityRate: 0,
      clickRate: 0,
      responseRate: 0,
    };

    existing.campaignsCount += 1;
    existing.sentCount += c.sentCount;
    existing.deliveredCount += c.deliveredCount;
    existing.clickedCount += c.clickedCount;
    existing.submittedCount += c.submittedCount;

    existing.deliverabilityRate =
      existing.sentCount > 0 ? Math.round((existing.deliveredCount / existing.sentCount) * 1000) / 10 : 0;
    existing.clickRate =
      existing.deliveredCount > 0 ? Math.round((existing.clickedCount / existing.deliveredCount) * 1000) / 10 : 0;
    existing.responseRate =
      existing.sentCount > 0 ? Math.round((existing.submittedCount / existing.sentCount) * 1000) / 10 : 0;

    templateMap.set(tId, existing);
  }

  const templatePerformance = Array.from(templateMap.values()).sort(
    (a, b) => b.submittedCount - a.submittedCount || b.sentCount - a.sentCount
  );

  // 7. Aggregate Daily Campaign Activity Trends
  const bucketMap = new Map<string, CampaignDailyTrend>();
  const bucketDays = effectivePeriod === "all" ? Math.min(days, 30) : days;
  const dayStep = new Date(start);

  for (let i = 0; i < bucketDays; i++) {
    const dateKey = dayStep.toISOString().slice(0, 10);
    const label = dayStep.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    bucketMap.set(dateKey, {
      date: dateKey,
      label,
      sent: 0,
      delivered: 0,
      failedOrBounced: 0,
      clicks: 0,
      submissions: 0,
    });
    dayStep.setDate(dayStep.getDate() + 1);
  }

  // Populate from recipient event timestamps
  for (const r of emailRecipients) {
    if (r.sentAt) {
      const d = r.sentAt.toISOString().slice(0, 10);
      const b = bucketMap.get(d);
      if (b) b.sent++;
    }
    if (r.deliveredAt) {
      const d = r.deliveredAt.toISOString().slice(0, 10);
      const b = bucketMap.get(d);
      if (b) b.delivered++;
    }
    if (r.status === "BOUNCED" || r.status === "FAILED") {
      const d = (r.deliveredAt || r.sentAt || r.createdAt).toISOString().slice(0, 10);
      const b = bucketMap.get(d);
      if (b) b.failedOrBounced++;
    }
    if (r.clickedAt) {
      const d = r.clickedAt.toISOString().slice(0, 10);
      const b = bucketMap.get(d);
      if (b) b.clicks++;
    }
    if (r.submittedAt) {
      const d = r.submittedAt.toISOString().slice(0, 10);
      const b = bucketMap.get(d);
      if (b) b.submissions++;
    }
  }

  for (const r of smsRecipients) {
    if (r.sentAt) {
      const d = r.sentAt.toISOString().slice(0, 10);
      const b = bucketMap.get(d);
      if (b) b.sent++;
    }
    if (r.deliveredAt) {
      const d = r.deliveredAt.toISOString().slice(0, 10);
      const b = bucketMap.get(d);
      if (b) b.delivered++;
    }
    if (r.status === "FAILED") {
      const d = (r.deliveredAt || r.sentAt || r.createdAt).toISOString().slice(0, 10);
      const b = bucketMap.get(d);
      if (b) b.failedOrBounced++;
    }
    if (r.clickedAt) {
      const d = r.clickedAt.toISOString().slice(0, 10);
      const b = bucketMap.get(d);
      if (b) b.clicks++;
    }
    if (r.submittedAt) {
      const d = r.submittedAt.toISOString().slice(0, 10);
      const b = bucketMap.get(d);
      if (b) b.submissions++;
    }
  }

  const dailyTrends = Array.from(bucketMap.values());

  // 8. Construct Recipient-Level Status Records
  const recipients: RecipientStatusItem[] = [];

  for (const r of emailRecipients) {
    recipients.push({
      id: r.id,
      campaignId: r.campaignId,
      campaignName: emailCampaignMap.get(r.campaignId) || "Email Campaign",
      channel: "EMAIL",
      name: r.name,
      contact: r.email,
      company: r.company || null,
      status: r.status,
      sentAt: r.sentAt?.toISOString() || null,
      deliveredAt: r.deliveredAt?.toISOString() || null,
      clickedAt: r.clickedAt?.toISOString() || null,
      submittedAt: r.submittedAt?.toISOString() || null,
      errorMessage: r.errorMessage || null,
      bounceReason: r.bounceReason || null,
      testimonialId: r.testimonialId || null,
    });
  }

  for (const r of smsRecipients) {
    recipients.push({
      id: r.id,
      campaignId: r.campaignId,
      campaignName: smsCampaignMap.get(r.campaignId) || "SMS Campaign",
      channel: "SMS",
      name: r.name,
      contact: r.phoneNumber,
      company: null,
      status: r.status,
      sentAt: r.sentAt?.toISOString() || null,
      deliveredAt: r.deliveredAt?.toISOString() || null,
      clickedAt: r.clickedAt?.toISOString() || null,
      submittedAt: r.submittedAt?.toISOString() || null,
      errorMessage: r.errorMessage || null,
      bounceReason: null,
      testimonialId: r.testimonialId || null,
    });
  }

  // Sort recipients: submitted first, then by sentAt / createdAt desc
  recipients.sort((a, b) => {
    if (a.submittedAt && !b.submittedAt) return -1;
    if (!a.submittedAt && b.submittedAt) return 1;
    const timeA = new Date(a.sentAt || a.deliveredAt || 0).getTime();
    const timeB = new Date(b.sentAt || b.deliveredAt || 0).getTime();
    return timeB - timeA;
  });

  return {
    period: effectivePeriod,
    channel,
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    summary,
    dailyTrends,
    campaigns: campaignPerformance,
    templatePerformance,
    recipients,
    metricDefinitions: METRIC_DEFINITIONS,
  };
}

/**
 * Generates formatted CSV content for exportable campaign reports.
 */
export function generateCampaignCsv(campaigns: CampaignPerformanceItem[]): string {
  const headers = [
    "Campaign ID",
    "Campaign Name",
    "Channel",
    "Status",
    "Collection Form",
    "Template",
    "Recipients Enrolled",
    "Messages Sent",
    "Delivered (Provider)",
    "Delivery Failures",
    "Bounces",
    "Opt-Outs / Unsubscribed",
    "Verified Clicks (Measured)",
    "Submissions (Measured)",
    "Deliverability Rate (%)",
    "Click Rate (%)",
    "Response Rate (%)",
    "Created Date",
  ];

  const escapeCsv = (val: any) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = campaigns.map((c) => [
    escapeCsv(c.id),
    escapeCsv(c.name),
    escapeCsv(c.channel),
    escapeCsv(c.status),
    escapeCsv(c.formTitle),
    escapeCsv(c.templateName),
    c.recipientsCount,
    c.sentCount,
    c.deliveredCount,
    c.failedCount,
    c.bouncedCount,
    c.optedOutCount,
    c.clickedCount,
    c.submittedCount,
    c.deliverabilityRate,
    c.clickRate,
    c.responseRate,
    escapeCsv(c.createdAt),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Generates formatted CSV content for recipient-level status audit exports.
 */
export function generateRecipientCsv(recipients: RecipientStatusItem[]): string {
  const headers = [
    "Recipient ID",
    "Name",
    "Contact (Email/Phone)",
    "Company",
    "Campaign Name",
    "Channel",
    "Delivery Status",
    "Sent At",
    "Delivered At",
    "Clicked At",
    "Submitted At",
    "Error / Bounce Reason",
    "Has Testimonial",
  ];

  const escapeCsv = (val: any) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = recipients.map((r) => [
    escapeCsv(r.id),
    escapeCsv(r.name),
    escapeCsv(r.contact),
    escapeCsv(r.company || ""),
    escapeCsv(r.campaignName),
    escapeCsv(r.channel),
    escapeCsv(r.status),
    escapeCsv(r.sentAt || ""),
    escapeCsv(r.deliveredAt || ""),
    escapeCsv(r.clickedAt || ""),
    escapeCsv(r.submittedAt || ""),
    escapeCsv(r.errorMessage || r.bounceReason || ""),
    r.testimonialId ? "YES" : "NO",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
