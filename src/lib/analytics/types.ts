export type AnalyticsPeriod = "7d" | "30d" | "90d" | "all" | "custom";

export type MetricDefinition = {
  name: string;
  category: "Widget" | "Video" | "Campaign" | "General";
  shortDescription: string;
  calculationMethod: string;
  sourceType?: "MEASURED_EVENT" | "PROVIDER_REPORTED" | "AGGREGATED";
  reliabilityNotice?: string;
};

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  widgetImpressions: {
    name: "Widget Impressions",
    category: "Widget",
    shortDescription: "Total instances where the widget container was delivered and initialized on a page.",
    calculationMethod: "Count of all initial widget embed render events, deduplicated against rapid bot reloads.",
    sourceType: "MEASURED_EVENT",
  },
  widgetViews: {
    name: "Widget Views (Viewable)",
    category: "Widget",
    shortDescription: "Verified times the widget scrolled into the active viewport and was seen by a human visitor.",
    calculationMethod: "IntersectionObserver events confirming >= 50% visibility for at least 1 continuous second, deduplicated per visitor session.",
    sourceType: "MEASURED_EVENT",
  },
  ctaClicks: {
    name: "CTA Clicks",
    category: "Widget",
    shortDescription: "User clicks on Call-To-Action buttons inside widgets (e.g. 'Leave a review' or custom links).",
    calculationMethod: "Recorded click events on primary CTA elements with debounce protection against click spam.",
    sourceType: "MEASURED_EVENT",
  },
  testimonialInteractions: {
    name: "Individual Testimonial Interactions",
    category: "Widget",
    shortDescription: "Direct user engagement with specific testimonial cards (expands, modal popups, quote shares).",
    calculationMethod: "Clicks and keyboard activations targeting individual testimonial cards within any widget.",
    sourceType: "MEASURED_EVENT",
  },
  widgetCtaRate: {
    name: "Widget Click-Through Rate (CTR)",
    category: "Widget",
    shortDescription: "Percentage of viewable widget impressions that generated at least one CTA click.",
    calculationMethod: "(Total CTA Clicks / Verified Widget Views) * 100",
    sourceType: "AGGREGATED",
  },
  widgetInteractionRate: {
    name: "Widget Interaction Rate",
    category: "Widget",
    shortDescription: "Percentage of viewable widget impressions where users interacted with individual cards.",
    calculationMethod: "(Total Testimonial Interactions / Verified Widget Views) * 100",
    sourceType: "AGGREGATED",
  },
  videoPlays: {
    name: "Video Plays",
    category: "Video",
    shortDescription: "Total times a video testimonial started playback.",
    calculationMethod: "HTML5 video play events initiated by user action or verified autoplay.",
    sourceType: "MEASURED_EVENT",
  },
  playbackDuration: {
    name: "Playback Duration",
    category: "Video",
    shortDescription: "Cumulative duration of video content watched across all viewer sessions.",
    calculationMethod: "Sum of verified playback watch-time seconds, clamped to video duration to discard anomalies.",
    sourceType: "MEASURED_EVENT",
  },
  averageWatchTime: {
    name: "Average Watch Time",
    category: "Video",
    shortDescription: "Mean duration a viewer spends watching a video before pausing or navigating away.",
    calculationMethod: "Total Playback Duration in seconds divided by Total Video Plays.",
    sourceType: "AGGREGATED",
  },
  videoCompletionRate: {
    name: "Video Completion Rate",
    category: "Video",
    shortDescription: "Proportion of video plays that were watched to completion (>= 90% progress).",
    calculationMethod: "(Video Completed Plays / Total Video Plays) * 100",
    sourceType: "AGGREGATED",
  },

  // ---------------------------------------------------------------------------
  // INVITATION CAMPAIGN METRIC DEFINITIONS
  // ---------------------------------------------------------------------------
  campaignRecipients: {
    name: "Recipients Enrolled",
    category: "Campaign",
    shortDescription: "Total customer profiles or phone/email contacts enrolled across selected campaigns.",
    calculationMethod: "Count of all recipient records linked to the campaigns.",
    sourceType: "MEASURED_EVENT",
  },
  campaignMessagesSent: {
    name: "Messages Sent",
    category: "Campaign",
    shortDescription: "Total email dispatches and outbound SMS message segments transmitted.",
    calculationMethod: "Outbound dispatches processed through the application's sending queue.",
    sourceType: "MEASURED_EVENT",
  },
  campaignDeliverySuccess: {
    name: "Delivery Successes",
    category: "Campaign",
    shortDescription: "Messages confirmed as successfully accepted by recipient mail servers or carrier handsets.",
    calculationMethod: "Upstream provider delivery receipt status (delivered callback from SMTP/Twilio gateway).",
    sourceType: "PROVIDER_REPORTED",
  },
  campaignDeliveryFailures: {
    name: "Delivery Failures",
    category: "Campaign",
    shortDescription: "Messages rejected during transmission due to carrier blocks, unallocated numbers, or gateway rejections.",
    calculationMethod: "Upstream provider error callbacks and local failure responses.",
    sourceType: "PROVIDER_REPORTED",
  },
  campaignBounces: {
    name: "Email Bounces",
    category: "Campaign",
    shortDescription: "Outbound invitation emails rejected by the recipient mail server (hard or soft bounce).",
    calculationMethod: "Upstream SMTP bounce event notifications from Resend/SendGrid/SES.",
    sourceType: "PROVIDER_REPORTED",
  },
  campaignClicks: {
    name: "Verified Invitation Clicks",
    category: "Campaign",
    shortDescription: "Recipients who clicked the personal review collection link in their email or SMS.",
    calculationMethod: "Direct application hit to /api/invitations/resolve with recipient's secure personal token.",
    sourceType: "MEASURED_EVENT",
  },
  campaignResponses: {
    name: "Testimonial Submissions",
    category: "Campaign",
    shortDescription: "Completed customer testimonials submitted through invitation campaign links.",
    calculationMethod: "Verified Testimonial records linked to recipient token upon form submission.",
    sourceType: "MEASURED_EVENT",
  },
  campaignResponseRate: {
    name: "Campaign Response Rate",
    category: "Campaign",
    shortDescription: "Conversion rate of sent invitation messages into completed customer testimonials.",
    calculationMethod: "(Completed Submissions / Total Messages Sent) * 100",
    sourceType: "AGGREGATED",
  },
  emailOpensDisclaimer: {
    name: "Email Opens (Pixel Tracking)",
    category: "Campaign",
    shortDescription: "Historically measured via 1x1 tracking pixels; now fundamentally distorted by privacy environments.",
    calculationMethod: "Recorded pixel requests. Note: Apple Mail Privacy Protection (MPP) & enterprise proxies prefetch pixels automatically, inflating open rates by 30-60%. Praise prioritizes verified clicks & completed reviews as actionable truth.",
    sourceType: "PROVIDER_REPORTED",
    reliabilityNotice: "Unreliable indicator due to automated proxy caching and Apple MPP.",
  },
};

export type AnalyticsSummary = {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  archivedSubmissions: number;
  approvalRate: number; // Percentage (0-100)
  formViews: number;
  formSubmissionRate: number; // Conversion rate Percentage (0-100)
  
  // Widget Analytics Metrics
  widgetImpressions: number;
  widgetViews: number;
  widgetViewRate: number; // (views / impressions) * 100
  widgetCtaClicks: number;
  widgetCtaRate: number; // (ctaClicks / views) * 100
  widgetInteractions: number;
  widgetInteractionRate: number; // (interactions / views) * 100

  // Video Analytics Metrics
  videoPlays: number;
  totalPlaybackDurationSeconds: number;
  averageWatchTimeSeconds: number;
  completedPlays: number;
  videoCompletionRate: number; // (completedPlays / videoPlays) * 100

  averageRating: number | null;
  typeDistribution: {
    text: number;
    video: number;
    audio: number;
  };
};

export type AnalyticsDailyTrend = {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Nov 4"
  submissions: number;
  approved: number;
  pending: number;
  rejected: number;
  formViews: number;
  widgetImpressions: number;
  widgetViews: number;
  widgetCtaClicks: number;
  widgetInteractions: number;
  videoPlays: number;
  videoWatchTimeSeconds: number;
  videoCompletions: number;
};

export type FormPerformanceItem = {
  id: string;
  title: string;
  slug: string;
  projectId?: string | null;
  projectName?: string | null;
  isPublished: boolean;
  views: number;
  submissions: number;
  submissionRate: number; // Percentage (0-100)
  approvedCount: number;
};

export type WidgetPerformanceItem = {
  id: string;
  name: string;
  type: string;
  slug?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  impressions: number;
  views: number;
  ctaClicks: number;
  interactions: number;
  ctaRate: number; // (ctaClicks / views) * 100
  interactionRate: number; // (interactions / views) * 100
  videoPlays: number;
};

export type WidgetByProjectItem = {
  projectId: string;
  projectName: string;
  widgetCount: number;
  impressions: number;
  views: number;
  ctaClicks: number;
  interactions: number;
  ctaRate: number;
  interactionRate: number;
};

export type VideoPerformanceItem = {
  testimonialId: string;
  customerName: string;
  customerCompany?: string | null;
  avatarUrl?: string | null;
  videoDurationSeconds: number;
  projectId?: string | null;
  projectName?: string | null;
  plays: number;
  totalWatchTimeSeconds: number;
  averageWatchTimeSeconds: number;
  completedPlays: number;
  completionRate: number; // Percentage (0-100)
};

export type VideoByWidgetPerformanceItem = {
  widgetId: string;
  widgetName: string;
  widgetType: string;
  projectId?: string | null;
  projectName?: string | null;
  videoPlays: number;
  totalWatchTimeSeconds: number;
  averageWatchTimeSeconds: number;
  completionRate: number;
};

export type VideoByProjectPerformanceItem = {
  projectId: string;
  projectName: string;
  videoCount: number;
  videoPlays: number;
  totalWatchTimeSeconds: number;
  averageWatchTimeSeconds: number;
  completionRate: number;
};

// -----------------------------------------------------------------------------
// INVITATION CAMPAIGN PERFORMANCE TYPES
// -----------------------------------------------------------------------------
export type CampaignChannel = "ALL" | "EMAIL" | "SMS";

export type CampaignSummaryChannelMetrics = {
  recipients: number;
  sent: number;
  delivered: number;
  failed: number;
  bounces?: number;
  optedOut?: number;
  clicks: number;
  submissions: number;
  deliverabilityRate: number;
  clickRate: number;
  responseRate: number;
};

export type CampaignAnalyticsSummary = {
  totalCampaigns: number;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number; // Provider-reported
  totalFailed: number; // Provider-reported
  totalBounced: number; // Provider-reported
  totalOptedOut: number; // Provider-reported/consent
  deliverabilityRate: number; // (delivered / sent) * 100
  
  // Measured Application Events
  totalClicks: number; // Verified token clicks
  clickRate: number; // (clicks / delivered) * 100
  totalSubmissions: number; // Completed reviews
  responseRate: number; // (submissions / sent) * 100

  // Channel Breakdown
  emailMetrics: CampaignSummaryChannelMetrics;
  smsMetrics: CampaignSummaryChannelMetrics;
};

export type CampaignDailyTrend = {
  date: string;
  label: string;
  sent: number;
  delivered: number;
  failedOrBounced: number;
  clicks: number;
  submissions: number;
};

export type CampaignPerformanceItem = {
  id: string;
  name: string;
  channel: "EMAIL" | "SMS";
  status: string;
  formId: string;
  formTitle: string;
  templateId?: string | null;
  templateName?: string | null;
  createdAt: string;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  
  // Counts
  recipientsCount: number;
  sentCount: number;
  deliveredCount: number; // Provider-reported
  failedCount: number; // Provider-reported
  bouncedCount: number; // Provider-reported
  optedOutCount: number; // Unsubscribe / opt-out
  
  // Measured events
  clickedCount: number;
  submittedCount: number;

  // Calculated Rates
  deliverabilityRate: number; // %
  clickRate: number; // %
  responseRate: number; // %
};

export type TemplatePerformanceItem = {
  templateId: string;
  templateName: string;
  channel: "EMAIL" | "SMS";
  category: string;
  campaignsCount: number;
  sentCount: number;
  deliveredCount: number;
  clickedCount: number;
  submittedCount: number;
  deliverabilityRate: number;
  clickRate: number;
  responseRate: number;
};

export type RecipientStatusItem = {
  id: string;
  campaignId: string;
  campaignName: string;
  channel: "EMAIL" | "SMS";
  name: string;
  contact: string; // Email address or E.164 phone
  company?: string | null;
  status: string; // PENDING, SENT, DELIVERED, CLICKED, SUBMITTED, BOUNCED, FAILED, UNSUBSCRIBED, OPTED_OUT
  sentAt?: string | null;
  deliveredAt?: string | null;
  clickedAt?: string | null;
  submittedAt?: string | null;
  errorMessage?: string | null;
  bounceReason?: string | null;
  testimonialId?: string | null;
};

export type CampaignAnalyticsResponse = {
  period: AnalyticsPeriod;
  channel: CampaignChannel;
  dateRange: {
    start: string;
    end: string;
  };
  summary: CampaignAnalyticsSummary;
  dailyTrends: CampaignDailyTrend[];
  campaigns: CampaignPerformanceItem[];
  templatePerformance: TemplatePerformanceItem[];
  recipients: RecipientStatusItem[];
  metricDefinitions: Record<string, MetricDefinition>;
};

export type AnalyticsResponse = {
  period: AnalyticsPeriod;
  dateRange: {
    start: string;
    end: string;
  };
  summary: AnalyticsSummary;
  dailyTrends: AnalyticsDailyTrend[];
  formPerformance: FormPerformanceItem[];
  widgetPerformance: WidgetPerformanceItem[];
  widgetByProject: WidgetByProjectItem[];
  videoPerformance: VideoPerformanceItem[];
  videoByWidget: VideoByWidgetPerformanceItem[];
  videoByProject: VideoByProjectPerformanceItem[];
  metricDefinitions: Record<string, MetricDefinition>;
};
