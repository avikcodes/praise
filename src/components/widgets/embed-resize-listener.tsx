"use client";

import { useEffect, useRef } from "react";

type EmbedResizeListenerProps = {
  widgetId: string;
  instanceId?: string | null;
  theme?: string | null;
  allowedOrigin?: string | null;
};

/**
 * EmbedResizeListener
 *
 * Secure iframe measurement and communication bridge.
 *
 * Features & Security:
 * - Dynamic dimension tracking via ResizeObserver, window resize & font load.
 * - Origin validation: targets document.referrer origin when available or specified allowedOrigin.
 * - Input validation: validates incoming parent messages (handshakes, resize pings).
 * - Clean iframe background: strips default browser body colors and scrollbars.
 * - Dark mode class synchronization on documentElement.
 */
export function EmbedResizeListener({
  widgetId,
  instanceId,
  theme,
  allowedOrigin,
}: EmbedResizeListenerProps) {
  const lastHeightRef = useRef<number>(0);

  useEffect(() => {
    // Only execute if running within an iframe
    if (typeof window === "undefined" || window.self === window.top) {
      return;
    }

    // 1. Ensure clean, transparent background for host embedding
    const originalBodyBg = document.body.style.backgroundColor;
    const originalBodyMargin = document.body.style.margin;
    const originalBodyPadding = document.body.style.padding;
    const originalDocBg = document.documentElement.style.backgroundColor;

    document.documentElement.style.backgroundColor = "transparent";
    document.body.style.backgroundColor = "transparent";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    // Synchronize dark theme class with html element
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Determine target origin for postMessage
    let targetOrigin = "*";
    if (allowedOrigin && allowedOrigin.trim() && allowedOrigin !== "*") {
      try {
        targetOrigin = new URL(allowedOrigin).origin;
      } catch {
        // Fallback if not valid URL
      }
    } else if (document.referrer) {
      try {
        const refOrigin = new URL(document.referrer).origin;
        if (refOrigin && refOrigin !== "null") {
          targetOrigin = refOrigin;
        }
      } catch {
        // Retain fallback
      }
    }

    const reportHeight = (force = false) => {
      try {
        const root =
          document.getElementById("praise-embed-root") ||
          document.body ||
          document.documentElement;

        if (!root) return;

        const boundingHeight = Math.ceil(root.getBoundingClientRect().height);
        const scrollHeight = root.scrollHeight;
        const offsetHeight = (root as HTMLElement).offsetHeight || 0;
        const docHeight = document.documentElement.scrollHeight;

        // Choose the most accurate content height without artificial viewport stretch
        const calculatedHeight = Math.max(
          boundingHeight,
          scrollHeight,
          offsetHeight,
          docHeight
        );

        // Deduplicate redundant messages unless forced
        if (!force && Math.abs(calculatedHeight - lastHeightRef.current) < 2) {
          return;
        }

        if (calculatedHeight > 0) {
          lastHeightRef.current = calculatedHeight;
          window.parent.postMessage(
            {
              type: "praise-resize",
              widgetId,
              instanceId: instanceId || null,
              height: calculatedHeight,
              timestamp: Date.now(),
            },
            targetOrigin
          );
        }
      } catch {
        // Cross-window security catch
      }
    };

    // 2. Parent-to-child message listener (validate origin & schema)
    const handleParentMessage = (event: MessageEvent) => {
      // Validate data is an object
      if (!event.data || typeof event.data !== "object") {
        return;
      }

      // Validate origin if targetOrigin is specific
      if (targetOrigin !== "*" && event.origin !== targetOrigin) {
        return;
      }

      const { type } = event.data;

      // Validate message command
      if (type === "praise-ping" || type === "praise-get-height") {
        reportHeight(true);
      }
    };

    window.addEventListener("message", handleParentMessage, false);

    // 3. Initial measurement
    reportHeight(true);

    // 4. Continuous ResizeObserver on root element
    let resizeObserver: ResizeObserver | null = null;
    const rootEl =
      document.getElementById("praise-embed-root") || document.body;

    if (typeof ResizeObserver !== "undefined" && rootEl) {
      resizeObserver = new ResizeObserver(() => {
        reportHeight();
      });
      resizeObserver.observe(rootEl);
    }

    // 5. Web fonts readiness
    if (document.fonts && typeof document.fonts.ready?.then === "function") {
      document.fonts.ready.then(() => {
        reportHeight();
      });
    }

    // 6. Window and media events
    window.addEventListener("resize", () => reportHeight());
    window.addEventListener("load", () => reportHeight(true));

    // 7. Staggered reflow timers
    const timers = [
      setTimeout(() => reportHeight(true), 60),
      setTimeout(() => reportHeight(), 250),
      setTimeout(() => reportHeight(), 700),
      setTimeout(() => reportHeight(), 1800),
    ];

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener("message", handleParentMessage);
      window.removeEventListener("resize", () => reportHeight());
      window.removeEventListener("load", () => reportHeight(true));
      timers.forEach(clearTimeout);

      // Restore styling on cleanup
      document.body.style.backgroundColor = originalBodyBg;
      document.body.style.margin = originalBodyMargin;
      document.body.style.padding = originalBodyPadding;
      document.documentElement.style.backgroundColor = originalDocBg;
    };
  }, [widgetId, instanceId, theme, allowedOrigin]);

  return null;
}
