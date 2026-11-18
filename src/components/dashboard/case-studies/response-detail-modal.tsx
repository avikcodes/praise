"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Archive,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Loader2,
  Lock,
  Mail,
  Plus,
  Quote,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Video,
  X,
} from "lucide-react";
import { CaseStudyResponseDetail, CaseStudyResponseStatus, MeasurableOutcome } from "@/lib/case-studies/types";
import { cn } from "@/lib/utils";

type ResponseDetailModalProps = {
  response: CaseStudyResponseDetail;
  workspaceId: string;
  projects?: { id: string; name: string }[];
  brands?: { id: string; name: string }[];
  onClose: () => void;
  onUpdated: (updated: CaseStudyResponseDetail) => void;
  onCreateStory?: (response: CaseStudyResponseDetail) => void;
};

export function ResponseDetailModal({
  response,
  workspaceId,
  projects = [],
  brands = [],
  onClose,
  onUpdated,
  onCreateStory,
}: ResponseDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"statements" | "editorial">("statements");

  // Editorial state
  const [editorialTitle, setEditorialTitle] = useState(
    response.editorialTitle || `${response.companyName}: Case Study`
  );
  const [editorialSubtitle, setEditorialSubtitle] = useState(response.editorialSubtitle || "");
  const [editorialSummary, setEditorialSummary] = useState(response.editorialSummary || "");
  const [editorialNotes, setEditorialNotes] = useState(response.editorialNotes || "");
  const [featuredQuoteOverride, setFeaturedQuoteOverride] = useState(
    response.featuredQuoteOverride || response.primaryQuote || ""
  );
  const [editorialTakeaways, setEditorialTakeaways] = useState<string[]>(
    response.editorialTakeaways.length > 0 ? response.editorialTakeaways : [""]
  );

  // Associations
  const [selectedProjectId, setSelectedProjectId] = useState(response.projectId || "");
  const [selectedBrandId, setSelectedBrandId] = useState(response.brandId || "");

  // Status
  const [status, setStatus] = useState<CaseStudyResponseStatus>(response.status);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Takeaway helpers
  const handleAddTakeaway = () => {
    setEditorialTakeaways((prev) => [...prev, ""]);
  };

  const handleUpdateTakeaway = (index: number, val: string) => {
    setEditorialTakeaways((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveTakeaway = (index: number) => {
    setEditorialTakeaways((prev) => prev.filter((_, i) => i !== index));
  };

  // Save handler
  const handleSave = async (newStatus?: CaseStudyResponseStatus) => {
    setIsSaving(true);
    setError(null);

    const targetStatus = newStatus || status;

    const payload = {
      status: targetStatus,
      editorialTitle: editorialTitle.trim() || null,
      editorialSubtitle: editorialSubtitle.trim() || null,
      editorialSummary: editorialSummary.trim() || null,
      editorialNotes: editorialNotes.trim() || null,
      featuredQuoteOverride: featuredQuoteOverride.trim() || null,
      editorialTakeaways: editorialTakeaways.filter((t) => t.trim()),
      projectId: selectedProjectId || null,
      brandId: selectedBrandId || null,
    };

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/case-studies/responses/${response.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update case study response");
      }

      const data = await res.json();
      setStatus(targetStatus);
      onUpdated(data.response);
    } catch (err: any) {
      setError(err.message || "Failed to update response.");
    } finally {
      setIsSaving(false);
    }
  };

  const statusColors = {
    SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
    UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PUBLISHED: "bg-brand-50 text-brand-700 border-brand-200",
    ARCHIVED: "bg-neutral-100 text-neutral-600 border-neutral-300",
  }[status] || "bg-neutral-100 text-neutral-600 border-neutral-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-line bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line p-6 bg-warm-50/50 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", statusColors)}>
                {status.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-ink-500 font-medium">From form: {response.formTitle}</span>
            </div>

            <h2 className="text-xl font-bold text-ink-900 flex items-center gap-2">
              <span>{response.companyName}</span>
              {response.customerRole && (
                <span className="text-sm font-normal text-ink-500">• {response.customerRole}</span>
              )}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500">
              <span className="flex items-center gap-1">
                <User size={13} className="text-ink-400" />
                <span>{response.customerName}</span>
              </span>
              <span className="flex items-center gap-1">
                <Mail size={13} className="text-ink-400" />
                <span>{response.customerEmail}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-ink-400" />
                <span>Submitted {new Date(response.submittedAt).toLocaleDateString()}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-400 hover:text-ink-700 hover:bg-warm-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-line bg-white px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("statements")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all",
              activeTab === "statements"
                ? "border-brand-500 text-brand-600 bg-brand-50/40"
                : "border-transparent text-ink-600 hover:text-ink-900 hover:border-warm-300"
            )}
          >
            <Lock size={13} className="text-ink-400" />
            <span>Customer's Original Statements</span>
            <span className="rounded-md bg-warm-100 px-1.5 py-0.2 text-[10px] text-ink-500">Immutable</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("editorial")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all",
              activeTab === "editorial"
                ? "border-brand-500 text-brand-600 bg-brand-50/40"
                : "border-transparent text-ink-600 hover:text-ink-900 hover:border-warm-300"
            )}
          >
            <Sparkles size={13} className="text-brand-500" />
            <span>Owner Editorial & Publishing</span>
            {editorialTitle && <span className="w-2 h-2 rounded-full bg-brand-500" />}
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* TAB 1: ORIGINAL CUSTOMER STATEMENTS */}
          {activeTab === "statements" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-line bg-warm-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-900 flex items-center gap-1.5">
                    <Building size={14} className="text-brand-600" />
                    <span>Company & Respondent Background</span>
                  </span>
                  {response.companyWebsite && (
                    <a
                      href={response.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1"
                    >
                      <span>{response.companyWebsite.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-ink-400 font-semibold uppercase">Company Size</span>
                    <p className="font-medium text-ink-800">{response.companySize || "Not specified"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-400 font-semibold uppercase">Industry</span>
                    <p className="font-medium text-ink-800">{response.companyIndustry || "Not specified"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-400 font-semibold uppercase">Respondent</span>
                    <p className="font-medium text-ink-800">{response.customerName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-400 font-semibold uppercase">Role</span>
                    <p className="font-medium text-ink-800">{response.customerRole || "Not specified"}</p>
                  </div>
                </div>
              </div>

              {/* The Challenge / Problem */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <span>Initial Challenge & Problem</span>
                </h4>
                <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 text-xs text-ink-900 leading-relaxed whitespace-pre-wrap">
                  {response.initialProblem}
                </div>
              </div>

              {/* Previous Solutions */}
              {response.previousSolution && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500">
                    Previous Solution & Alternatives
                  </h4>
                  <div className="rounded-2xl border border-line bg-warm-50/40 p-4 text-xs text-ink-800 leading-relaxed whitespace-pre-wrap">
                    {response.previousSolution}
                  </div>
                </div>
              )}

              {/* Implementation & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {response.productImplementation && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      Implementation & Rollout
                    </h4>
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 text-xs text-ink-900 leading-relaxed whitespace-pre-wrap">
                      {response.productImplementation}
                    </div>
                  </div>
                )}

                {response.experienceSummary && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">
                      Day-to-Day Product Experience
                    </h4>
                    <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4 text-xs text-ink-900 leading-relaxed whitespace-pre-wrap">
                      {response.experienceSummary}
                    </div>
                  </div>
                )}
              </div>

              {/* Business Results */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <TrendingUp size={14} />
                  <span>Business Results Achieved</span>
                </h4>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs text-ink-900 leading-relaxed whitespace-pre-wrap">
                  {response.resultsAchieved}
                </div>
              </div>

              {/* Measurable Outcomes Cards */}
              {response.measurableOutcomes.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Measurable Outcomes & Concrete Metrics ({response.measurableOutcomes.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {response.measurableOutcomes.map((m, idx) => (
                      <div key={idx} className="rounded-2xl border border-emerald-200 bg-white p-3.5 shadow-2xs space-y-1">
                        <span className="text-[11px] font-semibold text-ink-600 block line-clamp-1">{m.metric}</span>
                        <div className="text-lg font-black text-emerald-700">{m.improvement}</div>
                        {(m.before || m.after || m.timeframe) && (
                          <div className="text-[10px] text-ink-500 pt-1 border-t border-line">
                            {m.before && m.after && <span>{m.before} → {m.after} • </span>}
                            {m.timeframe && <span>{m.timeframe}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quotes & Peer Advice */}
              {(response.primaryQuote || response.peerAdvice) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {response.primaryQuote && (
                    <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 space-y-2">
                      <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider flex items-center gap-1">
                        <Quote size={12} />
                        <span>Executive Pull Quote</span>
                      </span>
                      <p className="text-xs font-medium italic text-ink-900 leading-relaxed">
                        "{response.primaryQuote}"
                      </p>
                    </div>
                  )}

                  {response.peerAdvice && (
                    <div className="rounded-2xl border border-line bg-warm-50 p-4 space-y-2">
                      <span className="text-[10px] font-bold text-ink-600 uppercase tracking-wider">
                        Advice for Industry Peers
                      </span>
                      <p className="text-xs text-ink-800 leading-relaxed">
                        {response.peerAdvice}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Supporting Media Assets */}
              {((response.imageUrls && response.imageUrls.length > 0) || response.videoUrl) && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-600">
                    Supporting Proof & Media
                  </h4>

                  <div className="flex flex-wrap gap-3">
                    {response.imageUrls?.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-36 h-24 rounded-2xl overflow-hidden border border-line group shadow-2xs"
                      >
                        <Image src={url} alt="Proof" fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />
                      </a>
                    ))}

                    {response.videoUrl && (
                      <div className="w-72 rounded-2xl overflow-hidden border border-line bg-black">
                        <video src={response.videoUrl} controls className="w-full h-auto max-h-40" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Consent Audit Block */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Publication Consent Verified</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Granted by {response.customerName} on {new Date(response.consentTimestamp).toLocaleString()}.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: OWNER EDITORIAL & PUBLISHING */}
          {activeTab === "editorial" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 space-y-1 text-xs">
                <span className="font-bold text-brand-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand-600" />
                  <span>Editorial Integrity Promise</span>
                </span>
                <p className="text-[11px] leading-relaxed text-brand-800">
                  Original customer statements are kept intact and unedited in Tab 1. In this tab, you can craft your marketing headline, executive summary, bulleted takeaways, and internal vetting notes before publishing to brand pages or case study directories.
                </p>
              </div>

              {/* Associations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-800">Associate with Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-xs outline-none focus:border-brand-500"
                    >
                      <option value="">No Project (Workspace-wide)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {brands.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-800">Associate with Brand Profile</label>
                    <select
                      value={selectedBrandId}
                      onChange={(e) => setSelectedBrandId(e.target.value)}
                      className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-xs outline-none focus:border-brand-500"
                    >
                      <option value="">No Brand Profile</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Editorial Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-900">
                  Editorial Headline / Case Study Title
                </label>
                <input
                  type="text"
                  value={editorialTitle}
                  onChange={(e) => setEditorialTitle(e.target.value)}
                  placeholder="e.g. How Acme Corp Scaled Pipeline Conversion 140% with Praise"
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs text-ink-900 font-bold outline-none focus:border-brand-500"
                />
              </div>

              {/* Editorial Subtitle */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-900">
                  Subtitle / Strategic Tagline
                </label>
                <input
                  type="text"
                  value={editorialSubtitle}
                  onChange={(e) => setEditorialSubtitle(e.target.value)}
                  placeholder="e.g. Accelerating B2B trial-to-paid velocity through automated customer proof"
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-xs text-ink-800 outline-none focus:border-brand-500"
                />
              </div>

              {/* Executive Summary */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-900">
                  Executive Narrative Summary / Abstract
                </label>
                <textarea
                  rows={3}
                  value={editorialSummary}
                  onChange={(e) => setEditorialSummary(e.target.value)}
                  placeholder="Synthesize the story, challenge, solution, and results into a crisp 2-paragraph overview..."
                  className="w-full rounded-xl border border-line bg-white p-3 text-xs text-ink-800 outline-none focus:border-brand-500 leading-relaxed"
                />
              </div>

              {/* Key Bulleted Takeaways */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink-900">
                    Key Bulleted Takeaways & Highlights
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTakeaway}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    <Plus size={12} />
                    <span>Add Bullet</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editorialTakeaways.map((takeaway, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-400">•</span>
                      <input
                        type="text"
                        value={takeaway}
                        onChange={(e) => handleUpdateTakeaway(idx, e.target.value)}
                        placeholder="e.g. Reduced customer onboarding duration from 3 weeks to 4 days"
                        className="flex-1 rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink-800 outline-none focus:border-brand-500"
                      />
                      {editorialTakeaways.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTakeaway(idx)}
                          className="text-ink-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Featured Quote Override */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-900">
                  Featured Pull Quote for Marketing
                </label>
                <textarea
                  rows={2}
                  value={featuredQuoteOverride}
                  onChange={(e) => setFeaturedQuoteOverride(e.target.value)}
                  placeholder="Selected pull quote from customer statements..."
                  className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink-800 outline-none focus:border-brand-500 italic"
                />
              </div>

              {/* Internal Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-900">
                  Private Workspace Editorial Notes (Internal Only)
                </label>
                <textarea
                  rows={2}
                  value={editorialNotes}
                  onChange={(e) => setEditorialNotes(e.target.value)}
                  placeholder="Add notes for your marketing and content team..."
                  className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink-700 outline-none focus:border-brand-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-line bg-warm-50/70 p-4 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-600">Lifecycle Status:</span>
            {(
              [
                { id: "SUBMITTED", label: "Submitted" },
                { id: "UNDER_REVIEW", label: "Under Review" },
                { id: "APPROVED", label: "Approved" },
                { id: "PUBLISHED", label: "Published" },
                { id: "ARCHIVED", label: "Archive" },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => handleSave(st.id)}
                disabled={isSaving}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                  status === st.id
                    ? "bg-brand-500 text-white shadow-2xs"
                    : "border border-line bg-white text-ink-700 hover:bg-warm-100"
                )}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {onCreateStory && response.consentGranted && (
              <button
                type="button"
                onClick={() => onCreateStory(response)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors"
                title="Publish or edit as a customer story"
              >
                <Sparkles size={13} className="text-brand-600" />
                <span>Create Customer Story</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
