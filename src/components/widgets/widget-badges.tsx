"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, ExternalLink, MessageSquare, Quote, Sparkles, Star, Users, X } from "lucide-react";
import { PublicTestimonialCard, WidgetPosition } from "@/types/widgets";
import { WidgetPublicConfig } from "./types";
import { WidgetAvatar } from "./widget-avatar";
import { WidgetRating } from "./widget-rating";
import {
  getCardBorderClasses,
  getCardRadiusClasses,
  getCardSpacingClasses,
} from "@/lib/branding/utils";

// ============================================================================
// 1. RATING BADGE
// ============================================================================
type WidgetRatingBadgeProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetRatingBadge({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetRatingBadgeProps) {
  const {
    showRatings = true,
    accentColor = "#7049D8",
    primaryColor,
    badgeStyle = "pill",
    cardRadius,
    theme,
  } = config;

  const brandColor = primaryColor || accentColor || "#7049D8";
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Compute live average rating from genuine approved testimonials
  const stats = useMemo(() => {
    const withRating = testimonials.filter((t) => t.rating && t.rating > 0);
    if (withRating.length === 0) {
      return { avg: 5.0, count: testimonials.length, displayAvg: "5.0" };
    }
    const sum = withRating.reduce((acc, curr) => acc + (curr.rating || 5), 0);
    const avg = sum / withRating.length;
    return {
      avg,
      count: withRating.length,
      displayAvg: avg.toFixed(1),
    };
  }, [testimonials]);

  const styleClasses = useMemo(() => {
    const isDark = theme === "dark";
    switch (badgeStyle) {
      case "card":
        return `px-5 py-3.5 border ${
          isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-line text-zinc-900"
        } shadow-sm`;
      case "glass":
        return `px-4 py-2 border backdrop-blur-md ${
          isDark
            ? "bg-zinc-900/70 border-zinc-800/80 text-zinc-100"
            : "bg-white/80 border-line/80 text-zinc-900"
        } shadow-sm`;
      case "minimal":
        return `px-2 py-1 text-inherit bg-transparent`;
      case "pill":
      default:
        return `px-4 py-2 border rounded-full ${
          isDark ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-line text-zinc-900"
        } shadow-2xs hover:shadow-sm`;
    }
  }, [badgeStyle, theme]);

  const radiusClass = badgeStyle === "pill" ? "rounded-full" : getCardRadiusClasses(cardRadius);

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowDetailModal(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShowDetailModal(true);
          }
        }}
        aria-label={`Rating badge: ${stats.displayAvg} out of 5 stars from ${stats.count} reviews`}
        className={`inline-flex items-center gap-3 transition-all cursor-pointer ${styleClasses} ${radiusClass}`}
      >
        {/* Rating Score & Stars */}
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-sm font-extrabold" style={{ color: brandColor }}>
            {stats.displayAvg}
          </span>
          <div className="flex items-center text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                className={
                  star <= Math.round(stats.avg)
                    ? "fill-current"
                    : "text-zinc-300 dark:text-zinc-700 fill-transparent"
                }
              />
            ))}
          </div>
        </div>

        <div className="h-3.5 w-px bg-zinc-200 dark:bg-zinc-800" />

        {/* Verified Count */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium opacity-80">
            {stats.count} {stats.count === 1 ? "review" : "reviews"}
          </span>
          <span title="Verified reviews" className="text-emerald-500 inline-flex items-center">
            <CheckCircle2 size={13} />
          </span>
        </div>
      </div>

      {/* Detail Popover Modal */}
      {showDetailModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-xl ${
              theme === "dark" ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-line text-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{stats.displayAvg} / 5.0</span>
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      className={s <= Math.round(stats.avg) ? "fill-current" : "text-zinc-300 fill-transparent"}
                    />
                  ))}
                </div>
                <span className="text-xs opacity-70">({stats.count} verified reviews)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {testimonials.slice(0, 10).map((t) => (
                <div
                  key={t.id}
                  onClick={() => onTestimonialClick?.(t)}
                  className="p-3 rounded-xl border border-line/60 dark:border-zinc-800/80 bg-warm-50/30 dark:bg-zinc-800/30 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t.customer.name}</span>
                    {t.rating && <WidgetRating rating={t.rating} size="xs" accentColor={brandColor} />}
                  </div>
                  <p className="opacity-80 italic line-clamp-2">&ldquo;{t.content}&rdquo;</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-warm-100 dark:bg-zinc-800 hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. REVIEW COUNT BADGE
// ============================================================================
type WidgetReviewCountBadgeProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetReviewCountBadge({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetReviewCountBadgeProps) {
  const {
    accentColor = "#7049D8",
    primaryColor,
    badgeStyle = "pill",
    cardRadius,
    theme,
  } = config;

  const brandColor = primaryColor || accentColor || "#7049D8";

  // Real avatars of customers
  const sampleAvatars = useMemo(() => {
    const withAvatars = testimonials.filter((t) => t.customer?.avatarUrl);
    const fallback = testimonials.filter((t) => !t.customer?.avatarUrl);
    return [...withAvatars, ...fallback].slice(0, 5);
  }, [testimonials]);

  const radiusClass = badgeStyle === "pill" ? "rounded-full" : getCardRadiusClasses(cardRadius);
  const isDark = theme === "dark";

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div
        className={`inline-flex items-center gap-3 px-4 py-2 border transition-all ${
          isDark
            ? "bg-zinc-900 border-zinc-800 text-zinc-100"
            : "bg-white border-line text-zinc-900"
        } shadow-2xs hover:shadow-sm ${radiusClass}`}
      >
        {/* Micro-avatar stack */}
        <div className="flex -space-x-2 overflow-hidden py-0.5">
          {sampleAvatars.map((t, idx) => (
            <div
              key={t.id}
              className="inline-block ring-2 ring-white dark:ring-zinc-900 rounded-full"
              style={{ zIndex: 10 - idx }}
            >
              <WidgetAvatar
                name={t.customer.name}
                avatarUrl={t.customer.avatarUrl}
                size="sm"
              />
            </div>
          ))}
        </div>

        {/* Text statement */}
        <div className="flex flex-col justify-center text-left">
          <div className="flex items-center gap-1">
            <div className="flex items-center text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={11} className="fill-current" />
              ))}
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-0.5">
              Verified
            </span>
          </div>
          <p className="text-xs font-semibold leading-tight">
            Loved by{" "}
            <span className="font-extrabold" style={{ color: brandColor }}>
              {testimonials.length}+
            </span>{" "}
            customers
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. FLOATING TESTIMONIAL BADGE
// ============================================================================
type WidgetFloatingBadgeProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetFloatingBadge({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetFloatingBadgeProps) {
  const {
    position = "bottom-right",
    accentColor = "#7049D8",
    primaryColor,
    theme,
    hideOnMobile = false,
    mobilePosition,
    cardRadius,
  } = config;

  const brandColor = primaryColor || accentColor || "#7049D8";
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Pick top testimonials
  const activeTestimonial = testimonials[currentIndex % Math.max(1, testimonials.length)];

  if (isDismissed || !activeTestimonial) return null;

  // Resolve responsive position classes
  const getPosClass = (pos: WidgetPosition) => {
    switch (pos) {
      case "bottom-left":
        return "bottom-5 left-5";
      case "top-left":
        return "top-5 left-5";
      case "top-right":
        return "top-5 right-5";
      case "bottom-center":
        return "bottom-5 left-1/2 -translate-x-1/2";
      case "top-center":
        return "top-5 left-1/2 -translate-x-1/2";
      case "bottom-right":
      default:
        return "bottom-5 right-5";
    }
  };

  const posClass = getPosClass(position);
  const isDark = theme === "dark";
  const radiusClass = getCardRadiusClasses(cardRadius);

  return (
    <aside
      aria-label="Customer review spotlight"
      className={`fixed ${posClass} z-40 ${
        hideOnMobile ? "hidden sm:block" : ""
      } transition-all duration-300 motion-safe:animate-in motion-safe:slide-in-from-bottom-5 ${className}`}
    >
      <div
        className={`relative border shadow-lg ${radiusClass} ${
          isDark
            ? "bg-zinc-900 border-zinc-800 text-zinc-100"
            : "bg-white border-line text-zinc-900"
        } transition-all duration-200 ${isExpanded ? "w-80 sm:w-96 p-4" : "p-2.5 max-w-xs"}`}
      >
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          aria-label="Dismiss badge"
          className="absolute -top-2 -right-2 bg-zinc-800 text-white dark:bg-zinc-700 rounded-full p-1 shadow-md hover:bg-zinc-900 transition-colors"
        >
          <X size={12} />
        </button>

        {!isExpanded ? (
          // Compact pill view
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsExpanded(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsExpanded(true);
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <WidgetAvatar
              name={activeTestimonial.customer.name}
              avatarUrl={activeTestimonial.customer.avatarUrl}
              size="sm"
            />
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs truncate">
                  {activeTestimonial.customer.name}
                </span>
                {activeTestimonial.rating && (
                  <div className="flex items-center text-amber-400">
                    <Star size={10} className="fill-current" />
                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 ml-0.5">
                      {activeTestimonial.rating}.0
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[11px] opacity-75 truncate italic">
                &ldquo;{activeTestimonial.content}&rdquo;
              </p>
            </div>
            <ChevronRight size={14} className="opacity-40" />
          </div>
        ) : (
          // Expanded preview view
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <WidgetAvatar
                name={activeTestimonial.customer.name}
                avatarUrl={activeTestimonial.customer.avatarUrl}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs">{activeTestimonial.customer.name}</span>
                  <span className="text-emerald-500 inline-flex items-center" title="Verified Customer">
                    <CheckCircle2 size={12} />
                  </span>
                </div>
                {activeTestimonial.customer.company && (
                  <p className="text-[11px] opacity-70 truncate">
                    {activeTestimonial.customer.company}
                  </p>
                )}
                {activeTestimonial.rating && (
                  <div className="pt-0.5">
                    <WidgetRating rating={activeTestimonial.rating} size="xs" accentColor={brandColor} />
                  </div>
                )}
              </div>
            </div>

            <blockquote className="text-xs leading-relaxed opacity-90 italic">
              &ldquo;{activeTestimonial.content}&rdquo;
            </blockquote>

            <div className="flex items-center justify-between pt-2 border-t border-line/50 dark:border-zinc-800/60 text-[11px]">
              {testimonials.length > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % testimonials.length)}
                  className="text-brand-600 hover:underline font-semibold"
                >
                  Next review ({currentIndex + 1}/{testimonials.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="opacity-60 hover:opacity-100"
              >
                Collapse
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
