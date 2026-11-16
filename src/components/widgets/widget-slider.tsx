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

type WidgetSliderProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetSlider({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetSliderProps) {
  const {
    showRatings = true,
    showCompany = true,
    showAvatar = true,
    showDate = true,
    showTags = true,
    showSource = true,
    showFeaturedBadge = true,
    allowVideoPlayback = true,
    autoplay = true,
    autoplayInterval = 6000,
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
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const total = testimonials.length;
  const current = testimonials[currentIndex];

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
    setProgress(0);
  }, [total]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
    setProgress(0);
  }, [total]);

  // Autoplay progression & interval
  useEffect(() => {
    if (!isPlaying || isHovered || total <= 1) {
      setProgress(0);
      return;
    }

    const stepMs = 50;
    const totalSteps = autoplayInterval / stepMs;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + 100 / totalSteps;
      });
    }, stepMs);

    return () => clearInterval(interval);
  }, [isPlaying, isHovered, total, autoplayInterval, goToNext]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToNext();
    } else if (e.key === "Home") {
      e.preventDefault();
      setCurrentIndex(0);
      setProgress(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setCurrentIndex(total - 1);
      setProgress(0);
    } else if (e.key === " " || e.key === "k") {
      e.preventDefault();
      setIsPlaying((p) => !p);
    }
  };

  // Touch Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!current) return null;

  const primaryMedia = current.media && current.media.length > 0 ? current.media[0] : null;

  return (
    <div
      role="region"
      aria-roledescription="slider"
      aria-label="Testimonial Slider"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full max-w-4xl mx-auto focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 rounded-2xl ${className}`}
    >
      {/* Live region for screen readers */}
      <div className="sr-only" aria-live="polite">
        Showing testimonial {currentIndex + 1} of {total}: by {current.customer?.name}
      </div>

      {/* Main Slider Spotlight Card */}
      <article
        onClick={() => onTestimonialClick?.(current)}
        className={`relative ${radiusClass} ${borderClass} ${spacingClass} bg-white dark:bg-zinc-900/90 shadow-md transition-all duration-300 ${
          onTestimonialClick ? "cursor-pointer" : ""
        }`}
      >
        {/* Top bar: Quote icon & Slide counter & Badges */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg"
              style={{
                backgroundColor: `${brandColor}15`,
                color: brandColor,
              }}
            >
              <Quote size={16} />
            </span>

            {current.isFeatured && showFeaturedBadge && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase"
                style={{
                  backgroundColor: `${brandColor}15`,
                  color: brandColor,
                }}
              >
                <Sparkles size={11} />
                Featured Story
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink-400 dark:text-zinc-500">
            <span>{String(currentIndex + 1).padStart(2, "0")}</span>
            <span>/</span>
            <span>{String(total).padStart(2, "0")}</span>
          </div>
        </div>

        {/* Testimonial Quote */}
        <blockquote className="text-base sm:text-lg md:text-xl font-medium leading-relaxed text-ink-800 dark:text-zinc-100 mb-6 italic">
          "{current.content}"
        </blockquote>

        {/* Media (if attached) */}
        {primaryMedia && (
          <div className="mb-6 max-w-lg mx-auto">
            <WidgetMediaPlayer
              media={primaryMedia}
              allowPlayback={allowVideoPlayback}
              aspectRatio="wide"
            />
          </div>
        )}

        {/* Customer Info & Rating */}
        <div className="pt-4 border-t border-line/70 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {showAvatar && (
              <WidgetAvatar
                avatarUrl={current.customer?.avatarUrl}
                name={current.customer?.name || "Customer"}
                size="lg"
              />
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-ink-900 dark:text-zinc-100">
                  {current.customer?.name}
                </span>
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              </div>
              {showCompany && (current.customer?.title || current.customer?.company) && (
                <p className="text-xs text-ink-500 dark:text-zinc-400 mt-0.5">
                  {current.customer?.title}
                  {current.customer?.title && current.customer?.company && " • "}
                  {current.customer?.website ? (
                    <Link
                      href={current.customer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline hover:text-brand-600 inline-flex items-center gap-1"
                    >
                      {current.customer.company}
                      <ExternalLink size={10} className="shrink-0" />
                    </Link>
                  ) : (
                    current.customer?.company
                  )}
                </p>
              )}
            </div>
          </div>

          {showRatings && current.rating !== null && current.rating > 0 && (
            <div className="flex items-center gap-2">
              <WidgetRating rating={current.rating} size="sm" accentColor={brandColor} />
              <span className="text-xs font-bold text-ink-700 dark:text-zinc-300">
                {current.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Autoplay Progress Line Indicator */}
        {isPlaying && total > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5 overflow-hidden rounded-b-xl">
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${progress}%`,
                backgroundColor: brandColor,
              }}
            />
          </div>
        )}
      </article>

      {/* Accessible Slider Controls Bar */}
      {total > 1 && (
        <div className="flex items-center justify-between gap-4 mt-4 px-1">
          {/* Previous / Next Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPrev}
              aria-label="Previous testimonial"
              className="p-2 rounded-xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900 text-ink-700 dark:text-zinc-200 hover:bg-warm-100 dark:hover:bg-zinc-800 transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next testimonial"
              className="p-2 rounded-xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900 text-ink-700 dark:text-zinc-200 hover:bg-warm-100 dark:hover:bg-zinc-800 transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Dots Pagination */}
          <div
            role="tablist"
            aria-label="Slider navigation dots"
            className="flex items-center gap-1.5"
          >
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={idx === currentIndex}
                aria-label={`Go to testimonial slide ${idx + 1}`}
                onClick={() => {
                  setCurrentIndex(idx);
                  setProgress(0);
                }}
                className={`transition-all duration-200 rounded-full h-2 ${
                  idx === currentIndex ? "w-6" : "w-2 opacity-35 hover:opacity-75"
                }`}
                style={{
                  backgroundColor: idx === currentIndex ? brandColor : "currentColor",
                }}
              />
            ))}
          </div>

          {/* Autoplay Play/Pause Toggle */}
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause automatic slide rotation" : "Play automatic slide rotation"}
            className="p-2 rounded-xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900 text-ink-600 dark:text-zinc-300 hover:bg-warm-100 dark:hover:bg-zinc-800 transition-colors text-xs inline-flex items-center gap-1.5"
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span className="hidden sm:inline text-[11px] font-medium">
              {isPlaying ? "Pause" : "Play"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
