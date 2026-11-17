"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Inbox,
  Layers,
  LayoutGrid,
  Loader2,
  MessageSquare,
  MessageSquareQuote,
  MoreVertical,
  PauseCircle,
  Play,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Sliders,
  Sparkles,
  Star,
  Trash2,
  Users2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/dashboard/status-pill";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { SurveyDetail, SurveyType, SurveyStatus } from "@/types/surveys";
import { SURVEY_TEMPLATES } from "@/lib/surveys/templates";
import { SurveyBuilder } from "@/components/dashboard/surveys/survey-builder";
import { cn } from "@/lib/utils";

export default function SurveysPage() {
  const { activeWorkspace } = useWorkspace();
  const toast = useToast();

  const [surveys, setSurveys] = useState<SurveyDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Builder State
  const [isBuilding, setIsBuilding] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<SurveyDetail | null>(null);

  // Embed Modal State
  const [embedSurvey, setEmbedSurvey] = useState<SurveyDetail | null>(null);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Delete & Status Modals
  const [deletingSurvey, setDeletingSurvey] = useState<SurveyDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const isOwnerOrAdmin =
    activeWorkspace?.role === "OWNER" || activeWorkspace?.role === "ADMIN";

  // Fetch surveys from API
  const fetchSurveys = async () => {
    const wsId = activeWorkspace?.id;
    if (!wsId || wsId.startsWith("ws-default")) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/workspaces/${wsId}/surveys`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch surveys.");
      setSurveys(data.surveys || []);
    } catch (err: any) {
      toast.error("Fetch Error", err?.message || "Could not load surveys.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, [activeWorkspace?.id]);

  // Filtered surveys
  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      const matchSearch =
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.slug.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "ALL" || s.type === typeFilter;
      const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [surveys, search, typeFilter, statusFilter]);

  // Aggregate stats
  const totalResponses = useMemo(() => {
    return surveys.reduce((acc, curr) => acc + (curr.submissionsCount || 0), 0);
  }, [surveys]);

  const activeSurveysCount = useMemo(() => {
    return surveys.filter((s) => s.status === "ACTIVE").length;
  }, [surveys]);

  // Delete survey handler
  const handleDeleteConfirm = async () => {
    if (!deletingSurvey || !activeWorkspace?.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/surveys/${deletingSurvey.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete survey.");

      toast.success("Survey Deleted", `"${deletingSurvey.title}" removed.`);
      setSurveys((prev) => prev.filter((s) => s.id !== deletingSurvey.id));
      setDeletingSurvey(null);
    } catch (err: any) {
      toast.error("Delete Error", err?.message || "Failed to delete survey.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Status toggle handler
  const handleToggleStatus = async (survey: SurveyDetail, newStatus: SurveyStatus) => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/surveys/${survey.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status.");

      setSurveys((prev) =>
        prev.map((s) => (s.id === survey.id ? { ...s, status: newStatus } : s))
      );
      toast.success("Status Updated", `Survey is now ${newStatus.toLowerCase()}.`);
    } catch (err: any) {
      toast.error("Status Error", err?.message || "Could not update status.");
    }
  };

  // Launch builder with a chosen template
  const handleStartWithTemplate = (template: typeof SURVEY_TEMPLATES[0]) => {
    const dummySurvey: Partial<SurveyDetail> = {
      title: template.name,
      slug: template.id.replace(/_/g, "-"),
      type: template.type,
      status: "ACTIVE",
      welcomeHeading: template.welcomeHeading,
      welcomeText: template.welcomeText,
      primaryPrompt: template.primaryPrompt,
      feedbackPrompt: template.feedbackPrompt,
      thankYouHeading: template.thankYouHeading,
      thankYouMessage: template.thankYouMessage,
      accentColor: template.accentColor,
      theme: template.theme,
      scoringConfig: template.scoringConfig,
      questions: template.questions.map((q, idx) => ({
        id: `q-${Date.now()}-${idx}`,
        label: q.label,
        description: q.description,
        placeholder: q.placeholder,
        type: q.type,
        isRequired: q.isRequired,
        options: q.options ? [...q.options] : undefined,
        minRating: q.minRating,
        maxRating: q.maxRating,
        orderIndex: idx,
      })),
    };
    setEditingSurvey(dummySurvey as SurveyDetail);
    setIsBuilding(true);
  };

  // If in builder mode, show full SurveyBuilder UI
  if (isBuilding) {
    return (
      <SurveyBuilder
        workspaceId={activeWorkspace?.id || ""}
        initialSurvey={editingSurvey}
        onBack={() => {
          setIsBuilding(false);
          setEditingSurvey(null);
        }}
        onSaved={(savedSurvey) => {
          setSurveys((prev) => {
            const idx = prev.findIndex((s) => s.id === savedSurvey.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = savedSurvey;
              return updated;
            }
            return [savedSurvey, ...prev];
          });
          setIsBuilding(false);
          setEditingSurvey(null);
        }}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
            <span>Customer Surveys</span>
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
              NPS · CSAT · CES
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-500 mt-1">
            Build NPS, CSAT, customer effort, and 5-star surveys with public links, embed widgets, and real-time responses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSurveys}
            disabled={isLoading}
            className="p-2 rounded-lg border border-line bg-white text-ink-600 hover:bg-warm-100 transition-colors"
            title="Refresh surveys"
          >
            <RefreshCw size={15} className={cn(isLoading && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingSurvey(null);
              setIsBuilding(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus size={15} />
            <span>Create Survey</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ink-500 text-xs font-semibold">
            <span>Total Surveys</span>
            <LayoutGrid size={15} className="text-brand-600" />
          </div>
          <p className="text-2xl font-bold text-ink-900 mt-1.5">{surveys.length}</p>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ink-500 text-xs font-semibold">
            <span>Active Campaigns</span>
            <PlayCircle size={15} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1.5">{activeSurveysCount}</p>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-ink-500 text-xs font-semibold">
            <span>Total Responses Collected</span>
            <MessageSquareQuote size={15} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-700 mt-1.5">{totalResponses}</p>
        </div>
      </div>

      {/* Quick Starter Templates Banner (shown if few surveys) */}
      {surveys.length <= 2 && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-600" />
              <h3 className="text-xs sm:text-sm font-bold text-ink-900">
                Quick Start with Proven Survey Templates
              </h3>
            </div>
            <span className="text-[11px] text-ink-500 font-medium hidden sm:inline">
              1-click setup
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {SURVEY_TEMPLATES.slice(0, 4).map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleStartWithTemplate(tpl)}
                className="p-3 rounded-xl border border-brand-200/80 bg-white hover:border-brand-500 text-left transition-all hover:shadow-sm group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-brand-700 font-mono">
                    {tpl.type}
                  </span>
                  <Plus size={13} className="text-brand-500 group-hover:scale-115 transition-transform" />
                </div>
                <h4 className="text-xs font-bold text-ink-900 mt-1 truncate">{tpl.name}</h4>
                <p className="text-[11px] text-ink-500 line-clamp-1 mt-0.5">{tpl.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search surveys by title or slug..."
            className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-xs text-ink-900 outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink-700 outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="NPS">NPS (0–10)</option>
            <option value="CSAT">CSAT (1–5)</option>
            <option value="CES">CES (1–7)</option>
            <option value="FIVE_STAR">Five-Star Rating</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink-700 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Surveys List / Cards */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-12 flex flex-col items-center justify-center text-center">
          <Loader2 size={28} className="animate-spin text-brand-600 mb-2" />
          <p className="text-xs text-ink-500">Loading surveys...</p>
        </div>
      ) : filteredSurveys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center">
          <Inbox size={40} className="mx-auto text-ink-300 mb-3" />
          <h3 className="text-sm font-bold text-ink-900">No surveys found</h3>
          <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1 mb-4">
            {search || typeFilter !== "ALL" || statusFilter !== "ALL"
              ? "No surveys matched your search criteria. Try adjusting your filters."
              : "Create your first customer survey to begin measuring NPS, CSAT, and actionable feedback."}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingSurvey(null);
              setIsBuilding(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors"
          >
            <Plus size={14} />
            <span>Create New Survey</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSurveys.map((survey) => {
            const publicUrl = `/s/${survey.slug}`;
            const fullPublicUrl =
              typeof window !== "undefined" ? `${window.location.origin}${publicUrl}` : publicUrl;

            return (
              <div
                key={survey.id}
                className="rounded-2xl border border-line bg-white p-5 flex flex-col justify-between gap-4 shadow-2xs hover:border-ink-300 transition-all"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono"
                      style={{
                        backgroundColor: `${survey.accentColor || "#7049D8"}15`,
                        color: survey.accentColor || "#7049D8",
                        borderColor: `${survey.accentColor || "#7049D8"}30`,
                      }}
                    >
                      {survey.type}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                        survey.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : survey.status === "PAUSED"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : survey.status === "CLOSED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      )}
                    >
                      {survey.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-ink-900 line-clamp-1">{survey.title}</h3>
                    <p className="text-xs text-ink-500 line-clamp-2 mt-0.5">
                      {survey.primaryPrompt}
                    </p>
                  </div>
                </div>

                {/* Score & Responses Statistics */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line text-center">
                  <div className="p-2 rounded-xl bg-warm-50">
                    <span className="text-[10px] text-ink-500 font-semibold block">Responses</span>
                    <span className="text-base font-bold text-ink-900">
                      {survey.submissionsCount || 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-warm-50">
                    <span className="text-[10px] text-ink-500 font-semibold block">
                      {survey.type === "NPS"
                        ? "Avg Rating"
                        : survey.type === "CSAT"
                        ? "Avg Satisfaction"
                        : survey.type === "CES"
                        ? "Avg Effort"
                        : "Avg Stars"}
                    </span>
                    <span className="text-base font-bold text-brand-700">
                      {survey.averageScore !== null ? survey.averageScore : "—"}
                    </span>
                  </div>
                </div>

                {/* Actions & Links */}
                <div className="space-y-2 pt-2 border-t border-line">
                  <div className="flex items-center justify-between text-xs">
                    {/* View Responses Link */}
                    <Link
                      href={`/dashboard/surveys/${survey.id}/responses`}
                      className="inline-flex items-center gap-1 font-bold text-brand-600 hover:text-brand-700"
                    >
                      <BarChart3 size={13} />
                      <span>View Responses</span>
                    </Link>

                    {/* Copy Link Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(fullPublicUrl);
                        setCopiedSlug(survey.slug);
                        setTimeout(() => setCopiedSlug(null), 2000);
                        toast.success("Link Copied", "Public survey link copied to clipboard.");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-600 hover:text-ink-900 bg-warm-100 px-2 py-1 rounded-lg"
                    >
                      {copiedSlug === survey.slug ? (
                        <Check size={11} className="text-emerald-600" />
                      ) : (
                        <Copy size={11} />
                      )}
                      <span>{copiedSlug === survey.slug ? "Copied" : "Copy Link"}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSurvey(survey);
                          setIsBuilding(true);
                        }}
                        className="p-1.5 rounded-lg border border-line hover:bg-warm-100 text-ink-600"
                        title="Edit Survey"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Embed Code Button */}
                      <button
                        type="button"
                        onClick={() => setEmbedSurvey(survey)}
                        className="p-1.5 rounded-lg border border-line hover:bg-warm-100 text-ink-600"
                        title="Get Embed Code"
                      >
                        <Code2 size={13} />
                      </button>

                      {/* Open Public Page */}
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-line hover:bg-warm-100 text-ink-600"
                        title="Open Public Survey Page"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Quick Pause / Resume Toggle */}
                      {survey.status === "ACTIVE" ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(survey, "PAUSED")}
                          className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 px-2 py-1 rounded-md bg-amber-50"
                        >
                          Pause
                        </button>
                      ) : survey.status === "PAUSED" ? (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(survey, "ACTIVE")}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded-md bg-emerald-50"
                        >
                          Resume
                        </button>
                      ) : null}

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setDeletingSurvey(survey)}
                        className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Survey"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embed Code Modal */}
      {embedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-line space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Code2 size={18} className="text-brand-600" />
                <h3 className="text-base font-bold text-ink-900">Embed Survey Widget</h3>
              </div>
              <button
                type="button"
                onClick={() => setEmbedSurvey(null)}
                className="p-1 rounded-lg text-ink-400 hover:bg-warm-100 text-ink-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-ink-600 leading-relaxed">
              Embed &quot;{embedSurvey.title}&quot; directly into your app or website with this responsive iframe code snippet:
            </p>

            <div className="relative">
              <pre className="p-3.5 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-zinc-800">
                {`<iframe\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/survey/${embedSurvey.id}"\n  width="100%"\n  height="650"\n  frameborder="0"\n  style="border: 0; max-width: 600px; width: 100%;"\n  title="${embedSurvey.title}"\n></iframe>`}
              </pre>
              <button
                type="button"
                onClick={() => {
                  const code = `<iframe\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/survey/${embedSurvey.id}"\n  width="100%"\n  height="650"\n  frameborder="0"\n  style="border: 0; max-width: 600px; width: 100%;"\n  title="${embedSurvey.title}"\n></iframe>`;
                  navigator.clipboard.writeText(code);
                  setCopiedEmbed(true);
                  setTimeout(() => setCopiedEmbed(false), 2000);
                  toast.success("Embed Code Copied", "Iframe snippet copied.");
                }}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold backdrop-blur-xs transition-colors flex items-center gap-1"
              >
                {copiedEmbed ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedEmbed ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setEmbedSurvey(null)}
                className="px-4 py-2 rounded-xl border border-line bg-warm-100 text-xs font-bold text-ink-800 hover:bg-warm-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingSurvey)}
        title="Delete Customer Survey?"
        message={`Are you sure you want to delete "${deletingSurvey?.title}"? All submitted responses for this survey will be permanently removed.`}
        confirmLabel="Delete Survey"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingSurvey(null)}
      />
    </div>
  );
}
