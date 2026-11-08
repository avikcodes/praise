"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  Quote,
  Sparkles,
} from "lucide-react";
import { PublicTestimonialCard } from "@/types/widgets";
import { WidgetPublicConfig } from "./types";
import { WidgetAvatar } from "./widget-avatar";
import { WidgetRating } from "./widget-rating";
import { WidgetMediaPlayer } from "./widget-media-player";
import {
  getCardBorderClasses,
  getCardRadiusClasses,
  getCardSpacingClasses,
} from "@/lib/branding/utils";

type WidgetSingleQuoteProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetSingleQuote({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetSingleQuoteProps) {
  const {
    showRatings = true,
    showCompany = true,
    showAvatar = true,
    showDate = true,
    showTags = true,
    showSource = true,
    allowVideoPlayback = true,
    accentColor = "#7049D8",
    primaryColor,
    secondaryColor = "#10B981",
    cardBorder,
    cardRadius,
    cardSpacing,
    theme,
  } = config;

  const brandColor = primaryColor || accentColor || "#7049D8";
  const borderClass = getCardBorderClasses(cardBorder, theme === "dark");
  const radiusClass = getCardRadiusClasses(cardRadius);
  const spacingClass = getCardSpacingClasses(cardSpacing);

  const [activeIndex, setActiveIndex] = useState(0);

  const total = testimonials.length;
  const current = testimonials[activeIndex] || testimonials[0];

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  }, [total]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  }, [total]);

  // Keyboard navigation when focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  };

  if (!current) return null;

  const hasMedia = current.media && current.media.length > 0;
  const primaryMedia = hasMedia ? current.media[0] : null;

  return (
    <section
      role="region"
      aria-label="Spotlight Customer Testimonial"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`relative w-full max-w-4xl mx-auto ${radiusClass} ${borderClass} ${spacingClass} bg-white dark:bg-zinc-900/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 overflow-hidden ${className}`}
    >
      {/* Decorative Oversized Watermark Quote Icon in Background */}
      <div
        className="absolute -top-6 -right-6 text-brand-600/5 dark:text-brand-400/5 pointer-events-none select-none"
        aria-hidden="true"
      >
        <Quote size={220} />
      </div>

      <div className="relative space-y-8">
        {/* Top Header Badge & Rating */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-2xs"
              style={{
                backgroundColor: `${brandColor}15`,
                color: brandColor,
              }}
            >
              <Sparkles size={12} />
              <span>Customer Spotlight</span>
            </span>

            {showSource && (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                style={{
                  backgroundColor: `${secondaryColor}15`,
                  borderColor: `${secondaryColor}30`,
                  color: secondaryColor,
                }}
              >
                <CheckCircle2 size={11} />
                <span>Verified Feedback</span>
              </span>
            )}
          </div>

          {showRatings && current.rating && current.rating > 0 && (
            <WidgetRating
              rating={current.rating}
              size="md"
              accentColor={brandColor}
              showNumber
            />
          )}
        </div>

        {/* Media Split or Prominent Quote Viewport */}
        <div
          className={`grid gap-8 items-center ${
            primaryMedia ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"
          }`}
        >
          {/* Main Editorial Quote */}
          <div
            className={`space-y-4 ${
              primaryMedia ? "lg:col-span-7" : "col-span-1"
            }`}
          >
            <blockquote
              onClick={() => onTestimonialClick?.(current)}
              className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium tracking-tight text-ink-950 dark:text-zinc-50 leading-snug sm:leading-relaxed ${
                onTestimonialClick ? "cursor-pointer" : ""
              }`}
            >
              &ldquo;{current.content}&rdquo;
            </blockquote>

            {/* Tags */}
            {showTags && current.tags && current.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                {current.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg bg-warm-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-ink-700 dark:text-zinc-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Media Showcase (Video / Image) */}
          {primaryMedia && (
            <div className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden border border-line dark:border-zinc-800 shadow-md">
                <WidgetMediaPlayer
                  media={primaryMedia}
                  allowPlayback={allowVideoPlayback}
                  aspectRatio="wide"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Profile Bar & Navigator */}
        <div className="pt-6 border-t border-line/70 dark:border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Customer Avatar & Bio */}
          <div className="flex items-center gap-4">
            {showAvatar && (
              <WidgetAvatar
                name={current.customer.name}
                avatarUrl={current.customer.avatarUrl}
                size="xl"
              />
            )}

            <div>
              <h4 className="text-base font-bold text-ink-900 dark:text-zinc-100">
                {current.customer.name}
              </h4>

              {showCompany && (current.customer.title || current.customer.company) && (
                <p className="text-xs text-ink-500 dark:text-zinc-400">
                  {current.customer.title}
                  {current.customer.title && current.customer.company && " • "}
                  {current.customer.website ? (
                    <a
                      href={current.customer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-0.5 font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      <span>{current.customer.company}</span>
                      <Globe size={11} className="inline opacity-80" />
                    </a>
                  ) : (
                    <span className="font-medium text-ink-700 dark:text-zinc-300">
                      {current.customer.company}
                    </span>
                  )}
                </p>
              )}

              {showDate && current.submittedAt && (
                <p className="text-[11px] text-ink-400 dark:text-zinc-500 mt-0.5">
                  Published{" "}
                  {new Date(current.submittedAt).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Stepper Controls (if multiple testimonials exist) */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Link
              href={`/t/${current.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-line dark:border-zinc-800 px-3 py-1.5 text-xs font-semibold text-ink-600 dark:text-zinc-300 hover:bg-warm-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <span>Permalink</span>
              <ExternalLink size={12} />
            </Link>

            {total > 1 && (
              <div className="flex items-center gap-2 pl-2 border-l border-line dark:border-zinc-800">
                <span className="text-xs font-mono text-ink-400 dark:text-zinc-500">
                  {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>

                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous quote"
                  className="h-8 w-8 rounded-lg border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900 text-ink-700 dark:text-zinc-300 hover:bg-warm-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
                >
                  <ArrowLeft size={14} />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next quote"
                  className="h-8 w-8 rounded-lg border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900 text-ink-700 dark:text-zinc-300 hover:bg-warm-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

