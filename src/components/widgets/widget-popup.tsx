"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Quote, Sparkles, Star, X } from "lucide-react";
import { PublicTestimonialCard } from "@/types/widgets";
import { WidgetPublicConfig } from "./types";
import { WidgetAvatar } from "./widget-avatar";
import { WidgetRating } from "./widget-rating";
import {
  getCardBorderClasses,
  getCardRadiusClasses,
} from "@/lib/branding/utils";

type WidgetPopupProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

export function WidgetPopup({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetPopupProps) {
  const {
    slug = "default",
    displayDelay = 3000,
    sessionFrequencyLimit = 1,
    hideOnMobile = false,
    showRatings = true,
    showCompany = true,
    showDate = true,
    showFeaturedBadge = true,
    accentColor = "#7049D8",
    primaryColor,
    cardBorder,
    cardRadius,
    theme,
  } = config;

  const brandColor = primaryColor || accentColor || "#7049D8";
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissedSession, setHasDismissedSession] = useState(false);
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const storageKey = `praise_popup_dismissed_${slug}`;

  // Check sessionStorage on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const isDismissed = sessionStorage.getItem(storageKey);
      if (isDismissed) {
        setHasDismissedSession(true);
        return;
      }

      // Schedule popup opening after displayDelay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, Math.max(500, displayDelay));

      return () => clearTimeout(timer);
    } catch {
      // Ignore storage errors in restricted iframe environments
    }
  }, [storageKey, displayDelay]);

  // Pick the best testimonial: featured first, then highest rating
  const selectedTestimonial = useMemo(() => {
    if (!testimonials || testimonials.length === 0) return null;
    const featured = testimonials.find((t) => t.isFeatured);
    if (featured) return featured;
    return testimonials[0];
  }, [testimonials]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(storageKey, "true");
      }
    } catch {
      // storage unavailable
    }
  };

  if (!isOpen || hasDismissedSession || !selectedTestimonial) {
    return null;
  }

  const borderClass = getCardBorderClasses(cardBorder, theme === "dark");
  const radiusClass = getCardRadiusClasses(cardRadius);
  const isDark = theme === "dark";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-customer-name"
      aria-describedby="popup-testimonial-content"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ${
        hideOnMobile ? "hidden sm:flex" : ""
      } ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`relative w-full max-w-lg p-6 sm:p-8 shadow-2xl transition-all duration-300 motion-safe:animate-in motion-safe:zoom-in-95 ${borderClass} ${radiusClass} ${
          isDark
            ? "bg-zinc-900 border-zinc-800 text-zinc-100"
            : "bg-white border-line text-zinc-900"
        }`}
        style={{
          borderTop: `4px solid ${brandColor}`,
        }}
      >
        {/* Close "X" Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close testimonial popup"
          className="absolute top-4 right-4 p-2 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Decorative Quote Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${brandColor}15`, color: brandColor }}
        >
          <Quote size={20} className="fill-current opacity-80" />
        </div>

        {/* Testimonial Quote */}
        <blockquote
          id="popup-testimonial-content"
          className="text-base sm:text-lg font-medium leading-relaxed italic opacity-95 mb-6"
        >
          &ldquo;{selectedTestimonial.content}&rdquo;
        </blockquote>

        {/* Customer Profile & Verification */}
        <div className="flex items-center justify-between pt-4 border-t border-line/60 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <WidgetAvatar
              name={selectedTestimonial.customer.name}
              avatarUrl={selectedTestimonial.customer.avatarUrl}
              size="md"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span id="popup-customer-name" className="font-bold text-sm">
                  {selectedTestimonial.customer.name}
                </span>
                <span
                  title="Verified Customer"
                  className="text-emerald-500 inline-flex items-center"
                >
                  <CheckCircle2 size={14} />
                </span>
                {showFeaturedBadge && selectedTestimonial.isFeatured && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${brandColor}20`,
                      color: brandColor,
                    }}
                  >
                    <Sparkles size={9} />
                    Featured
                  </span>
                )}
              </div>
              {showCompany &&
                (selectedTestimonial.customer.company || selectedTestimonial.customer.title) && (
                  <p className="text-xs opacity-70">
                    {selectedTestimonial.customer.title && selectedTestimonial.customer.company
                      ? `${selectedTestimonial.customer.title}, ${selectedTestimonial.customer.company}`
                      : selectedTestimonial.customer.company || selectedTestimonial.customer.title}
                  </p>
                )}
            </div>
          </div>

          {/* Star Rating */}
          {showRatings && selectedTestimonial.rating && selectedTestimonial.rating > 0 && (
            <WidgetRating
              rating={selectedTestimonial.rating}
              size="sm"
              accentColor={brandColor}
            />
          )}
        </div>

        {/* Bottom Dismiss / Opt-out footer */}
        <div className="flex items-center justify-between pt-4 mt-2 text-[11px] opacity-60">
          <button
            type="button"
            onClick={handleDismiss}
            className="hover:underline hover:opacity-100"
          >
            Don&apos;t show again this session
          </button>
          {showDate && selectedTestimonial.submittedAt && (
            <span>
              {new Date(selectedTestimonial.submittedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
