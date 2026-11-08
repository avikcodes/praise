"use client";

import { WidgetDisplayType } from "@/types/widgets";

type SkeletonProps = {
  className?: string;
};

export function WidgetGridSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading testimonials grid..."
      role="status"
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse ${className}`}
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 space-y-4 shadow-2xs"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-warm-200 dark:bg-zinc-800 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-24 rounded bg-warm-200 dark:bg-zinc-800" />
              <div className="h-2.5 w-32 rounded bg-warm-100 dark:bg-zinc-800/60" />
            </div>
            <div className="h-3 w-16 rounded bg-warm-200 dark:bg-zinc-800" />
          </div>

          {/* Quote Body */}
          <div className="space-y-2 pt-1">
            <div className="h-3 w-full rounded bg-warm-200 dark:bg-zinc-800" />
            <div className="h-3 w-5/6 rounded bg-warm-200 dark:bg-zinc-800" />
            <div className="h-3 w-4/6 rounded bg-warm-100 dark:bg-zinc-800/60" />
          </div>

          {/* Optional Media placeholder on alternate cards */}
          {i % 2 === 0 && (
            <div className="h-36 w-full rounded-xl bg-warm-200 dark:bg-zinc-800" />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-line/50 dark:border-zinc-800/50">
            <div className="h-2.5 w-16 rounded bg-warm-100 dark:bg-zinc-800" />
            <div className="h-2.5 w-12 rounded bg-warm-100 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WidgetCarouselSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading testimonials carousel..."
      role="status"
      className={`relative w-full max-w-4xl mx-auto space-y-4 animate-pulse ${className}`}
    >
      {/* Slider Viewport with Centered Card */}
      <div className="rounded-2xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 sm:p-8 space-y-5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-warm-200 dark:bg-zinc-800" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 rounded bg-warm-200 dark:bg-zinc-800" />
              <div className="h-3 w-40 rounded bg-warm-100 dark:bg-zinc-800/60" />
            </div>
          </div>
          <div className="h-4 w-20 rounded bg-warm-200 dark:bg-zinc-800" />
        </div>

        <div className="space-y-2.5 pt-2">
          <div className="h-4 w-full rounded bg-warm-200 dark:bg-zinc-800" />
          <div className="h-4 w-11/12 rounded bg-warm-200 dark:bg-zinc-800" />
          <div className="h-4 w-4/5 rounded bg-warm-100 dark:bg-zinc-800/60" />
        </div>

        <div className="h-48 w-full rounded-xl bg-warm-200 dark:bg-zinc-800" />
      </div>

      {/* Nav Controls */}
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="h-8 w-8 rounded-full bg-warm-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((d) => (
            <div key={d} className="h-2 w-2 rounded-full bg-warm-200 dark:bg-zinc-800" />
          ))}
        </div>
        <div className="h-8 w-8 rounded-full bg-warm-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export function WidgetSingleQuoteSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading featured quote..."
      role="status"
      className={`w-full max-w-4xl mx-auto rounded-3xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-8 sm:p-12 space-y-8 animate-pulse shadow-sm ${className}`}
    >
      {/* Decorative Quote Mark Skeleton */}
      <div className="h-10 w-12 rounded-lg bg-warm-200 dark:bg-zinc-800" />

      {/* Large Editorial Quote Lines */}
      <div className="space-y-3.5">
        <div className="h-6 w-full rounded-lg bg-warm-200 dark:bg-zinc-800" />
        <div className="h-6 w-11/12 rounded-lg bg-warm-200 dark:bg-zinc-800" />
        <div className="h-6 w-4/5 rounded-lg bg-warm-100 dark:bg-zinc-800/60" />
      </div>

      {/* Author and Rating Spotlight */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-line/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-warm-200 dark:bg-zinc-800 shrink-0" />
          <div className="space-y-2">
            <div className="h-4 w-36 rounded bg-warm-200 dark:bg-zinc-800" />
            <div className="h-3 w-48 rounded bg-warm-100 dark:bg-zinc-800/60" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-4 w-24 rounded bg-warm-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

export function WidgetListSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading testimonials list..."
      role="status"
      className={`w-full max-w-4xl mx-auto space-y-4 animate-pulse ${className}`}
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 flex flex-col md:flex-row gap-5 shadow-2xs"
        >
          {/* Left Metadata */}
          <div className="md:w-56 shrink-0 flex items-center md:items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-warm-200 dark:bg-zinc-800 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-28 rounded bg-warm-200 dark:bg-zinc-800" />
              <div className="h-2.5 w-36 rounded bg-warm-100 dark:bg-zinc-800/60" />
              <div className="h-3 w-16 rounded bg-warm-200 dark:bg-zinc-800 pt-1" />
            </div>
          </div>

          {/* Right Quote Content */}
          <div className="flex-1 space-y-2 md:border-l md:border-line md:dark:border-zinc-800 md:pl-5">
            <div className="h-3.5 w-full rounded bg-warm-200 dark:bg-zinc-800" />
            <div className="h-3.5 w-5/6 rounded bg-warm-200 dark:bg-zinc-800" />
            <div className="h-3.5 w-3/4 rounded bg-warm-100 dark:bg-zinc-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WidgetSkeleton({
  type = "grid",
  className = "",
}: {
  type?: WidgetDisplayType | string;
  className?: string;
}) {
  const normType = (type || "").toLowerCase().trim();
  if (normType === "carousel") return <WidgetCarouselSkeleton className={className} />;
  if (normType === "single_quote" || normType === "quote_card" || normType === "quote") {
    return <WidgetSingleQuoteSkeleton className={className} />;
  }
  if (normType === "list") return <WidgetListSkeleton className={className} />;
  return <WidgetGridSkeleton className={className} />;
}

