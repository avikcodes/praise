"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageSquare, Sparkles, Star, X } from "lucide-react";
import { PublicTestimonialCard, WidgetPosition } from "@/types/widgets";
import { WidgetPublicConfig } from "./types";
import { WidgetAvatar } from "./widget-avatar";
import { WidgetRating } from "./widget-rating";
import {
  getCardBorderClasses,
  getCardRadiusClasses,
} from "@/lib/branding/utils";

type WidgetNotificationProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetNotification({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetNotificationProps) {
  const {
    slug = "default",
    position = "bottom-left",
    displayDelay = 2500,
    displayDuration = 6000,
    displayInterval = 8000,
    maxDisplayCount = 5,
    hideOnMobile = false,
    mobilePosition,
    showRatings = true,
    showCompany = true,
    showDate = true,
    showFeaturedBadge = true,
    accentColor = "#7049D8",
    primaryColor,
    cardBorder,
    cardRadius,
    theme,
  } = config;

  const brandColor = primaryColor || accentColor || "#7049D8";
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  const storageKey = `praise_notif_dismissed_${slug}`;

  // Session check
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(storageKey) === "true") {
        setIsDismissed(true);
      }
    } catch {
      // storage unavailable
    }
  }, [storageKey]);

  // Toast notification cycling timer
  useEffect(() => {
    if (isDismissed || !testimonials || testimonials.length === 0) return;

    let showTimeout: NodeJS.Timeout;
    let hideTimeout: NodeJS.Timeout;

    // Initial show after displayDelay
    const startInitialTimer = () => {
      showTimeout = setTimeout(() => {
        setIsVisible(true);
        setDisplayCount((prev) => {
          const next = prev + 1;
          if (next >= maxDisplayCount) {
            // Once limit reached, set session dismissal
            try {
              sessionStorage.setItem(storageKey, "true");
            } catch {}
          }
          return next;
        });

        // Hide after displayDuration
        hideTimeout = setTimeout(() => {
          setIsVisible(false);

          // If still within limit, queue next notification
          if (displayCount < maxDisplayCount - 1) {
            setTimeout(() => {
              setCurrentIndex((idx) => (idx + 1) % testimonials.length);
              startInitialTimer();
            }, Math.max(1000, displayInterval));
          }
        }, Math.max(2000, displayDuration));
      }, Math.max(500, displayDelay));
    };

    startInitialTimer();

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
    };
  }, [
    isDismissed,
    testimonials,
    displayDelay,
    displayDuration,
    displayInterval,
    maxDisplayCount,
    storageKey,
  ]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "true");
    } catch {}
  };

  if (isDismissed || !isVisible || !testimonials || testimonials.length === 0) {
    return null;
  }

  const currentTestimonial = testimonials[currentIndex % testimonials.length];
  if (!currentTestimonial) return null;

  // Resolve responsive position classes
  const getPosClass = (pos: WidgetPosition) => {
    switch (pos) {
      case "bottom-right":
        return "bottom-5 right-5";
      case "top-left":
        return "top-5 left-5";
      case "top-right":
        return "top-5 right-5";
      case "bottom-center":
        return "bottom-5 left-1/2 -translate-x-1/2";
      case "top-center":
        return "top-5 left-1/2 -translate-x-1/2";
      case "bottom-left":
      default:
        return "bottom-5 left-5";
    }
  };

  const posClass = getPosClass(position);
  const borderClass = getCardBorderClasses(cardBorder, theme === "dark");
  const radiusClass = getCardRadiusClasses(cardRadius);
  const isDark = theme === "dark";

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Recent customer review"
      className={`fixed ${posClass} z-40 max-w-sm w-[calc(100vw-2.5rem)] sm:w-88 transition-all duration-300 motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in ${
        hideOnMobile ? "hidden sm:block" : ""
      } ${className}`}
    >
      <div
        className={`relative p-4 border shadow-xl ${borderClass} ${radiusClass} ${
          isDark
            ? "bg-zinc-900 border-zinc-800 text-zinc-100"
            : "bg-white border-line text-zinc-900"
        }`}
        style={{
          borderLeft: `3px solid ${brandColor}`,
        }}
      >
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="absolute top-2.5 right-2.5 p-1 rounded-md opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3">
          <WidgetAvatar
            name={currentTestimonial.customer.name}
            avatarUrl={currentTestimonial.customer.avatarUrl}
            size="md"
          />
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs truncate">
                {currentTestimonial.customer.name}
              </span>
              <span
                title="Verified Customer"
                className="text-emerald-500 inline-flex items-center"
              >
                <CheckCircle2 size={12} />
              </span>
              {showFeaturedBadge && currentTestimonial.isFeatured && (
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${brandColor}20`,
                    color: brandColor,
                  }}
                >
                  <Sparkles size={8} />
                </span>
              )}
            </div>

            {showCompany && currentTestimonial.customer.company && (
              <p className="text-[11px] opacity-70 truncate">
                {currentTestimonial.customer.company}
              </p>
            )}

            {showRatings && currentTestimonial.rating && (
              <div className="pt-0.5">
                <WidgetRating rating={currentTestimonial.rating} size="xs" accentColor={brandColor} />
              </div>
            )}

            <p className="text-xs mt-1.5 opacity-90 line-clamp-2 italic leading-relaxed">
              &ldquo;{currentTestimonial.content}&rdquo;
            </p>

            <div className="flex items-center justify-between pt-2 mt-1 border-t border-line/40 dark:border-zinc-800/60 text-[10px] opacity-60">
              <span>Verified Testimonial</span>
              <button
                type="button"
                onClick={handleDismiss}
                className="hover:underline"
              >
                Don&apos;t show again
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
