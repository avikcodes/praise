"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  Globe,
  Layers,
  MessageSquareQuote,
  Moon,
  Share2,
  Sparkles,
  Star,
  Sun,
} from "lucide-react";
import { TestimonialMedia } from "@/components/ui/testimonial-media";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { PraiseLogo } from "@/components/brand";
import { PublicIndividualTestimonial } from "@/types/public-testimonial";

type TestimonialClientProps = {
  data: PublicIndividualTestimonial;
};

export function TestimonialClient({ data }: TestimonialClientProps) {
  const {
    id,
    content,
    rating,
    isFeatured,
    submittedAt,
    customer,
    project,
    workspace,
    tags,
    media,
    wallUrl,
    collectionFormUrl,
    isVerified,
    showPraiseBranding = true,
  } = data;

  // Theme state: "light" | "dark"
  const [isDark, setIsDark] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const videoAsset = media.find((m) => m.type === "VIDEO");
  const imageAssets = media.filter((m) => m.type === "IMAGE");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/t/${id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareTwitter = () => {
    const textSnippet =
      content.length > 180 ? `${content.slice(0, 180)}...` : content;
    const tweetText = `"${textSnippet}" — ${customer.name}${
      customer.company ? ` at ${customer.company}` : ""
    }`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      tweetText
    )}&url=${encodeURIComponent(publicUrl)}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  const handleShareLinkedIn = () => {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      publicUrl
    )}`;
    window.open(shareUrl, "_blank", "width=600,height=500");
  };

  const embedSnippet = `<blockquote class="praise-testimonial" data-id="${id}">\n  <p>"${content}"</p>\n  <footer>— ${customer.name}${
    customer.company ? `, ${customer.company}` : ""
  }</footer>\n</blockquote>\n<script src="${origin}/embed.js" async></script>`;

  // Theme styles
  const pageBg = isDark ? "bg-ink-950 text-white" : "bg-[#FAF7F2] text-ink-900";
  const cardBg = isDark
    ? "bg-ink-900/90 border-ink-800 text-white shadow-xl"
    : "bg-white border-[#E9E4DB] text-ink-900 shadow-sm";
  const subtleText = isDark ? "text-ink-400" : "text-ink-500";
  const borderLine = isDark ? "border-ink-800" : "border-[#E9E4DB]";

  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-200 flex flex-col justify-between`}>
      {/* Top Navbar */}
      <header className={`border-b ${borderLine} sticky top-0 z-30 backdrop-blur-md ${isDark ? "bg-ink-950/80" : "bg-white/80"}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Attribution */}
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
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight">
                  {project?.name || workspace.name}
                </span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 size={10} />
                    <span>Verified Feedback</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setIsDark((curr) => !curr)}
              className={`p-2 rounded-lg border ${borderLine} hover:bg-warm-100/50 transition-colors ${subtleText}`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Link to Wall of Love if present */}
            {wallUrl && (
              <Link
                href={wallUrl}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${borderLine} text-xs font-semibold hover:bg-warm-100/50 transition-colors`}
              >
                <Layers size={13} className="text-brand-600" />
                <span>Wall of Love</span>
              </Link>
            )}

            {/* Share Menu Trigger */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
            >
              {copiedLink ? <Check size={13} /> : <Share2 size={13} />}
              <span>{copiedLink ? "Link Copied!" : "Share"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Spotlight Section */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full space-y-6">
        {/* Navigation back link */}
        {wallUrl && (
          <div>
            <Link
              href={wallUrl}
              className={`inline-flex items-center gap-1 text-xs font-semibold ${subtleText} hover:text-brand-600 transition-colors`}
            >
              <ArrowLeft size={13} />
              <span>Back to {project?.name || "All"} Wall of Love</span>
            </Link>
          </div>
        )}

        {/* The Spotlight Card */}
        <article
          aria-label={`Testimonial from ${customer.name}`}
          className={`rounded-3xl border ${borderLine} ${cardBg} p-8 sm:p-12 relative transition-all ${
            isFeatured ? "ring-2 ring-brand-400/40" : ""
          }`}
        >
          {/* Hidden Screen-Reader H1 for SEO semantics */}
          <h1 className="sr-only">
            {customer.name}&apos;s customer review of {project?.name || workspace.name}
          </h1>

          {/* Decorative Quote Icon Background */}
          <div className="absolute top-6 right-8 opacity-10 pointer-events-none select-none">
            <MessageSquareQuote size={96} />
          </div>

          <div className="space-y-6 relative z-10">
            {/* Header: Star Rating & Featured Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {rating && rating > 0 ? (
                <div className="flex items-center gap-1 text-amber-400" aria-label={`Rating: ${rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={18}
                      className={
                        s <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-ink-200 fill-transparent"
                      }
                    />
                  ))}
                  <span className="text-xs font-bold text-ink-600 ml-1.5">
                    {rating}.0 / 5.0
                  </span>
                </div>
              ) : (
                <div />
              )}

              {isFeatured && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                  <Sparkles size={12} />
                  <span>Featured Customer Story</span>
                </span>
              )}
            </div>

            {/* Video Testimonial Player (if attached) */}
            {videoAsset && (
              <figure className="rounded-2xl overflow-hidden border border-line bg-black shadow-sm m-0">
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
                  compact={false}
                />
              </figure>
            )}

            {/* Testimonial Quote */}
            <blockquote className="space-y-3">
              <p
                className={`text-lg sm:text-2xl font-medium leading-relaxed italic ${
                  isDark ? "text-ink-50" : "text-ink-900"
                }`}
              >
                &ldquo;{content}&rdquo;
              </p>
            </blockquote>

            {/* Attached Photo Gallery */}
            {imageAssets.length > 0 && (
              <div className="pt-2 space-y-3">
                {imageAssets.map((img) => (
                  <figure
                    key={img.id}
                    className="rounded-2xl overflow-hidden border border-line shadow-xs max-h-96 m-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`Photo attached by ${customer.name}`}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                  </figure>
                ))}
              </div>
            )}

            {/* Reviewer Profile Section */}
            <footer className={`pt-6 border-t ${borderLine} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
              <div className="flex items-center gap-3.5">
                {customer.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={customer.avatarUrl}
                    alt={customer.name}
                    className="h-12 w-12 rounded-full object-cover border-2 border-line shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-brand-50 text-brand-700 border-2 border-brand-200 flex items-center justify-center font-bold text-base uppercase shrink-0">
                    {customer.name ? customer.name.slice(0, 2) : "CU"}
                  </div>
                )}

                <div>
                  <h2 className="text-base font-bold text-ink-900 flex items-center gap-1.5">
                    <cite className="not-italic font-bold">{customer.name}</cite>
                    {customer.website && (
                      <a
                        href={
                          customer.website.startsWith("http")
                            ? customer.website
                            : `https://${customer.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-500 hover:text-brand-600 inline-flex items-center"
                        title={customer.website}
                      >
                        <Globe size={13} />
                      </a>
                    )}
                  </h2>

                  {(customer.company || customer.title) && (
                    <div className={`text-xs flex items-center gap-1 mt-0.5 ${subtleText}`}>
                      {customer.company && <Building2 size={12} className="shrink-0" />}
                      <span>
                        {[customer.title, customer.company].filter(Boolean).join(" at ")}
                      </span>
                    </div>
                  )}

                  <div className={`text-[11px] flex items-center gap-1.5 mt-1 ${subtleText}`}>
                    <Calendar size={11} />
                    <time dateTime={new Date(submittedAt).toISOString()}>
                      {new Date(submittedAt).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  {tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-md ${
                        isDark ? "bg-ink-800 text-ink-300" : "bg-warm-100 text-ink-700"
                      }`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </footer>
          </div>
        </article>

        {/* Share and Action Strip */}
        <div className={`rounded-2xl border ${borderLine} ${cardBg} p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs`}>
          <div className="flex items-center gap-2 text-ink-700 font-semibold">
            <Share2 size={14} className="text-brand-600" />
            <span>Share this review:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${borderLine} font-semibold hover:bg-warm-100/50 transition-colors`}
            >
              {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copiedLink ? "Copied" : "Copy Link"}</span>
            </button>

            <button
              type="button"
              onClick={handleShareTwitter}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${borderLine} font-semibold hover:bg-warm-100/50 transition-colors`}
            >
              <span>Post to X</span>
              <ExternalLink size={11} className={subtleText} />
            </button>

            <button
              type="button"
              onClick={handleShareLinkedIn}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${borderLine} font-semibold hover:bg-warm-100/50 transition-colors`}
            >
              <span>LinkedIn</span>
              <ExternalLink size={11} className={subtleText} />
            </button>

            <button
              type="button"
              onClick={() => setIsEmbedOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${borderLine} font-semibold hover:bg-warm-100/50 transition-colors`}
            >
              <Code2 size={13} />
              <span>Embed</span>
            </button>
          </div>
        </div>

        {/* Social Proof CTA Banner */}
        <div className={`rounded-2xl border ${borderLine} ${cardBg} p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5`}>
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-bold text-ink-900">
              Want to see more experiences with {project?.name || workspace.name}?
            </h3>
            <p className={`text-xs ${subtleText}`}>
              Explore our full collection of customer reviews, photos, and video testimonials.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {wallUrl && (
              <Link
                href={wallUrl}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
              >
                <span>View Wall of Love</span>
                <ArrowRight size={13} />
              </Link>
            )}

            {collectionFormUrl && (
              <Link
                href={collectionFormUrl}
                className={`inline-flex items-center gap-1.5 rounded-xl border ${borderLine} px-4 py-2 text-xs font-semibold hover:bg-warm-100/50 transition-colors`}
              >
                <span>Leave a Review</span>
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Embed Modal Dialog */}
      {isEmbedOpen && (
        <ModalDialog
          isOpen={isEmbedOpen}
          onClose={() => setIsEmbedOpen(false)}
          title="Embed this Testimonial"
          description="Copy this snippet to embed this customer quote on your landing page or blog."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-ink-900 mb-1.5">
                HTML Blockquote Snippet
              </label>
              <div className="relative">
                <pre className="rounded-xl border border-line bg-warm-100 p-3 font-mono text-[11px] text-ink-900 overflow-x-auto leading-relaxed">
                  {embedSnippet}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(embedSnippet);
                    setCopiedEmbed(true);
                    setTimeout(() => setCopiedEmbed(false), 2000);
                  }}
                  className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-white border border-line px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-warm-50 shadow-2xs"
                >
                  {copiedEmbed ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  <span>{copiedEmbed ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Footer */}
      {showPraiseBranding !== false && (
        <footer className={`border-t ${borderLine} py-6 text-center text-xs ${subtleText}`}>
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
      )}
    </div>
  );
}

