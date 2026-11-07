import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-warm-50/50 p-8 text-center sm:p-12",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warm-100 text-ink-500 mb-4 border border-line/60">
        <Icon size={24} className="text-ink-600" />
      </div>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-ink-500 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

