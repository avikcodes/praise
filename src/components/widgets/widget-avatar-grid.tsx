"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Quote, Sparkles, Star, Users, X } from "lucide-react";
import { PublicTestimonialCard } from "@/types/widgets";
import { WidgetPublicConfig } from "./types";
import { WidgetAvatar } from "./widget-avatar";
import { WidgetRating } from "./widget-rating";
import {
  getCardBorderClasses,
  getCardRadiusClasses,
  getCardSpacingClasses,
} from "@/lib/branding/utils";

type WidgetAvatarGridProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetAvatarGrid({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetAvatarGridProps) {
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
    avatarSize = "md",
    cardsPerRow = 4,
  } = config;

  const brandColor = primaryColor || accentColor || "#7049D8";
  const borderClass = getCardBorderClasses(cardBorder, theme === "dark");
  const radiusClass = getCardRadiusClasses(cardRadius);
  const spacingClass = getCardSpacingClasses(cardSpacing);

  const [activeItem, setActiveItem] = useState<PublicTestimonialCard | null>(null);

  // Group testimonials: prioritized by having an avatar image and high ratings
  const displayedTestimonials = useMemo(() => {
    return [...testimonials].sort((a, b) => {
      const aHasImg = a.customer?.avatarUrl ? 1 : 0;
      const bHasImg = b.customer?.avatarUrl ? 1 : 0;
      if (bHasImg !== aHasImg) return bHasImg - aHasImg;
      if (b.isFeatured !== a.isFeatured) return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      return (b.rating || 5) - (a.rating || 5);
    });
  }, [testimonials]);

  // Dynamic grid column classes
  const gridColsClass = useMemo(() => {
    switch (cardsPerRow) {
      case 2:
        return "grid-cols-1 sm:grid-cols-2";
      case 3:
        return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
      case 6:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
      case 4:
      default:
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";
    }
  }, [cardsPerRow]);

  return (
    <div className={`w-full max-w-6xl mx-auto space-y-6 ${className}`}>
      {/* Grid of Customer Profiles */}
      <div
        role="region"
        aria-label="Customer avatar grid"
        className={`grid ${gridColsClass} ${spacingClass}`}
      >
        {displayedTestimonials.map((t) => {
          const isSelected = activeItem?.id === t.id;
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setActiveItem(isSelected ? null : t);
                onTestimonialClick?.(t);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveItem(isSelected ? null : t);
                  onTestimonialClick?.(t);
                } else if (e.key === "Escape") {
                  setActiveItem(null);
                }
              }}
              aria-label={`View feedback from ${t.customer.name}`}
              aria-expanded={isSelected}
              className={`group relative p-4 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-between ${borderClass} ${radiusClass} ${
                theme === "dark"
                  ? "bg-zinc-900/60 hover:bg-zinc-900 text-zinc-100"
                  : "bg-white hover:bg-warm-50/80 text-zinc-900"
              } ${isSelected ? "ring-2 shadow-md" : "hover:shadow-sm"}`}
              style={{
                borderColor: isSelected ? brandColor : undefined,
                boxShadow: isSelected ? `0 0 0 1px ${brandColor}` : undefined,
              }}
            >
              {/* Featured Badge */}
              {showFeaturedBadge && t.isFeatured && (
                <span
                  className="absolute top-2.5 right-2.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${brandColor}18`,
                    color: brandColor,
                  }}
                >
                  <Sparkles size={9} />
                </span>
              )}

              {/* Avatar with optional ring */}
              <div className="relative mb-3 mt-1">
                <div
                  className="rounded-full transition-transform duration-200 group-hover:scale-105"
                  style={{
                    boxShadow: isSelected ? `0 0 0 3px ${brandColor}` : undefined,
                  }}
                >
                  <WidgetAvatar
                    name={t.customer.name}
                    avatarUrl={t.customer.avatarUrl}
                    size={avatarSize === "lg" ? "lg" : avatarSize === "sm" ? "sm" : "md"}
                  />
                </div>
                <span
                  title="Verified Customer"
                  className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-950 rounded-full p-0.5 text-blue-500 shadow-2xs"
                >
                  <CheckCircle2 size={13} className="fill-blue-500 text-white dark:text-zinc-950" />
                </span>
              </div>

              {/* Name & Title */}
              <div className="w-full min-w-0 space-y-0.5 mb-2">
                <p className="font-semibold text-xs truncate leading-tight group-hover:text-brand-600 transition-colors">
                  {t.customer.name}
                </p>
                {showCompany && (t.customer.company || t.customer.title) && (
                  <p className="text-[11px] opacity-70 truncate leading-tight">
                    {t.customer.title && t.customer.company
                      ? `${t.customer.title}, ${t.customer.company}`
                      : t.customer.company || t.customer.title}
                  </p>
                )}
              </div>

              {/* Rating */}
              {showRatings && t.rating && t.rating > 0 && (
                <div className="pt-1">
                  <WidgetRating rating={t.rating} size="xs" accentColor={brandColor} />
                </div>
              )}

              {/* Micro-snippet quote */}
              <p className="mt-2 text-[11px] opacity-75 line-clamp-2 italic leading-relaxed text-center">
                &ldquo;{t.content}&rdquo;
              </p>
            </div>
          );
        })}
      </div>

      {/* Popover / Spotlight Modal when an avatar is active */}
      {activeItem && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={`Testimonial from ${activeItem.customer.name}`}
          className={`relative p-5 sm:p-6 transition-all animate-in fade-in zoom-in-95 duration-200 ${borderClass} ${radiusClass} ${
            theme === "dark"
              ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl"
              : "bg-white border-line text-zinc-900 shadow-xl"
          }`}
          style={{
            borderLeft: `4px solid ${brandColor}`,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveItem(null)}
            aria-label="Close quote details"
            className="absolute top-4 right-4 p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            <WidgetAvatar
              name={activeItem.customer.name}
              avatarUrl={activeItem.customer.avatarUrl}
              size="lg"
            />
            <div className="space-y-2 flex-1 min-w-0 pr-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm">{activeItem.customer.name}</span>
                <span
                  title="Verified Testimonial"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2 size={13} />
                  <span>Verified</span>
                </span>
                {showFeaturedBadge && activeItem.isFeatured && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${brandColor}20`,
                      color: brandColor,
                    }}
                  >
                    <Sparkles size={10} />
                    Featured
                  </span>
                )}
                {showRatings && activeItem.rating && activeItem.rating > 0 && (
                  <WidgetRating rating={activeItem.rating} size="sm" accentColor={brandColor} />
                )}
              </div>

              {(activeItem.customer.company || activeItem.customer.title) && (
                <p className="text-xs opacity-75">
                  {activeItem.customer.title && activeItem.customer.company
                    ? `${activeItem.customer.title} at ${activeItem.customer.company}`
                    : activeItem.customer.company || activeItem.customer.title}
                </p>
              )}

              <blockquote className="pt-2 text-sm sm:text-base leading-relaxed italic opacity-90">
                &ldquo;{activeItem.content}&rdquo;
              </blockquote>

              <div className="flex items-center justify-between pt-2 text-[11px] opacity-60">
                {showDate && activeItem.submittedAt && (
                  <span>
                    {new Date(activeItem.submittedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                {activeItem.customer.website && (
                  <Link
                    href={activeItem.customer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    <span>Website</span>
                    <ExternalLink size={11} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
