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

export function WidgetMasonrySkeleton({ className = "" }: SkeletonProps) {
  const cardHeights = [220, 310, 260, 340, 200, 280];
  return (
    <div
      aria-label="Loading testimonials masonry..."
      role="status"
      className={`columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5 animate-pulse ${className}`}
    >
      {cardHeights.map((h, i) => (
        <div
          key={i}
          style={{ height: `${h}px` }}
          className="break-inside-avoid w-full rounded-2xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 space-y-4 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-warm-200 dark:bg-zinc-800 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-24 rounded bg-warm-200 dark:bg-zinc-800" />
              <div className="h-2.5 w-32 rounded bg-warm-100 dark:bg-zinc-800/60" />
            </div>
          </div>
          <div className="space-y-2 flex-1 pt-3">
            <div className="h-3 w-full rounded bg-warm-200 dark:bg-zinc-800" />
            <div className="h-3 w-5/6 rounded bg-warm-200 dark:bg-zinc-800" />
            <div className="h-3 w-2/3 rounded bg-warm-100 dark:bg-zinc-800/60" />
          </div>
          <div className="h-2.5 w-20 rounded bg-warm-100 dark:bg-zinc-800 pt-2 border-t border-line/50 dark:border-zinc-800" />
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

export function WidgetSliderSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading testimonial slider..."
      role="status"
      className={`w-full max-w-4xl mx-auto space-y-4 animate-pulse ${className}`}
    >
      <div className="rounded-3xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-8 sm:p-10 space-y-6 shadow-md">
        <div className="flex items-center justify-between">
          <div className="h-8 w-8 rounded-lg bg-warm-200 dark:bg-zinc-800" />
          <div className="h-4 w-14 rounded bg-warm-200 dark:bg-zinc-800" />
        </div>

        <div className="space-y-3 pt-2">
          <div className="h-5 w-full rounded-lg bg-warm-200 dark:bg-zinc-800" />
          <div className="h-5 w-11/12 rounded-lg bg-warm-200 dark:bg-zinc-800" />
          <div className="h-5 w-3/4 rounded-lg bg-warm-100 dark:bg-zinc-800/60" />
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-line/70 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-warm-200 dark:bg-zinc-800" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-warm-200 dark:bg-zinc-800" />
              <div className="h-3 w-40 rounded bg-warm-100 dark:bg-zinc-800/60" />
            </div>
          </div>
          <div className="h-4 w-24 rounded bg-warm-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

export function WidgetVideoSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading video testimonials..."
      role="status"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse ${className}`}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-2xs"
        >
          {/* 16:9 Video Box */}
          <div className="w-full aspect-video bg-zinc-800 relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-zinc-700" />
          </div>
          {/* Card Body */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-warm-200 dark:bg-zinc-800 shrink-0" />
              <div className="space-y-1 flex-1">
                <div className="h-3 w-24 rounded bg-warm-200 dark:bg-zinc-800" />
                <div className="h-2.5 w-32 rounded bg-warm-100 dark:bg-zinc-800/60" />
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-3 w-full rounded bg-warm-200 dark:bg-zinc-800" />
              <div className="h-3 w-4/5 rounded bg-warm-100 dark:bg-zinc-800/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WidgetAudioSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading audio testimonials..."
      role="status"
      className={`grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse ${className}`}
    >
      {[1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 space-y-4 shadow-2xs"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warm-200 dark:bg-zinc-800 shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 rounded bg-warm-200 dark:bg-zinc-800" />
                <div className="h-2.5 w-36 rounded bg-warm-100 dark:bg-zinc-800/60" />
              </div>
            </div>
            <div className="h-3.5 w-16 rounded bg-warm-200 dark:bg-zinc-800" />
          </div>

          {/* Audio Player Bar Skeleton */}
          <div className="p-3 rounded-xl bg-warm-100 dark:bg-zinc-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warm-300 dark:bg-zinc-700 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2 w-full rounded bg-warm-300 dark:bg-zinc-700" />
              <div className="flex justify-between">
                <div className="h-2 w-8 rounded bg-warm-200 dark:bg-zinc-700/60" />
                <div className="h-2 w-8 rounded bg-warm-200 dark:bg-zinc-700/60" />
              </div>
            </div>
          </div>

          {/* Transcript text */}
          <div className="space-y-2 pt-1">
            <div className="h-3 w-full rounded bg-warm-200 dark:bg-zinc-800" />
            <div className="h-3 w-5/6 rounded bg-warm-100 dark:bg-zinc-800/60" />
          </div>
        </div>
      ))}
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
      <div className="h-10 w-12 rounded-lg bg-warm-200 dark:bg-zinc-800" />

      <div className="space-y-3.5">
        <div className="h-6 w-full rounded-lg bg-warm-200 dark:bg-zinc-800" />
        <div className="h-6 w-11/12 rounded-lg bg-warm-200 dark:bg-zinc-800" />
        <div className="h-6 w-4/5 rounded-lg bg-warm-100 dark:bg-zinc-800/60" />
      </div>

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
          <div className="md:w-56 shrink-0 flex items-center md:items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-warm-200 dark:bg-zinc-800 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-28 rounded bg-warm-200 dark:bg-zinc-800" />
              <div className="h-2.5 w-36 rounded bg-warm-100 dark:bg-zinc-800/60" />
              <div className="h-3 w-16 rounded bg-warm-200 dark:bg-zinc-800 pt-1" />
            </div>
          </div>

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

export function WidgetAvatarWallSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading customer avatar wall..."
      role="status"
      className={`w-full max-w-xl mx-auto p-4 flex flex-col items-center gap-4 animate-pulse ${className}`}
    >
      <div className="flex -space-x-3 overflow-hidden py-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-12 w-12 rounded-full ring-2 ring-white dark:ring-zinc-900 bg-warm-200 dark:bg-zinc-800 shrink-0"
          />
        ))}
      </div>
      <div className="h-4 w-48 rounded bg-warm-200 dark:bg-zinc-800" />
      <div className="h-3 w-32 rounded bg-warm-100 dark:bg-zinc-800/60" />
    </div>
  );
}

export function WidgetAvatarGridSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading avatar grid..."
      role="status"
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-pulse ${className}`}
    >
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 flex flex-col items-center space-y-3"
        >
          <div className="h-11 w-11 rounded-full bg-warm-200 dark:bg-zinc-800" />
          <div className="h-3 w-20 rounded bg-warm-200 dark:bg-zinc-800" />
          <div className="h-2 w-16 rounded bg-warm-100 dark:bg-zinc-800/60" />
          <div className="h-2 w-full rounded bg-warm-100 dark:bg-zinc-800/60 mt-1" />
        </div>
      ))}
    </div>
  );
}

export function WidgetBadgeSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading badge..."
      role="status"
      className={`inline-flex items-center gap-3 px-4 py-2 rounded-full border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 animate-pulse ${className}`}
    >
      <div className="h-4 w-12 rounded bg-warm-200 dark:bg-zinc-800" />
      <div className="h-3.5 w-16 rounded bg-warm-100 dark:bg-zinc-800/60" />
    </div>
  );
}

export function WidgetPopupSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading popup testimonial..."
      role="status"
      className={`w-full max-w-md mx-auto rounded-2xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 space-y-4 animate-pulse ${className}`}
    >
      <div className="h-8 w-8 rounded-full bg-warm-200 dark:bg-zinc-800" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-warm-200 dark:bg-zinc-800" />
        <div className="h-4 w-4/5 rounded bg-warm-200 dark:bg-zinc-800" />
      </div>
      <div className="flex items-center gap-3 pt-3 border-t border-line/60 dark:border-zinc-800/60">
        <div className="h-9 w-9 rounded-full bg-warm-200 dark:bg-zinc-800" />
        <div className="space-y-1">
          <div className="h-3 w-24 rounded bg-warm-200 dark:bg-zinc-800" />
          <div className="h-2 w-16 rounded bg-warm-100 dark:bg-zinc-800/60" />
        </div>
      </div>
    </div>
  );
}

export function WidgetNotificationSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-label="Loading notification..."
      role="status"
      className={`w-80 rounded-xl border border-line dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 space-y-2 animate-pulse ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full bg-warm-200 dark:bg-zinc-800 shrink-0" />
        <div className="space-y-1 flex-1">
          <div className="h-3 w-20 rounded bg-warm-200 dark:bg-zinc-800" />
          <div className="h-2 w-28 rounded bg-warm-100 dark:bg-zinc-800/60" />
        </div>
      </div>
      <div className="h-2.5 w-full rounded bg-warm-100 dark:bg-zinc-800/60 mt-1" />
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
  if (normType === "masonry") return <WidgetMasonrySkeleton className={className} />;
  if (normType === "slider") return <WidgetSliderSkeleton className={className} />;
  if (normType === "video" || normType === "video_grid") return <WidgetVideoSkeleton className={className} />;
  if (normType === "audio" || normType === "voice") return <WidgetAudioSkeleton className={className} />;
  if (normType === "avatar_wall" || normType === "face_pile" || normType === "avatar-wall") {
    return <WidgetAvatarWallSkeleton className={className} />;
  }
  if (normType === "avatar_grid" || normType === "avatar-grid" || normType === "customer_grid") {
    return <WidgetAvatarGridSkeleton className={className} />;
  }
  if (normType === "rating_badge" || normType === "rating-badge" || normType === "review_badge" || normType === "review-badge") {
    return <WidgetBadgeSkeleton className={className} />;
  }
  if (normType === "floating_badge" || normType === "floating-badge") {
    return <WidgetBadgeSkeleton className={className} />;
  }
  if (normType === "popup" || normType === "modal") {
    return <WidgetPopupSkeleton className={className} />;
  }
  if (normType === "notification" || normType === "toast") {
    return <WidgetNotificationSkeleton className={className} />;
  }
  if (normType === "single_quote" || normType === "quote_card" || normType === "quote") {
    return <WidgetSingleQuoteSkeleton className={className} />;
  }
  if (normType === "list") return <WidgetListSkeleton className={className} />;
  return <WidgetGridSkeleton className={className} />;
}
