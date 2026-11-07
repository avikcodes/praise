import { CheckCircle2, CircleDashed, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeatureStatus = "available" | "in-development" | "planned";

type StatusBadgeProps = {
  status: FeatureStatus;
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  if (status === "available") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800",
          className,
        )}
      >
        <CheckCircle2 size={12} className="text-emerald-600" aria-hidden="true" />
        {label ?? "Available"}
      </span>
    );
  }

  if (status === "in-development") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800",
          className,
        )}
      >
        <Clock size={12} className="text-amber-600" aria-hidden="true" />
        {label ?? "In development"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-dashed border-brand-300 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700",
        className,
      )}
    >
      <CircleDashed size={12} className="text-brand-500" aria-hidden="true" />
      {label ?? "Planned"}
    </span>
  );
}

