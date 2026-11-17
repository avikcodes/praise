"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Quote, Sparkles, Star, Users } from "lucide-react";
import { PublicTestimonialCard } from "@/types/widgets";
import { WidgetPublicConfig } from "./types";
import { WidgetAvatar } from "./widget-avatar";
import { WidgetRating } from "./widget-rating";
import {
  getCardBorderClasses,
  getCardRadiusClasses,
  getCardSpacingClasses,
} from "@/lib/branding/utils";

type WidgetAvatarWallProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetAvatarWall({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetAvatarWallProps) {
  const {
    showRatings = true,
    showCompany = true,
    showAvatar = true,
    showDate = true,
    showFeaturedBadge = true,
    accentColor = "#7049D8",
    primaryColor,
    cardBorder,
    cardRadius,
    cardSpacing,
    theme,
    avatarCount = 8,
    avatarSize = "md",
  } = config;

  const brandColor = primaryColor || accentColor || "#7049D8";
  const borderClass = getCardBorderClasses(cardBorder, theme === "dark");
  const radiusClass = getCardRadiusClasses(cardRadius);
  const spacingClass = getCardSpacingClasses(cardSpacing);

  const [activeTestimonial, setActiveTestimonial] = useState<PublicTestimonialCard | null>(null);

  // Take the configured number of avatars, prioritizing featured reviews with photos
  const displayedTestimonials = useMemo(() => {
    const withAvatars = testimonials.filter((t) => t.customer?.avatarUrl);
    const withoutAvatars = testimonials.filter((t) => !t.customer?.avatarUrl);
    return [...withAvatars, ...withoutAvatars].slice(0, Math.max(3, avatarCount));
  }, [testimonials, avatarCount]);

  const remainingCount = Math.max(0, testimonials.length - displayedTestimonials.length);

  // Compute live rating statistics
  const averageRating = useMemo(() => {
    const rated = testimonials.filter((t) => t.rating !== null && t.rating > 0);
    if (rated.length === 0) return 5.0;
    const sum = rated.reduce((acc, curr) => acc + (curr.rating || 5), 0);
    return Number((sum / rated.length).toFixed(1));
  }, [testimonials]);

  const avatarDimensions =
    avatarSize === "sm"
      ? "w-8 h-8 -ml-2"
      : avatarSize === "lg"
      ? "w-12 h-12 -ml-3.5"
      : "w-10 h-10 -ml-2.5";

  return (
    <div
      role="region"
      aria-label="Customer Avatar Wall"
      className={`relative w-full max-w-4xl mx-auto ${className}`}
    >
      <div
        className={`${radiusClass} ${borderClass} ${spacingClass} bg-white dark:bg-zinc-900/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-200`}
      >
        {/* Left Side: Avatar Stack + Callout */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Overlapping Avatar Stack */}
          <div
            role="list"
            aria-label="Customer Avatars"
            className="flex items-center pl-2.5 overflow-visible shrink-0"
          >
            {displayedTestimonials.map((t, idx) => {
              const isSelected = activeTestimonial?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="listitem"
                  aria-label={`View testimonial from ${t.customer?.name}`}
                  aria-expanded={isSelected}
                  onClick={() => {
                    setActiveTestimonial(isSelected ? null : t);
                    onTestimonialClick?.(t);
                  }}
                  onMouseEnter={() => setActiveTestimonial(t)}
                  className={`relative rounded-full ring-2 ring-white dark:ring-zinc-900 transition-all duration-200 hover:scale-115 hover:z-30 focus:outline-hidden focus:ring-brand-500 focus:z-30 ${avatarDimensions} ${
                    idx === 0 ? "ml-0" : ""
                  } ${isSelected ? "scale-115 z-30 ring-brand-500" : "z-10"}`}
                  style={{ zIndex: isSelected ? 40 : 20 - idx }}
                >
                  <WidgetAvatar
                    avatarUrl={t.customer?.avatarUrl}
                    name={t.customer?.name || "Customer"}
                    size={avatarSize}
                  />
                  {t.isFeatured && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-white text-[8px] shadow-2xs"
                      style={{ backgroundColor: brandColor }}
                    >
                      ★
                    </span>
                  )}
                </button>
              );
            })}

            {/* Overflow "+N more" badge */}
            {remainingCount > 0 && (
              <div
                className={`rounded-full bg-sand-200 dark:bg-zinc-800 border border-white dark:border-zinc-900 flex items-center justify-center text-[11px] font-bold text-ink-700 dark:text-zinc-300 shadow-2xs shrink-0 select-none ${avatarDimensions} z-0`}
              >
                +{remainingCount}
              </div>
            )}
          </div>

          {/* Social Proof Text & Rating Stats */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-ink-900 dark:text-zinc-100">
                Loved by {testimonials.length}+ verified customers
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                <CheckCircle2 size={11} />
                <span>Verified</span>
              </span>
            </div>

            {showRatings && (
              <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-zinc-400">
                <WidgetRating rating={averageRating} size="xs" accentColor={brandColor} />
                <span className="font-semibold text-ink-700 dark:text-zinc-300">
                  {averageRating} / 5.0
                </span>
                <span>•</span>
                <span>Click any avatar to preview</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Optional CTA button if configured */}
        {config.ctaEnabled && config.ctaUrl && (
          <div className="shrink-0 flex items-center gap-2">
            <Link
              href={config.ctaUrl}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-2xs hover:opacity-95 transition-opacity"
              style={{ backgroundColor: brandColor }}
            >
              <span>{config.ctaLabel || "View All Stories"}</span>
            </Link>
          </div>
        )}
      </div>

      {/* Interactive Active Testimonial Popover / Spotlight Preview */}
      {activeTestimonial && (
        <div
          role="dialog"
          aria-label={`Testimonial from ${activeTestimonial.customer?.name}`}
          className={`mt-3 p-4 rounded-2xl border ${borderClass} bg-sand-50/90 dark:bg-zinc-950/90 shadow-md backdrop-blur-xs transition-all duration-200 animate-in fade-in-50 slide-in-from-top-1`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <WidgetAvatar
                avatarUrl={activeTestimonial.customer?.avatarUrl}
                name={activeTestimonial.customer?.name || "Customer"}
                size="sm"
              />
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs text-ink-900 dark:text-zinc-100">
                    {activeTestimonial.customer?.name}
                  </span>
                  <CheckCircle2 size={11} className="text-emerald-500" />
                </div>
                {showCompany && (activeTestimonial.customer?.title || activeTestimonial.customer?.company) && (
                  <p className="text-[10px] text-ink-500 dark:text-zinc-400">
                    {[activeTestimonial.customer?.title, activeTestimonial.customer?.company]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showRatings && activeTestimonial.rating && (
                <WidgetRating rating={activeTestimonial.rating} size="xs" accentColor={brandColor} />
              )}
              <button
                type="button"
                onClick={() => setActiveTestimonial(null)}
                aria-label="Close preview"
                className="text-ink-400 hover:text-ink-800 text-xs p-1 rounded-md"
              >
                ✕
              </button>
            </div>
          </div>

          <blockquote className="text-xs text-ink-800 dark:text-zinc-200 leading-relaxed italic pl-1 border-l-2 border-brand-500/40">
            "{activeTestimonial.content}"
          </blockquote>

          {showDate && activeTestimonial.submittedAt && (
            <div className="pt-2 mt-2 border-t border-line/40 dark:border-zinc-800 text-[10px] text-ink-400 dark:text-zinc-500 flex justify-end">
              <time dateTime={activeTestimonial.submittedAt}>
                {new Date(activeTestimonial.submittedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
