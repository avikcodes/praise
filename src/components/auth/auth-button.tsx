"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuthButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "outline";
  icon?: React.ReactNode;
}

export function AuthButton({
  children,
  loading = false,
  loadingText,
  variant = "primary",
  icon,
  className,
  disabled,
  type = "submit",
  ...props
}: AuthButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold tracking-tight transition-all duration-150 shadow-2xs select-none",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-brand-500/10 hover:shadow-brand-500/20 hover:shadow-xs",
        variant === "secondary" &&
          "bg-warm-100 text-ink-900 hover:bg-warm-200 active:bg-warm-200/80 border border-line",
        variant === "outline" &&
          "bg-white text-ink-800 hover:bg-warm-50 border border-line hover:border-ink-400/40",
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin text-current" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {children}
          {icon && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
}
