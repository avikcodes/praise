"use client";

import React from "react";
import { Heart, MessageSquareQuote, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AuthVisualVariant = "sign-in" | "sign-up" | "forgot-password";

interface AuthVisualPanelProps {
  variant?: AuthVisualVariant;
  className?: string;
}

/** 4-point sparkle vector glyph, styled in harmony with the Praise logo */
function SparkleStar({
  size = 24,
  className,
  color = "currentColor",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M12 2C12.3 7 17 11.7 22 12C17 12.3 12.3 17 12 22C11.7 17 7 12.3 2 12C7 11.7 11.7 7 12 2Z"
        fill={color}
      />
    </svg>
  );
}

/** Quotation marks icon geometry */
function QuoteMarks({
  size = 20,
  className,
  color = "#7049D8",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.324 1.433-4.483 3.42-4.483 5.42.383-.24.864-.378 1.385-.378 1.83 0 3.175 1.417 3.175 3.197 0 1.868-1.488 3.284-3.332 3.284-.81 0-1.577-.336-2.085-.923zm10.5 0C14.053 16.227 13.5 15 13.5 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.324 1.433-4.483 3.42-4.483 5.42.383-.24.864-.378 1.385-.378 1.83 0 3.175 1.417 3.175 3.197 0 1.868-1.488 3.284-3.332 3.284-.81 0-1.577-.336-2.085-.923z"
        fill={color}
      />
    </svg>
  );
}

export function AuthVisualPanel({
  variant = "sign-in",
  className,
}: AuthVisualPanelProps) {
  const content = {
    "sign-in": {
      concept: "A little love goes a long way.",
      badge: "Wall of Love",
      heading: "Every kind word deserves a place.",
      supporting:
        "Bring your customer stories together and turn genuine feedback into lasting trust.",
      mainQuote:
        "“Collecting genuine customer stories used to feel scattered. With Praise, every kind word has a beautiful, permanent home.”",
      mainAuthorRole: "Product Lead",
      secondaryQuote:
        "“Sharing authentic customer appreciation transformed how our entire team builds.”",
      secondaryAuthorRole: "Design Founder",
      pillText: "Verified Praise",
    },
    "sign-up": {
      concept: "A little love goes a long way.",
      badge: "Social Proof Engine",
      heading: "Good things are worth sharing.",
      supporting:
        "Build your own home for customer stories, appreciation and social proof.",
      mainQuote:
        "“Your happiest customers want to advocate for you. Make it joyful for them to share their voice.”",
      mainAuthorRole: "Community Director",
      secondaryQuote:
        "“The easiest way to turn spontaneous gratitude into an inspiring Wall of Love.”",
      secondaryAuthorRole: "Independent Creator",
      pillText: "Ready to Publish",
    },
    "forgot-password": {
      concept: "Peace of mind.",
      badge: "Account Recovery",
      heading: "We're here to help you get back.",
      supporting:
        "Your workspace and customer feedback are safe and ready whenever you return.",
      mainQuote:
        "“Your customer stories and testimonials are protected, securely stored, and waiting for you.”",
      mainAuthorRole: "Praise Security",
      secondaryQuote:
        "“Instant access restored with end-to-end cryptographic verification.”",
      secondaryAuthorRole: "Always Encrypted",
      pillText: "Safe & Protected",
    },
  }[variant];

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden flex flex-col justify-between p-8 sm:p-12 lg:p-14 xl:p-16",
        "bg-gradient-to-br from-[#FAF8FF] via-[#F4EFFE] to-[#E9DFFA]",
        className,
      )}
    >
      {/* Decorative ambient background glows */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-brand-200/50 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 -left-20 size-80 rounded-full bg-brand-300/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 right-1/4 size-80 rounded-full bg-brand-100/70 blur-2xl"
        aria-hidden="true"
      />

      {/* Subtle geometric dot grid pattern */}
      <svg
        className="pointer-events-none absolute inset-0 size-full opacity-[0.25]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="auth-grid-dots"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="#7049D8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-grid-dots)" />
      </svg>

      {/* TOP: Floating Concept Pill */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/90 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-2xs backdrop-blur-md">
          <Sparkles size={13} className="text-brand-500" />
          <span>{content.concept}</span>
        </div>

        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-purple-200/60 bg-white/60 px-3 py-1 text-[11px] font-medium text-ink-700 backdrop-blur-xs">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{content.badge}</span>
        </div>
      </div>

      {/* CENTER: Original Praise Illustration Composition (Layered Testimonial Cards & Wall of Love Representation) */}
      <div className="relative z-10 my-auto py-8">
        <div className="relative mx-auto max-w-lg">
          {/* Decorative Sparkle Accents */}
          <SparkleStar
            size={28}
            color="#7049D8"
            className="absolute -top-8 -left-4 text-brand-500 drop-shadow-xs animate-bounce [animation-duration:3s]"
          />
          <SparkleStar
            size={18}
            color="#B9A6F4"
            className="absolute top-2 -right-2 text-brand-300"
          />
          <SparkleStar
            size={22}
            color="#9579EA"
            className="absolute -bottom-6 right-8 text-brand-400"
          />

          {/* Floating Pill: Customer Appreciation Badge */}
          <div className="absolute -top-5 right-6 z-20 hidden sm:flex items-center gap-2 rounded-full border border-white/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-ink-900 shadow-md shadow-brand-500/10 backdrop-blur-md transition-transform hover:-translate-y-0.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Heart size={11} className="fill-brand-500 text-brand-500" />
            </span>
            <span className="font-semibold text-ink-900">Appreciation Captured</span>
          </div>

          {/* SECONDARY LAYERED CARD (Angled background card) */}
          <div className="relative -mb-16 ml-8 mr-2 rounded-2xl border border-white/70 bg-white/75 p-5 shadow-lg shadow-purple-950/5 backdrop-blur-md transition-all sm:mr-6 -rotate-2">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200/80">
                  <span>✦</span>
                </div>
                <div>
                  <div className="h-2.5 w-24 rounded-full bg-brand-200/80 mb-1" />
                  <p className="text-[11px] font-medium text-ink-500">
                    {content.secondaryAuthorRole}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-medium text-brand-700 bg-brand-50/80 px-2.5 py-0.5 rounded-full border border-brand-100/70">
                <CheckCircle2 size={12} className="text-brand-500" />
                <span>Verified</span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-ink-700 font-normal italic">
              {content.secondaryQuote}
            </p>
          </div>

          {/* PRIMARY SHOWCASE TESTIMONIAL CARD (Polished Wall of Love Hero Card) */}
          <div className="relative z-10 rounded-2xl border border-white/95 bg-white/95 p-6 sm:p-7 shadow-xl shadow-purple-950/10 backdrop-blur-lg">
            {/* Card Header */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-brand-500 to-brand-400 text-white shadow-sm font-semibold text-sm">
                  <QuoteMarks size={18} color="#FFFFFF" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-ink-900 tracking-tight">
                      Customer Story
                    </span>
                    <span className="flex size-1.5 rounded-full bg-brand-500" />
                  </div>
                  <p className="text-xs text-ink-500 font-medium">
                    {content.mainAuthorRole}
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/90 px-3 py-1 text-xs font-semibold text-brand-700">
                <MessageSquareQuote size={13} className="text-brand-600" />
                <span>{content.pillText}</span>
              </div>
            </div>

            {/* Testimonial Quote Body */}
            <p className="text-sm sm:text-base leading-relaxed text-ink-900 font-normal">
              {content.mainQuote}
            </p>

            {/* Card Footer: Interactive Elements & Proof Badges */}
            <div className="mt-5 pt-4 border-t border-line/80 flex items-center justify-between text-xs text-ink-500">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-medium text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100">
                  <Heart size={12} className="fill-brand-500 text-brand-500" />
                  <span>Wall of Love</span>
                </span>
                <span className="hidden sm:inline text-ink-400">&bull;</span>
                <span className="hidden sm:inline text-ink-500 font-medium">
                  Public Showcase
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-brand-600 font-medium">
                <span className="size-2 rounded-full bg-brand-500" />
                <span>Active</span>
              </div>
            </div>
          </div>

          {/* FLOATING SPEECH BUBBLE ACCENT (Bottom left) */}
          <div className="absolute -bottom-6 -left-3 z-20 flex items-center gap-2 rounded-xl border border-white/95 bg-white/95 px-3.5 py-2 text-xs font-medium text-ink-800 shadow-md shadow-brand-500/10 backdrop-blur-md">
            <span className="flex size-6 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <Sparkles size={13} className="text-brand-600" />
            </span>
            <span className="font-semibold text-ink-900 text-xs">
              Every story matters
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM: Typography Block (Short Heading & Supporting Text) */}
      <div className="relative z-10 pt-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-900 mb-2.5">
          {content.heading}
        </h2>
        <p className="text-sm sm:text-base leading-relaxed text-ink-700 max-w-lg">
          {content.supporting}
        </p>

        {/* Footer Brand Guarantee */}
        <div className="mt-6 pt-5 border-t border-brand-200/60 flex items-center gap-2 text-xs font-medium text-ink-500">
          <span>Open-source</span>
          <span>&bull;</span>
          <span>Self-hosted</span>
          <span>&bull;</span>
          <span>Privacy-first customer proof</span>
        </div>
      </div>
    </div>
  );
}
