"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  FileDown,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  Layout,
  Loader2,
  Lock,
  Palette,
  Plus,
  Printer,
  Quote,
  Save,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users2,
  Video,
  X,
} from "lucide-react";
import { StoryReadingView } from "@/components/customer-stories/story-reading-view";
import { exportStoryToMarkdown, exportStoryToHtml } from "@/lib/customer-stories/export";
import type { CustomerStoryDetail, StorySection, StoryMeasurableOutcome, StoryMediaItem, StoryTheme } from "@/lib/customer-stories/types";
import { useToast } from "@/components/dashboard/toast-context";
import { cn } from "@/lib/utils";

interface StoryEditorModalProps {
  story: CustomerStoryDetail;
  projects?: Array<{ id: string; name: string }>;
  brands?: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSaved: (updated: CustomerStoryDetail) => void;
}

type EditorTab = "details" | "sections" | "company" | "metrics_media" | "seo" | "preview";

export function StoryEditorModal({
  story,
  projects = [],
  brands = [],
  onClose,
  onSaved,
}: StoryEditorModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<EditorTab>("details");
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState(story.title || "");
  const [subtitle, setSubtitle] = useState(story.subtitle || "");
  const [summary, setSummary] = useState(story.summary || "");
  const [slug, setSlug] = useState(story.slug || "");
  const [readingTimeMinutes, setReadingTimeMinutes] = useState(story.readingTimeMinutes || 4);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">(story.status);
  const [projectId, setProjectId] = useState(story.projectId || "");
  const [brandId, setBrandId] = useState(story.brandId || "");

  // Company & Customer State
  const [customerName, setCustomerName] = useState(story.customerName || "");
  const [customerTitle, setCustomerTitle] = useState(story.customerTitle || "");
  const [customerAvatarUrl, setCustomerAvatarUrl] = useState(story.customerAvatarUrl || "");
  const [companyName, setCompanyName] = useState(story.companyName || "");
  const [companyLogoUrl, setCompanyLogoUrl] = useState(story.companyLogoUrl || "");
  const [companyWebsite, setCompanyWebsite] = useState(story.companyWebsite || "");
  const [companyIndustry, setCompanyIndustry] = useState(story.companyIndustry || "");
  const [companySize, setCompanySize] = useState(story.companySize || "");

  // Quotes State
  const [featuredQuote, setFeaturedQuote] = useState(story.featuredQuote || "");
  const [featuredQuoteAuthor, setFeaturedQuoteAuthor] = useState(story.featuredQuoteAuthor || "");
  const [featuredQuoteRole, setFeaturedQuoteRole] = useState(story.featuredQuoteRole || "");
  const [peerAdvice, setPeerAdvice] = useState(story.peerAdvice || "");

  // Sections State
  const [sections, setSections] = useState<StorySection[]>(story.sections || []);

  // Takeaways State
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>(story.keyTakeaways || []);
  const [newTakeaway, setNewTakeaway] = useState("");

  // Measurable Outcomes
  const [measurableOutcomes, setMeasurableOutcomes] = useState<StoryMeasurableOutcome[]>(
    story.measurableOutcomes || []
  );

  // Media
  const [coverImageUrl, setCoverImageUrl] = useState(story.coverImageUrl || "");
  const [videoUrl, setVideoUrl] = useState(story.videoUrl || "");
  const [approvedMedia, setApprovedMedia] = useState<StoryMediaItem[]>(story.approvedMedia || []);

  // Theme & CTA
  const [theme, setTheme] = useState<StoryTheme>(story.theme || "warm");
  const [accentColor, setAccentColor] = useState(story.accentColor || "#4f46e5");
  const [customCtaText, setCustomCtaText] = useState(story.customCtaText || "");
  const [customCtaUrl, setCustomCtaUrl] = useState(story.customCtaUrl || "");

  // SEO
  const [seoTitle, setSeoTitle] = useState(story.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(story.seoDescription || "");
  const [ogImageUrl, setOgImageUrl] = useState(story.ogImageUrl || "");

  // Permission & Compliance Verification
  const [permissionVerified, setPermissionVerified] = useState(story.permissionVerified);
  const [permissionNotes, setPermissionNotes] = useState(story.permissionNotes || "");

  // Section Management Helpers
  const handleAddSection = (type: StorySection["type"]) => {
    const defaultTitles: Record<string, string> = {
      challenge: "The Scaling Obstacle",
      solution: "The Adoption & Implementation",
      results: "Measurable Business Results",
      quote: "Customer Perspective",
      media: "Product Visuals & Architecture",
      custom: "Additional Insights",
    };
    const newSection: StorySection = {
      id: `sec-${Date.now()}`,
      type,
      title: defaultTitles[type] || "New Narrative Section",
      content: "",
    };
    setSections([...sections, newSection]);
  };

  const handleUpdateSection = (index: number, updates: Partial<StorySection>) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], ...updates };
    setSections(updated);
  };

  const handleDeleteSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  // Takeaway helpers
  const handleAddTakeaway = () => {
    if (newTakeaway.trim()) {
      setKeyTakeaways([...keyTakeaways, newTakeaway.trim()]);
      setNewTakeaway("");
    }
  };

  const handleDeleteTakeaway = (index: number) => {
    setKeyTakeaways(keyTakeaways.filter((_, i) => i !== index));
  };

  // Outcome helpers
  const handleAddOutcome = () => {
    setMeasurableOutcomes([
      ...measurableOutcomes,
      { metric: "Metric Name", before: "", after: "", improvement: "+50%", timeframe: "30 days" },
    ]);
  };

  const handleUpdateOutcome = (index: number, updates: Partial<StoryMeasurableOutcome>) => {
    const updated = [...measurableOutcomes];
    updated[index] = { ...updated[index], ...updates };
    setMeasurableOutcomes(updated);
  };

  const handleDeleteOutcome = (index: number) => {
    setMeasurableOutcomes(measurableOutcomes.filter((_, i) => i !== index));
  };

  // Media helpers
  const handleAddMedia = () => {
    setApprovedMedia([
      ...approvedMedia,
      { id: `media-${Date.now()}`, url: "", type: "IMAGE", caption: "" },
    ]);
  };

  const handleUpdateMedia = (index: number, updates: Partial<StoryMediaItem>) => {
    const updated = [...approvedMedia];
    updated[index] = { ...updated[index], ...updates };
    setApprovedMedia(updated);
  };

  const handleDeleteMedia = (index: number) => {
    setApprovedMedia(approvedMedia.filter((_, i) => i !== index));
  };

  // Save handler
  const handleSave = async (desiredStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED") => {
    const newStatus = desiredStatus || status;

    // INTEGRITY CHECK: Verify permission before publishing
    if (newStatus === "PUBLISHED" && !permissionVerified) {
      toast.error(
        "Permission Required",
        "Stories cannot be published without documented customer permission. Please verify consent in the Permission section."
      );
      return;
    }

    if (!title.trim() || !companyName.trim()) {
      toast.error("Validation Error", "Title and Company Name are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        subtitle,
        summary,
        slug,
        readingTimeMinutes,
        status: newStatus,
        projectId: projectId || null,
        brandId: brandId || null,
        customerName,
        customerTitle,
        customerAvatarUrl,
        companyName,
        companyLogoUrl,
        companyWebsite,
        companyIndustry,
        companySize,
        featuredQuote,
        featuredQuoteAuthor,
        featuredQuoteRole,
        peerAdvice,
        sections,
        keyTakeaways,
        measurableOutcomes,
        coverImageUrl,
        videoUrl,
        approvedMedia,
        theme,
        accentColor,
        customCtaText,
        customCtaUrl,
        seoTitle,
        seoDescription,
        ogImageUrl,
        permissionVerified,
        permissionNotes,
      };

      const res = await fetch(`/api/workspaces/${story.workspaceId}/customer-stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update customer story");
      }

      setStatus(newStatus);
      toast.success(
        "Story Saved",
        newStatus === "PUBLISHED" ? "Customer story published live!" : "Customer story saved as draft."
      );

      onSaved(data.story);
    } catch (err: any) {
      toast.error("Save Failed", err.message || "Could not save customer story");
    } finally {
      setSaving(false);
    }
  };

  // Construct current preview story
  const previewStory: CustomerStoryDetail = {
    ...story,
    title,
    subtitle,
    summary,
    slug,
    readingTimeMinutes,
    status,
    customerName,
    customerTitle,
    customerAvatarUrl,
    companyName,
    companyLogoUrl,
    companyWebsite,
    companyIndustry,
    companySize,
    featuredQuote,
    featuredQuoteAuthor,
    featuredQuoteRole,
    peerAdvice,
    sections,
    keyTakeaways,
    measurableOutcomes,
    coverImageUrl,
    videoUrl,
    approvedMedia,
    theme,
    accentColor,
    customCtaText,
    customCtaUrl,
    seoTitle,
    seoDescription,
    ogImageUrl,
    permissionVerified,
    permissionNotes,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-warm-50 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-500 hover:text-ink-800 hover:bg-warm-100 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink-900 text-base">{companyName || "Customer"} Story Editor</span>
                {status === "PUBLISHED" ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Live Published
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warm-200 text-ink-700">
                    Draft
                  </span>
                )}
                {permissionVerified ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <ShieldCheck size={13} />
                    <span>Permission Verified</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                    <ShieldAlert size={13} />
                    <span>Permission Unverified</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-500">
                Public URL: <span className="font-mono text-brand-600">/stories/{slug}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Export Buttons */}
            <button
              onClick={() => {
                const md = exportStoryToMarkdown(previewStory);
                const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${slug}.md`;
                a.click();
              }}
              title="Export as Markdown"
              className="p-2 rounded-lg border border-line text-ink-600 hover:bg-warm-100 text-xs font-medium flex items-center gap-1"
            >
              <FileText size={14} />
              <span className="hidden sm:inline">MD</span>
            </button>

            <button
              onClick={() => {
                const html = exportStoryToHtml(previewStory);
                const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${slug}.html`;
                a.click();
              }}
              title="Export as HTML"
              className="p-2 rounded-lg border border-line text-ink-600 hover:bg-warm-100 text-xs font-medium flex items-center gap-1"
            >
              <FileCode size={14} />
              <span className="hidden sm:inline">HTML</span>
            </button>

            {status === "PUBLISHED" ? (
              <button
                onClick={() => handleSave("DRAFT")}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Unpublish
              </button>
            ) : (
              <button
                onClick={() => handleSave("PUBLISHED")}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                <span>Publish Story</span>
              </button>
            )}

            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-line bg-surface overflow-x-auto shrink-0">
          {[
            { id: "details", label: "Story Details", icon: Layout },
            { id: "sections", label: "Narrative Sections", icon: Layers, badge: sections.length },
            { id: "company", label: "Company & Customer", icon: Building },
            {
              id: "metrics_media",
              label: "Metrics & Media",
              icon: TrendingUp,
              badge: measurableOutcomes.length + approvedMedia.length,
            },
            { id: "seo", label: "SEO & Social", icon: Globe },
            { id: "preview", label: "Live Reading Preview", icon: Eye },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as EditorTab)}
                className={cn(
                  "flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                  isActive
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-ink-500 hover:text-ink-800"
                )}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-50 text-brand-700 font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-warm-50/40">
          {/* TAB 1: STORY DETAILS */}
          {activeTab === "details" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-surface p-6 rounded-2xl border border-line space-y-5">
                <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider text-opacity-80">
                  Headline & Overview
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Story Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. How SkyTech Slashed Latency by 99% with Acme"
                    className="w-full text-base font-bold text-ink-900 px-3.5 py-2.5 rounded-xl border border-line focus:ring-2 focus:ring-brand-500 bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Subtitle / Summary Deck
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Scaling distributed compute fleets across 120 robotics nodes."
                    className="w-full text-sm text-ink-800 px-3.5 py-2 rounded-xl border border-line focus:ring-2 focus:ring-brand-500 bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Executive Summary (TL;DR)
                  </label>
                  <textarea
                    rows={3}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Brief 2-3 sentence executive synopsis of the problem, the solution, and the strategic outcome."
                    className="w-full text-sm text-ink-800 p-3 rounded-xl border border-line focus:ring-2 focus:ring-brand-500 bg-surface leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Custom URL Slug <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center rounded-xl border border-line overflow-hidden bg-surface px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand-500">
                      <span className="text-xs text-ink-400 font-mono">/stories/</span>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="w-full text-xs font-mono text-ink-900 bg-transparent outline-none pl-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Estimated Reading Time (Minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={readingTimeMinutes}
                      onChange={(e) => setReadingTimeMinutes(parseInt(e.target.value) || 3)}
                      className="w-full text-sm text-ink-800 px-3.5 py-1.5 rounded-xl border border-line bg-surface"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Associate Project
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    >
                      <option value="">No Project (All Projects)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Associate Brand
                    </label>
                    <select
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value)}
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    >
                      <option value="">No Specific Brand</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Theme & Styling */}
              <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
                <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider text-opacity-80 flex items-center gap-2">
                  <Palette size={16} />
                  <span>Branding & Visual Style</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "warm", name: "Warm Editorial", bg: "#faf9f5", text: "#2d2825" },
                    { id: "light", name: "Modern Clean", bg: "#ffffff", text: "#0f172a" },
                    { id: "dark", name: "Dark High-Contrast", bg: "#020617", text: "#f8fafc" },
                    { id: "editorial", name: "Classic Print", bg: "#fcfbf9", text: "#1c1917" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id as StoryTheme)}
                      className={cn(
                        "p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all",
                        theme === t.id ? "border-brand-600 ring-2 ring-brand-500/20" : "border-line"
                      )}
                      style={{ backgroundColor: t.bg }}
                    >
                      <span className="text-xs font-bold" style={{ color: t.text }}>
                        {t.name}
                      </span>
                      <span className="text-[10px] opacity-70" style={{ color: t.text }}>
                        Sample text
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-10 h-10 rounded-xl border border-line cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-32 text-xs font-mono text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Custom Call-To-Action Button Text
                    </label>
                    <input
                      type="text"
                      value={customCtaText}
                      onChange={(e) => setCustomCtaText(e.target.value)}
                      placeholder="e.g. Schedule a Live Demo"
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    />
                  </div>
                </div>

                {customCtaText && (
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      CTA Link Destination URL
                    </label>
                    <input
                      type="url"
                      value={customCtaUrl}
                      onChange={(e) => setCustomCtaUrl(e.target.value)}
                      placeholder="https://yourcompany.com/demo"
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    />
                  </div>
                )}
              </div>

              {/* Key Takeaways */}
              <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
                <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider text-opacity-80 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <span>Key Executive Takeaways</span>
                </h3>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTakeaway}
                    onChange={(e) => setNewTakeaway(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTakeaway();
                      }
                    }}
                    placeholder="e.g. Reduced pager alerts by 90% in first two weeks"
                    className="flex-1 text-xs text-ink-800 px-3.5 py-2 rounded-xl border border-line bg-surface"
                  />
                  <button
                    type="button"
                    onClick={handleAddTakeaway}
                    className="px-4 py-2 rounded-xl bg-warm-100 hover:bg-warm-200 text-xs font-semibold text-ink-800 transition-colors"
                  >
                    Add Takeaway
                  </button>
                </div>

                <div className="space-y-2">
                  {keyTakeaways.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-line bg-warm-50 text-xs text-ink-800"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTakeaway(idx)}
                        className="text-ink-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {keyTakeaways.length === 0 && (
                    <p className="text-xs text-ink-400 italic">No takeaways defined yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NARRATIVE SECTIONS */}
          {activeTab === "sections" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-ink-900">Structured Narrative Sections</h3>
                  <p className="text-xs text-ink-500">
                    Arrange the story narrative (The Challenge, The Solution, The Outcomes). Original quotations are preserved.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddSection("challenge")}
                    className="px-2.5 py-1.5 rounded-lg border border-line text-xs font-medium bg-surface hover:bg-warm-100 transition-colors"
                  >
                    + Challenge
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSection("solution")}
                    className="px-2.5 py-1.5 rounded-lg border border-line text-xs font-medium bg-surface hover:bg-warm-100 transition-colors"
                  >
                    + Solution
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSection("results")}
                    className="px-2.5 py-1.5 rounded-lg border border-line text-xs font-medium bg-surface hover:bg-warm-100 transition-colors"
                  >
                    + Results
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSection("quote")}
                    className="px-2.5 py-1.5 rounded-lg border border-line text-xs font-medium bg-surface hover:bg-warm-100 transition-colors"
                  >
                    + Quote
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {sections.map((section, idx) => (
                  <div
                    key={section.id}
                    className="bg-surface p-6 rounded-2xl border border-line space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-700 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-ink-500">
                          {section.type} Section
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(idx)}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 size={13} />
                        <span>Remove Section</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-700 mb-1">
                        Section Heading
                      </label>
                      <input
                        type="text"
                        value={section.title || ""}
                        onChange={(e) => handleUpdateSection(idx, { title: e.target.value })}
                        className="w-full text-sm font-bold text-ink-900 px-3 py-2 rounded-xl border border-line bg-surface"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-700 mb-1">
                        Narrative Content (Markdown supported)
                      </label>
                      <textarea
                        rows={4}
                        value={section.content || ""}
                        onChange={(e) => handleUpdateSection(idx, { content: e.target.value })}
                        className="w-full text-xs text-ink-800 p-3 rounded-xl border border-line bg-surface font-sans leading-relaxed"
                      />
                    </div>

                    {section.type === "quote" && (
                      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                        <label className="block text-xs font-bold text-amber-900">
                          Pull Quote (Verbatim Statement)
                        </label>
                        <textarea
                          rows={2}
                          value={section.quote || ""}
                          onChange={(e) => handleUpdateSection(idx, { quote: e.target.value })}
                          className="w-full text-xs text-ink-800 p-2.5 rounded-lg border border-line bg-surface italic"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Quote Author (e.g. Sarah Connor)"
                            value={section.quoteAuthor || ""}
                            onChange={(e) => handleUpdateSection(idx, { quoteAuthor: e.target.value })}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-line bg-surface"
                          />
                          <input
                            type="text"
                            placeholder="Author Role (e.g. VP of Engineering)"
                            value={section.quoteRole || ""}
                            onChange={(e) => handleUpdateSection(idx, { quoteRole: e.target.value })}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-line bg-surface"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: COMPANY & CUSTOMER */}
          {activeTab === "company" && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Company Info */}
              <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
                <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider text-opacity-80 flex items-center gap-2">
                  <Building size={16} />
                  <span>Customer Company Profile</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Company Website
                    </label>
                    <input
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Industry Vertical
                    </label>
                    <input
                      type="text"
                      value={companyIndustry}
                      onChange={(e) => setCompanyIndustry(e.target.value)}
                      placeholder="e.g. Robotics & AI, FinTech, E-Commerce"
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Company Size
                    </label>
                    <input
                      type="text"
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      placeholder="e.g. 250-500, Enterprise, Seed"
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Company Logo URL
                  </label>
                  <input
                    type="url"
                    value={companyLogoUrl}
                    onChange={(e) => setCompanyLogoUrl(e.target.value)}
                    placeholder="https://cdn.example.com/logo.svg"
                    className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                  />
                </div>
              </div>

              {/* Customer Champion Details */}
              <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
                <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider text-opacity-80 flex items-center gap-2">
                  <User size={16} />
                  <span>Featured Customer Champion</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Job Title / Role
                    </label>
                    <input
                      type="text"
                      value={customerTitle}
                      onChange={(e) => setCustomerTitle(e.target.value)}
                      placeholder="e.g. VP of Engineering"
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Customer Avatar / Photo URL
                  </label>
                  <input
                    type="url"
                    value={customerAvatarUrl}
                    onChange={(e) => setCustomerAvatarUrl(e.target.value)}
                    placeholder="https://cdn.example.com/sarah-connor.jpg"
                    className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                  />
                </div>
              </div>

              {/* Quotations & Peer Advice */}
              <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
                <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider text-opacity-80 flex items-center gap-2">
                  <Quote size={16} />
                  <span>Featured Quotations & Peer Advice</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Highlighted Pull Quote (Verbatim from Customer)
                  </label>
                  <textarea
                    rows={3}
                    value={featuredQuote}
                    onChange={(e) => setFeaturedQuote(e.target.value)}
                    className="w-full text-xs text-ink-800 p-3 rounded-xl border border-line bg-surface italic"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Quote Attribution Name
                    </label>
                    <input
                      type="text"
                      value={featuredQuoteAuthor}
                      onChange={(e) => setFeaturedQuoteAuthor(e.target.value)}
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Quote Attribution Role
                    </label>
                    <input
                      type="text"
                      value={featuredQuoteRole}
                      onChange={(e) => setFeaturedQuoteRole(e.target.value)}
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Advice for Industry Peers
                  </label>
                  <textarea
                    rows={2}
                    value={peerAdvice}
                    onChange={(e) => setPeerAdvice(e.target.value)}
                    className="w-full text-xs text-ink-800 p-3 rounded-xl border border-line bg-surface italic"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: METRICS & MEDIA */}
          {activeTab === "metrics_media" && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Measurable Outcomes */}
              <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider text-opacity-80 flex items-center gap-2">
                      <TrendingUp size={16} className="text-brand-600" />
                      <span>Measurable Results & Outcomes</span>
                    </h3>
                    <p className="text-xs text-ink-500">
                      Only displayed when supplied. Do not fabricate metrics.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOutcome}
                    className="px-3 py-1.5 rounded-lg border border-line bg-warm-100 hover:bg-warm-200 text-xs font-semibold text-ink-800 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add Metric</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {measurableOutcomes.map((outcome, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-line bg-warm-50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-brand-700">Metric #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteOutcome(idx)}
                          className="text-ink-400 hover:text-red-500 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-ink-600 mb-1">
                            Metric Name
                          </label>
                          <input
                            type="text"
                            value={outcome.metric}
                            onChange={(e) => handleUpdateOutcome(idx, { metric: e.target.value })}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-line bg-surface font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-ink-600 mb-1">
                            Improvement / Delta (e.g. +94%, -85%)
                          </label>
                          <input
                            type="text"
                            value={outcome.improvement || ""}
                            onChange={(e) => handleUpdateOutcome(idx, { improvement: e.target.value })}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-line bg-surface text-brand-700 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-ink-600 mb-1">
                            Before State
                          </label>
                          <input
                            type="text"
                            value={outcome.before || ""}
                            onChange={(e) => handleUpdateOutcome(idx, { before: e.target.value })}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-line bg-surface"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-ink-600 mb-1">
                            After State
                          </label>
                          <input
                            type="text"
                            value={outcome.after || ""}
                            onChange={(e) => handleUpdateOutcome(idx, { after: e.target.value })}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-line bg-surface"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-ink-600 mb-1">
                          Timeframe
                        </label>
                        <input
                          type="text"
                          value={outcome.timeframe || ""}
                          onChange={(e) => handleUpdateOutcome(idx, { timeframe: e.target.value })}
                          placeholder="e.g. First 30 days"
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-line bg-surface"
                        />
                      </div>
                    </div>
                  ))}

                  {measurableOutcomes.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-line text-center text-xs text-ink-400">
                      No measurable metrics supplied yet. This section will remain cleanly hidden on public reading views.
                    </div>
                  )}
                </div>
              </div>

              {/* Cover Image & Approved Media */}
              <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider text-opacity-80 flex items-center gap-2">
                      <ImageIcon size={16} />
                      <span>Approved Visual Media & Screenshots</span>
                    </h3>
                    <p className="text-xs text-ink-500">
                      Display authentic dashboard charts, architectures, or customer video responses.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMedia}
                    className="px-3 py-1.5 rounded-lg border border-line bg-warm-100 hover:bg-warm-200 text-xs font-semibold text-ink-800 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add Media</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Hero Cover Image URL
                    </label>
                    <input
                      type="url"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="https://cdn.example.com/cover.png"
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">
                      Video Walkthrough / Interview URL
                    </label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://cdn.example.com/interview.mp4"
                      className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {approvedMedia.map((media, idx) => (
                    <div
                      key={media.id}
                      className="p-3.5 rounded-xl border border-line bg-warm-50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-ink-700">Artifact #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(idx)}
                          className="text-ink-400 hover:text-red-500 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            type="url"
                            value={media.url}
                            onChange={(e) => handleUpdateMedia(idx, { url: e.target.value })}
                            placeholder="Media URL"
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-line bg-surface"
                          />
                        </div>
                        <div>
                          <select
                            value={media.type}
                            onChange={(e) =>
                              handleUpdateMedia(idx, { type: e.target.value as "IMAGE" | "VIDEO" })
                            }
                            className="w-full text-xs px-2 py-1.5 rounded-lg border border-line bg-surface"
                          >
                            <option value="IMAGE">Image / Diagram</option>
                            <option value="VIDEO">Video Clip</option>
                          </select>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={media.caption || ""}
                        onChange={(e) => handleUpdateMedia(idx, { caption: e.target.value })}
                        placeholder="Caption (e.g. SkyTech latency telemetry dashboard)"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-line bg-surface"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SEO & SOCIAL */}
          {activeTab === "seo" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-surface p-6 rounded-2xl border border-line space-y-4">
                <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider text-opacity-80 flex items-center gap-2">
                  <Globe size={16} />
                  <span>Search Engine & Social Metadata</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={`${title} | ${companyName} Customer Story`}
                    className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={3}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder={subtitle || summary || "Description of customer achievements and outcomes."}
                    className="w-full text-xs text-ink-800 p-3 rounded-xl border border-line bg-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    OpenGraph Share Image URL
                  </label>
                  <input
                    type="url"
                    value={ogImageUrl}
                    onChange={(e) => setOgImageUrl(e.target.value)}
                    placeholder="https://cdn.example.com/og-card.png"
                    className="w-full text-xs text-ink-800 px-3 py-2 rounded-xl border border-line bg-surface"
                  />
                </div>
              </div>

              {/* Permission & Publication Verification */}
              <div
                className={cn(
                  "p-6 rounded-2xl border space-y-4",
                  permissionVerified
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-amber-200 bg-amber-50/50"
                )}
              >
                <div className="flex items-center gap-2">
                  {permissionVerified ? (
                    <ShieldCheck size={20} className="text-emerald-600" />
                  ) : (
                    <ShieldAlert size={20} className="text-amber-600" />
                  )}
                  <h3
                    className={cn(
                      "text-sm font-bold uppercase tracking-wider",
                      permissionVerified ? "text-emerald-900" : "text-amber-900"
                    )}
                  >
                    Customer Consent & Publication Verification
                  </h3>
                </div>

                <p
                  className={cn(
                    "text-xs leading-relaxed",
                    permissionVerified ? "text-emerald-800" : "text-amber-800"
                  )}
                >
                  Praise strictly requires recorded customer consent before stories can be published live to protect your brand and customer relationships.
                </p>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="permissionVerifiedCheckbox"
                    checked={permissionVerified}
                    onChange={(e) => setPermissionVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <label
                    htmlFor="permissionVerifiedCheckbox"
                    className="text-xs font-bold text-ink-900 cursor-pointer"
                  >
                    Documented Customer Permission is Verified
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                    Permission Notes / Consent Record
                  </label>
                  <textarea
                    rows={2}
                    value={permissionNotes}
                    onChange={(e) => setPermissionNotes(e.target.value)}
                    placeholder="Record of email approval, signed release, or form submission consent."
                    className="w-full text-xs text-ink-800 p-2.5 rounded-xl border border-line bg-surface"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: LIVE PREVIEW */}
          {activeTab === "preview" && (
            <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border border-line shadow-lg bg-surface">
              <div className="p-3 bg-warm-100 border-b border-line flex items-center justify-between text-xs text-ink-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Eye size={14} />
                  <span>Interactive Story Reading Preview</span>
                </span>
                <Link
                  href={`/stories/${slug}?preview=true`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-brand-600 hover:underline font-semibold"
                >
                  <span>Open in standalone window</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                <StoryReadingView story={previewStory} isPreview />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
