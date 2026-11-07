import React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "approved"
  | "pending"
  | "rejected"
  | "archived"
  | "active"
  | "draft"
  | "default";

type StatusPillProps = {
  status: string;
  variant?: StatusVariant;
  className?: string;
};

export function StatusPill({ status, variant, className }: StatusPillProps) {
  const normalized = (variant || status.toLowerCase()) as StatusVariant;

  const styles: Record<StatusVariant, string> = {
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    archived: "bg-warm-100 text-ink-600 border-line",
    draft: "bg-warm-100 text-ink-600 border-line",
    default: "bg-brand-50 text-brand-700 border-brand-200",
  };

  const dots: Record<StatusVariant, string> = {
    approved: "bg-emerald-500",
    active: "bg-emerald-500",
    pending: "bg-amber-500",
    rejected: "bg-rose-500",
    archived: "bg-ink-400",
    draft: "bg-ink-400",
    default: "bg-brand-500",
  };

  const style = styles[normalized] || styles.default;
  const dot = dots[normalized] || dots.default;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        style,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
      <span>{status}</span>
    </span>
  );
}

