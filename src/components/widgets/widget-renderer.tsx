"use client";

import { useMemo } from "react";
import { WidgetDisplayType } from "@/types/widgets";
import { WidgetRendererProps } from "./types";
import { WidgetGrid } from "./widget-grid";
import { WidgetCarousel } from "./widget-carousel";
import { WidgetSingleQuote } from "./widget-single-quote";
import { WidgetList } from "./widget-list";
import { WidgetSkeleton } from "./widget-skeletons";
import { WidgetEmptyState } from "./widget-empty-state";
import { getFontFamilyCss } from "@/lib/branding/utils";

export function normalizeWidgetType(type: string): WidgetDisplayType {
  const clean = (type || "").toLowerCase().trim();
  if (clean === "carousel") return "carousel";
  if (
    clean === "single_quote" ||
    clean === "single-quote" ||
    clean === "quote" ||
    clean === "quote_card" ||
    clean === "quote-card"
  ) {
    return "single_quote";
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

      {normType === "carousel" && (
        <WidgetCarousel
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

