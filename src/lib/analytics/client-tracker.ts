/**
 * Client-Side Privacy-Conscious Analytics Helper
 * Zero cookies, zero persistent tracking identifiers, zero fingerprinting.
 * Uses sessionStorage for ephemeral within-session view deduplication.
 */

type ClientEventPayload = {
  workspaceId?: string;
  targetType: "WIDGET" | "FORM" | "TESTIMONIAL" | "VIDEO";
  targetId: string;
  testimonialId?: string;
  eventType:
    | "IMPRESSION"
    | "VIEW"
    | "INTERACTION"
    | "CTA_CLICK"
    | "TESTIMONIAL_CLICK"
    | "VIDEO_PLAY"
    | "VIDEO_PROGRESS"
    | "VIDEO_COMPLETE";
  metadata?: Record<string, unknown>;
};

export function sendAnalyticsEvent(payload: ClientEventPayload): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify(payload);

  // Prefer navigator.sendBeacon for fast non-blocking background delivery
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/analytics/track", blob);
      if (sent) return;
    } catch {
      // Fallback to fetch
    }
  }

  // Fallback to fetch with keepalive
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

/**
 * Tracks a widget impression (container rendered).
 * Session-deduplicated to prevent duplicate counts during hot reloads or route changes.
 */
export function trackWidgetImpression(
  workspaceId: string | undefined,
  widgetId: string
): void {
  if (typeof window === "undefined" || !widgetId) return;

  try {
    const key = `praise_imp_${widgetId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    sendAnalyticsEvent({
      workspaceId,
      targetType: "WIDGET",
      targetId: widgetId,
      eventType: "IMPRESSION",
    });
  } catch {
    // Ignore storage errors in private browsing modes
  }
}

/**
 * Sets up an IntersectionObserver to record a verified widget view
 * when >= 50% of the widget enters viewport for at least 1 second.
 */
export function observeWidgetView(
  element: HTMLElement | null,
  workspaceId: string | undefined,
  widgetId: string
): () => void {
  if (typeof window === "undefined" || !element || !widgetId) return () => {};

  try {
    const key = `praise_view_${widgetId}`;
    if (sessionStorage.getItem(key)) return () => {};

    let viewTimer: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!viewTimer) {
              viewTimer = setTimeout(() => {
                try {
                  if (sessionStorage.getItem(key)) return;
                  sessionStorage.setItem(key, "1");

                  sendAnalyticsEvent({
                    workspaceId,
                    targetType: "WIDGET",
                    targetId: widgetId,
                    eventType: "VIEW",
                  });
                } catch {}
              }, 1000); // 1-second viewable dwell time
            }
          } else {
            if (viewTimer) {
              clearTimeout(viewTimer);
              viewTimer = null;
            }
          }
        }
      },
      { threshold: [0.5] }
    );

    observer.observe(element);

    return () => {
      if (viewTimer) clearTimeout(viewTimer);
      observer.disconnect();
    };
  } catch {
    return () => {};
  }
}

/**
 * Tracks a click on the primary Call-To-Action inside a widget.
 */
export function trackWidgetCtaClick(
  workspaceId: string | undefined,
  widgetId: string,
  ctaText?: string,
  ctaUrl?: string
): void {
  if (typeof window === "undefined" || !widgetId) return;

  sendAnalyticsEvent({
    workspaceId,
    targetType: "WIDGET",
    targetId: widgetId,
    eventType: "CTA_CLICK",
    metadata: {
      ctaText,
      ctaUrl,
      timestamp: Date.now(),
    },
  });
}

/**
 * Tracks user engagement with an individual testimonial card.
 */
export function trackTestimonialInteraction(
  workspaceId: string | undefined,
  widgetId: string,
  testimonialId: string,
  action: "expand" | "modal" | "share" | "click" = "click"
): void {
  if (typeof window === "undefined" || !widgetId || !testimonialId) return;

  sendAnalyticsEvent({
    workspaceId,
    targetType: "WIDGET",
    targetId: widgetId,
    testimonialId,
    eventType: "TESTIMONIAL_CLICK",
    metadata: {
      action,
      timestamp: Date.now(),
    },
  });
}

/**
 * Tracks the start of video testimonial playback.
 */
export function trackVideoPlay(
  workspaceId: string | undefined,
  widgetId: string,
  testimonialId: string,
  videoDurationSeconds?: number
): void {
  if (typeof window === "undefined" || !widgetId || !testimonialId) return;

  sendAnalyticsEvent({
    workspaceId,
    targetType: "WIDGET",
    targetId: widgetId,
    testimonialId,
    eventType: "VIDEO_PLAY",
    metadata: {
      videoDurationSeconds,
      timestamp: Date.now(),
    },
  });
}

/**
 * Tracks cumulative playback duration and completion.
 */
export function trackVideoProgress(
  workspaceId: string | undefined,
  widgetId: string,
  testimonialId: string,
  watchDurationSeconds: number,
  videoDurationSeconds: number,
  completed: boolean = false
): void {
  if (typeof window === "undefined" || !widgetId || !testimonialId) return;
  if (watchDurationSeconds <= 0) return;

  sendAnalyticsEvent({
    workspaceId,
    targetType: "WIDGET",
    targetId: widgetId,
    testimonialId,
    eventType: completed ? "VIDEO_COMPLETE" : "VIDEO_PROGRESS",
    metadata: {
      watchDurationSeconds: Math.round(watchDurationSeconds),
      videoDurationSeconds: Math.round(videoDurationSeconds),
      completed,
      timestamp: Date.now(),
    },
  });
}
