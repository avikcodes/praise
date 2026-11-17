"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Star,
  User,
  Users2,
  X,
} from "lucide-react";
import { RoutingRuleBuilder } from "@/components/dashboard/surveys/routing-rule-builder";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import {
  SurveyResponseItem,
  SurveyType,
  calculateNps,
  calculateCsat,
  calculateCes,
} from "@/types/surveys";
import { cn } from "@/lib/utils";

export default function SurveyResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const toast = useToast();

  const surveyId = String(params?.surveyId || "");

  const [surveyInfo, setSurveyInfo] = useState<{
    id: string;
    title: string;
    type: SurveyType;
    slug: string;
  } | null>(null);

  const [responses, setResponses] = useState<SurveyResponseItem[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scoreFilter, setScoreFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [showRoutingModal, setShowRoutingModal] = useState(false);

  const fetchResponses = async () => {
    const wsId = activeWorkspace?.id;
    if (!wsId || !surveyId || wsId.startsWith("ws-default")) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/workspaces/${wsId}/surveys/${surveyId}/responses`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load responses.");

      setSurveyInfo(data.survey);
      setResponses(data.responses || []);
      setMetrics(data.metrics || null);
    } catch (err: any) {
      toast.error("Error", err?.message || "Could not fetch responses.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, [activeWorkspace?.id, surveyId]);

  // Filtered responses by score
  const filteredResponses = useMemo(() => {
    if (scoreFilter === "ALL") return responses;
    const target = Number(scoreFilter);
    return responses.filter((r) => r.score === target);
  }, [responses, scoreFilter]);

  // Export handler
  const handleExport = (format: "csv" | "json") => {
    if (!activeWorkspace?.id) return;
    setIsExporting(format);
    const url = `/api/workspaces/${activeWorkspace.id}/surveys/${surveyId}/export?format=${format}`;
    window.location.href = url;
    setTimeout(() => setIsExporting(null), 1500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/surveys")}
            className="p-1.5 rounded-lg border border-line bg-white hover:bg-warm-100 text-ink-600 transition-colors shrink-0"
            aria-label="Back to surveys"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight">
                {surveyInfo?.title || "Survey Responses"}
              </h1>
              {surveyInfo?.type && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-brand-50 border-brand-200 text-brand-700 font-mono">
                  {surveyInfo.type}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              Review individual customer scores, written feedback, and follow-up responses.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchResponses}
            disabled={isLoading}
            className="p-2 rounded-lg border border-line bg-white text-ink-600 hover:bg-warm-100 transition-colors"
            title="Refresh responses"
          >
            <RefreshCw size={15} className={cn(isLoading && "animate-spin")} />
          </button>

          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={isExporting !== null || responses.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white hover:bg-warm-100 text-ink-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport("json")}
            disabled={isExporting !== null || responses.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white hover:bg-warm-100 text-ink-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            <FileText size={14} className="text-blue-600" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRoutingModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white hover:bg-warm-100 text-ink-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Sliders size={14} className="text-brand-600" />
            <span>Routing Rules</span>
          </button>
        </div>
      </div>

      {/* Aggregate Score Analytics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Responses */}
          <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-ink-500">Total Responses</span>
            <p className="text-2xl font-bold text-ink-900 mt-1">{metrics.totalResponses}</p>
            <span className="text-[11px] text-ink-400">All submissions to date</span>
          </div>

          {/* Card 2: Primary Metric Card */}
          {surveyInfo?.type === "NPS" && metrics.nps && (
            <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
              <span className="text-xs font-semibold text-ink-500">Net Promoter Score (NPS)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={cn(
                    "text-2xl font-black",
                    metrics.nps.nps > 30
                      ? "text-emerald-600"
                      : metrics.nps.nps >= 0
                      ? "text-amber-600"
                      : "text-rose-600"
                  )}
                >
                  {metrics.nps.nps > 0 ? `+${metrics.nps.nps}` : metrics.nps.nps}
                </span>
                <span className="text-xs font-medium text-ink-500">score (-100 to +100)</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold mt-1">
                <span className="text-emerald-700">{metrics.nps.promoterPct}% Promoters</span>
                <span className="text-ink-300">·</span>
                <span className="text-rose-700">{metrics.nps.detractorPct}% Detractors</span>
              </div>
            </div>
          )}

          {surveyInfo?.type === "CSAT" && metrics.csat && (
            <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
              <span className="text-xs font-semibold text-ink-500">Customer Satisfaction (CSAT)</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {metrics.csat.csatPercentage}%
              </p>
              <span className="text-[11px] text-ink-400">
                {metrics.csat.satisfied} of {metrics.csat.total} rated Satisfied (4-5)
              </span>
            </div>
          )}

          {surveyInfo?.type === "CES" && metrics.ces && (
            <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
              <span className="text-xs font-semibold text-ink-500">Average Effort Score</span>
              <p className="text-2xl font-bold text-blue-700 mt-1">{metrics.ces.average} / 7</p>
              <span className="text-[11px] text-ink-400">
                {metrics.ces.lowEffortPct}% found the task low-effort
              </span>
            </div>
          )}

          {surveyInfo?.type === "FIVE_STAR" && (
            <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
              <span className="text-xs font-semibold text-ink-500">Average Star Rating</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Star size={20} className="fill-amber-400 text-amber-400" />
                <span className="text-2xl font-bold text-ink-900">{metrics.averageScore}</span>
                <span className="text-xs text-ink-400 font-medium">/ 5.0</span>
              </div>
              <span className="text-[11px] text-ink-400">Across all star reviews</span>
            </div>
          )}

          {/* Card 3: Average Overall Score */}
          <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-ink-500">Average Raw Score</span>
            <p className="text-2xl font-bold text-brand-700 mt-1">
              {metrics.averageScore !== null ? metrics.averageScore : "—"}
            </p>
            <span className="text-[11px] text-ink-400">Arithmetic mean of all ratings</span>
          </div>

          {/* Card 4: Response Rate / Completeness */}
          <div className="rounded-xl border border-line bg-white p-4 shadow-2xs">
            <span className="text-xs font-semibold text-ink-500">Feedback Volume</span>
            <p className="text-2xl font-bold text-ink-900 mt-1">
              {responses.filter((r) => Boolean(r.feedback)).length}
            </p>
            <span className="text-[11px] text-ink-400">
              {responses.length > 0
                ? `${Math.round(
                    (responses.filter((r) => Boolean(r.feedback)).length / responses.length) * 100
                  )}% included written feedback`
                : "No responses yet"}
            </span>
          </div>
        </div>
      )}

      {/* Filter by score bar */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-ink-400" />
          <span className="text-xs font-semibold text-ink-700">Filter by Score:</span>
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink-800 outline-none"
          >
            <option value="ALL">All Scores</option>
            {surveyInfo?.type === "NPS" &&
              [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((s) => (
                <option key={s} value={String(s)}>
                  Score {s} {s >= 9 ? "(Promoter)" : s >= 7 ? "(Passive)" : "(Detractor)"}
                </option>
              ))}
            {surveyInfo?.type === "CSAT" &&
              [5, 4, 3, 2, 1].map((s) => (
                <option key={s} value={String(s)}>
                  Rating {s}
                </option>
              ))}
            {surveyInfo?.type === "CES" &&
              [7, 6, 5, 4, 3, 2, 1].map((s) => (
                <option key={s} value={String(s)}>
                  Effort {s}
                </option>
              ))}
            {surveyInfo?.type === "FIVE_STAR" &&
              [5, 4, 3, 2, 1].map((s) => (
                <option key={s} value={String(s)}>
                  {s} Stars
                </option>
              ))}
          </select>
        </div>

        <span className="text-xs text-ink-500">
          Showing <strong>{filteredResponses.length}</strong> of {responses.length} responses
        </span>
      </div>

      {/* Responses Feed & Detail Table */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <Loader2 size={24} className="animate-spin text-brand-600 mx-auto mb-2" />
          <p className="text-xs text-ink-500">Loading survey responses...</p>
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white p-12 text-center">
          <Inbox size={36} className="mx-auto text-ink-300 mb-2" />
          <h3 className="text-sm font-bold text-ink-900">No responses recorded</h3>
          <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
            {scoreFilter !== "ALL"
              ? "No responses matched this score filter."
              : "Share your survey link or embed widget on your website to start collecting responses."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResponses.map((r) => {
            const isExpanded = expandedId === r.id;
            const hasFollowUpAnswers = Object.keys(r.answers || {}).length > 0;

            // Score Badge styling
            const isPromoter = surveyInfo?.type === "NPS" && r.score !== null && r.score >= 9;
            const isPassive = surveyInfo?.type === "NPS" && r.score !== null && (r.score === 7 || r.score === 8);
            const isDetractor = surveyInfo?.type === "NPS" && r.score !== null && r.score <= 6;

            return (
              <div
                key={r.id}
                className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-2xs space-y-3 hover:border-ink-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Score Badge & Respondent Info */}
                  <div className="flex items-center gap-3">
                    {/* Score badge */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-2xs shrink-0",
                        surveyInfo?.type === "NPS"
                          ? isPromoter
                            ? "bg-emerald-600"
                            : isPassive
                            ? "bg-amber-500"
                            : "bg-rose-500"
                          : surveyInfo?.type === "FIVE_STAR"
                          ? "bg-amber-500"
                          : "bg-brand-600"
                      )}
                    >
                      {surveyInfo?.type === "FIVE_STAR" ? (
                        <div className="flex items-center">
                          <span>{r.score}</span>
                          <Star size={13} className="fill-white text-white ml-0.5" />
                        </div>
                      ) : (
                        r.score
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink-900">
                          {r.respondentName || "Anonymous Respondent"}
                        </span>
                        {r.respondentCompany && (
                          <span className="text-xs font-semibold text-ink-500 bg-warm-100 px-2 py-0.5 rounded-md">
                            {r.respondentCompany}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-ink-400 mt-0.5">
                        {r.respondentEmail && (
                          <span className="text-ink-600">{r.respondentEmail}</span>
                        )}
                        {r.respondentEmail && <span>·</span>}
                        <span>{new Date(r.submittedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Expand details toggle */}
                  {hasFollowUpAnswers && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg transition-colors self-start sm:self-center"
                    >
                      <span>{isExpanded ? "Hide Answers" : "View Follow-up Answers"}</span>
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                  )}
                </div>

                {/* Written feedback quote */}
                {r.feedback && (
                  <div className="rounded-xl border border-line bg-warm-50/60 p-3.5 text-xs text-ink-800 leading-relaxed font-medium">
                    &ldquo;{r.feedback}&rdquo;
                  </div>
                )}

                {/* Expanded Follow-up Question Answers */}
                {isExpanded && hasFollowUpAnswers && (
                  <div className="pt-3 border-t border-dashed border-line space-y-2 animate-in fade-in duration-150">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                      Follow-up Question Responses
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {Object.entries(r.answers).map(([qId, ans]) => (
                        <div key={qId} className="rounded-lg border border-line bg-white p-2.5 space-y-1">
                          <span className="text-[11px] font-semibold text-ink-600 block">
                            Question ID: {qId}
                          </span>
                          <span className="text-xs font-bold text-ink-900 block">
                            {typeof ans === "boolean"
                              ? ans
                                ? "Yes"
                                : "No"
                              : Array.isArray(ans)
                              ? ans.join(", ")
                              : String(ans)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Routing Rules Modal */}
      {showRoutingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl border border-line space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-base font-bold text-ink-900">Feedback Routing & Automations</h3>
              <button
                type="button"
                onClick={() => setShowRoutingModal(false)}
                className="p-1 rounded-lg text-ink-400 hover:bg-warm-100 text-ink-700"
              >
                <X size={18} />
              </button>
            </div>
            <RoutingRuleBuilder
              workspaceId={activeWorkspace?.id || ""}
              surveyId={surveyId}
              surveyType={surveyInfo?.type}
              surveyTitle={surveyInfo?.title}
            />
          </div>
        </div>
      )}
    </div>
  );
}
