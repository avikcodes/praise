"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface AuthInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      label,
      id,
      name,
      type = "text",
      error,
      helperText,
      icon,
      rightElement,
      className,
      required,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id || name || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-ink-900 tracking-tight"
          >
            {label}
            {required && <span className="ml-1 text-brand-500">*</span>}
          </label>
        </div>

        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-400">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            name={name || inputId}
            type={type}
            required={required}
            disabled={disabled}
            className={cn(
              "w-full h-11 rounded-xl border bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-400 shadow-2xs transition-all duration-150",
              "border-line hover:border-ink-400/40",
              "focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15",
              "disabled:cursor-not-allowed disabled:bg-warm-100 disabled:opacity-60",
              icon ? "pl-10" : undefined,
              rightElement ? "pr-11" : undefined,
              error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15" : undefined,
              className,
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              {rightElement}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs font-medium text-rose-600 animate-in fade-in-50 duration-150">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-ink-500">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

AuthInput.displayName = "AuthInput";
