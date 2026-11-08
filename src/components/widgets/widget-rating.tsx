"use client";

import { Star } from "lucide-react";

type WidgetRatingProps = {
  rating: number;
  maxStars?: number;
  size?: "xs" | "sm" | "md";
  showNumber?: boolean;
  accentColor?: string;
  className?: string;
};

export function WidgetRating({
  rating,
  maxStars = 5,
  size = "sm",
  showNumber = false,
  accentColor = "#F59E0B",
  className = "",
}: WidgetRatingProps) {
  const clampedRating = Math.max(0, Math.min(maxStars, Math.round(rating)));

  const iconSizes = {
    xs: 11,
    sm: 13,
    md: 16,
  }[size];

  return (
    <div
      role="img"
      aria-label={`Rated ${clampedRating} out of ${maxStars} stars`}
      className={`inline-flex items-center gap-1 ${className}`}
    >
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: maxStars }).map((_, idx) => {
          const isFilled = idx < clampedRating;
          return (
            <Star
              key={idx}
              size={iconSizes}
              style={{
                color: isFilled ? accentColor : "currentColor",
              }}
              className={
                isFilled
                  ? "fill-current"
                  : "text-ink-200 dark:text-zinc-700 fill-transparent"
              }
              aria-hidden="true"
            />
          );
        })}
      </div>
      {showNumber && (
        <span className="text-[11px] font-bold text-ink-700 dark:text-zinc-300 ml-0.5">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

