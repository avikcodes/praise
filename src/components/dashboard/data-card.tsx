import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type DataCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
};

export function DataCard({
  title,
  value,
  description,
  icon: Icon,
  badge,
  trend,
  className,
}: DataCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-white p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between text-xs font-medium text-ink-500">
        <span>{title}</span>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warm-100 text-ink-600">
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900">
          {value}
        </span>
        {badge}
      </div>

      {(description || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
          {trend && (
            <span
              className={cn(
                "font-semibold",
                trend.isPositive ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {trend.value}
            </span>
          )}
          {description && <span>{description}</span>}
        </div>
      )}
    </div>
  );
}

