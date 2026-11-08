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

type WidgetListProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetList({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetListProps) {
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
    cardBorder,
    cardRadius,
    cardSpacing,
    theme,
  } = config;

  const brandColor = primaryColor || accentColor || "#7049D8";
  const borderClass = getCardBorderClasses(cardBorder, theme === "dark");
  const radiusClass = getCardRadiusClasses(cardRadius);
  const spacingClass = getCardSpacingClasses(cardSpacing);

  return (
    <div
      role="feed"
      aria-label="Customer Testimonials Feed"
      className={`w-full max-w-4xl mx-auto space-y-4 ${className}`}
    >
      {testimonials.map((t, index) => {
        const hasMedia = t.media && t.media.length > 0;
        const primaryMedia = hasMedia ? t.media[0] : null;

        return (
          <article
            key={t.id}
            aria-posinset={index + 1}
            aria-setsize={testimonials.length}
            onClick={() => onTestimonialClick?.(t)}
            className={`${radiusClass} ${borderClass} ${spacingClass} bg-white dark:bg-zinc-900/90 shadow-2xs hover:shadow-md transition-all duration-200 ${
              onTestimonialClick ? "cursor-pointer" : ""
            }`}
          >
            <div className="flex flex-col md:flex-row gap-5 lg:gap-6">
              {/* Left Column: Customer Profile & Rating */}
              <div className="md:w-56 lg:w-64 shrink-0 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start gap-3">
                <div className="flex items-center gap-3">
                  {showAvatar && (
                    <WidgetAvatar
                      name={t.customer.name}
                      avatarUrl={t.customer.avatarUrl}
                      size="lg"
                    />
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-xs sm:text-sm text-ink-900 dark:text-zinc-100 truncate">
                        {t.customer.name}
                      </h4>
                      {showSource && (
                        <CheckCircle2
                          size={12}
                          className="text-emerald-500 shrink-0"
                          aria-label="Verified Customer Review"
                        />
                      )}
                    </div>

                    {showCompany && (t.customer.title || t.customer.company) && (
                      <p className="text-[11px] sm:text-xs text-ink-500 dark:text-zinc-400 truncate">
                        {t.customer.title}
                        {t.customer.title && t.customer.company && " • "}
                        {t.customer.website ? (
                          <a
                            href={t.customer.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 hover:underline text-ink-700 dark:text-zinc-300 font-medium"
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

                {/* Rating on the Left under avatar on desktop */}
                {showRatings && t.rating && t.rating > 0 && (
                  <div className="md:pt-1">
                    <WidgetRating
                      rating={t.rating}
                      size="sm"
                      accentColor={brandColor}
                      showNumber
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Quote Text, Media Attachment & Footer */}
              <div className="flex-1 min-w-0 md:border-l md:border-line/70 md:dark:border-zinc-800/70 md:pl-6 space-y-3.5">
                {/* Quote */}
                <blockquote className="text-xs sm:text-sm text-ink-900 dark:text-zinc-100 leading-relaxed font-normal whitespace-pre-line">
                  &ldquo;{t.content}&rdquo;
                </blockquote>

                {/* Media Attachment */}
                {primaryMedia && (
                  <div className="max-w-md pt-1">
                    <WidgetMediaPlayer
                      media={primaryMedia}
                      allowPlayback={allowVideoPlayback}
                      aspectRatio="wide"
                    />
                  </div>
                )}

                {/* Footer Metadata */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-400 dark:text-zinc-500">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {showTags &&
                      t.tags &&
                      t.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-warm-100 dark:bg-zinc-800 px-2 py-0.5 font-medium text-ink-600 dark:text-zinc-300 text-[10px]"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>

                  <div className="flex items-center gap-2.5">
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
                      className="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      <span>Permalink</span>
                      <ExternalLink size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

