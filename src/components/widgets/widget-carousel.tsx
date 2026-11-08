"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Pause,
  Play,
  Quote,
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

type WidgetCarouselProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetCarousel({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetCarouselProps) {
  const {
    showRatings = true,
    showCompany = true,
    showAvatar = true,
    showDate = true,
    showTags = true,
    showSource = true,
    showFeaturedBadge = true,
    allowVideoPlayback = true,
    autoplay = false,
    autoplayInterval = 5000,
    accentColor = "#7049D8",
    primaryColor,
    cardBorder,
    cardRadius,
    cardSpacing,
    theme,
  } = config;

  const brandColor = primaryColor || accentColor || "#7049D8";
  const borderClass = getCardBorderClasses(cardBorder, theme === "dark");
  const radiusClass = getCardRadiusClasses(cardRadius);
  const spacingClass = getCardSpacingClasses(cardSpacing);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplayRunning, setIsAutoplayRunning] = useState(autoplay);
  const [isPausedByHover, setIsPausedByHover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const total = testimonials.length;

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  }, [total]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  }, [total]);

  // Autoplay timer with pause-on-hover / pause-on-focus
  useEffect(() => {
    if (!isAutoplayRunning || isPausedByHover || total <= 1) return;
    const interval = setInterval(() => {
      goToNext();
    }, Math.max(3000, autoplayInterval));
    return () => clearInterval(interval);
  }, [isAutoplayRunning, isPausedByHover, total, autoplayInterval, goToNext]);

  // Keyboard navigation (ArrowLeft & ArrowRight)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToNext();
    }
  };

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchStartX.current = null;
  };

  if (total === 0) return null;

  const current = testimonials[currentIndex];
  const hasMedia = current.media && current.media.length > 0;
  const primaryMedia = hasMedia ? current.media[0] : null;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Testimonials Carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPausedByHover(true)}
      onMouseLeave={() => setIsPausedByHover(false)}
      onFocus={() => setIsPausedByHover(true)}
      onBlur={() => setIsPausedByHover(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full max-w-4xl mx-auto focus:outline-none focus:ring-2 focus:ring-brand-500/40 rounded-3xl select-none ${className}`}
    >
      {/* Live Region for Screen Readers */}
      <div className="sr-only" aria-live="polite">
        Showing testimonial {currentIndex + 1} of {total}: by {current.customer.name}
      </div>

      {/* Main Slide Card */}
      <div className={`${radiusClass} ${borderClass} ${spacingClass} bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300`}>
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
          {/* If there is media, show prominent media showcase */}
          {primaryMedia && (
            <div className="w-full lg:w-5/12 shrink-0">
              <WidgetMediaPlayer
                media={primaryMedia}
                allowPlayback={allowVideoPlayback}
                aspectRatio="wide"
                className="shadow-sm"
              />
            </div>
          )}

          {/* Review Details & Quote Content */}
          <div className="w-full flex-1 space-y-4">
            {/* Top Bar: Quote Glyph & Star Rating */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  <Quote size={18} className="fill-white" />
                </div>
                {current.isFeatured && showFeaturedBadge && (
                  <span className="rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:text-brand-300">
                    Featured Review
                  </span>
                )}
              </div>

              {showRatings && current.rating && current.rating > 0 && (
                <WidgetRating
                  rating={current.rating}
                  size="sm"
                  accentColor={brandColor}
                  showNumber
                />
              )}
            </div>

            {/* Testimonial Quote */}
            <blockquote
              onClick={() => onTestimonialClick?.(current)}
              className={`text-sm sm:text-base lg:text-lg text-ink-900 dark:text-zinc-100 font-medium leading-relaxed ${
                onTestimonialClick ? "cursor-pointer" : ""
              }`}
            >
              &ldquo;{current.content}&rdquo;
            </blockquote>

            {/* Tags */}
            {showTags && current.tags && current.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {current.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-warm-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-ink-600 dark:text-zinc-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Reviewer Profile */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-line/60 dark:border-zinc-800/60">
              <div className="flex items-center gap-3">
                {showAvatar && (
                  <WidgetAvatar
                    name={current.customer.name}
                    avatarUrl={current.customer.avatarUrl}
                    size="lg"
                  />
                )}

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-ink-900 dark:text-zinc-100">
                      {current.customer.name}
                    </span>
                    {showSource && (
                      <CheckCircle2
                        size={13}
                        className="text-emerald-500 shrink-0"
                        aria-label="Verified Customer Review"
                      />
                    )}
                  </div>

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
                          className="inline-flex items-center gap-0.5 hover:underline text-ink-600 dark:text-zinc-300"
                        >
                          <span>{current.customer.company}</span>
                          <Globe size={10} className="inline opacity-70" />
                        </a>
                      ) : (
                        current.customer.company
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {showDate && current.submittedAt && (
                  <span className="text-[11px] text-ink-400 dark:text-zinc-500 hidden sm:inline">
                    {new Date(current.submittedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}

                <Link
                  href={`/t/${current.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View individual testimonial page"
                  className="p-1.5 rounded-lg border border-line dark:border-zinc-800 text-ink-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-warm-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls Bar */}
      <div className="mt-4 flex items-center justify-between px-2">
        {/* Prev / Next Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrev}
            aria-label="Previous testimonial"
            className="h-9 w-9 rounded-full border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900 text-ink-700 dark:text-zinc-300 hover:bg-warm-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors shadow-2xs"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Next testimonial"
            className="h-9 w-9 rounded-full border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900 text-ink-700 dark:text-zinc-300 hover:bg-warm-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors shadow-2xs"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Indicator Dots */}
        <div
          role="tablist"
          aria-label="Carousel slide pagination"
          className="flex items-center gap-1.5"
        >
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              role="tab"
              aria-selected={idx === currentIndex}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-6 bg-brand-600 dark:bg-brand-400"
                  : "w-2 bg-warm-200 dark:bg-zinc-700 hover:bg-warm-300"
              }`}
            />
          ))}
        </div>

        {/* Counter & Autoplay Toggle */}
        <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-zinc-400 font-mono">
          <span>
            {currentIndex + 1} / {total}
          </span>

          {autoplay && (
            <button
              type="button"
              onClick={() => setIsAutoplayRunning(!isAutoplayRunning)}
              aria-label={isAutoplayRunning ? "Pause carousel autoplay" : "Start carousel autoplay"}
              className="p-1 rounded hover:bg-warm-100 dark:hover:bg-zinc-800 text-ink-500 dark:text-zinc-400 transition-colors"
            >
              {isAutoplayRunning ? <Pause size={12} /> : <Play size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
