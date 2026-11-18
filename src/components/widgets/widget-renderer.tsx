"use client";

import { useEffect, useMemo, useRef } from "react";
import { WidgetDisplayType } from "@/types/widgets";
import { WidgetRendererProps } from "./types";
import {
  trackWidgetImpression,
  observeWidgetView,
  trackWidgetCtaClick,
} from "@/lib/analytics/client-tracker";
import { WidgetGrid } from "./widget-grid";
import { WidgetMasonry } from "./widget-masonry";
import { WidgetCarousel } from "./widget-carousel";
import { WidgetSlider } from "./widget-slider";
import { WidgetVideo } from "./widget-video";
import { WidgetAudio } from "./widget-audio";
import { WidgetSingleQuote } from "./widget-single-quote";
import { WidgetList } from "./widget-list";
import { WidgetAvatarWall } from "./widget-avatar-wall";
import { WidgetAvatarGrid } from "./widget-avatar-grid";
import {
  WidgetRatingBadge,
  WidgetReviewCountBadge,
  WidgetFloatingBadge,
} from "./widget-badges";
import { WidgetPopup } from "./widget-popup";
import { WidgetNotification } from "./widget-notification";
import { WidgetSkeleton } from "./widget-skeletons";
import { WidgetEmptyState } from "./widget-empty-state";
import { getFontFamilyCss } from "@/lib/branding/utils";

export function normalizeWidgetType(type: string): WidgetDisplayType {
  const clean = (type || "").toLowerCase().trim();
  if (clean === "carousel") return "carousel";
  if (clean === "slider" || clean === "slideshow") return "slider";
  if (clean === "masonry" || clean === "waterfall") return "masonry";
  if (
    clean === "video" ||
    clean === "video_grid" ||
    clean === "video-grid" ||
    clean === "video_testimonial" ||
    clean === "video-testimonial"
  ) {
    return "video";
  }
  if (
    clean === "audio" ||
    clean === "voice" ||
    clean === "audio_player" ||
    clean === "audio-player" ||
    clean === "audio_testimonial" ||
    clean === "audio-testimonial"
  ) {
    return "audio";
  }
  if (
    clean === "single_quote" ||
    clean === "single-quote" ||
    clean === "quote" ||
    clean === "quote_card" ||
    clean === "quote-card"
  ) {
    return "single_quote";
  }
  if (
    clean === "avatar_wall" ||
    clean === "avatar-wall" ||
    clean === "face_pile" ||
    clean === "avatars"
  ) {
    return "avatar_wall";
  }
  if (
    clean === "avatar_grid" ||
    clean === "avatar-grid" ||
    clean === "customer_grid" ||
    clean === "faces_grid"
  ) {
    return "avatar_grid";
  }
  if (
    clean === "rating_badge" ||
    clean === "rating-badge" ||
    clean === "rating"
  ) {
    return "rating_badge";
  }
  if (
    clean === "review_badge" ||
    clean === "review-badge" ||
    clean === "review_count" ||
    clean === "reviews_count"
  ) {
    return "review_badge";
  }
  if (
    clean === "floating_badge" ||
    clean === "floating-badge" ||
    clean === "floating"
  ) {
    return "floating_badge";
  }
  if (
    clean === "popup" ||
    clean === "modal" ||
    clean === "popup_testimonial" ||
    clean === "popup-testimonial"
  ) {
    return "popup";
  }
  if (
    clean === "notification" ||
    clean === "toast" ||
    clean === "floating_notification" ||
    clean === "floating-notification"
  ) {
    return "notification";
  }
  if (clean === "list") return "list";
  return "grid";
}

export function WidgetRenderer({
  type,
  testimonials = [],
  config = {},
  isLoading = false,
  emptyTitle,
  emptyMessage,
  className = "",
  onTestimonialClick,
}: WidgetRendererProps) {
  const normType = normalizeWidgetType(type);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = config.widgetId || config.slug;

  // Track verified widget impressions & viewable dwells
  useEffect(() => {
    if (!widgetId) return;
    trackWidgetImpression(config.workspaceId, widgetId);
    const unobserve = observeWidgetView(containerRef.current, config.workspaceId, widgetId);
    return () => {
      unobserve();
    };
  }, [widgetId, config.workspaceId]);

  // 1. Strict Privacy & Moderation Gate:
  // Only display testimonials that are explicitly approved (if status field is present)
  // and discard empty or corrupted records.
  const approvedTestimonials = useMemo(() => {
    return (testimonials || []).filter((t) => {
      if (!t || !t.id || !t.content) return false;
      if (t.status && t.status !== "APPROVED") return false;
      return true;
    });
  }, [testimonials]);

  // 2. Theme & Typography styling wrappers
  const theme = config.theme || "warm";
  const themeContainerClass = useMemo(() => {
    switch (theme) {
      case "dark":
        return "bg-zinc-950 text-white dark";
      case "light":
        return "bg-white text-zinc-900";
      case "transparent":
        return "bg-transparent text-inherit";
      case "warm":
      default:
        return "bg-[#FAF7F2] text-zinc-900";
    }
  }, [theme]);

  const typographyClass = useMemo(() => {
    const size =
      config.typographySize === "compact"
        ? "[&_blockquote]:text-xs"
        : config.typographySize === "large"
        ? "[&_blockquote]:text-base sm:[&_blockquote]:text-lg"
        : "";

    return size;
  }, [config.typographySize]);

  const customStyle = useMemo(() => {
    const style: React.CSSProperties = {
      fontFamily: getFontFamilyCss(config.typographyFamily),
    };
    if (config.backgroundColor) {
      style.backgroundColor = config.backgroundColor;
    }
    if (config.textColor) {
      style.color = config.textColor;
    }
    return style;
  }, [config.typographyFamily, config.backgroundColor, config.textColor]);

  // 3. Loading State
  if (isLoading) {
    return (
      <div
        style={customStyle}
        className={`w-full p-4 sm:p-6 transition-colors ${themeContainerClass} ${typographyClass} ${className}`}
      >
        <WidgetSkeleton type={normType} />
      </div>
    );
  }

  // 4. Empty State
  if (approvedTestimonials.length === 0) {
    return (
      <div
        style={customStyle}
        className={`w-full p-4 sm:p-6 transition-colors ${themeContainerClass} ${typographyClass} ${className}`}
      >
        <WidgetEmptyState title={emptyTitle} message={emptyMessage} />
      </div>
    );
  }

  // 5. Layout Dispatcher
  return (
    <div
      ref={containerRef}
      style={customStyle}
      className={`w-full p-4 sm:p-6 transition-colors ${themeContainerClass} ${typographyClass} ${className}`}
    >
      {normType === "grid" && (
        <WidgetGrid
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "masonry" && (
        <WidgetMasonry
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "carousel" && (
        <WidgetCarousel
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "slider" && (
        <WidgetSlider
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "video" && (
        <WidgetVideo
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "audio" && (
        <WidgetAudio
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "single_quote" && (
        <WidgetSingleQuote
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "list" && (
        <WidgetList
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "avatar_wall" && (
        <WidgetAvatarWall
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "avatar_grid" && (
        <WidgetAvatarGrid
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "rating_badge" && (
        <WidgetRatingBadge
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "review_badge" && (
        <WidgetReviewCountBadge
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "floating_badge" && (
        <WidgetFloatingBadge
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "popup" && (
        <WidgetPopup
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {normType === "notification" && (
        <WidgetNotification
          testimonials={approvedTestimonials}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      )}

      {/* Optional Widget CTA Button */}
      {config.ctaEnabled && (
        <div className="flex justify-center pt-4">
          <a
            href={config.ctaUrl || "#"}
            onClick={() => {
              if (widgetId) {
                trackWidgetCtaClick(config.workspaceId, widgetId, config.ctaLabel, config.ctaUrl);
              }
            }}
            target={config.ctaUrl?.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-2xs hover:shadow-md transition-all duration-200"
            style={{
              backgroundColor: config.primaryColor || config.accentColor || "#7049D8",
              color: "#ffffff",
            }}
          >
            <span>{config.ctaLabel || "Leave a Review"}</span>
          </a>
        </div>
      )}

      {/* Optional Praise Attribution (Fully removable when showPraiseBranding is false) */}
      {config.showPraiseBranding !== false && (
        <div className="flex justify-center pt-5">
          <a
            href="https://praise.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium opacity-60 hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              color: "inherit",
            }}
          >
            <span>Powered by</span>
            <span className="font-bold flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: config.primaryColor || config.accentColor || "#7049D8" }}
              />
              Praise
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
