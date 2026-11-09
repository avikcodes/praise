"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ExternalLink,
  FileText,
  Filter,
  HelpCircle,
  Inbox,
  LayoutGrid,
  MessageSquareQuote,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  Video,
  Volume2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataCard } from "@/components/dashboard/data-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import {
  AnalyticsDailyTrend,
  AnalyticsPeriod,
  AnalyticsResponse,
} from "@/lib/analytics/types";

export default function AnalyticsPage() {
  const { activeWorkspace, activeProject } = useWorkspace();
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTrend, setHoveredTrend] = useState<AnalyticsDailyTrend | null>(null);
  const [formSearch, setFormSearch] = useState("");
  const [widgetSearch, setWidgetSearch] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const workspaceId = activeWorkspace?.id;
    if (!workspaceId) return;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ period });
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
  }, [activeWorkspace?.id, activeProject?.id, period, reloadTrigger]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setReloadTrigger((prev) => prev + 1);
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

  // Max value for daily trend bars
  const maxTrendSubmissions = Math.max(
    ...dailyTrends.map((d) => d.submissions),
    1
  );

  return (
    <div className="space-y-6">
      {/* Page Header with Period Filters & Refresh */}
      <PageHeader
        title="Analytics & Insights"
        description="Monitor verified customer submissions, form conversion performance, and widget engagement across your workspace."
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
                  onClick={() => setPeriod(p.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    period === p.id
                      ? "bg-brand-500 text-white shadow-2xs"
                      : "text-ink-600 hover:text-ink-900 hover:bg-warm-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

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

      {/* Privacy Notice Pill */}
      <div className="flex items-center gap-2 text-[11px] text-ink-500 px-1">
        <HelpCircle size={12} className="shrink-0 text-ink-400" />
        <span>
          Privacy-conscious analytics: Zero cookies or invasive fingerprinting. Repeated page views within 30 minutes from the same visitor session are automatically deduplicated.
        </span>
      </div>

      {isLoading ? (
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
          {/* 1. Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Submissions */}
            <DataCard
              title="Total Submissions"
              value={summary.totalSubmissions.toString()}
              description={`${summary.approvedSubmissions} approved • ${summary.pendingSubmissions} pending${
                summary.rejectedSubmissions > 0 ? ` • ${summary.rejectedSubmissions} rejected` : ""
              }`}
              icon={MessageSquareQuote}
            />

            {/* Form Views & Submission Rate */}
            <DataCard
              title="Form Submission Rate"
              value={`${summary.formSubmissionRate}%`}
              description={
                summary.formViews > 0
                  ? `${summary.totalSubmissions} submissions from ${summary.formViews.toLocaleString()} views`
                  : summary.totalSubmissions > 0
                  ? `${summary.totalSubmissions} direct submissions`
                  : "No form views recorded yet"
              }
              icon={Inbox}
            />

            {/* Widget Views & Engagement Rate */}
            <DataCard
              title="Widget Engagement"
              value={`${summary.widgetEngagementRate}%`}
              description={
                summary.widgetViews > 0
                  ? `${summary.widgetClicks.toLocaleString()} interactions on ${summary.widgetViews.toLocaleString()} views`
                  : "No widget impressions recorded yet"
              }
              icon={LayoutGrid}
            />

            {/* Customer Satisfaction / Rating */}
            <DataCard
              title="Average Rating"
              value={summary.averageRating ? `${summary.averageRating} / 5.0` : "N/A"}
              description={`${summary.typeDistribution.text} text • ${summary.typeDistribution.video} video${
                summary.typeDistribution.audio > 0 ? ` • ${summary.typeDistribution.audio} audio` : ""
              }`}
              icon={Star}
            />
          </div>

          {/* 2. Simple Charts Section */}
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

              {/* Chart Content or Empty State */}
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
                  {/* Hovered Bar Inspection Pill */}
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

                  {/* Responsive CSS Bar Chart */}
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

                  {/* X-axis date labels */}
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

            {/* Chart 2: Moderation Status & Format Distribution */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs space-y-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink-900">Distribution & Composition</h3>
                <p className="text-xs text-ink-500 mt-0.5">Status breakdown and format types</p>
              </div>

              {summary.totalSubmissions === 0 ? (
                <div className="py-8 text-center text-xs text-ink-400 italic">
                  No submissions to distribute in this period
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Progress Meter */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-ink-700">Moderation Status</span>
                      <span className="text-brand-600">{summary.approvalRate}% Approved</span>
                    </div>

                    <div className="h-3 w-full rounded-full bg-warm-100 flex overflow-hidden">
                      {summary.approvedSubmissions > 0 && (
                        <div
                          style={{ width: `${(summary.approvedSubmissions / summary.totalSubmissions) * 100}%` }}
                          className="bg-emerald-500 transition-all duration-300"
                          title={`Approved: ${summary.approvedSubmissions}`}
                        />
                      )}
                      {summary.pendingSubmissions > 0 && (
                        <div
                          style={{ width: `${(summary.pendingSubmissions / summary.totalSubmissions) * 100}%` }}
                          className="bg-amber-500 transition-all duration-300"
                          title={`Pending: ${summary.pendingSubmissions}`}
                        />
                      )}
                      {summary.rejectedSubmissions > 0 && (
                        <div
                          style={{ width: `${(summary.rejectedSubmissions / summary.totalSubmissions) * 100}%` }}
                          className="bg-rose-400 transition-all duration-300"
                          title={`Rejected: ${summary.rejectedSubmissions}`}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-center">
                      <div className="rounded-lg bg-emerald-50 p-1.5 border border-emerald-100">
                        <div className="font-bold text-emerald-800">{summary.approvedSubmissions}</div>
                        <div className="text-[10px] text-emerald-600">Approved</div>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-1.5 border border-amber-100">
                        <div className="font-bold text-amber-800">{summary.pendingSubmissions}</div>
                        <div className="text-[10px] text-amber-600">Pending</div>
                      </div>
                      <div className="rounded-lg bg-rose-50 p-1.5 border border-rose-100">
                        <div className="font-bold text-rose-800">{summary.rejectedSubmissions}</div>
                        <div className="text-[10px] text-rose-600">Rejected</div>
                      </div>
                    </div>
                  </div>

                  {/* Submission Formats */}
                  <div className="space-y-2 pt-2 border-t border-line">
                    <span className="text-xs font-semibold text-ink-700">Feedback Formats</span>

                    <div className="space-y-2 text-xs">
                      {/* Text */}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-ink-600">
                          <FileText size={13} className="text-brand-500" />
                          <span>Written Text</span>
                        </span>
                        <span className="font-semibold text-ink-900">
                          {summary.typeDistribution.text}{" "}
                          <span className="text-[10px] text-ink-400 font-normal">
                            ({Math.round((summary.typeDistribution.text / summary.totalSubmissions) * 100)}%)
                          </span>
                        </span>
                      </div>

                      {/* Video */}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-ink-600">
                          <Video size={13} className="text-indigo-500" />
                          <span>Video Reviews</span>
                        </span>
                        <span className="font-semibold text-ink-900">
                          {summary.typeDistribution.video}{" "}
                          <span className="text-[10px] text-ink-400 font-normal">
                            ({Math.round((summary.typeDistribution.video / summary.totalSubmissions) * 100)}%)
                          </span>
                        </span>
                      </div>

                      {/* Audio */}
                      {summary.typeDistribution.audio > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-ink-600">
                            <Volume2 size={13} className="text-amber-500" />
                            <span>Audio Clips</span>
                          </span>
                          <span className="font-semibold text-ink-900">
                            {summary.typeDistribution.audio}{" "}
                            <span className="text-[10px] text-ink-400 font-normal">
                              ({Math.round((summary.typeDistribution.audio / summary.totalSubmissions) * 100)}%)
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* View Testimonials Link */}
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
                  <span>Collection Form Performance</span>
                </h3>
                <p className="text-xs text-ink-500 mt-0.5">
                  Conversion metrics and submission rates for each collection link
                </p>
              </div>

              {/* Form Search Input */}
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
                  : "No collection forms created yet. Create a form to begin collecting feedback."}
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
                          <div className="font-semibold text-ink-900 flex items-center gap-1.5">
                            <span>{form.title}</span>
                          </div>
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
                            <Link
                              href="/dashboard/forms"
                              className="rounded px-2 py-1 text-[11px] font-semibold text-ink-600 hover:text-ink-900 hover:bg-warm-100 transition-colors"
                            >
                              Edit
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

          {/* 4. Widget Performance Table */}
          <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                  <LayoutGrid size={16} className="text-brand-600" />
                  <span>Widget & Embed Performance</span>
                </h3>
                <p className="text-xs text-ink-500 mt-0.5">
                  Impression counts, clicks, and interaction rates for active widgets
                </p>
              </div>

              {/* Widget Search Input */}
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
                  : "No widgets configured yet. Create a Wall of Love or widget in the Widgets tab."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-warm-50/70 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Widget Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3 text-right">Impressions (Views)</th>
                      <th className="px-4 py-3 text-right">Interactions (Clicks)</th>
                      <th className="px-4 py-3 text-right">Click-Through Rate</th>
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
                        <td className="px-4 py-3.5 text-right font-medium text-ink-800">
                          {widget.views.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-ink-900">
                          {widget.clicks.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold">
                          <span
                            className={
                              widget.engagementRate >= 5
                                ? "text-emerald-700"
                                : widget.engagementRate > 0
                                ? "text-brand-600"
                                : "text-ink-400"
                            }
                          >
                            {widget.engagementRate}%
                          </span>
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
        </>
      ) : null}
    </div>
  );
}
