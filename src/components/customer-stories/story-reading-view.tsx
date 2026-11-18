"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  FileDown,
  FileText,
  Globe,
  Printer,
  Quote,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users2,
  Video,
} from "lucide-react";
import { exportStoryToMarkdown, exportStoryToHtml } from "@/lib/customer-stories/export";
import type { CustomerStoryDetail } from "@/lib/customer-stories/types";
import { cn } from "@/lib/utils";

interface StoryReadingViewProps {
  story: CustomerStoryDetail;
  isPreview?: boolean;
}

export function StoryReadingView({ story, isPreview = false }: StoryReadingViewProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const themeClasses = {
    light: "bg-white text-slate-900 border-slate-200",
    warm: "bg-[#faf9f5] text-[#2d2825] border-[#e8e4df]",
    dark: "bg-slate-950 text-slate-100 border-slate-800",
    editorial: "bg-[#fcfbf9] text-stone-900 border-stone-200 font-serif-headings",
  }[story.theme || "warm"];

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadMarkdown = () => {
    const md = exportStoryToMarkdown(story);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${story.slug}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    const html = exportStoryToHtml(story);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${story.slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const accent = story.accentColor || "#4f46e5";

  return (
    <div className={cn("min-h-screen transition-colors", themeClasses)}>
      {/* Print-only Header */}
      <div className="hidden print:block p-8 border-b border-gray-300 mb-6">
        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Praise Customer Case Study</div>
        <div className="text-xl font-bold mt-1">{story.companyName} Success Story</div>
      </div>

      {/* Top Floating / Sticky Action Bar (hidden on print) */}
      <nav className="sticky top-0 z-40 border-b border-inherit bg-inherit/90 backdrop-blur-md px-4 py-3 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold text-white tracking-wide"
              style={{ backgroundColor: accent }}
            >
              Customer Story
            </span>
            <span className="hidden sm:inline-block text-xs font-medium opacity-75">
              {story.companyName}
            </span>
            {isPreview && (
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-semibold border border-amber-500/20">
                Draft Preview
              </span>
            )}
            {story.permissionVerified && (
              <span className="hidden md:flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck size={13} />
                <span>Verified Consent</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Share / Copy Link */}
            <button
              onClick={handleCopyLink}
              title="Copy Story Link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-inherit text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy Link"}</span>
            </button>

            {/* Export Markdown */}
            <button
              onClick={handleDownloadMarkdown}
              title="Download Markdown"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-inherit text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <FileText size={14} />
              <span className="hidden sm:inline">Markdown</span>
            </button>

            {/* Export HTML */}
            <button
              onClick={handleDownloadHtml}
              title="Download HTML"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-inherit text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <FileCode size={14} />
              <span className="hidden sm:inline">HTML</span>
            </button>

            {/* Download / Print PDF */}
            <button
              onClick={handlePrintPdf}
              title="Print or Save as PDF"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              <Printer size={14} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Reading Container */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Story Header */}
        <header className="mb-12">
          {/* Company Badges & Metadata */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-opacity-75 mb-6">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-inherit font-semibold">
              <Building size={13} className="opacity-70" />
              {story.companyName}
            </span>
            {story.companyIndustry && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-inherit">
                {story.companyIndustry}
              </span>
            )}
            {story.companySize && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-inherit">
                <Users2 size={13} className="opacity-70" />
                {story.companySize} employees
              </span>
            )}
            <span className="text-xs opacity-60 ml-auto">
              {story.readingTimeMinutes} min read
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15] mb-6">
            {story.title}
          </h1>

          {/* Subtitle */}
          {story.subtitle && (
            <p className="text-lg sm:text-xl opacity-80 leading-relaxed font-normal mb-8">
              {story.subtitle}
            </p>
          )}

          {/* Featured Customer & Company Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              {story.customerAvatarUrl ? (
                <img
                  src={story.customerAvatarUrl}
                  alt={story.customerName}
                  className="w-12 h-12 rounded-full object-cover border border-inherit shadow-sm"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
                  style={{ backgroundColor: accent }}
                >
                  {story.customerName.charAt(0)}
                </div>
              )}
              <div>
                <div className="font-semibold text-sm sm:text-base flex items-center gap-1.5">
                  <span>{story.customerName}</span>
                  {story.permissionVerified && (
                    <span title="Verified Customer Submission">
                      <ShieldCheck size={15} className="text-emerald-500 inline" />
                    </span>
                  )}
                </div>
                <div className="text-xs opacity-70">
                  {story.customerTitle ? `${story.customerTitle}, ` : ""}
                  <span className="font-medium">{story.companyName}</span>
                </div>
              </div>
            </div>

            {story.companyWebsite && (
              <a
                href={story.companyWebsite.startsWith("http") ? story.companyWebsite : `https://${story.companyWebsite}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium hover:underline opacity-80"
              >
                <span>Visit website</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </header>

        {/* Cover Image if present */}
        {story.coverImageUrl && (
          <figure className="mb-12 rounded-2xl overflow-hidden border border-inherit shadow-md">
            <img
              src={story.coverImageUrl}
              alt={story.title}
              className="w-full h-auto max-h-[460px] object-cover"
            />
          </figure>
        )}

        {/* Executive Summary & Key Takeaways */}
        {(story.summary || (story.keyTakeaways && story.keyTakeaways.length > 0)) && (
          <div
            className="mb-12 p-6 sm:p-8 rounded-2xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02]"
            style={{ borderLeftWidth: "4px", borderLeftColor: accent }}
          >
            {story.summary && (
              <p className="text-base sm:text-lg leading-relaxed font-medium mb-6">
                {story.summary}
              </p>
            )}

            {story.keyTakeaways && story.keyTakeaways.length > 0 && (
              <div className="pt-4 border-t border-inherit">
                <div className="text-xs font-bold uppercase tracking-wider opacity-75 mb-3 flex items-center gap-1.5">
                  <Sparkles size={14} style={{ color: accent }} />
                  <span>Key Takeaways</span>
                </div>
                <ul className="space-y-2.5">
                  {story.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm sm:text-base leading-snug">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: accent }} />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* MEASURABLE RESULTS SECTION - ONLY rendered when supplied by customer */}
        {story.measurableOutcomes && story.measurableOutcomes.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={20} style={{ color: accent }} />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Measurable Results & Impact
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {story.measurableOutcomes.map((outcome, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-inherit bg-black/[0.015] dark:bg-white/[0.015] flex flex-col justify-between shadow-sm"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-65 mb-2">
                    {outcome.metric}
                  </div>
                  <div
                    className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3"
                    style={{ color: accent }}
                  >
                    {outcome.improvement || outcome.after || "Significant"}
                  </div>
                  {(outcome.before || outcome.after) && (
                    <div className="text-xs opacity-75 flex items-center gap-1.5 pt-3 border-t border-inherit">
                      {outcome.before && <span>Before: <strong>{outcome.before}</strong></span>}
                      {outcome.before && outcome.after && <span>&rarr;</span>}
                      {outcome.after && <span>After: <strong>{outcome.after}</strong></span>}
                    </div>
                  )}
                  {outcome.timeframe && (
                    <div className="text-[11px] opacity-50 mt-1">
                      Timeframe: {outcome.timeframe}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FEATURED CUSTOMER PULL QUOTE */}
        {story.featuredQuote && (
          <div className="my-14 p-6 sm:p-10 rounded-3xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02] relative overflow-hidden shadow-sm">
            <Quote
              size={56}
              className="absolute -top-2 -left-2 opacity-10 pointer-events-none"
              style={{ color: accent }}
            />
            <blockquote className="relative z-10">
              <p className="text-xl sm:text-2xl font-medium italic leading-relaxed mb-6">
                &ldquo;{story.featuredQuote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                {story.featuredQuoteAvatar ? (
                  <img
                    src={story.featuredQuoteAvatar}
                    alt={story.featuredQuoteAuthor || story.customerName}
                    className="w-10 h-10 rounded-full object-cover border border-inherit shadow-sm"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs"
                    style={{ backgroundColor: accent }}
                  >
                    {(story.featuredQuoteAuthor || story.customerName).charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-bold text-sm">
                    {story.featuredQuoteAuthor || story.customerName}
                  </div>
                  <div className="text-xs opacity-70">
                    {story.featuredQuoteRole || story.customerTitle || story.companyName}
                  </div>
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <ShieldCheck size={12} />
                  <span>Verbatim Customer Statement</span>
                </div>
              </div>
            </blockquote>
          </div>
        )}

        {/* STRUCTURED NARRATIVE SECTIONS */}
        {story.sections && story.sections.length > 0 && (
          <div className="space-y-12 mb-14">
            {story.sections.map((section) => (
              <section key={section.id} className="prose-container">
                {section.title && (
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                    {section.title}
                  </h2>
                )}

                {section.content && (
                  <div className="text-base sm:text-lg leading-relaxed opacity-90 space-y-4">
                    {section.content.split("\n\n").map((para, pIdx) => (
                      <p key={pIdx} className="whitespace-pre-line">
                        {para}
                      </p>
                    ))}
                  </div>
                )}

                {section.quote && (
                  <blockquote
                    className="my-6 pl-4 border-l-4 italic opacity-90 text-lg"
                    style={{ borderLeftColor: accent }}
                  >
                    <p>&ldquo;{section.quote}&rdquo;</p>
                    {section.quoteAuthor && (
                      <cite className="block text-xs font-semibold not-italic opacity-70 mt-2">
                        &mdash; {section.quoteAuthor}
                        {section.quoteRole ? `, ${section.quoteRole}` : ""}
                      </cite>
                    )}
                  </blockquote>
                )}

                {section.mediaUrl && (
                  <figure className="my-6 rounded-xl overflow-hidden border border-inherit">
                    <img
                      src={section.mediaUrl}
                      alt={section.caption || "Illustration"}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                    {section.caption && (
                      <figcaption className="text-center text-xs opacity-60 p-2 border-t border-inherit bg-black/[0.01]">
                        {section.caption}
                      </figcaption>
                    )}
                  </figure>
                )}
              </section>
            ))}
          </div>
        )}

        {/* PEER ADVICE SECTION */}
        {story.peerAdvice && (
          <div className="my-12 p-6 rounded-2xl border border-inherit bg-black/[0.015] dark:bg-white/[0.015]">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Quote size={16} style={{ color: accent }} />
              <span>Advice for Industry Peers</span>
            </h3>
            <blockquote className="italic opacity-85 text-base sm:text-lg leading-relaxed mb-3">
              &ldquo;{story.peerAdvice}&rdquo;
            </blockquote>
            <p className="text-xs font-medium opacity-60">
              &mdash; {story.customerName}, {story.customerTitle || story.companyName}
            </p>
          </div>
        )}

        {/* APPROVED MEDIA & VIDEO INTERVIEWS */}
        {story.approvedMedia && story.approvedMedia.length > 0 && (
          <section className="my-14 pt-8 border-t border-inherit">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-6">
              Visual Proof & Media Walkthroughs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {story.approvedMedia.map((media) => (
                <div
                  key={media.id}
                  className="rounded-xl overflow-hidden border border-inherit bg-black/[0.02] dark:bg-white/[0.02]"
                >
                  {media.type === "IMAGE" ? (
                    <img
                      src={media.url}
                      alt={media.caption || "Screenshot"}
                      className="w-full h-48 sm:h-56 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-black flex items-center justify-center">
                      <video controls src={media.url} className="w-full h-full object-contain"></video>
                    </div>
                  )}
                  {media.caption && (
                    <div className="p-3 text-xs opacity-75 border-t border-inherit">
                      {media.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* OPTIONAL CTA SECTION */}
        {story.customCtaText && story.customCtaUrl && (
          <div className="my-16 p-8 rounded-3xl text-center border border-inherit bg-black/[0.02] dark:bg-white/[0.02]">
            <h3 className="text-2xl font-bold mb-3">Ready to achieve similar results?</h3>
            <p className="text-sm opacity-75 max-w-md mx-auto mb-6">
              See how Praise helps forward-thinking companies collect and showcase authentic customer proof.
            </p>
            <a
              href={story.customCtaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-md hover:opacity-95 transition-opacity"
              style={{ backgroundColor: accent }}
            >
              <span>{story.customCtaText}</span>
              <ArrowRight size={16} />
            </a>
          </div>
        )}

        {/* FOOTER */}
        <footer className="mt-16 pt-8 border-t border-inherit text-center text-xs opacity-60 space-y-2">
          {story.permissionVerified && (
            <p className="flex items-center justify-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={14} />
              <span>Published with verified customer publication consent</span>
            </p>
          )}
          <p>&copy; {new Date().getFullYear()} {story.companyName}. All quotations preserved verbatim.</p>
        </footer>
      </article>
    </div>
  );
}
