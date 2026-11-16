"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, Globe, Sparkles } from "lucide-react";
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

type WidgetMasonryProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetMasonry({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetMasonryProps) {
  const {
    showRatings = true,
    showCompany = true,
    showAvatar = true,
    showDate = true,
    showTags = true,
    showSource = true,
    showFeaturedBadge = true,
    allowVideoPlayback = true,
    cardsPerRow = 3,
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

  // Column gap and item bottom margin matched with cardSpacing
  const gapClass =
    cardSpacing === "compact"
      ? "gap-3.5 space-y-3.5"
      : cardSpacing === "spacious"
      ? "gap-7 space-y-7"
      : "gap-5 space-y-5";

  const columnClass =
    cardsPerRow === 1
      ? "columns-1 max-w-xl mx-auto"
      : cardsPerRow === 2
      ? "columns-1 sm:columns-2 max-w-4xl mx-auto"
      : cardsPerRow === 4
      ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4"
      : "columns-1 sm:columns-2 lg:columns-3";

  return (
    <div
      role="region"
      aria-label="Customer Testimonials Masonry"
      className={`w-full ${columnClass} ${gapClass} ${className}`}
    >
      {testimonials.map((t) => {
        const hasMedia = t.media && t.media.length > 0;
        const primaryMedia = hasMedia ? t.media[0] : null;

        return (
          <article
            key={t.id}
            onClick={() => onTestimonialClick?.(t)}
            className={`break-inside-avoid inline-block w-full ${radiusClass} ${borderClass} ${spacingClass} bg-white dark:bg-zinc-900/90 shadow-2xs hover:shadow-md transition-all duration-200 ${
              onTestimonialClick ? "cursor-pointer" : ""
            } ${
              t.isFeatured && showFeaturedBadge
                ? "ring-1 ring-offset-1 ring-brand-500/30"
                : ""
            }`}
          >
            {/* Header: Customer metadata + rating */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                {showAvatar && (
                  <WidgetAvatar
                    avatarUrl={t.customer?.avatarUrl}
                    name={t.customer?.name || "Customer"}
                    size="md"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-ink-900 dark:text-zinc-100 truncate">
                      {t.customer?.name}
                    </span>
                    <CheckCircle2
                      size={13}
                      className="text-emerald-500 shrink-0"
                      aria-label="Verified Customer"
                    />
                  </div>

                  {showCompany && (t.customer?.title || t.customer?.company) && (
                    <p className="text-xs text-ink-500 dark:text-zinc-400 truncate mt-0.5">
                      {t.customer?.title}
                      {t.customer?.title && t.customer?.company && " • "}
                      {t.customer?.website ? (
                        <Link
                          href={t.customer.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline hover:text-brand-600 inline-flex items-center gap-1"
                        >
                          {t.customer.company}
                          <ExternalLink size={10} className="shrink-0" />
                        </Link>
                      ) : (
                        t.customer?.company
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Star Rating */}
              {showRatings && t.rating !== null && t.rating > 0 && (
                <div className="shrink-0 pt-0.5">
                  <WidgetRating rating={t.rating} size="xs" accentColor={brandColor} />
                </div>
              )}
            </div>

            {/* Featured Badge */}
            {t.isFeatured && showFeaturedBadge && (
              <div className="mb-2.5">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase"
                  style={{
                    backgroundColor: `${brandColor}15`,
                    color: brandColor,
                  }}
                >
                  <Sparkles size={10} />
                  Featured
                </span>
              </div>
            )}

            {/* Quote content */}
            <blockquote className="text-sm leading-relaxed text-ink-700 dark:text-zinc-200 whitespace-pre-line mb-3">
              "{t.content}"
            </blockquote>

            {/* Media Attachment (Video or Image with natural aspect) */}
            {primaryMedia && (
              <div className="mb-3">
                <WidgetMediaPlayer
                  media={primaryMedia}
                  allowPlayback={allowVideoPlayback}
                  aspectRatio="auto"
                />
              </div>
            )}

            {/* Footer tags, date & source */}
            {(showDate || (showTags && t.tags.length > 0) || (showSource && t.source)) && (
              <div className="pt-2.5 border-t border-line/60 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-ink-400 dark:text-zinc-500 gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {showTags &&
                    t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded-md bg-warm-100 dark:bg-zinc-800 text-ink-600 dark:text-zinc-400 font-medium text-[10px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  {showSource && t.source && (
                    <span className="inline-flex items-center gap-1 text-[10px] opacity-80">
                      <Globe size={10} />
                      {t.source}
                    </span>
                  )}
                </div>

                {showDate && t.submittedAt && (
                  <time dateTime={t.submittedAt} className="text-[10px] opacity-75 shrink-0">
                    {new Date(t.submittedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
