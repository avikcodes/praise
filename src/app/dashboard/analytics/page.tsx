"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  FolderGit2,
  HelpCircle,
  Inbox,
  Info,
  Layers,
  LayoutGrid,
  MessageSquareQuote,
  MousePointerClick,
  Play,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Star,
  TrendingUp,
  Video,
  Volume2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataCard } from "@/components/dashboard/data-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { CampaignAnalyticsView } from "@/components/dashboard/analytics/campaign-analytics-view";
import {
  AnalyticsDailyTrend,
  AnalyticsPeriod,
  AnalyticsResponse,
  METRIC_DEFINITIONS,
} from "@/lib/analytics/types";

type AnalyticsTab = "overview" | "widgets" | "video" | "campaigns";

function AnalyticsContent() {
  const { activeWorkspace, activeProject } = useWorkspace();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") as AnalyticsTab | null;
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    initialTab === "campaigns" || initialTab === "widgets" || initialTab === "video"
      ? initialTab
      : "overview"
  );
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appliedCustomStart, setAppliedCustomStart] = useState<string | null>(null);
  const [appliedCustomEnd, setAppliedCustomEnd] = useState<string | null>(null);

  const workspaceId =
    activeWorkspace && !activeWorkspace.id.startsWith("ws-default")
      ? activeWorkspace.id
      : undefined;

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTrend, setHoveredTrend] = useState<AnalyticsDailyTrend | null>(null);

  // Search filters
  const [formSearch, setFormSearch] = useState("");
  const [widgetSearch, setWidgetSearch] = useState("");
  const [videoSearch, setVideoSearch] = useState("");

  const [showDefinitionsModal, setShowDefinitionsModal] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!workspaceId) return;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (appliedCustomStart && appliedCustomEnd) {
          params.set("period", "custom");
          params.set("startDate", appliedCustomStart);
          params.set("endDate", appliedCustomEnd);
        } else {
          params.set("period", period);
        }

        if (activeProject?.id) {
          params.set("projectId", activeProject.id);
        }

        const res = await fetch(`/api/workspaces/${workspaceId}/analytics?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load analytics");
        }
        const json: AnalyticsResponse = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load analytics data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [
    activeWorkspace?.id,
    activeProject?.id,
    period,
    appliedCustomStart,
    appliedCustomEnd,
    reloadTrigger,
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setReloadTrigger((prev) => prev + 1);
  };

  const handleApplyCustomDate = () => {
    if (customStart && customEnd) {
      setAppliedCustomStart(customStart);
      setAppliedCustomEnd(customEnd);
      setPeriod("custom");
      setIsCustomDateOpen(false);
    }
  };

  const handleClearCustomDate = () => {
    setAppliedCustomStart(null);
    setAppliedCustomEnd(null);
    setPeriod("30d");
    setIsCustomDateOpen(false);
  };

  const formatSeconds = (secs: number) => {
    if (!secs || isNaN(secs)) return "0s";
    const mins = Math.floor(secs / 60);
    const remainder = Math.round(secs % 60);
    if (mins === 0) return `${remainder}s`;
    return `${mins}m ${remainder}s`;
  };

  const summary = data?.summary;
  const dailyTrends = data?.dailyTrends || [];

  // Filter forms by search input
  const filteredForms = (data?.formPerformance || []).filter(
    (f) =>
      f.title.toLowerCase().includes(formSearch.toLowerCase()) ||
      f.slug.toLowerCase().includes(formSearch.toLowerCase()) ||
      (f.projectName && f.projectName.toLowerCase().includes(formSearch.toLowerCase()))
  );

  // Filter widgets by search input
  const filteredWidgets = (data?.widgetPerformance || []).filter(
    (w) =>
      w.name.toLowerCase().includes(widgetSearch.toLowerCase()) ||
      w.type.toLowerCase().includes(widgetSearch.toLowerCase()) ||
      (w.projectName && w.projectName.toLowerCase().includes(widgetSearch.toLowerCase()))
  );

  // Filter video testimonials by search input
  const filteredVideos = (data?.videoPerformance || []).filter(
    (v) =>
      v.customerName.toLowerCase().includes(videoSearch.toLowerCase()) ||
      (v.customerCompany && v.customerCompany.toLowerCase().includes(videoSearch.toLowerCase())) ||
      (v.projectName && v.projectName.toLowerCase().includes(videoSearch.toLowerCase()))
  );

  // Max value for daily trend bars
  const maxTrendSubmissions = Math.max(
    ...dailyTrends.map((d) => d.submissions),
    1
  );
  const maxTrendWidgetViews = Math.max(
    ...dailyTrends.map((d) => d.widgetViews),
    1
  );
  const maxTrendVideoPlays = Math.max(
    ...dailyTrends.map((d) => d.videoPlays),
    1
  );

  return (
    <div className="space-y-6">
      {/* Page Header with Period Filters & Refresh */}
      <PageHeader
        title="Analytics & Insights"
        description="Comprehensive reporting for verified customer testimonials, widget views, CTA conversions, and video media performance."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Period Filter Buttons */}
            <div className="inline-flex items-center rounded-xl border border-line bg-white p-1 shadow-2xs">
              {(
                [
                  { id: "7d", label: "7 Days" },
                  { id: "30d", label: "30 Days" },
                  { id: "90d", label: "90 Days" },
                  { id: "all", label: "All Time" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setAppliedCustomStart(null);
                    setAppliedCustomEnd(null);
                    setPeriod(p.id);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    period === p.id && !appliedCustomStart
                      ? "bg-brand-500 text-white shadow-2xs"
                      : "text-ink-600 hover:text-ink-900 hover:bg-warm-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}

              {/* Custom Date Trigger Button */}
              <button
                type="button"
                onClick={() => setIsCustomDateOpen(!isCustomDateOpen)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  appliedCustomStart
                    ? "bg-brand-500 text-white shadow-2xs"
                    : isCustomDateOpen
                    ? "bg-warm-100 text-ink-900"
                    : "text-ink-600 hover:text-ink-900 hover:bg-warm-100"
                }`}
              >
                <Calendar size={12} />
                <span>
                  {appliedCustomStart && appliedCustomEnd
                    ? `${appliedCustomStart} → ${appliedCustomEnd}`
                    : "Custom"}
                </span>
              </button>
            </div>

            {/* Metric Definitions Guide Button */}
            <button
              type="button"
              onClick={() => setShowDefinitionsModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
              title="Metric Definitions"
            >
              <Info size={13} className="text-brand-600" />
              <span className="hidden sm:inline">Metric Definitions</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin text-brand-600" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Custom Date Range Popover */}
      {isCustomDateOpen && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-brand-900 flex items-center gap-1.5">
              <Calendar size={13} className="text-brand-600" />
              <span>Filter by Custom Date Range:</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
              <span className="text-ink-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyCustomDate}
              disabled={!customStart || !customEnd}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 disabled:opacity-50"
            >
              Apply Filter
            </button>
            {appliedCustomStart && (
              <button
                type="button"
                onClick={handleClearCustomDate}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-warm-100"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCustomDateOpen(false)}
              className="p-1 rounded-md text-ink-400 hover:text-ink-700"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Active Project Filter Notice */}
      {activeProject && (
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-2 text-xs text-brand-900">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-brand-600" />
            <span>
              Showing metrics scoped to project: <strong>{activeProject.name}</strong>
            </span>
          </div>
          <span className="text-[11px] text-brand-700">Switch project in sidebar to change scope</span>
        </div>
      )}

      {/* Privacy & Storage Guarantee Banner */}
      <div className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-2.5 text-[11px] text-ink-600 shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
          <span>
            <strong>Privacy-Preserving & Self-Hosted:</strong> Zero canvas fingerprinting, zero cross-site tracking cookies. Ephemeral 30-minute deduplication hashing with automatic bot filtering. Events are securely stored in your workspace PostgreSQL & local filesystem.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowDefinitionsModal(true)}
          className="underline font-semibold text-brand-600 hover:text-brand-700 shrink-0 ml-3"
        >
          View Methodology
        </button>
      </div>

      {/* Analytics Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-line pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "overview"
              ? "border-brand-500 text-brand-600 bg-brand-50/40"
              : "border-transparent text-ink-600 hover:text-ink-900 hover:border-warm-300"
          }`}
        >
          <TrendingUp size={14} />
          <span>Overview & Trends</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("widgets")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "widgets"
              ? "border-brand-500 text-brand-600 bg-brand-50/40"
              : "border-transparent text-ink-600 hover:text-ink-900 hover:border-warm-300"
          }`}
        >
          <LayoutGrid size={14} />
          <span>Widget Performance</span>
          {summary && summary.widgetViews > 0 && (
            <span className="rounded-full bg-brand-100 text-brand-700 px-1.5 py-0.2 text-[10px]">
              {summary.widgetViews.toLocaleString()}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("video")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "video"
              ? "border-brand-500 text-brand-600 bg-brand-50/40"
              : "border-transparent text-ink-600 hover:text-ink-900 hover:border-warm-300"
          }`}
        >
          <Video size={14} />
          <span>Video & Media Analytics</span>
          {summary && summary.videoPlays > 0 && (
            <span className="rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.2 text-[10px]">
              {summary.videoPlays.toLocaleString()}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "campaigns"
              ? "border-brand-500 text-brand-600 bg-brand-50/40"
              : "border-transparent text-ink-600 hover:text-ink-900 hover:border-warm-300"
          }`}
        >
          <Send size={14} />
          <span>Invitation Campaigns</span>
        </button>
      </div>

      {activeTab === "campaigns" ? (
        workspaceId ? (
          <CampaignAnalyticsView
            workspaceId={workspaceId}
            period={period}
            projectId={activeProject?.id}
            startDate={appliedCustomStart}
            endDate={appliedCustomEnd}
          />
        ) : (
          <EmptyState
            icon={Send}
            title="No workspace selected"
            description="Select an active workspace to view campaign analytics."
          />
        )
      ) : isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl border border-line bg-white p-5 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-2xl border border-line bg-white animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center space-y-3">
          <p className="text-xs font-semibold text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => setReloadTrigger((prev) => prev + 1)}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Try Again
          </button>
        </div>
      ) : summary ? (
        <>
          {/* TAB 1: OVERVIEW & GENERAL TRENDS */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* 1. Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <DataCard
                  title="Total Submissions"
                  value={summary.totalSubmissions.toString()}
                  description={`${summary.approvedSubmissions} approved • ${summary.pendingSubmissions} pending${
                    summary.rejectedSubmissions > 0 ? ` • ${summary.rejectedSubmissions} rejected` : ""
                  }`}
                  icon={MessageSquareQuote}
                />

                <DataCard
                  title="Form Submission Rate"
                  value={`${summary.formSubmissionRate}%`}
                  description={
                    summary.formViews > 0
                      ? `${summary.totalSubmissions} submissions from ${summary.formViews.toLocaleString()} unique views`
                      : summary.totalSubmissions > 0
                      ? `${summary.totalSubmissions} direct submissions`
                      : "No form views recorded yet"
                  }
                  icon={Inbox}
                />

                <DataCard
                  title="Widget Impressions & Views"
                  value={summary.widgetViews.toLocaleString()}
                  description={`${summary.widgetImpressions.toLocaleString()} delivered • ${summary.widgetViewRate}% viewable rate`}
                  icon={Eye}
                />

                <DataCard
                  title="CTA Click-Through"
                  value={`${summary.widgetCtaRate}%`}
                  description={`${summary.widgetCtaClicks.toLocaleString()} CTA clicks • ${summary.widgetInteractions.toLocaleString()} card interactions`}
                  icon={MousePointerClick}
                />
              </div>

              {/* 2. Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Daily Submissions Volume & Status Trend */}
                <div className="lg:col-span-2 rounded-2xl border border-line bg-white p-5 shadow-2xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                        <TrendingUp size={16} className="text-brand-600" />
                        <span>Submission Volume Over Time</span>
                      </h3>
                      <p className="text-xs text-ink-500 mt-0.5">
                        Daily incoming customer reviews grouped by moderation status
                      </p>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="text-ink-600">Approved</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <span className="text-ink-600">Pending</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                        <span className="text-ink-600">Rejected</span>
                      </div>
                    </div>
                  </div>

                  {summary.totalSubmissions === 0 ? (
                    <div className="py-12">
                      <EmptyState
                        title="No Submissions in this Period"
                        description="Share your public collection form link with customers to begin collecting feedback and seeing submission trends."
                        icon={MessageSquareQuote}
                        action={
                          <Link
                            href="/dashboard/forms"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
                          >
                            <span>View Collection Forms</span>
                            <ArrowRight size={13} />
                          </Link>
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-6 flex items-center justify-between text-xs text-ink-600 bg-warm-50 px-3 py-1 rounded-lg border border-line/60">
                        {hoveredTrend ? (
                          <>
                            <span className="font-semibold text-ink-900">{hoveredTrend.label}:</span>
                            <div className="flex items-center gap-3 text-[11px]">
                              <span>
                                Total: <strong>{hoveredTrend.submissions}</strong>
                              </span>
                              <span className="text-emerald-700">
                                Approved: <strong>{hoveredTrend.approved}</strong>
                              </span>
                              <span className="text-amber-700">
                                Pending: <strong>{hoveredTrend.pending}</strong>
                              </span>
                              {hoveredTrend.rejected > 0 && (
                                <span className="text-rose-700">
                                  Rejected: <strong>{hoveredTrend.rejected}</strong>
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-ink-400 italic">Hover over any bar to view daily breakdown</span>
                        )}
                      </div>

                      <div className="h-48 flex items-end gap-1 sm:gap-2 pt-4 px-1 border-b border-line">
                        {dailyTrends.map((trend) => {
                          const total = trend.submissions;
                          const heightPercent = total > 0 ? Math.max((total / maxTrendSubmissions) * 100, 8) : 0;
                          const isHovered = hoveredTrend?.date === trend.date;

                          const approvedPercent = total > 0 ? (trend.approved / total) * 100 : 0;
                          const pendingPercent = total > 0 ? (trend.pending / total) * 100 : 0;
                          const rejectedPercent = total > 0 ? (trend.rejected / total) * 100 : 0;

                          return (
                            <div
                              key={trend.date}
                              onMouseEnter={() => setHoveredTrend(trend)}
                              onMouseLeave={() => setHoveredTrend(null)}
                              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                            >
                              {total > 0 ? (
                                <div
                                  style={{ height: `${heightPercent}%` }}
                                  className={`w-full max-w-[28px] rounded-t flex flex-col-reverse overflow-hidden transition-all duration-150 ${
                                    isHovered ? "ring-2 ring-brand-500 ring-offset-1 scale-105" : "hover:opacity-90"
                                  }`}
                                >
                                  {trend.approved > 0 && (
                                    <div
                                      style={{ height: `${approvedPercent}%` }}
                                      className="w-full bg-emerald-500"
                                    />
                                  )}
                                  {trend.pending > 0 && (
                                    <div
                                      style={{ height: `${pendingPercent}%` }}
                                      className="w-full bg-amber-500"
                                    />
                                  )}
                                  {trend.rejected > 0 && (
                                    <div
                                      style={{ height: `${rejectedPercent}%` }}
                                      className="w-full bg-rose-400"
                                    />
                                  )}
                                </div>
                              ) : (
                                <div className="w-full max-w-[28px] h-1 bg-warm-200 rounded-t" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-ink-400 px-1 font-mono">
                        <span>{dailyTrends[0]?.label}</span>
                        {dailyTrends.length > 2 && (
                          <span>{dailyTrends[Math.floor(dailyTrends.length / 2)]?.label}</span>
                        )}
                        <span>{dailyTrends[dailyTrends.length - 1]?.label}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chart 2: Format & Status Composition */}
                <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs space-y-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-ink-900">Format & Quality</h3>
                    <p className="text-xs text-ink-500 mt-0.5">Media distribution and customer rating</p>
                  </div>

                  <div className="space-y-4">
                    {/* Average Rating Highlight */}
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-semibold text-amber-800">Average Rating</div>
                        <div className="text-xl font-extrabold text-amber-900">
                          {summary.averageRating ? `${summary.averageRating} / 5.0` : "No ratings"}
                        </div>
                      </div>
                      <div className="flex items-center text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            className={
                              summary.averageRating && s <= Math.round(summary.averageRating)
                                ? "fill-amber-400 text-amber-400"
                                : "text-amber-200"
                            }
                          />
                        ))}
                      </div>
                    </div>

                    {/* Media Type Breakdown */}
                    <div className="space-y-2 pt-2 border-t border-line">
                      <span className="text-xs font-semibold text-ink-700">Testimonial Media Types</span>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-ink-600">
                            <FileText size={13} className="text-brand-500" />
                            <span>Written Text</span>
                          </span>
                          <span className="font-semibold text-ink-900">
                            {summary.typeDistribution.text}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-ink-600">
                            <Video size={13} className="text-indigo-500" />
                            <span>Video Testimonials</span>
                          </span>
                          <span className="font-semibold text-ink-900">
                            {summary.typeDistribution.video}
                          </span>
                        </div>

                        {summary.typeDistribution.audio > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-ink-600">
                              <Volume2 size={13} className="text-amber-500" />
                              <span>Audio Clips</span>
                            </span>
                            <span className="font-semibold text-ink-900">
                              {summary.typeDistribution.audio}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-line">
                    <Link
                      href="/dashboard/testimonials"
                      className="inline-flex items-center justify-between w-full text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      <span>Review in Testimonial Inbox</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* 3. Form Performance Table */}
              <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
                <div className="p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                      <Inbox size={16} className="text-brand-600" />
                      <span>Collection Form Conversion Performance</span>
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Submissions and conversion rates per collection link
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-ink-400" />
                    <input
                      type="text"
                      value={formSearch}
                      onChange={(e) => setFormSearch(e.target.value)}
                      placeholder="Filter forms..."
                      className="w-full rounded-lg border border-line pl-8 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {filteredForms.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-500">
                    {formSearch
                      ? "No forms match your search query."
                      : "No collection forms created yet."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-line bg-warm-50/70 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-5 py-3">Form Title</th>
                          <th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Unique Views</th>
                          <th className="px-4 py-3 text-right">Submissions</th>
                          <th className="px-4 py-3 text-right">Conversion Rate</th>
                          <th className="px-4 py-3 text-right">Approved</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredForms.map((form) => (
                          <tr key={form.id} className="hover:bg-warm-50/50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-ink-900">{form.title}</div>
                              <span className="text-[11px] font-mono text-ink-400">/p/{form.slug}</span>
                            </td>
                            <td className="px-4 py-3.5 text-ink-600">
                              {form.projectName || <span className="text-ink-400 italic">Workspace</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  form.isPublished
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-warm-100 text-ink-600 border border-line"
                                }`}
                              >
                                {form.isPublished ? "Published" : "Draft"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-ink-800">
                              {form.views.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-ink-900">
                              {form.submissions.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold">
                              <span
                                className={
                                  form.submissionRate >= 20
                                    ? "text-emerald-700"
                                    : form.submissionRate > 0
                                    ? "text-brand-600"
                                    : "text-ink-400"
                                }
                              >
                                {form.submissionRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right text-emerald-700 font-semibold">
                              {form.approvedCount}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  href={`/p/${form.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded p-1 text-ink-400 hover:text-brand-600 hover:bg-warm-100 transition-colors"
                                  title="Open public form"
                                >
                                  <ExternalLink size={13} />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WIDGET ANALYTICS & PROJECT BREAKDOWN */}
          {activeTab === "widgets" && (
            <div className="space-y-6">
              {/* Widget Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <DataCard
                  title="Widget Impressions"
                  value={summary.widgetImpressions.toLocaleString()}
                  description="Initial embed loads delivered on client pages"
                  icon={Layers}
                />

                <DataCard
                  title="Viewable Impressions (Views)"
                  value={summary.widgetViews.toLocaleString()}
                  description={`${summary.widgetViewRate}% viewable rate (>=50% viewport dwell)`}
                  icon={Eye}
                />

                <DataCard
                  title="CTA Clicks & CTR"
                  value={summary.widgetCtaClicks.toLocaleString()}
                  description={`${summary.widgetCtaRate}% click-through rate on primary CTAs`}
                  icon={MousePointerClick}
                />

                <DataCard
                  title="Testimonial Interactions"
                  value={summary.widgetInteractions.toLocaleString()}
                  description={`${summary.widgetInteractionRate}% interaction rate on individual cards`}
                  icon={LayoutGrid}
                />
              </div>

              {/* Daily Widget Engagement Chart */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                      <TrendingUp size={16} className="text-brand-600" />
                      <span>Daily Widget Views & CTA Interactions</span>
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Visual dwell time vs direct user clicks
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                      <span className="text-ink-600">Widget Views</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-ink-600">CTA Clicks</span>
                    </div>
                  </div>
                </div>

                {summary.widgetViews === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      title="No Widget Views Recorded"
                      description="Embed your testimonials widget on your landing page or website to start collecting impression and interaction telemetry."
                      icon={LayoutGrid}
                      action={
                        <Link
                          href="/dashboard/widgets"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
                        >
                          <span>Explore Widgets</span>
                          <ArrowRight size={13} />
                        </Link>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-44 flex items-end gap-1 sm:gap-2 pt-4 px-1 border-b border-line">
                      {dailyTrends.map((trend) => {
                        const views = trend.widgetViews;
                        const heightPercent = views > 0 ? Math.max((views / maxTrendWidgetViews) * 100, 8) : 0;
                        const clicks = trend.widgetCtaClicks;

                        return (
                          <div
                            key={trend.date}
                            className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                            title={`${trend.label}: ${views} views, ${clicks} CTA clicks`}
                          >
                            {views > 0 ? (
                              <div
                                style={{ height: `${heightPercent}%` }}
                                className="w-full max-w-[24px] rounded-t bg-brand-500 group-hover:bg-brand-600 transition-all flex flex-col justify-end"
                              >
                                {clicks > 0 && (
                                  <div
                                    style={{ height: `${Math.min((clicks / views) * 100, 100)}%` }}
                                    className="w-full bg-emerald-400 rounded-t"
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="w-full max-w-[24px] h-1 bg-warm-200 rounded-t" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-ink-400 px-1 font-mono">
                      <span>{dailyTrends[0]?.label}</span>
                      {dailyTrends.length > 2 && (
                        <span>{dailyTrends[Math.floor(dailyTrends.length / 2)]?.label}</span>
                      )}
                      <span>{dailyTrends[dailyTrends.length - 1]?.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Table 1: Individual Widget Performance */}
              <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
                <div className="p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                      <LayoutGrid size={16} className="text-brand-600" />
                      <span>Individual Widget & Embed Performance</span>
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Impressions, views, CTA clicks, and card interaction rates
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-ink-400" />
                    <input
                      type="text"
                      value={widgetSearch}
                      onChange={(e) => setWidgetSearch(e.target.value)}
                      placeholder="Filter widgets..."
                      className="w-full rounded-lg border border-line pl-8 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {filteredWidgets.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-500">
                    {widgetSearch
                      ? "No widgets match your search query."
                      : "No active widgets configured yet."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-line bg-warm-50/70 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-5 py-3">Widget Name</th>
                          <th className="px-4 py-3">Layout Type</th>
                          <th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3 text-right">Impressions</th>
                          <th className="px-4 py-3 text-right">Views (Dwell)</th>
                          <th className="px-4 py-3 text-right">CTA Clicks</th>
                          <th className="px-4 py-3 text-right">CTR (%)</th>
                          <th className="px-4 py-3 text-right">Card Interactions</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredWidgets.map((widget) => (
                          <tr key={widget.id} className="hover:bg-warm-50/50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-ink-900">{widget.name}</div>
                              {widget.slug && (
                                <span className="text-[11px] font-mono text-ink-400">/w/{widget.slug}</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                                {widget.type.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-ink-600">
                              {widget.projectName || <span className="text-ink-400 italic">Workspace</span>}
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-ink-700">
                              {widget.impressions.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-ink-900">
                              {widget.views.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
                              {widget.ctaClicks.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold">
                              <span className={widget.ctaRate > 0 ? "text-emerald-700" : "text-ink-400"}>
                                {widget.ctaRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-ink-800">
                              {widget.interactions.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {widget.slug && (
                                  <Link
                                    href={`/w/${widget.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded p-1 text-ink-400 hover:text-brand-600 hover:bg-warm-100 transition-colors"
                                    title="Open public Wall of Love"
                                  >
                                    <ExternalLink size={13} />
                                  </Link>
                                )}
                                <Link
                                  href="/dashboard/widgets"
                                  className="rounded px-2 py-1 text-[11px] font-semibold text-ink-600 hover:text-ink-900 hover:bg-warm-100 transition-colors"
                                >
                                  Configure
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Table 2: Widget Performance Grouped by Project */}
              <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
                <div className="p-5 border-b border-line">
                  <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                    <FolderGit2 size={16} className="text-brand-600" />
                    <span>Widget Performance by Project</span>
                  </h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Aggregated widget reach and engagement across your assigned projects
                  </p>
                </div>

                {(data?.widgetByProject || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-500">
                    No project-assigned widget performance data available for this period.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-line bg-warm-50/70 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-5 py-3">Project Name</th>
                          <th className="px-4 py-3 text-right">Active Widgets</th>
                          <th className="px-4 py-3 text-right">Impressions</th>
                          <th className="px-4 py-3 text-right">Views</th>
                          <th className="px-4 py-3 text-right">CTA Clicks</th>
                          <th className="px-4 py-3 text-right">Average CTR</th>
                          <th className="px-4 py-3 text-right">Card Interactions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {(data?.widgetByProject || []).map((proj) => (
                          <tr key={proj.projectId} className="hover:bg-warm-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-ink-900 flex items-center gap-2">
                              <FolderGit2 size={14} className="text-brand-600 shrink-0" />
                              <span>{proj.projectName}</span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-ink-700">
                              {proj.widgetCount}
                            </td>
                            <td className="px-4 py-3.5 text-right text-ink-700">
                              {proj.impressions.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-ink-900">
                              {proj.views.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
                              {proj.ctaClicks.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                              {proj.ctaRate}%
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-ink-800">
                              {proj.interactions.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: VIDEO & MEDIA ANALYTICS */}
          {activeTab === "video" && (
            <div className="space-y-6">
              {/* Video Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <DataCard
                  title="Total Video Plays"
                  value={summary.videoPlays.toLocaleString()}
                  description="HTML5 video playback starts initiated by visitors"
                  icon={Play}
                />

                <DataCard
                  title="Total Playback Duration"
                  value={formatSeconds(summary.totalPlaybackDurationSeconds)}
                  description="Cumulative watch time across all viewer sessions"
                  icon={Clock}
                />

                <DataCard
                  title="Average Watch Time"
                  value={formatSeconds(summary.averageWatchTimeSeconds)}
                  description="Mean view duration per video playback session"
                  icon={Eye}
                />

                <DataCard
                  title="Video Completion Rate"
                  value={`${summary.videoCompletionRate}%`}
                  description={`${summary.completedPlays.toLocaleString()} plays watched to >=90% completion`}
                  icon={CheckCircle2}
                />
              </div>

              {/* Daily Video Plays Chart */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                      <Video size={16} className="text-indigo-600" />
                      <span>Daily Video Plays & Completions</span>
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Volume of video starts vs completed video sessions
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      <span className="text-ink-600">Video Plays</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-ink-600">Completions</span>
                    </div>
                  </div>
                </div>

                {summary.videoPlays === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      title="No Video Testimonials Watched Yet"
                      description="Collect video testimonials or embed a Video Widget on your website to start observing video completion and watch-time telemetry."
                      icon={Video}
                      action={
                        <Link
                          href="/dashboard/video-studio"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 transition-colors"
                        >
                          <span>Open Video Studio</span>
                          <ArrowRight size={13} />
                        </Link>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-44 flex items-end gap-1 sm:gap-2 pt-4 px-1 border-b border-line">
                      {dailyTrends.map((trend) => {
                        const plays = trend.videoPlays;
                        const heightPercent = plays > 0 ? Math.max((plays / maxTrendVideoPlays) * 100, 8) : 0;
                        const comps = trend.videoCompletions;

                        return (
                          <div
                            key={trend.date}
                            className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                            title={`${trend.label}: ${plays} plays, ${comps} completions`}
                          >
                            {plays > 0 ? (
                              <div
                                style={{ height: `${heightPercent}%` }}
                                className="w-full max-w-[24px] rounded-t bg-indigo-500 group-hover:bg-indigo-600 transition-all flex flex-col justify-end"
                              >
                                {comps > 0 && (
                                  <div
                                    style={{ height: `${Math.min((comps / plays) * 100, 100)}%` }}
                                    className="w-full bg-emerald-400 rounded-t"
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="w-full max-w-[24px] h-1 bg-warm-200 rounded-t" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-ink-400 px-1 font-mono">
                      <span>{dailyTrends[0]?.label}</span>
                      {dailyTrends.length > 2 && (
                        <span>{dailyTrends[Math.floor(dailyTrends.length / 2)]?.label}</span>
                      )}
                      <span>{dailyTrends[dailyTrends.length - 1]?.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Table 1: Individual Video Testimonial Performance */}
              <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
                <div className="p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                      <Play size={16} className="text-indigo-600" />
                      <span>Video Testimonial Performance</span>
                    </h3>
                    <p className="text-xs text-ink-500 mt-0.5">
                      Plays, watch duration, average watch time, and completion rates per video
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-ink-400" />
                    <input
                      type="text"
                      value={videoSearch}
                      onChange={(e) => setVideoSearch(e.target.value)}
                      placeholder="Filter videos..."
                      className="w-full rounded-lg border border-line pl-8 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {filteredVideos.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-500">
                    {videoSearch
                      ? "No video testimonials match your search query."
                      : "No approved video testimonials found in this workspace."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-line bg-warm-50/70 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-5 py-3">Customer Review</th>
                          <th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3 text-right">Length</th>
                          <th className="px-4 py-3 text-right">Plays</th>
                          <th className="px-4 py-3 text-right">Total Watch Time</th>
                          <th className="px-4 py-3 text-right">Avg Watch Time</th>
                          <th className="px-4 py-3 text-right">Completion Rate</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {filteredVideos.map((video) => (
                          <tr key={video.testimonialId} className="hover:bg-warm-50/50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                {video.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={video.avatarUrl}
                                    alt={video.customerName}
                                    className="h-8 w-8 rounded-full object-cover border border-line shrink-0"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                    {video.customerName.slice(0, 2)}
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-ink-900">{video.customerName}</div>
                                  {video.customerCompany && (
                                    <span className="text-[11px] text-ink-400">{video.customerCompany}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-ink-600">
                              {video.projectName || <span className="text-ink-400 italic">Workspace</span>}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-ink-600">
                              {video.videoDurationSeconds > 0 ? `${video.videoDurationSeconds}s` : "N/A"}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-ink-900">
                              {video.plays.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-ink-800">
                              {formatSeconds(video.totalWatchTimeSeconds)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-indigo-700">
                              {formatSeconds(video.averageWatchTimeSeconds)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold">
                              <span
                                className={
                                  video.completionRate >= 50
                                    ? "text-emerald-700"
                                    : video.completionRate > 0
                                    ? "text-indigo-600"
                                    : "text-ink-400"
                                }
                              >
                                {video.completionRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <Link
                                href={`/dashboard/video-studio`}
                                className="rounded px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors"
                              >
                                Studio
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Table 2: Video Engagement Grouped by Widget */}
              <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
                <div className="p-5 border-b border-line">
                  <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                    <LayoutGrid size={16} className="text-indigo-600" />
                    <span>Video Engagement by Widget</span>
                  </h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Attribution of video consumption to specific widgets and embeds
                  </p>
                </div>

                {(data?.videoByWidget || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-500">
                    No video engagement recorded across widgets yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-line bg-warm-50/70 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-5 py-3">Widget Name</th>
                          <th className="px-4 py-3">Layout Type</th>
                          <th className="px-4 py-3">Project</th>
                          <th className="px-4 py-3 text-right">Video Plays</th>
                          <th className="px-4 py-3 text-right">Total Watch Time</th>
                          <th className="px-4 py-3 text-right">Avg Watch Time</th>
                          <th className="px-4 py-3 text-right">Completion Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {(data?.videoByWidget || []).map((vw) => (
                          <tr key={vw.widgetId} className="hover:bg-warm-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-ink-900">{vw.widgetName}</td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {vw.widgetType.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-ink-600">
                              {vw.projectName || <span className="text-ink-400 italic">Workspace</span>}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-ink-900">
                              {vw.videoPlays.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-ink-800">
                              {formatSeconds(vw.totalWatchTimeSeconds)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-indigo-700">
                              {formatSeconds(vw.averageWatchTimeSeconds)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                              {vw.completionRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Table 3: Video Performance Grouped by Project */}
              <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
                <div className="p-5 border-b border-line">
                  <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                    <FolderGit2 size={16} className="text-indigo-600" />
                    <span>Video Performance by Project</span>
                  </h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Aggregated media consumption and completion across your projects
                  </p>
                </div>

                {(data?.videoByProject || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-500">
                    No video performance data assigned to projects in this period.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-line bg-warm-50/70 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-5 py-3">Project Name</th>
                          <th className="px-4 py-3 text-right">Video Count</th>
                          <th className="px-4 py-3 text-right">Video Plays</th>
                          <th className="px-4 py-3 text-right">Total Watch Time</th>
                          <th className="px-4 py-3 text-right">Avg Watch Time</th>
                          <th className="px-4 py-3 text-right">Completion Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {(data?.videoByProject || []).map((proj) => (
                          <tr key={proj.projectId} className="hover:bg-warm-50/50 transition-colors">
                            <td className="px-5 py-3.5 font-bold text-ink-900 flex items-center gap-2">
                              <FolderGit2 size={14} className="text-indigo-600 shrink-0" />
                              <span>{proj.projectName}</span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-ink-700">
                              {proj.videoCount}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-ink-900">
                              {proj.videoPlays.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium text-ink-800">
                              {formatSeconds(proj.totalWatchTimeSeconds)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-indigo-700">
                              {formatSeconds(proj.averageWatchTimeSeconds)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                              {proj.completionRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* METRIC DEFINITIONS & METHODOLOGY MODAL */}
      {showDefinitionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-xl space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-brand-600" />
                  <span>Metric Definitions & Methodology</span>
                </h3>
                <p className="text-xs text-ink-500 mt-1">
                  How Praise measures, deduplicates, and reports social proof engagement without collecting personal data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDefinitionsModal(false)}
                className="rounded-lg p-1.5 text-ink-400 hover:text-ink-700 hover:bg-warm-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Privacy Architecture Notice */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2 text-xs text-emerald-900">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Zero Fingerprinting & Self-Hosted Telemetry</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                Praise does not store IP addresses, hardware identifiers, or tracking cookies. Deduplication uses an ephemeral sliding window (30-minute memory hash with daily rotating salts) to discard repeated views while respecting user privacy. All event storage is fully self-hosted within your deployment database and filesystem.
              </p>
            </div>

            {/* Definitions List */}
            <div className="space-y-4">
              {Object.entries(METRIC_DEFINITIONS).map(([key, def]) => (
                <div key={key} className="rounded-xl border border-line bg-warm-50/50 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink-900">{def.name}</span>
                    <span className="rounded-md bg-white border border-line px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                      {def.category}
                    </span>
                  </div>
                  <p className="text-xs text-ink-700">{def.shortDescription}</p>
                  <div className="pt-1 text-[11px] font-mono text-ink-500">
                    Calculation: {def.calculationMethod}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-line flex justify-end">
              <button
                type="button"
                onClick={() => setShowDefinitionsModal(false)}
                className="rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500" />
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
