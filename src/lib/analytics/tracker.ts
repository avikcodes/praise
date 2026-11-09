import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/client";
import { parseWidgetConfig } from "@/lib/widgets/utils";
import {
  AnalyticsDailyTrend,
  AnalyticsPeriod,
  AnalyticsResponse,
  FormPerformanceItem,
  WidgetPerformanceItem,
} from "./types";
import { Prisma, WidgetEventType } from "@prisma/client";

export type StoredEvent = {
  id: string;
  workspaceId: string;
  targetType: "FORM" | "WIDGET";
  targetId: string;
  eventType: "VIEW" | "INTERACT" | "VIDEO_PLAY";
  recordedAt: string; // ISO date
  metadata?: Record<string, unknown>;
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

// In-memory events cache backed by file persistence
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
 * Privacy-conscious visitor deduplication check.
 * Creates a one-way ephemeral hash that never stores the raw IP or user-agent.
 */
function isRecentVisitor(clientIp: string, userAgent: string, targetId: string, eventType: string): boolean {
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
 * Records a privacy-conscious analytics event.
 */
export async function recordAnalyticsEvent({
  workspaceId,
  targetType,
  targetId,
  eventType,
  clientIp = "127.0.0.1",
  userAgent = "",
  metadata,
}: {
  workspaceId: string;
  targetType: "FORM" | "WIDGET";
  targetId: string;
  eventType: "VIEW" | "INTERACT" | "VIDEO_PLAY";
  clientIp?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ recorded: boolean; reason?: string }> {
  // 1. Deduplication check for VIEW events
  if (eventType === "VIEW" && isRecentVisitor(clientIp, userAgent, targetId, eventType)) {
    return { recorded: false, reason: "deduplicated_recent_visitor" };
  }

  await ensureLoaded();

  const newEvent: StoredEvent = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    workspaceId,
    targetType,
    targetId,
    eventType,
    recordedAt: new Date().toISOString(),
    metadata,
  };

  memoryEvents.push(newEvent);
  scheduleSave();

  // 2. Also record to Prisma WidgetEvent table if widget target and DB available
  if (targetType === "WIDGET" && !targetId.startsWith("proj-")) {
    try {
      const pEventType =
        eventType === "INTERACT"
          ? WidgetEventType.INTERACTION
          : eventType === "VIDEO_PLAY"
          ? WidgetEventType.VIDEO_PLAY
          : WidgetEventType.IMPRESSION;

      await prisma.widgetEvent.create({
        data: {
          workspaceId,
          widgetId: targetId,
          eventType: pEventType,
        },
      });
    } catch {
      // Ignore DB error if database is offline or sqlite/dev
    }
  }

  return { recorded: true };
}

/**
 * Calculates start and end Date objects for an analytics period.
 */
export function getPeriodDateRange(period: AnalyticsPeriod): { start: Date; end: Date; days: number } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

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
 * Queries and calculates workspace analytics scoped to the date range.
 */
export async function getWorkspaceAnalytics({
  workspaceId,
  period = "30d",
  projectId,
}: {
  workspaceId: string;
  period?: AnalyticsPeriod;
  projectId?: string | null;
}): Promise<AnalyticsResponse> {
  const { start, end, days } = getPeriodDateRange(period);
  await ensureLoaded();

  // 1. Query actual Testimonials within workspace and date range
  const testimonialWhere: Prisma.TestimonialWhereInput = {
    workspaceId,
  };

  if (projectId) {
    testimonialWhere.projectId = projectId;
  }

  if (period !== "all") {
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
      },
    });
  } catch {
    // Graceful fallback when DB is offline
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

  // 4. Filter stored events within date range and workspace
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const relevantEvents = memoryEvents.filter((ev) => {
    if (ev.workspaceId !== workspaceId) return false;
    if (period !== "all") {
      if (ev.recordedAt < startIso || ev.recordedAt > endIso) return false;
    }
    return true;
  });

  // Calculate summary counts from actual data
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

  // Aggregate event metrics
  let formViewsCount = 0;
  let widgetViewsCount = 0;
  let widgetClicksCount = 0;

  const formViewsMap = new Map<string, number>();
  const widgetViewsMap = new Map<string, number>();
  const widgetClicksMap = new Map<string, number>();

  for (const ev of relevantEvents) {
    if (ev.targetType === "FORM") {
      if (ev.eventType === "VIEW") {
        formViewsCount++;
        formViewsMap.set(ev.targetId, (formViewsMap.get(ev.targetId) || 0) + 1);
      }
    } else if (ev.targetType === "WIDGET") {
      if (ev.eventType === "VIEW") {
        widgetViewsCount++;
        widgetViewsMap.set(ev.targetId, (widgetViewsMap.get(ev.targetId) || 0) + 1);
      } else if (ev.eventType === "INTERACT" || ev.eventType === "VIDEO_PLAY") {
        widgetClicksCount++;
        widgetClicksMap.set(ev.targetId, (widgetClicksMap.get(ev.targetId) || 0) + 1);
      }
    }
  }

  // Also query prisma.widgetEvent if available
  try {
    const prismaWidgetEvents = await prisma.widgetEvent.findMany({
      where: {
        workspaceId,
        ...(period !== "all" ? { recordedAt: { gte: start, lte: end } } : {}),
      },
      select: {
        widgetId: true,
        eventType: true,
        recordedAt: true,
      },
    });

    for (const wev of prismaWidgetEvents) {
      if (wev.eventType === "IMPRESSION") {
        widgetViewsMap.set(wev.widgetId, (widgetViewsMap.get(wev.widgetId) || 0) + 1);
        widgetViewsCount++;
      } else {
        widgetClicksMap.set(wev.widgetId, (widgetClicksMap.get(wev.widgetId) || 0) + 1);
        widgetClicksCount++;
      }
    }
  } catch {
    // Ignore if table not queried
  }

  const formSubmissionRate =
    formViewsCount > 0
      ? Math.round((totalSubmissions / formViewsCount) * 1000) / 10
      : totalSubmissions > 0
      ? 100
      : 0;

  const widgetEngagementRate =
    widgetViewsCount > 0
      ? Math.round((widgetClicksCount / widgetViewsCount) * 1000) / 10
      : 0;

  // 5. Daily Trend Buckets (Group by calendar day)
  const bucketMap = new Map<string, AnalyticsDailyTrend>();
  const bucketDays = period === "all" ? Math.min(days, 30) : days;
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
      widgetViews: 0,
      widgetClicks: 0,
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
      } else if (ev.targetType === "WIDGET") {
        if (ev.eventType === "VIEW") bucket.widgetViews++;
        else bucket.widgetClicks++;
      }
    }
  }

  const dailyTrends = Array.from(bucketMap.values());

  // 6. Form Performance Table Rows
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

  // Sort forms by submissions desc, then views desc
  formPerformance.sort((a, b) => b.submissions - a.submissions || b.views - a.views);

  // 7. Widget Performance Table Rows
  const widgetPerformance: WidgetPerformanceItem[] = widgets.map((w) => {
    let slug: string | null = null;
    if (w.configJson) {
      try {
        const parsed = parseWidgetConfig(w.configJson, w.name);
        slug = parsed.slug;
      } catch {
        // ignore
      }
    }

    const views = widgetViewsMap.get(w.id) || 0;
    const clicks = widgetClicksMap.get(w.id) || 0;
    const rate = views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0;

    return {
      id: w.id,
      name: w.name,
      type: w.type,
      slug,
      projectId: w.projectId,
      projectName: w.project?.name || null,
      views,
      clicks,
      engagementRate: rate,
    };
  });

  // Sort widgets by views desc, then clicks desc
  widgetPerformance.sort((a, b) => b.views - a.views || b.clicks - a.clicks);

  return {
    period,
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
      widgetViews: widgetViewsCount,
      widgetClicks: widgetClicksCount,
      widgetEngagementRate,
      averageRating,
      typeDistribution: typeCounts,
    },
    dailyTrends,
    formPerformance,
    widgetPerformance,
  };
}

