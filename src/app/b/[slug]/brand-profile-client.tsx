"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  Heart,
  MessageSquareQuote,
  Share2,
  Sparkles,
  Star,
  Quote,
} from "lucide-react";
import { PraiseLogo } from "@/components/brand";
import { TestimonialMedia } from "@/components/ui/testimonial-media";
import type { PublicBrandProfileData, BrandTheme } from "@/types/brands";

interface BrandProfileClientProps {
  data: PublicBrandProfileData;
  previewMode?: boolean;
}

const THEME_STYLES: Record<
  BrandTheme,
  {
    pageBg: string;
    cardBg: string;
    cardBorder: string;
    cardShadow: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accentBg: string;
    accentText: string;
    heroCardBg: string;
    headerBorder: string;
  }
> = {
  WARM: {
    pageBg: "bg-[#FAF7F2]",
    cardBg: "bg-[#FFFDF9]",
    cardBorder: "border-[#E8E2D7]",
    cardShadow: "shadow-[0_4px_20px_-4px_rgba(112,73,216,0.06)]",
    textPrimary: "text-[#2B241D]",
    textSecondary: "text-[#5C5248]",
    textMuted: "text-[#8C8073]",
    accentBg: "bg-[#7049D8]",
    accentText: "text-[#7049D8]",
    heroCardBg: "bg-[#F3EFE6] border-[#E2DBD0]",
    headerBorder: "border-[#E8E2D7]",
  },
  LIGHT: {
    pageBg: "bg-slate-50",
    cardBg: "bg-white",
    cardBorder: "border-slate-200",
    cardShadow: "shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]",
    textPrimary: "text-slate-900",
    textSecondary: "text-slate-600",
    textMuted: "text-slate-400",
    accentBg: "bg-brand-500",
    accentText: "text-brand-600",
    heroCardBg: "bg-white border-slate-200",
    headerBorder: "border-slate-200",
  },
  DARK: {
    pageBg: "bg-[#0F172A]",
    cardBg: "bg-[#1E293B]",
    cardBorder: "border-slate-800",
    cardShadow: "shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]",
    textPrimary: "text-slate-100",
    textSecondary: "text-slate-300",
    textMuted: "text-slate-400",
    accentBg: "bg-indigo-600",
    accentText: "text-indigo-400",
    heroCardBg: "bg-[#162032] border-slate-800",
    headerBorder: "border-slate-800",
  },
  MIDNIGHT: {
    pageBg: "bg-[#090D16]",
    cardBg: "bg-[#0E1526]",
    cardBorder: "border-[#1D2845]",
    cardShadow: "shadow-[0_4px_24px_-4px_rgba(79,70,229,0.15)]",
    textPrimary: "text-indigo-50",
    textSecondary: "text-indigo-200",
    textMuted: "text-indigo-400",
    accentBg: "bg-indigo-500",
    accentText: "text-indigo-300",
    heroCardBg: "bg-[#131C33] border-[#1D2845]",
    headerBorder: "border-[#1D2845]",
  },
  EMERALD: {
    pageBg: "bg-[#F2F7F4]",
    cardBg: "bg-[#FFFFFF]",
    cardBorder: "border-[#D1E3D9]",
    cardShadow: "shadow-[0_4px_20px_-4px_rgba(5,150,105,0.06)]",
    textPrimary: "text-[#132D20]",
    textSecondary: "text-[#2E5440]",
    textMuted: "text-[#628572]",
    accentBg: "bg-emerald-600",
    accentText: "text-emerald-700",
    heroCardBg: "bg-[#E6F0EB] border-[#D1E3D9]",
    headerBorder: "border-[#D1E3D9]",
  },
  SUNSET: {
    pageBg: "bg-[#FFF7F2]",
    cardBg: "bg-[#FFFFFF]",
    cardBorder: "border-[#FAD9C8]",
    cardShadow: "shadow-[0_4px_20px_-4px_rgba(234,88,12,0.06)]",
    textPrimary: "text-[#3D1A0D]",
    textSecondary: "text-[#693926]",
    textMuted: "text-[#9E6E59]",
    accentBg: "bg-orange-600",
    accentText: "text-orange-700",
    heroCardBg: "bg-[#FCECE4] border-[#FAD9C8]",
    headerBorder: "border-[#FAD9C8]",
  },
  MINIMAL: {
    pageBg: "bg-white",
    cardBg: "bg-white",
    cardBorder: "border-black",
    cardShadow: "shadow-none",
    textPrimary: "text-black",
    textSecondary: "text-neutral-700",
    textMuted: "text-neutral-500",
    accentBg: "bg-black",
    accentText: "text-black",
    heroCardBg: "bg-white border-black",
    headerBorder: "border-black",
  },
};

export function BrandProfileClient({ data, previewMode = false }: BrandProfileClientProps) {
  const theme = THEME_STYLES[data.theme] || THEME_STYLES.WARM;
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(data.canonicalUrl || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`min-h-screen ${theme.pageBg} font-sans selection:bg-brand-500 selection:text-white transition-colors duration-200`}>
      {/* Top Banner if in Preview Mode */}
      {previewMode && (
        <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 text-center text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-sm">
          <Sparkles size={14} />
          <span>Preview Mode — This brand profile is currently in draft and visible only to workspace members.</span>
        </div>
      )}

      {/* Main Header / Hero Section */}
      <header className={`border-b ${theme.headerBorder} relative overflow-hidden`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-start gap-6">
              {/* Brand Logo */}
              <div className="shrink-0">
                {data.logoUrl ? (
                  <img
                    src={data.logoUrl}
                    alt={data.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-black/5 shadow-md bg-white p-1"
                  />
                ) : (
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold shadow-md"
                    style={{ backgroundColor: data.accentColor || "#7049D8" }}
                  >
                    {data.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Brand Info */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${theme.textPrimary}`}>
                    {data.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 text-xs font-bold border border-emerald-500/20">
                    <CheckCircle2 size={12} />
                    <span>Verified Brand</span>
                  </span>
                </div>

                {data.tagline && (
                  <p className={`text-base sm:text-lg font-semibold ${theme.textSecondary}`}>
                    {data.tagline}
                  </p>
                )}

                {data.description && (
                  <p className={`text-sm sm:text-base max-w-2xl leading-relaxed ${theme.textMuted}`}>
                    {data.description}
                  </p>
                )}

                {/* Social & Website Links */}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  {data.websiteUrl && (
                    <a
                      href={data.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 text-xs font-bold hover:underline ${theme.accentText}`}
                    >
                      <Globe size={13} />
                      <span>{data.websiteUrl.replace(/^[a-z]+:\/\//, "").replace(/\/$/, "")}</span>
                      <ExternalLink size={11} />
                    </a>
                  )}

                  {Object.entries(data.socialLinks || {}).map(([network, url]) => {
                    if (!url) return null;
                    return (
                      <a
                        key={network}
                        href={url.startsWith("http") ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs font-semibold hover:underline capitalize ${theme.textMuted}`}
                      >
                        {network}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CTAs & Share */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              {data.ctaEnabled && data.ctaUrl && (
                <a
                  href={data.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm hover:opacity-95 transition-opacity text-center"
                  style={{ backgroundColor: data.accentColor || "#7049D8" }}
                >
                  <span>{data.ctaLabel || "Visit Website"}</span>
                  <ArrowRight size={14} />
                </a>
              )}

              {data.ctaSecondaryEnabled && data.ctaSecondaryUrl && (
                <a
                  href={data.ctaSecondaryUrl}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border ${theme.cardBorder} ${theme.cardBg} px-5 py-3 text-sm font-bold ${theme.textPrimary} shadow-2xs hover:bg-black/5 transition-colors text-center`}
                >
                  <MessageSquareQuote size={14} className={theme.accentText} />
                  <span>{data.ctaSecondaryLabel || "Share Praise"}</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleShare}
                className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg border border-transparent hover:border-black/10 ${theme.textMuted} transition-colors`}
              >
                <Share2 size={13} />
                <span>{copied ? "Link Copied!" : "Share Profile"}</span>
              </button>
            </div>
          </div>

          {/* Social Proof Stats Bar */}
          <div className={`mt-10 grid grid-cols-3 gap-4 p-4 rounded-2xl border ${theme.heroCardBg}`}>
            <div className="text-center sm:text-left sm:pl-4">
              <div className={`text-2xl sm:text-3xl font-extrabold ${theme.textPrimary}`}>
                {data.stats.totalApprovedTestimonials}
              </div>
              <div className={`text-xs font-semibold ${theme.textMuted}`}>
                Verified Reviews
              </div>
            </div>

            <div className="text-center border-x border-black/5">
              <div className="flex items-center justify-center gap-1.5">
                <span className={`text-2xl sm:text-3xl font-extrabold ${theme.textPrimary}`}>
                  {data.stats.averageRating}
                </span>
                <Star size={18} className="fill-amber-400 text-amber-400" />
              </div>
              <div className={`text-xs font-semibold ${theme.textMuted}`}>
                Average Rating
              </div>
            </div>

            <div className="text-center sm:text-right sm:pr-4">
              <div className={`text-2xl sm:text-3xl font-extrabold ${theme.textPrimary}`}>
                {data.stats.totalWalls}
              </div>
              <div className={`text-xs font-semibold ${theme.textMuted}`}>
                Published Walls
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        {/* Section 1: Curated Walls of Love */}
        {data.walls && data.walls.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textPrimary}`}>
                  Showcase Walls of Love
                </h2>
                <p className={`text-xs sm:text-sm ${theme.textMuted}`}>
                  Explore dedicated social proof galleries and customer feedback collections.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.walls.map((wall) => (
                <Link
                  key={wall.id}
                  href={wall.publicUrl}
                  className={`group rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-5 ${theme.cardShadow} hover:scale-[1.01] transition-all flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600">
                        {wall.layout}
                      </span>
                      <Heart size={14} className="text-rose-500 fill-rose-500/20" />
                    </div>

                    <h3 className={`text-lg font-bold ${theme.textPrimary} group-hover:${theme.accentText} transition-colors`}>
                      {wall.name}
                    </h3>

                    {wall.description && (
                      <p className={`text-xs line-clamp-2 ${theme.textSecondary}`}>
                        {wall.description}
                      </p>
                    )}
                  </div>

                  <div className={`pt-4 mt-4 border-t ${theme.cardBorder} flex items-center justify-between text-xs font-bold ${theme.accentText}`}>
                    <span>View Wall of Love</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Section 2: Featured Testimonials */}
        <section className="space-y-6">
          <div>
            <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${theme.textPrimary}`}>
              Featured Customer Stories
            </h2>
            <p className={`text-xs sm:text-sm ${theme.textMuted}`}>
              Authentic feedback and experiences shared by verified customers.
            </p>
          </div>

          {data.featuredTestimonials.length === 0 ? (
            <div className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-12 text-center space-y-3`}>
              <MessageSquareQuote size={36} className={`mx-auto ${theme.textMuted}`} />
              <p className={`text-sm font-semibold ${theme.textSecondary}`}>
                No approved testimonials yet for this brand.
              </p>
              {data.ctaSecondaryUrl && (
                <a
                  href={data.ctaSecondaryUrl}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold ${theme.accentText} hover:underline`}
                >
                  <span>Leave the first review</span>
                  <ArrowRight size={12} />
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.featuredTestimonials.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-2xl border ${theme.cardBorder} ${theme.cardBg} p-6 ${theme.cardShadow} flex flex-col justify-between space-y-4 relative`}
                >
                  <div className="space-y-3">
                    {/* Rating stars & verified review badge */}
                    <div className="flex items-center justify-between">
                      {t.rating ? (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={
                                i < (t.rating || 5)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300"
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <span />
                      )}

                      {t.isFeatured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 text-brand-600 px-2 py-0.5 text-[10px] font-bold">
                          <Sparkles size={10} />
                          <span>Featured</span>
                        </span>
                      )}
                    </div>

                    {/* Media playback if video/audio */}
                    {t.media && t.media.length > 0 && (
                      <div className="rounded-xl overflow-hidden">
                        <TestimonialMedia
                          media={{
                            id: t.media[0].id,
                            type: t.media[0].type,
                            url: t.media[0].url,
                            mimeType: t.media[0].mimeType,
                          }}
                        />
                      </div>
                    )}

                    {/* Quote content */}
                    <div className="relative">
                      <Quote size={20} className={`absolute -top-1 -left-1 opacity-10 ${theme.textPrimary}`} />
                      <p className={`text-sm sm:text-base leading-relaxed ${theme.textPrimary} relative z-10 pl-2`}>
                        "{t.content}"
                      </p>
                    </div>

                    {/* Tags */}
                    {t.tags && t.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {t.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-neutral-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer author footer */}
                  <div className={`pt-4 border-t ${theme.cardBorder} flex items-center gap-3`}>
                    {t.customer.avatarUrl ? (
                      <img
                        src={t.customer.avatarUrl}
                        alt={t.customer.name}
                        className="w-10 h-10 rounded-full object-cover border border-black/10"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                        style={{ backgroundColor: data.accentColor || "#7049D8" }}
                      >
                        {t.customer.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${theme.textPrimary}`}>
                        {t.customer.name}
                      </div>
                      {(t.customer.title || t.customer.company) && (
                        <div className={`text-[11px] truncate ${theme.textMuted}`}>
                          {[t.customer.title, t.customer.company].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className={`border-t ${theme.headerBorder} py-8 mt-16 text-center`}>
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className={`text-xs ${theme.textMuted}`}>
            © {new Date().getFullYear()} {data.name}. All verified customer stories preserved with Praise.
          </div>

          <a
            href="https://praise.local"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-brand-600 transition-colors"
          >
            <span>Powered by</span>
            <PraiseLogo size="sm" />
          </a>
        </div>
      </footer>
    </div>
  );
}
