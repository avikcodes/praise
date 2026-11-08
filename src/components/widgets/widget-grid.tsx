"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, Globe } from "lucide-react";
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

type WidgetGridProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetGrid({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetGridProps) {
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

  const gridColsClass =
    cardsPerRow === 1
      ? "grid-cols-1 max-w-xl mx-auto"
      : cardsPerRow === 2
      ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto"
      : cardsPerRow === 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div
      role="region"
      aria-label="Customer Testimonials Grid"
      className={`grid gap-5 ${gridColsClass} ${className}`}
    >
      {testimonials.map((t) => {
        const hasMedia = t.media && t.media.length > 0;
        const primaryMedia = hasMedia ? t.media[0] : null;

        return (
          <article
            key={t.id}
            onClick={() => onTestimonialClick?.(t)}
            className={`flex flex-col justify-between ${radiusClass} ${borderClass} ${spacingClass} bg-white dark:bg-zinc-900/90 shadow-2xs hover:shadow-md transition-all duration-200 ${
              onTestimonialClick ? "cursor-pointer" : ""
            } ${
              t.isFeatured && showFeaturedBadge
                ? "ring-1 ring-offset-1 ring-brand-500/30"
                : ""
            }`}
          >
            <div className="space-y-3.5">
              {/* Header: Reviewer & Rating */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {showAvatar && (
                    <WidgetAvatar
                      name={t.customer.name}
                      avatarUrl={t.customer.avatarUrl}
                      size="md"
                    />
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-xs text-ink-900 dark:text-zinc-100 truncate">
                        {t.customer.name}
                      </h4>
                      {showSource && (
                        <CheckCircle2
                          size={12}
                          className="shrink-0"
                          style={{ color: secondaryColor }}
                          aria-label="Verified Customer Review"
                        />
                      )}
                    </div>

                    {showCompany && (t.customer.title || t.customer.company) && (
                      <p className="text-[11px] text-ink-500 dark:text-zinc-400 truncate">
                        {t.customer.title}
                        {t.customer.title && t.customer.company && " • "}
                        {t.customer.website ? (
                          <a
                            href={t.customer.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 hover:underline text-ink-600 dark:text-zinc-300"
                          >
                            <span>{t.customer.company}</span>
                            <Globe size={10} className="inline opacity-70" />
                          </a>
                        ) : (
                          t.customer.company
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rating */}
                {showRatings && t.rating && t.rating > 0 && (
                  <WidgetRating
                    rating={t.rating}
                    size="xs"
                    accentColor={brandColor}
                  />
                )}
              </div>

              {/* Quote Body */}
              <blockquote className="text-xs sm:text-[13px] text-ink-800 dark:text-zinc-200 leading-relaxed font-normal whitespace-pre-line">
                &ldquo;{t.content}&rdquo;
              </blockquote>

              {/* Media Attachment (Photo / Video) */}
              {primaryMedia && (
                <div className="pt-1">
                  <WidgetMediaPlayer
                    media={primaryMedia}
                    allowPlayback={allowVideoPlayback}
                    aspectRatio="wide"
                  />
                </div>
              )}
            </div>

            {/* Footer Metadata */}
            <div className="mt-4 pt-3 border-t border-line/60 dark:border-zinc-800/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-400 dark:text-zinc-500">
              <div className="flex flex-wrap items-center gap-1.5">
                {showTags &&
                  t.tags &&
                  t.tags.slice(0, 2).map((tag, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-warm-100 dark:bg-zinc-800 px-1.5 py-0.5 font-medium text-ink-600 dark:text-zinc-300"
                    >
                      #{tag}
                    </span>
                  ))}
              </div>

              <div className="flex items-center gap-2">
                {showDate && t.submittedAt && (
                  <time dateTime={t.submittedAt}>
                    {new Date(t.submittedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                )}

                <Link
                  href={`/t/${t.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="View individual testimonial permalink"
                  className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  <ExternalLink size={11} />
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

