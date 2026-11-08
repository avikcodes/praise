"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  ExternalLink,
  Globe,
  LayoutGrid,
  Layers,
  MessageSquareQuote,
  Moon,
  Search,
  Share2,
  Sparkles,
  Star,
  Sun,
} from "lucide-react";
import { TestimonialMedia } from "@/components/ui/testimonial-media";
import { PraiseLogo } from "@/components/brand";
import { PublicTestimonialCard, PublicWallOfLoveData } from "@/types/widgets";

type WallOfLoveClientProps = {
  data: PublicWallOfLoveData;
};

export function WallOfLoveClient({ data }: WallOfLoveClientProps) {
  const { config, project, workspace, testimonials } = data;

  // Theme state: defaults to configured theme, but user can toggle interactively
  const [activeTheme, setActiveTheme] = useState<"warm" | "light" | "dark">(
    config.theme === "dark" ? "dark" : config.theme === "light" ? "light" : "warm"
  );

  // Layout state: defaults to config layout, but user can toggle
  const [layoutMode, setLayoutMode] = useState<"masonry" | "grid">(
    config.layout === "grid" ? "grid" : "masonry"
  );

  // Search & tag filtering
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [copiedLink, setCopiedLink] = useState(false);

  // Extract all distinct tags from testimonials
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of testimonials) {
      for (const tag of t.tags) {
        set.add(tag);
      }
    }
    return Array.from(set);
  }, [testimonials]);

  // Filtered testimonials
  const filteredTestimonials = useMemo(() => {
    return testimonials.filter((t) => {
      if (selectedTag !== "all" && !t.tags.includes(selectedTag)) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesContent = t.content.toLowerCase().includes(q);
        const matchesName = t.customer.name.toLowerCase().includes(q);
        const matchesCompany = t.customer.company?.toLowerCase().includes(q) ?? false;
        const matchesTitle = t.customer.title?.toLowerCase().includes(q) ?? false;
        if (!matchesContent && !matchesName && !matchesCompany && !matchesTitle) {
          return false;
        }
      }
      return true;
    });
  }, [testimonials, selectedTag, search]);

  // Average Rating
  const averageRating = useMemo(() => {
    const rated = testimonials.filter((t) => t.rating && t.rating > 0);
    if (rated.length === 0) return 5.0;
    const sum = rated.reduce((acc, curr) => acc + (curr.rating || 5), 0);
    return (sum / rated.length).toFixed(1);
  }, [testimonials]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Theme-specific styles
  const isDark = activeTheme === "dark";
  const isWarm = activeTheme === "warm";

  const containerBg = isDark
    ? "bg-ink-950 text-white"
    : isWarm
    ? "bg-[#FAF7F2] text-ink-900"
    : "bg-slate-50 text-ink-900";

  const cardBg = isDark
    ? "bg-ink-900/90 border-ink-800 text-white shadow-lg"
    : isWarm
    ? "bg-white border-[#E9E4DB] text-ink-900 shadow-xs"
    : "bg-white border-slate-200 text-ink-900 shadow-xs";

  const subtleText = isDark ? "text-ink-400" : "text-ink-500";
  const borderLine = isDark ? "border-ink-800" : isWarm ? "border-[#E9E4DB]" : "border-slate-200";

  return (
    <div className={`min-h-screen ${containerBg} transition-colors duration-200`}>
      {/* Top Navbar */}
      <header className={`border-b ${borderLine} sticky top-0 z-30 backdrop-blur-md ${isDark ? "bg-ink-950/80" : "bg-white/80"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {project?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.logoUrl}
                alt={project.name}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <PraiseLogo size="sm" />
            )}
            <div>
              <span className="font-bold text-sm tracking-tight">
                {project?.name || workspace.name}
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                Wall of Love
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() =>
                setActiveTheme((curr) =>
                  curr === "dark" ? "warm" : curr === "warm" ? "light" : "dark"
                )
              }
              className={`p-2 rounded-lg border ${borderLine} hover:bg-warm-100/50 transition-colors ${subtleText}`}
              title={`Switch Theme (Current: ${activeTheme})`}
              aria-label="Toggle light or dark theme"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Share Page Button */}
            <button
              type="button"
              onClick={handleShare}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${borderLine} text-xs font-semibold hover:bg-warm-100/50 transition-colors`}
              title="Copy public link"
            >
              {copiedLink ? (
                <>
                  <Check size={13} className="text-emerald-500 font-bold" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 size={13} className={subtleText} />
                  <span className="hidden sm:inline">Share Wall</span>
                </>
              )}
            </button>

            {/* Header CTA Button */}
            {config.ctaEnabled && (
              <a
                href={config.ctaUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
                style={{ backgroundColor: config.accentColor || "#7049D8" }}
              >
                <span>{config.ctaLabel || "Share Praise"}</span>
                <ArrowRight size={13} />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero Header */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-8 text-center space-y-4">
        {/* Rating summary pill */}
        {config.showRatings && testimonials.length > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/70 px-3 py-1 text-xs font-semibold text-amber-800 shadow-2xs">
            <div className="flex items-center text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={13} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span>
              {averageRating} / 5.0 rating from {testimonials.length} verified reviews
            </span>
          </div>
        )}

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
          {config.title || "Wall of Love"}
        </h1>

        <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${subtleText}`}>
          {config.description ||
            "Real testimonials, stories, and experiences shared by our community and customers."}
        </p>

        {/* Hero Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {config.ctaEnabled && (
            <a
              href={config.ctaUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
              style={{ backgroundColor: config.accentColor || "#7049D8" }}
            >
              <span>{config.ctaLabel || "Share Your Feedback"}</span>
              <ArrowRight size={15} />
            </a>
          )}

          {config.ctaSecondaryEnabled && config.ctaSecondaryUrl && (
            <a
              href={config.ctaSecondaryUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1.5 rounded-xl border ${borderLine} px-4 py-2.5 text-sm font-semibold hover:bg-warm-100/50 transition-colors`}
            >
              <span>{config.ctaSecondaryLabel || "Visit Product"}</span>
              <ExternalLink size={13} className={subtleText} />
            </a>
          )}
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className={`p-3 rounded-2xl border ${borderLine} ${isDark ? "bg-ink-900/50" : "bg-white"} shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3`}>
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className={`absolute left-3 top-2.5 ${subtleText}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search testimonials by name, company, or keywords..."
              className={`w-full rounded-xl border ${borderLine} ${
                isDark ? "bg-ink-950 text-white placeholder:text-ink-600" : "bg-warm-50/50 text-ink-900 placeholder:text-ink-400"
              } pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500`}
            />
          </div>

          {/* Tags Chips & Layout Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-md">
                <button
                  type="button"
                  onClick={() => setSelectedTag("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    selectedTag === "all"
                      ? "bg-brand-500 text-white shadow-2xs"
                      : `border ${borderLine} ${subtleText} hover:bg-warm-100/50`
                  }`}
                >
                  All ({testimonials.length})
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedTag === tag
                        ? "bg-brand-500 text-white shadow-2xs"
                        : `border ${borderLine} ${subtleText} hover:bg-warm-100/50`
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Layout Mode Switcher */}
            <div className={`flex items-center rounded-lg border ${borderLine} p-0.5 ml-auto shrink-0`}>
              <button
                type="button"
                onClick={() => setLayoutMode("masonry")}
                className={`p-1.5 rounded-md transition-colors ${
                  layoutMode === "masonry"
                    ? "bg-brand-500 text-white shadow-2xs"
                    : `${subtleText} hover:bg-warm-100/40`
                }`}
                title="Masonry Layout"
              >
                <Layers size={14} />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${
                  layoutMode === "grid"
                    ? "bg-brand-500 text-white shadow-2xs"
                    : `${subtleText} hover:bg-warm-100/40`
                }`}
                title="Grid Layout"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Wall of Cards Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {filteredTestimonials.length === 0 ? (
          <div className={`rounded-2xl border ${borderLine} ${cardBg} p-12 text-center max-w-lg mx-auto space-y-3`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mx-auto border border-brand-200">
              <MessageSquareQuote size={24} />
            </div>
            <h2 className="text-base font-bold">
              {search || selectedTag !== "all"
                ? "No matching testimonials found"
                : "No approved testimonials published yet"}
            </h2>
            <p className={`text-xs ${subtleText}`}>
              {search || selectedTag !== "all"
                ? "Try clearing your search query or choosing another tag."
                : "Approved reviews will appear here automatically once moderated in your dashboard."}
            </p>
            {config.ctaEnabled && (
              <div className="pt-2">
                <a
                  href={config.ctaUrl || "#"}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
                >
                  <span>Leave the First Review</span>
                  <ArrowRight size={13} />
                </a>
              </div>
            )}
          </div>
        ) : (
          <div
            className={
              layoutMode === "masonry"
                ? "columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            }
          >
            {filteredTestimonials.map((t) => (
              <TestimonialCard
                key={t.id}
                testimonial={t}
                config={config}
                cardBg={cardBg}
                borderLine={borderLine}
                subtleText={subtleText}
                isDark={isDark}
                isMasonry={layoutMode === "masonry"}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom CTA Banner */}
      {config.ctaEnabled && filteredTestimonials.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
          <div className={`rounded-3xl border ${borderLine} ${cardBg} p-8 sm:p-12 shadow-sm space-y-4`}>
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 border border-brand-200 mb-1">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Share your experience with {project?.name || workspace.name}
            </h2>
            <p className={`text-xs sm:text-sm max-w-lg mx-auto ${subtleText}`}>
              Help others discover how our product makes a difference. It takes less than 60 seconds.
            </p>
            <div className="pt-2">
              <a
                href={config.ctaUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                style={{ backgroundColor: config.accentColor || "#7049D8" }}
              >
                <span>{config.ctaLabel || "Leave a Review"}</span>
                <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Public Footer */}
      <footer className={`border-t ${borderLine} py-8 text-center text-xs ${subtleText}`}>
        <div className="flex items-center justify-center gap-2">
          <span>Powered by</span>
          <Link
            href="/"
            className="font-bold text-ink-900 hover:text-brand-600 inline-flex items-center gap-1 transition-colors"
          >
            <PraiseLogo size="sm" decorative />
          </Link>
          <span>&bull; Open Source Testimonial Engine</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * Individual Testimonial Card supporting text, image, and video content.
 */
function TestimonialCard({
  testimonial,
  config,
  cardBg,
  borderLine,
  subtleText,
  isDark,
  isMasonry,
}: {
  testimonial: PublicTestimonialCard;
  config: PublicWallOfLoveData["config"];
  cardBg: string;
  borderLine: string;
  subtleText: string;
  isDark: boolean;
  isMasonry: boolean;
}) {
  const { customer, rating, content, isFeatured, submittedAt, media, tags } = testimonial;

  // Has attached video
  const videoAsset = media.find((m) => m.type === "VIDEO");
  // Has attached images
  const imageAssets = media.filter((m) => m.type === "IMAGE");

  return (
    <div
      className={`rounded-2xl border ${borderLine} ${cardBg} p-5 transition-all hover:shadow-md ${
        isMasonry ? "break-inside-avoid mb-5" : ""
      } ${isFeatured && config.showFeaturedBadge ? "ring-2 ring-brand-400/50" : ""}`}
    >
      {/* Top Header: Customer Info + Featured Badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {customer.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={customer.avatarUrl}
              alt={customer.name}
              className="h-10 w-10 rounded-full object-cover border border-line shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {customer.name ? customer.name.slice(0, 2) : "CU"}
            </div>
          )}

          <div>
            <div className="font-bold text-xs leading-snug flex items-center gap-1">
              <span>{customer.name}</span>
              {customer.website && (
                <a
                  href={customer.website.startsWith("http") ? customer.website : `https://${customer.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-500 hover:text-brand-600 inline-flex items-center"
                  title={customer.website}
                >
                  <Globe size={11} />
                </a>
              )}
            </div>

            {(customer.company || customer.title) && (
              <div className={`text-[11px] leading-tight flex items-center gap-1 mt-0.5 ${subtleText}`}>
                {customer.company && <Building2 size={10} className="shrink-0" />}
                <span className="truncate max-w-[170px]">
                  {[customer.title, customer.company].filter(Boolean).join(" at ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Featured Pill */}
        {isFeatured && config.showFeaturedBadge && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700 shrink-0">
            <Sparkles size={10} />
            <span>Featured</span>
          </span>
        )}
      </div>

      {/* Star Rating */}
      {config.showRatings && rating && rating > 0 && (
        <div className="flex items-center gap-0.5 text-amber-400 mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={12}
              className={s <= rating ? "fill-amber-400 text-amber-400" : "text-ink-200 fill-transparent"}
            />
          ))}
        </div>
      )}

      {/* Video Player (if video testimonial) */}
      {videoAsset && config.allowVideoPlayback && (
        <div className="mb-3.5 rounded-xl overflow-hidden border border-line bg-black">
          <TestimonialMedia
            media={{
              id: videoAsset.id,
              type: "VIDEO",
              url: videoAsset.url,
              mimeType: videoAsset.mimeType,
              fileSizeBytes: videoAsset.fileSizeBytes,
              durationSeconds: videoAsset.durationSeconds,
            }}
            canDownload={false}
            compact
          />
        </div>
      )}

      {/* Image Gallery Preview (if attached image) */}
      {imageAssets.length > 0 && (
        <div className="mb-3.5 space-y-2">
          {imageAssets.map((img) => (
            <div key={img.id} className="rounded-xl overflow-hidden border border-line max-h-64">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt="Testimonial attachment"
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* Testimonial Quote Text */}
      <div className={`text-xs leading-relaxed italic ${isDark ? "text-ink-100" : "text-ink-800"}`}>
        &ldquo;{content}&rdquo;
      </div>

      {/* Card Footer: Date & Tags */}
      <div className={`mt-4 pt-3 border-t ${borderLine} flex flex-wrap items-center justify-between gap-2 text-[10px] ${subtleText}`}>
        {config.showDate && (
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            <span>
              {new Date(submittedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Tags */}
          {config.showTags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className={`rounded-sm px-1.5 py-0.2 font-medium ${
                    isDark ? "bg-ink-800 text-ink-300" : "bg-warm-100 text-ink-600"
                  }`}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          <Link
            href={`/t/${testimonial.id}`}
            className="hover:text-brand-500 transition-colors p-0.5 rounded"
            title="View permanent public page"
          >
            <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}

