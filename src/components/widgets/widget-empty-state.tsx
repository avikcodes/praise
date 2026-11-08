"use client";

import { MessageSquareQuote } from "lucide-react";

type WidgetEmptyStateProps = {
  title?: string;
  message?: string;
  className?: string;
};

export function WidgetEmptyState({
  title = "No Testimonials Published Yet",
  message = "Approved customer testimonials will appear here once verified.",
  className = "",
}: WidgetEmptyStateProps) {
  return (
    <div
      role="region"
      aria-label="No testimonials available"
      className={`rounded-2xl border border-dashed border-line dark:border-zinc-800 bg-warm-50/50 dark:bg-zinc-900/30 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="h-12 w-12 rounded-full bg-warm-100 dark:bg-zinc-800 flex items-center justify-center text-ink-400 dark:text-zinc-500">
        <MessageSquareQuote size={22} />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-semibold text-ink-900 dark:text-zinc-100">
          {title}
        </h4>
        <p className="text-xs text-ink-500 dark:text-zinc-400 leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}

