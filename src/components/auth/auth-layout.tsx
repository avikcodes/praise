"use client";

import React from "react";
import Link from "next/link";
import { PraiseLogo } from "@/components/brand";
import { AuthVisualPanel, type AuthVisualVariant } from "./auth-visual-panel";
import { cn } from "@/lib/utils";

export interface AuthLayoutProps {
  children: React.ReactNode;
  visualVariant?: AuthVisualVariant;
  className?: string;
}

export function AuthLayout({
  children,
  visualVariant = "sign-in",
  className,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-warm-50 text-ink-900 flex overflow-x-hidden">
      {/* =========================================================================
          LEFT PANEL (~47% on desktop)
          Contains the Praise logo, authentication form, and subtle footer links.
          ========================================================================= */}
      <div className="flex flex-1 flex-col justify-between w-full lg:w-[47%] lg:min-h-screen px-6 py-8 sm:px-12 sm:py-12 lg:px-14 xl:px-20 z-10 bg-warm-50">
        {/* Top Header: Praise Logo */}
        <div className="w-full">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
            aria-label="Praise Home"
          >
            <PraiseLogo size="md" decorative />
          </Link>
        </div>

        {/* Form Container: Centered Vertically */}
        <div className="my-auto w-full max-w-[420px] mx-auto py-8 sm:py-10">
          <div className={cn("w-full", className)}>{children}</div>
        </div>

        {/* Bottom subtle legal & privacy footer */}
        <div className="w-full pt-4 text-center sm:text-left">
          <p className="text-xs text-ink-500 flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
            <span>Open-source customer proof engine</span>
            <span aria-hidden="true">&bull;</span>
            <Link
              href="/privacy"
              className="text-ink-600 hover:text-brand-600 underline-offset-4 hover:underline transition-colors"
            >
              Privacy Policy
            </Link>
            <span aria-hidden="true">&bull;</span>
            <Link
              href="/terms"
              className="text-ink-600 hover:text-brand-600 underline-offset-4 hover:underline transition-colors"
            >
              Terms of Service
            </Link>
          </p>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANEL (~53% on desktop)
          Visual Panel: Praise illustration, layered cards, Wall of Love art.
          Hidden on mobile/tablet to ensure spacious, comfortable form experience.
          ========================================================================= */}
      <div className="hidden lg:flex lg:w-[53%] lg:min-h-screen p-4 xl:p-6 sticky top-0 h-screen">
        <div className="w-full h-full rounded-3xl overflow-hidden shadow-sm border border-brand-200/40">
          <AuthVisualPanel variant={visualVariant} />
        </div>
      </div>
    </div>
  );
}
