import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../db/client.ts";
import { parseWidgetConfig } from "../widgets/utils.ts";
import type {
  AnalyticsDailyTrend,
  AnalyticsPeriod,
  AnalyticsResponse,
  FormPerformanceItem,
  VideoByProjectPerformanceItem,
  VideoByWidgetPerformanceItem,
  VideoPerformanceItem,
  WidgetByProjectItem,
  WidgetPerformanceItem,
} from "./types.ts";
import { METRIC_DEFINITIONS } from "./types.ts";
import { Prisma, WidgetEventType } from "@prisma/client";

export type AnalyticsEventType =
  | "IMPRESSION"
  | "VIEW"
  | "INTERACTION"
  | "CTA_CLICK"
  | "TESTIMONIAL_CLICK"
  | "VIDEO_PLAY"
  | "VIDEO_PROGRESS"
  | "VIDEO_COMPLETE";

export type StoredEvent = {
  id: string;
  workspaceId: string;
  targetType: "FORM" | "WIDGET" | "TESTIMONIAL" | "VIDEO";
  targetId: string;
  testimonialId?: string | null;
  eventType: AnalyticsEventType;
  recordedAt: string; // ISO date
  metadata?: {
    watchDurationSeconds?: number;
    videoDurationSeconds?: number;
    completed?: boolean;
    ctaUrl?: string;
    ctaText?: string;
    target?: string;
    [key: string]: unknown;
  };
};

// In-memory sliding window for deduplication (hash -> timestamp)
const recentVisitorHashes = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// Periodic cleanup of stale deduplication hashes every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [hash, ts] of recentVisitorHashes.entries()) {
      if (now - ts > DEDUPLICATION_WINDOW_MS) {
        recentVisitorHashes.delete(hash);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

// In-memory events cache backed by file persistence for self-hosted resilience
let memoryEvents: StoredEvent[] = [];
let isLoaded = false;
const DATA_DIR = path.resolve(process.cwd(), "data", "analytics");
const DATA_FILE = path.join(DATA_DIR, "events.json");

async function ensureLoaded(): Promise<void> {
  if (isLoaded) return;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    memoryEvents = JSON.parse(raw);
  } catch {
    memoryEvents = [];
  }
  isLoaded = true;
}

let saveTimeout: NodeJS.Timeout | null = null;
function scheduleSave(): void {
  if (saveTimeout) return;
  saveTimeout = setTimeout(async () => {
    saveTimeout = null;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      // Keep most recent 50,000 events to prevent unbounded file growth
      if (memoryEvents.length > 50000) {
        memoryEvents = memoryEvents.slice(-50000);
      }
      await fs.writeFile(DATA_FILE, JSON.stringify(memoryEvents), "utf-8");
    } catch (err) {
      console.error("Failed to persist analytics events to disk:", err);
    }
  }, 1000);
}

/**
 * Filter bot-like and crawler requests.
 * Uses standard User-Agent inspection without collecting personal data.
 */
export function isBotUserAgent(userAgent?: string): boolean {
  if (!userAgent || userAgent.trim().length === 0) return false; // Don't block requests with missing UA by default
  const lower = userAgent.toLowerCase();
  const botPatterns = [
    "googlebot",
    "bingbot",
    "yandexbot",
    "baiduspider",
    "duckduckbot",
    "slurp",
    "twitterbot",
    "facebookexternalhit",
    "linkedinbot",
    "embedly",
    "quora link preview",
    "showyoubot",
    "outbrain",
    "pinterest",
    "slackbot",
    "vkshare",
    "w3c_validator",
    "curl",
    "wget",
    "python-requests",
    "aiohttp",
    "httpx",
    "headlesschrome",
    "puppeteer",
    "playwright",
    "selenium",
    "phantomjs",
    "lighthouse",
    "postmanruntime",
  ];
  return botPatterns.some((pattern) => lower.includes(pattern));
}

/**
 * Privacy-conscious visitor deduplication check.
 * Creates a one-way ephemeral hash that never stores the raw IP or user-agent.
 */
function isRecentVisitor(
  clientIp: string,
  userAgent: string,
  targetId: string,
  eventType: string
): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const hash = crypto
    .createHash("sha256")
    .update(`${clientIp}:${userAgent.slice(0, 50)}:${targetId}:${eventType}:${today}`)
    .digest("hex");

  const now = Date.now();
  const lastSeen = recentVisitorHashes.get(hash);

  if (lastSeen && now - lastSeen < DEDUPLICATION_WINDOW_MS) {
    return true; // Already recorded recently, skip counting
  }

  recentVisitorHashes.set(hash, now);
  return false;
}

/**
 * Maps incoming event strings to canonical Prisma WidgetEventType enum.
 */
function mapToPrismaEventType(eventType: AnalyticsEventType): WidgetEventType {
  switch (eventType) {
    case "IMPRESSION":
      return WidgetEventType.IMPRESSION;
    case "VIEW":
      return WidgetEventType.VIEW;
    case "CTA_CLICK":
      return WidgetEventType.CTA_CLICK;
    case "TESTIMONIAL_CLICK":
      return WidgetEventType.TESTIMONIAL_CLICK;
    case "VIDEO_PLAY":
      return WidgetEventType.VIDEO_PLAY;
    case "VIDEO_PROGRESS":
      return WidgetEventType.VIDEO_PROGRESS;
    case "VIDEO_COMPLETE":
      return WidgetEventType.VIDEO_COMPLETE;
    case "INTERACTION":
    default:
      return WidgetEventType.INTERACTION;
  }
}

/**
 * Records a privacy-conscious analytics event.
 */
export async function recordAnalyticsEvent({
  workspaceId,
  targetType,
  targetId,
  testimonialId,
  eventType,
  clientIp = "127.0.0.1",
  userAgent = "",
  metadata,
}: {
  workspaceId: string;
  targetType: "FORM" | "WIDGET" | "TESTIMONIAL" | "VIDEO";
  targetId: string;
  testimonialId?: string | null;
  eventType: AnalyticsEventType;
  clientIp?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ recorded: boolean; reason?: string }> {
  // 1. Bot & Crawler Filtering
  if (isBotUserAgent(userAgent)) {
    return { recorded: false, reason: "bot_filtered" };
  }

  // 2. Deduplication check for VIEW & IMPRESSION events
  if ((eventType === "VIEW" || eventType === "IMPRESSION") && isRecentVisitor(clientIp, userAgent, targetId, eventType)) {
    return { recorded: false, reason: "deduplicated_recent_visitor" };
  }

  // 3. Invalid Event Validation (e.g. video watch time sanity check)
  if (metadata?.watchDurationSeconds !== undefined) {
    const secs = Number(metadata.watchDurationSeconds);
    if (isNaN(secs) || secs < 0 || secs > 7200) {
      return { recorded: false, reason: "invalid_duration_range" };
    }
  }

  await ensureLoaded();

  const newEvent: StoredEvent = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    workspaceId,
    targetType,
    targetId,
    testimonialId: testimonialId || null,
    eventType,
    recordedAt: new Date().toISOString(),
    metadata,
  };

  memoryEvents.push(newEvent);
  scheduleSave();

  // 4. Also record to Prisma WidgetEvent table if target is a widget
  if (targetType === "WIDGET" && !targetId.startsWith("proj-")) {
    try {
      const pEventType = mapToPrismaEventType(eventType);
      await prisma.widgetEvent.create({
        data: {
          workspaceId,
          widgetId: targetId,
          testimonialId: testimonialId || null,
          eventType: pEventType,
          metadataJson: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch {
      // Ignore DB error if database is offline or sqlite fallback
    }
  }

  return { recorded: true };
}

/**
 * Calculates start and end Date objects for an analytics period or custom date range.
 */
export function getPeriodDateRange(
  period: AnalyticsPeriod,
  customStart?: string | null,
  customEnd?: string | null
): { start: Date; end: Date; days: number } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period === "custom" && customStart && customEnd) {
    const s = new Date(customStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(customEnd);
    e.setHours(23, 59, 59, 999);

    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s <= e) {
      const diffDays = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
      return { start: s, end: e, days: diffDays };
    }
  }

  let days = 30;
  if (period === "7d") {
    days = 7;
    start.setDate(end.getDate() - 6);
  } else if (period === "90d") {
    days = 90;
    start.setDate(end.getDate() - 89);
  } else if (period === "all") {
    days = 365;
    start.setFullYear(end.getFullYear() - 5);
  } else {
    // 30d default
    days = 30;
    start.setDate(end.getDate() - 29);
  }

  return { start, end, days };
}

/**
 * Queries and calculates workspace analytics scoped to the date range, widget, media, and project.
 */
export async function getWorkspaceAnalytics({
  workspaceId,
  period = "30d",
  projectId,
  startDate,
  endDate,
}: {
  workspaceId: string;
  period?: AnalyticsPeriod;
  projectId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<AnalyticsResponse> {
  const effectivePeriod = startDate && endDate ? "custom" : period;
  const { start, end, days } = getPeriodDateRange(effectivePeriod, startDate, endDate);
  await ensureLoaded();

  // 1. Query actual Testimonials within workspace and date range
  const testimonialWhere: Prisma.TestimonialWhereInput = {
    workspaceId,
  };

  if (projectId) {
    testimonialWhere.projectId = projectId;
  }

  if (effectivePeriod !== "all") {
    testimonialWhere.submittedAt = {
      gte: start,
      lte: end,
    };
  }

  let testimonials: Array<{
    id: string;
    status: string;
    type: string;
    rating: number | null;
    submittedAt: Date;
    formId: string | null;
    projectId: string | null;
    customer?: { name: string; company?: string | null; avatarUrl?: string | null } | null;
    mediaAssets?: Array<{ id: string; type: string; durationSeconds?: number | null }>;
  }> = [];

  try {
    testimonials = await prisma.testimonial.findMany({
      where: testimonialWhere,
      select: {
        id: true,
        status: true,
        type: true,
        rating: true,
        submittedAt: true,
        formId: true,
        projectId: true,
        customer: { select: { name: true, company: true, avatarUrl: true } },
        mediaAssets: { select: { id: true, type: true, durationSeconds: true } },
      },
    });
  } catch {
    // Graceful fallback when DB is offline
  }

  // Also query all video testimonials in workspace to populate video report even if submitted earlier
  let allVideoTestimonials: Array<{
    id: string;
    projectId: string | null;
    customer?: { name: string; company?: string | null; avatarUrl?: string | null } | null;
    mediaAssets?: Array<{ id: string; type: string; durationSeconds?: number | null }>;
    project?: { name: string } | null;
  }> = [];

  try {
    const vWhere: Prisma.TestimonialWhereInput = {
      workspaceId,
      status: "APPROVED",
      type: "VIDEO",
    };
    if (projectId) vWhere.projectId = projectId;

    allVideoTestimonials = await prisma.testimonial.findMany({
      where: vWhere,
      select: {
        id: true,
        projectId: true,
        customer: { select: { name: true, company: true, avatarUrl: true } },
        mediaAssets: { select: { id: true, type: true, durationSeconds: true } },
        project: { select: { name: true } },
      },
    });
  } catch {
    // Graceful fallback
  }

  // 2. Query workspace forms
  const formWhere: Prisma.CollectionFormWhereInput = { workspaceId };
  if (projectId) formWhere.projectId = projectId;

  let forms: Array<{
    id: string;
    title: string;
    slug: string;
    projectId: string | null;
    isPublished: boolean;
    project?: { name: string } | null;
  }> = [];

  try {
    forms = await prisma.collectionForm.findMany({
      where: formWhere,
      select: {
        id: true,
        title: true,
        slug: true,
        projectId: true,
        isPublished: true,
        project: { select: { name: true } },
      },
    });
  } catch {
    // Graceful fallback
  }

  // 3. Query workspace widgets
  const widgetWhere: Prisma.WidgetWhereInput = { workspaceId };
  if (projectId) widgetWhere.projectId = projectId;

  let widgets: Array<{
    id: string;
    name: string;
    type: string;
    projectId: string | null;
    configJson: string | null;
    project?: { name: string } | null;
  }> = [];

  try {
    widgets = await prisma.widget.findMany({
      where: widgetWhere,
      select: {
        id: true,
        name: true,
        type: true,
        projectId: true,
        configJson: true,
        project: { select: { name: true } },
      },
    });
  } catch {
    // Graceful fallback
  }

  // 4. Query workspace projects for project breakdowns
  let projects: Array<{ id: string; name: string }> = [];
  try {
    projects = await prisma.project.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    });
  } catch {
    // Graceful fallback
  }

  const projectMap = new Map<string, string>();
  for (const p of projects) {
    projectMap.set(p.id, p.name);
  }

  // 5. Query and unify events from both Prisma DB and memory/file storage
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  // Combine memory events and DB events, deduplicating by ID
  const eventMap = new Map<string, StoredEvent>();

  // A. Load from memoryEvents
  for (const ev of memoryEvents) {
    if (ev.workspaceId !== workspaceId) continue;
    if (effectivePeriod !== "all") {
      if (ev.recordedAt < startIso || ev.recordedAt > endIso) continue;
    }
    eventMap.set(ev.id, ev);
  }

  // B. Load from Prisma WidgetEvent if available
  try {
    const dbEvents = await prisma.widgetEvent.findMany({
      where: {
        workspaceId,
        ...(effectivePeriod !== "all" ? { recordedAt: { gte: start, lte: end } } : {}),
      },
      select: {
        id: true,
        widgetId: true,
        testimonialId: true,
        eventType: true,
        metadataJson: true,
        recordedAt: true,
      },
    });

    for (const dbev of dbEvents) {
      if (!eventMap.has(dbev.id)) {
        let meta: Record<string, unknown> | undefined = undefined;
        if (dbev.metadataJson) {
          try {
            meta = JSON.parse(dbev.metadataJson);
          } catch {}
        }

        eventMap.set(dbev.id, {
          id: dbev.id,
          workspaceId,
          targetType: "WIDGET",
          targetId: dbev.widgetId,
          testimonialId: dbev.testimonialId,
          eventType: dbev.eventType as AnalyticsEventType,
          recordedAt: dbev.recordedAt.toISOString(),
          metadata: meta,
        });
      }
    }
  } catch {
    // Fallback to memory events
  }

  const relevantEvents = Array.from(eventMap.values());

  // 6. Calculate Testimonial & Form Submissions summary
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let archivedCount = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  const typeCounts = { text: 0, video: 0, audio: 0 };
  const formSubmissionsMap = new Map<string, { total: number; approved: number }>();

  for (const t of testimonials) {
    if (t.status === "APPROVED") approvedCount++;
    else if (t.status === "PENDING") pendingCount++;
    else if (t.status === "REJECTED") rejectedCount++;
    else if (t.status === "ARCHIVED") archivedCount++;

    if (t.rating && t.rating > 0) {
      ratingSum += t.rating;
      ratingCount++;
    }

    if (t.type === "VIDEO") typeCounts.video++;
    else if (t.type === "AUDIO") typeCounts.audio++;
    else typeCounts.text++;

    if (t.formId) {
      const existing = formSubmissionsMap.get(t.formId) || { total: 0, approved: 0 };
      existing.total++;
      if (t.status === "APPROVED") existing.approved++;
      formSubmissionsMap.set(t.formId, existing);
    }
  }

  const totalSubmissions = testimonials.length;
  const approvalRate =
    totalSubmissions > 0 ? Math.round((approvedCount / totalSubmissions) * 1000) / 10 : 0;
  const averageRating =
    ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;

  // 7. Aggregate Widget & Video Metrics
  let formViewsCount = 0;
  let totalImpressions = 0;
  let totalViews = 0;
  let totalCtaClicks = 0;
  let totalInteractions = 0;

  let totalVideoPlays = 0;
  let totalPlaybackDurationSeconds = 0;
  let completedVideoPlays = 0;

  const formViewsMap = new Map<string, number>();

  // Maps for widget breakdowns
  const widgetImpressionsMap = new Map<string, number>();
  const widgetViewsMap = new Map<string, number>();
  const widgetCtaClicksMap = new Map<string, number>();
  const widgetInteractionsMap = new Map<string, number>();
  const widgetVideoPlaysMap = new Map<string, number>();
  const widgetVideoDurationMap = new Map<string, number>();
  const widgetVideoCompletionsMap = new Map<string, number>();

  // Maps for video breakdowns (by testimonialId)
  const videoPlaysMap = new Map<string, number>();
  const videoDurationMap = new Map<string, number>();
  const videoCompletionsMap = new Map<string, number>();

  for (const ev of relevantEvents) {
    if (ev.targetType === "FORM") {
      if (ev.eventType === "VIEW") {
        formViewsCount++;
        formViewsMap.set(ev.targetId, (formViewsMap.get(ev.targetId) || 0) + 1);
      }
    } else if (ev.targetType === "WIDGET" || ev.targetType === "VIDEO" || ev.targetType === "TESTIMONIAL") {
      const wId = ev.targetId;

      // Widget Impression
      if (ev.eventType === "IMPRESSION") {
        totalImpressions++;
        widgetImpressionsMap.set(wId, (widgetImpressionsMap.get(wId) || 0) + 1);
      }
      // Widget View (Viewable Impression)
      else if (ev.eventType === "VIEW") {
        totalViews++;
        widgetViewsMap.set(wId, (widgetViewsMap.get(wId) || 0) + 1);
      }
      // CTA Click
      else if (ev.eventType === "CTA_CLICK") {
        totalCtaClicks++;
        widgetCtaClicksMap.set(wId, (widgetCtaClicksMap.get(wId) || 0) + 1);
      }
      // Testimonial Click / Interaction
      else if (ev.eventType === "TESTIMONIAL_CLICK" || ev.eventType === "INTERACTION") {
        totalInteractions++;
        widgetInteractionsMap.set(wId, (widgetInteractionsMap.get(wId) || 0) + 1);
      }
      // Video Play
      else if (ev.eventType === "VIDEO_PLAY") {
        totalVideoPlays++;
        widgetVideoPlaysMap.set(wId, (widgetVideoPlaysMap.get(wId) || 0) + 1);

        const tId = ev.testimonialId || (ev.metadata?.testimonialId as string | undefined);
        if (tId) {
          videoPlaysMap.set(tId, (videoPlaysMap.get(tId) || 0) + 1);
        }
      }
      // Video Progress & Watch Duration
      else if (ev.eventType === "VIDEO_PROGRESS") {
        const watchSecs = Number(ev.metadata?.watchDurationSeconds || 0);
        if (watchSecs > 0) {
          totalPlaybackDurationSeconds += watchSecs;
          widgetVideoDurationMap.set(wId, (widgetVideoDurationMap.get(wId) || 0) + watchSecs);

          const tId = ev.testimonialId || (ev.metadata?.testimonialId as string | undefined);
          if (tId) {
            videoDurationMap.set(tId, (videoDurationMap.get(tId) || 0) + watchSecs);
          }
        }
        if (ev.metadata?.completed) {
          completedVideoPlays++;
          widgetVideoCompletionsMap.set(wId, (widgetVideoCompletionsMap.get(wId) || 0) + 1);

          const tId = ev.testimonialId || (ev.metadata?.testimonialId as string | undefined);
          if (tId) {
            videoCompletionsMap.set(tId, (videoCompletionsMap.get(tId) || 0) + 1);
          }
        }
      }
      // Video Complete
      else if (ev.eventType === "VIDEO_COMPLETE") {
        completedVideoPlays++;
        widgetVideoCompletionsMap.set(wId, (widgetVideoCompletionsMap.get(wId) || 0) + 1);

        const tId = ev.testimonialId || (ev.metadata?.testimonialId as string | undefined);
        if (tId) {
          videoCompletionsMap.set(tId, (videoCompletionsMap.get(tId) || 0) + 1);
        }
      }
    }
  }

  // Ensure impressions is at least as large as views
  if (totalImpressions < totalViews) {
    totalImpressions = totalViews;
  }

  const widgetViewRate =
    totalImpressions > 0 ? Math.round((totalViews / totalImpressions) * 1000) / 10 : 0;
  const widgetCtaRate =
    totalViews > 0 ? Math.round((totalCtaClicks / totalViews) * 1000) / 10 : 0;
  const widgetInteractionRate =
    totalViews > 0 ? Math.round((totalInteractions / totalViews) * 1000) / 10 : 0;

  const averageWatchTimeSeconds =
    totalVideoPlays > 0 ? Math.round(totalPlaybackDurationSeconds / totalVideoPlays) : 0;
  const videoCompletionRate =
    totalVideoPlays > 0 ? Math.round((completedVideoPlays / totalVideoPlays) * 1000) / 10 : 0;

  const formSubmissionRate =
    formViewsCount > 0
      ? Math.round((totalSubmissions / formViewsCount) * 1000) / 10
      : totalSubmissions > 0
      ? 100
      : 0;

  // 8. Daily Trend Buckets (Group by calendar day)
  const bucketMap = new Map<string, AnalyticsDailyTrend>();
  const bucketDays = effectivePeriod === "all" ? Math.min(days, 30) : days;
  const dayStep = new Date(start);

  for (let i = 0; i < bucketDays; i++) {
    const dateKey = dayStep.toISOString().slice(0, 10);
    const label = dayStep.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    bucketMap.set(dateKey, {
      date: dateKey,
      label,
      submissions: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      formViews: 0,
      widgetImpressions: 0,
      widgetViews: 0,
      widgetCtaClicks: 0,
      widgetInteractions: 0,
      videoPlays: 0,
      videoWatchTimeSeconds: 0,
      videoCompletions: 0,
    });
    dayStep.setDate(dayStep.getDate() + 1);
  }

  for (const t of testimonials) {
    const dKey = t.submittedAt.toISOString().slice(0, 10);
    const bucket = bucketMap.get(dKey);
    if (bucket) {
      bucket.submissions++;
      if (t.status === "APPROVED") bucket.approved++;
      else if (t.status === "PENDING") bucket.pending++;
      else if (t.status === "REJECTED") bucket.rejected++;
    }
  }

  for (const ev of relevantEvents) {
    const dKey = ev.recordedAt.slice(0, 10);
    const bucket = bucketMap.get(dKey);
    if (bucket) {
      if (ev.targetType === "FORM" && ev.eventType === "VIEW") {
        bucket.formViews++;
      } else if (ev.targetType === "WIDGET" || ev.targetType === "VIDEO" || ev.targetType === "TESTIMONIAL") {
        if (ev.eventType === "IMPRESSION") bucket.widgetImpressions++;
        else if (ev.eventType === "VIEW") bucket.widgetViews++;
        else if (ev.eventType === "CTA_CLICK") bucket.widgetCtaClicks++;
        else if (ev.eventType === "TESTIMONIAL_CLICK" || ev.eventType === "INTERACTION") {
          bucket.widgetInteractions++;
        } else if (ev.eventType === "VIDEO_PLAY") {
          bucket.videoPlays++;
        } else if (ev.eventType === "VIDEO_PROGRESS") {
          const watch = Number(ev.metadata?.watchDurationSeconds || 0);
          bucket.videoWatchTimeSeconds += watch;
          if (ev.metadata?.completed) bucket.videoCompletions++;
        } else if (ev.eventType === "VIDEO_COMPLETE") {
          bucket.videoCompletions++;
        }
      }
    }
  }

  const dailyTrends = Array.from(bucketMap.values());

  // 9. Form Performance Rows
  const formPerformance: FormPerformanceItem[] = forms.map((f) => {
    const sub = formSubmissionsMap.get(f.id) || { total: 0, approved: 0 };
    const views = formViewsMap.get(f.id) || 0;
    const rate = views > 0 ? Math.round((sub.total / views) * 1000) / 10 : sub.total > 0 ? 100 : 0;

    return {
      id: f.id,
      title: f.title,
      slug: f.slug,
      projectId: f.projectId,
      projectName: f.project?.name || null,
      isPublished: f.isPublished,
      views,
      submissions: sub.total,
      submissionRate: rate,
      approvedCount: sub.approved,
    };
  });
  formPerformance.sort((a, b) => b.submissions - a.submissions || b.views - a.views);

  // 10. Widget Performance Rows
  const widgetPerformance: WidgetPerformanceItem[] = widgets.map((w) => {
    let slug: string | null = null;
    if (w.configJson) {
      try {
        const parsed = parseWidgetConfig(w.configJson, w.name);
        slug = parsed.slug;
      } catch {}
    }

    let impressions = widgetImpressionsMap.get(w.id) || 0;
    const views = widgetViewsMap.get(w.id) || 0;
    if (impressions < views) impressions = views;

    const ctaClicks = widgetCtaClicksMap.get(w.id) || 0;
    const interactions = widgetInteractionsMap.get(w.id) || 0;
    const vPlays = widgetVideoPlaysMap.get(w.id) || 0;

    const ctaRate = views > 0 ? Math.round((ctaClicks / views) * 1000) / 10 : 0;
    const interactionRate = views > 0 ? Math.round((interactions / views) * 1000) / 10 : 0;

    return {
      id: w.id,
      name: w.name,
      type: w.type,
      slug,
      projectId: w.projectId,
      projectName: w.project?.name || (w.projectId ? projectMap.get(w.projectId) : null) || null,
      impressions,
      views,
      ctaClicks,
      interactions,
      ctaRate,
      interactionRate,
      videoPlays: vPlays,
    };
  });
  widgetPerformance.sort((a, b) => b.views - a.views || b.ctaClicks - a.ctaClicks);

  // 11. Widget Performance Grouped by Project
  const projectWidgetMap = new Map<string, WidgetByProjectItem>();
  for (const wp of widgetPerformance) {
    const pId = wp.projectId || "unassigned";
    const pName = wp.projectName || "Unassigned / General";
    const existing = projectWidgetMap.get(pId) || {
      projectId: pId,
      projectName: pName,
      widgetCount: 0,
      impressions: 0,
      views: 0,
      ctaClicks: 0,
      interactions: 0,
      ctaRate: 0,
      interactionRate: 0,
    };

    existing.widgetCount += 1;
    existing.impressions += wp.impressions;
    existing.views += wp.views;
    existing.ctaClicks += wp.ctaClicks;
    existing.interactions += wp.interactions;
    existing.ctaRate =
      existing.views > 0 ? Math.round((existing.ctaClicks / existing.views) * 1000) / 10 : 0;
    existing.interactionRate =
      existing.views > 0 ? Math.round((existing.interactions / existing.views) * 1000) / 10 : 0;

    projectWidgetMap.set(pId, existing);
  }
  const widgetByProject = Array.from(projectWidgetMap.values()).sort((a, b) => b.views - a.views);

  // 12. Video Performance Rows (Individual Video Testimonials)
  const videoPerformance: VideoPerformanceItem[] = allVideoTestimonials.map((v) => {
    const plays = videoPlaysMap.get(v.id) || 0;
    const totalWatchTime = videoDurationMap.get(v.id) || 0;
    const completed = videoCompletionsMap.get(v.id) || 0;
    const avgWatch = plays > 0 ? Math.round(totalWatchTime / plays) : 0;
    const compRate = plays > 0 ? Math.round((completed / plays) * 1000) / 10 : 0;

    const media = v.mediaAssets?.find((m) => m.type === "VIDEO");
    const duration = media?.durationSeconds || 0;

    return {
      testimonialId: v.id,
      customerName: v.customer?.name || "Customer Video",
      customerCompany: v.customer?.company || null,
      avatarUrl: v.customer?.avatarUrl || null,
      videoDurationSeconds: duration,
      projectId: v.projectId,
      projectName: v.project?.name || (v.projectId ? projectMap.get(v.projectId) : null) || null,
      plays,
      totalWatchTimeSeconds: totalWatchTime,
      averageWatchTimeSeconds: avgWatch,
      completedPlays: completed,
      completionRate: compRate,
    };
  });
  videoPerformance.sort((a, b) => b.plays - a.plays || b.totalWatchTimeSeconds - a.totalWatchTimeSeconds);

  // 13. Video Engagement Grouped by Widget
  const videoByWidget: VideoByWidgetPerformanceItem[] = widgets
    .map((w) => {
      const plays = widgetVideoPlaysMap.get(w.id) || 0;
      const totalWatch = widgetVideoDurationMap.get(w.id) || 0;
      const completed = widgetVideoCompletionsMap.get(w.id) || 0;
      const avgWatch = plays > 0 ? Math.round(totalWatch / plays) : 0;
      const compRate = plays > 0 ? Math.round((completed / plays) * 1000) / 10 : 0;

      return {
        widgetId: w.id,
        widgetName: w.name,
        widgetType: w.type,
        projectId: w.projectId,
        projectName: w.project?.name || (w.projectId ? projectMap.get(w.projectId) : null) || null,
        videoPlays: plays,
        totalWatchTimeSeconds: totalWatch,
        averageWatchTimeSeconds: avgWatch,
        completionRate: compRate,
      };
    })
    .filter((vw) => vw.videoPlays > 0 || vw.widgetType.toLowerCase().includes("video"))
    .sort((a, b) => b.videoPlays - a.videoPlays || b.totalWatchTimeSeconds - a.totalWatchTimeSeconds);

  // 14. Video Performance Grouped by Project
  const projectVideoMap = new Map<string, VideoByProjectPerformanceItem>();
  for (const vp of videoPerformance) {
    const pId = vp.projectId || "unassigned";
    const pName = vp.projectName || "Unassigned / General";
    const existing = projectVideoMap.get(pId) || {
      projectId: pId,
      projectName: pName,
      videoCount: 0,
      videoPlays: 0,
      totalWatchTimeSeconds: 0,
      averageWatchTimeSeconds: 0,
      completionRate: 0,
    };

    existing.videoCount += 1;
    existing.videoPlays += vp.plays;
    existing.totalWatchTimeSeconds += vp.totalWatchTimeSeconds;
    const totalComps = (existing.completionRate / 100) * (existing.videoPlays - vp.plays) + vp.completedPlays;
    existing.completionRate =
      existing.videoPlays > 0 ? Math.round((totalComps / existing.videoPlays) * 1000) / 10 : 0;
    existing.averageWatchTimeSeconds =
      existing.videoPlays > 0 ? Math.round(existing.totalWatchTimeSeconds / existing.videoPlays) : 0;

    projectVideoMap.set(pId, existing);
  }
  const videoByProject = Array.from(projectVideoMap.values()).sort((a, b) => b.videoPlays - a.videoPlays);

  return {
    period: effectivePeriod,
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    summary: {
      totalSubmissions,
      pendingSubmissions: pendingCount,
      approvedSubmissions: approvedCount,
      rejectedSubmissions: rejectedCount,
      archivedSubmissions: archivedCount,
      approvalRate,
      formViews: formViewsCount,
      formSubmissionRate,

      // Widget metrics
      widgetImpressions: totalImpressions,
      widgetViews: totalViews,
      widgetViewRate,
      widgetCtaClicks: totalCtaClicks,
      widgetCtaRate,
      widgetInteractions: totalInteractions,
      widgetInteractionRate,

      // Video metrics
      videoPlays: totalVideoPlays,
      totalPlaybackDurationSeconds,
      averageWatchTimeSeconds,
      completedPlays: completedVideoPlays,
      videoCompletionRate,

      averageRating,
      typeDistribution: typeCounts,
    },
    dailyTrends,
    formPerformance,
    widgetPerformance,
    widgetByProject,
    videoPerformance,
    videoByWidget,
    videoByProject,
    metricDefinitions: METRIC_DEFINITIONS,
  };
}
