"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  FolderKanban,
  Inbox,
  LayoutGrid,
  Loader2,
  MessageSquareQuote,
  Plus,
  RefreshCw,
  Star,
  Users2,
  Video,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataCard } from "@/components/dashboard/data-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusPill } from "@/components/dashboard/status-pill";
import { useWorkspace } from "@/components/dashboard/workspace-context";

type OverviewData = {
  counts: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    archived: number;
    forms: number;
    projects: number;
    customers: number;
    widgets: number;
    averageRating: number | null;
  };
  recentSubmissions: Array<{
    id: string;
    content: string;
    rating: number | null;
    type: "TEXT" | "VIDEO" | "AUDIO";
    status: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
    submittedAt: string;
    customer: {
      id: string;
      name: string;
      email: string;
      company?: string | null;
      title?: string | null;
      avatarUrl?: string | null;
    } | null;
    project: {
      id: string;
      name: string;
      slug: string;
      color?: string | null;
    } | null;
    form: {
      id: string;
      title: string;
      slug: string;
    } | null;
    mediaAssets: Array<{
      id: string;
      type: "VIDEO" | "IMAGE" | "AUDIO";
      url: string;
      mimeType: string;
      fileSizeBytes?: number | null;
    }>;
  }>;
  recentActivity: Array<{
    id: string;
    type: "TESTIMONIAL" | "FORM" | "PROJECT";
    title: string;
    description: string;
    timestamp: string;
    link?: string;
    badge?: string;
  }>;
  submissionTrends: Array<{
    date: string;
    label: string;
    count: number;
    pendingCount: number;
    approvedCount: number;
  }>;
};

export default function DashboardOverviewPage() {
  const { activeWorkspace, activeProject } = useWorkspace();
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredTrend, setHoveredTrend] = useState<{
    date: string;
    label: string;
    count: number;
    pendingCount: number;
    approvedCount: number;
  } | null>(null);

  const workspaceId = activeWorkspace?.id;

  const fetchOverview = useCallback(
    async (showRefreshIndicator = false) => {
      if (!workspaceId) return;
      if (showRefreshIndicator) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/overview`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load overview data:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function loadInitial() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/overview`);
        if (res.ok && isMounted) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load overview data:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  const counts = data?.counts || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
    forms: 0,
    projects: 0,
    customers: 0,
    widgets: 0,
    averageRating: null,
  };

  const total14Days =
    data?.submissionTrends?.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const maxTrendCount =
    data?.submissionTrends?.reduce(
      (max, item) => (item.count > max ? item.count : max),
      0,
    ) ?? 0;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <PageHeader
        title={`${activeWorkspace?.name || "Workspace"} Overview`}
        description={
          activeProject
            ? `Active project "${activeProject.name}". Overview of incoming testimonials, approval queues, and response trends.`
            : `Workspace operational dashboard. Review incoming testimonials, monitor approval queues, and track submissions.`
        }
        badge={
          counts.pending > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              {counts.pending} pending review
            </span>
          ) : (
            <StatusPill status="Up to date" variant="active" />
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchOverview(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors disabled:opacity-50"
              title="Refresh dashboard metrics"
            >
              <RefreshCw
                size={13}
                className={isRefreshing ? "animate-spin text-brand-600" : "text-ink-500"}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/dashboard/testimonials"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
            >
              <Inbox size={14} className="text-ink-400" />
              <span>Inbox ({counts.total})</span>
            </Link>
            <Link
              href="/dashboard/forms"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
            >
              <Plus size={14} />
              <span>New Form</span>
            </Link>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Submissions */}
        <DataCard
          title="Total Submissions"
          value={isLoading ? "..." : String(counts.total)}
          description={`${counts.approved} approved • ${counts.pending} pending`}
          icon={MessageSquareQuote}
        />

        {/* Pending Submissions */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">
              Pending Submissions
            </span>
            <div
              className={`rounded-lg p-2 ${
                counts.pending > 0
                  ? "bg-amber-50 text-amber-600"
                  : "bg-warm-100 text-ink-500"
              }`}
            >
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink-900">
              {isLoading ? "..." : counts.pending}
            </span>
            {counts.pending > 0 && (
              <span className="text-[11px] font-semibold text-amber-600">
                Action required
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-ink-500">
            <span>Awaiting owner review</span>
            {counts.pending > 0 && (
              <Link
                href="/dashboard/testimonials?status=pending"
                className="text-brand-600 hover:text-brand-700 font-medium"
              >
                Review queue &rarr;
              </Link>
            )}
          </div>
        </div>

        {/* Approved Testimonials */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">
              Approved Testimonials
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink-900">
              {isLoading ? "..." : counts.approved}
            </span>
            {counts.averageRating && (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                <Star size={12} className="fill-amber-400" />
                {counts.averageRating} avg
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Publishable in widgets &amp; Wall of Love
          </p>
        </div>

        {/* Rejected & Archived */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-500">
              Rejected &amp; Archived
            </span>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-500">
              <XCircle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink-900">
              {isLoading ? "..." : counts.rejected + counts.archived}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {counts.rejected} rejected • {counts.archived} archived
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Shortcuts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/forms"
          className="group flex items-center justify-between rounded-xl border border-line bg-white p-3.5 shadow-2xs hover:border-brand-300 hover:bg-warm-50/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-50 p-2 text-brand-600 group-hover:scale-105 transition-transform">
              <FileText size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-900">Collection Forms</div>
              <div className="text-[11px] text-ink-500">{counts.forms} forms configured</div>
            </div>
          </div>
          <ArrowRight size={13} className="text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/dashboard/projects"
          className="group flex items-center justify-between rounded-xl border border-line bg-white p-3.5 shadow-2xs hover:border-brand-300 hover:bg-warm-50/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600 group-hover:scale-105 transition-transform">
              <FolderKanban size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-900">Projects</div>
              <div className="text-[11px] text-ink-500">{counts.projects} active projects</div>
            </div>
          </div>
          <ArrowRight size={13} className="text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/dashboard/customers"
          className="group flex items-center justify-between rounded-xl border border-line bg-white p-3.5 shadow-2xs hover:border-brand-300 hover:bg-warm-50/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 group-hover:scale-105 transition-transform">
              <Users2 size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-900">Customers</div>
              <div className="text-[11px] text-ink-500">{counts.customers} respondents</div>
            </div>
          </div>
          <ArrowRight size={13} className="text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/dashboard/widgets"
          className="group flex items-center justify-between rounded-xl border border-line bg-white p-3.5 shadow-2xs hover:border-brand-300 hover:bg-warm-50/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600 group-hover:scale-105 transition-transform">
              <LayoutGrid size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-900">Widgets &amp; Wall</div>
              <div className="text-[11px] text-ink-500">{counts.widgets} embeds &amp; walls</div>
            </div>
          </div>
          <ArrowRight size={13} className="text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* Real Submission Trends (Based on Actual Database Records) */}
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-ink-900">
                Submission Trends
              </h2>
              <span className="rounded-full bg-warm-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600 border border-line">
                Past 14 Days
              </span>
            </div>
            <p className="text-xs text-ink-500 mt-0.5">
              Daily customer submissions calculated directly from verified database records.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-ink-600">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-amber-400" />
              <span>Pending</span>
            </div>
            <div className="text-xs text-ink-500 pl-2 border-l border-line font-medium">
              Total: <strong className="text-ink-900">{total14Days}</strong>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="h-44 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : total14Days === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-warm-100 text-ink-400">
              <Calendar size={18} />
            </div>
            <h3 className="text-xs font-semibold text-ink-800">
              No submissions recorded in the past 14 days
            </h3>
            <p className="text-xs text-ink-500 max-w-sm mx-auto leading-relaxed">
              When respondents submit feedback through your public collection forms, daily submission volume will be plotted here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Hover Data Indicator */}
            <div className="h-5 text-xs text-ink-600">
              {hoveredTrend ? (
                <div className="flex items-center gap-3 animate-in fade-in duration-150">
                  <span className="font-semibold text-ink-900">{hoveredTrend.label}:</span>
                  <span>{hoveredTrend.count} total {hoveredTrend.count === 1 ? "submission" : "submissions"}</span>
                  <span className="text-emerald-600">({hoveredTrend.approvedCount} approved)</span>
                  <span className="text-amber-600">({hoveredTrend.pendingCount} pending)</span>
                </div>
              ) : (
                <span className="text-ink-400 text-[11px]">Hover over any bar to inspect daily metrics</span>
              )}
            </div>

            {/* Bar Chart Visualization */}
            <div className="flex items-end gap-2 sm:gap-3 h-36 pt-4 border-b border-line px-1">
              {data?.submissionTrends?.map((item) => {
                const heightPercent =
                  maxTrendCount > 0 ? Math.max((item.count / maxTrendCount) * 100, 6) : 6;
                const approvedPercent =
                  item.count > 0 ? (item.approvedCount / item.count) * 100 : 0;
                const pendingPercent =
                  item.count > 0 ? (item.pendingCount / item.count) * 100 : 0;

                return (
                  <div
                    key={item.date}
                    onMouseEnter={() => setHoveredTrend(item)}
                    onMouseLeave={() => setHoveredTrend(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    <div
                      className="w-full max-w-[28px] rounded-t-sm flex flex-col-reverse overflow-hidden transition-all group-hover:brightness-95 group-hover:scale-y-[1.02] origin-bottom"
                      style={{
                        height: item.count > 0 ? `${heightPercent}%` : "4px",
                        backgroundColor: item.count === 0 ? "#E5E5E0" : undefined,
                      }}
                    >
                      {item.count > 0 && (
                        <>
                          <div
                            style={{ height: `${approvedPercent}%` }}
                            className="w-full bg-emerald-500"
                          />
                          <div
                            style={{ height: `${pendingPercent}%` }}
                            className="w-full bg-amber-400"
                          />
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-ink-400 mt-2 truncate w-full text-center group-hover:text-ink-900 font-medium">
                      {item.label.split(" ")[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout: Recent Testimonials & Activity Stream */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Recent Submissions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">
                Recently Submitted Testimonials
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                Latest customer responses received across all workspace forms.
              </p>
            </div>
            <Link
              href="/dashboard/testimonials"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>View all in Inbox</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-line bg-white p-12 text-center">
              <Loader2 size={24} className="animate-spin text-brand-500 mx-auto" />
              <p className="text-xs text-ink-500 mt-2">Loading submissions...</p>
            </div>
          ) : !data?.recentSubmissions || data.recentSubmissions.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="No testimonials received yet"
              description="Once you share your collection forms, new customer text and video submissions will appear here for review."
              action={
                <Link
                  href="/dashboard/forms"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
                >
                  <Plus size={14} />
                  <span>Create your first form</span>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {data.recentSubmissions.map((item) => {
                const customer = item.customer;
                const isPending = item.status === "PENDING";
                const isApproved = item.status === "APPROVED";
                const isRejected = item.status === "REJECTED";
                const hasMedia = Boolean(item.mediaAssets && item.mediaAssets.length > 0);
                const isVideo = Boolean(hasMedia && item.mediaAssets?.some((m) => m.type === "VIDEO"));

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-line bg-white p-4 shadow-2xs hover:border-line-dark transition-all space-y-2.5"
                  >
                    {/* Top Row: Customer info + Rating + Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {customer?.avatarUrl ? (
                          <div className="h-8 w-8 rounded-full overflow-hidden border border-line shrink-0 bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={customer.avatarUrl}
                              alt={customer.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {customer?.name ? customer.name.slice(0, 2) : "AN"}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-ink-900">
                              {customer?.name || "Anonymous Respondent"}
                            </span>
                            {customer?.company && (
                              <span className="text-[11px] text-ink-500">
                                &bull; {customer.company}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-400">
                            {customer?.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {/* Rating */}
                        {item.rating && (
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={12}
                                className={
                                  s <= (item.rating || 5)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-ink-200 fill-transparent"
                                }
                              />
                            ))}
                          </div>
                        )}

                        {/* Media Indicator */}
                        {hasMedia && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                            <Video size={10} />
                            <span>{isVideo ? "Video" : "Media"}</span>
                          </span>
                        )}

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            isPending
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : isApproved
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isRejected
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-warm-100 text-ink-600 border-line"
                          }`}
                        >
                          {isPending && <Clock size={10} />}
                          {isApproved && <CheckCircle2 size={10} />}
                          {isRejected && <XCircle size={10} />}
                          <span>{item.status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <p className="text-xs text-ink-700 line-clamp-2 leading-relaxed bg-warm-50/50 p-2.5 rounded-lg border border-line/50">
                      &ldquo;{item.content}&rdquo;
                    </p>

                    {/* Metadata Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-ink-400 border-t border-line/40">
                      <div className="flex items-center gap-2.5">
                        {item.form && (
                          <Link
                            href={`/p/${item.form.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-ink-600 hover:text-brand-600 transition-colors"
                          >
                            <ExternalLink size={10} />
                            <span>{item.form.title}</span>
                          </Link>
                        )}
                        {item.project && (
                          <span className="inline-flex items-center gap-1 text-ink-500">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: item.project.color || "#7049D8" }}
                            />
                            <span>{item.project.name}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span>
                          {new Date(item.submittedAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <Link
                          href="/dashboard/testimonials"
                          className="font-semibold text-brand-600 hover:underline"
                        >
                          Review in Inbox &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Recent Activity & Workspace Resources */}
        <div className="space-y-5">
          {/* Recent Activity */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-xs font-semibold text-ink-900 uppercase tracking-wider">
                Recent Activity
              </h3>
              <span className="text-[11px] text-ink-400">Chronological</span>
            </div>

            {isLoading ? (
              <div className="py-6 text-center">
                <Loader2 size={16} className="animate-spin text-brand-500 mx-auto" />
              </div>
            ) : !data?.recentActivity || data.recentActivity.length === 0 ? (
              <p className="text-xs text-ink-400 py-3 text-center">No recent activity recorded.</p>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warm-100 text-ink-600">
                      {act.type === "TESTIMONIAL" && <MessageSquareQuote size={12} />}
                      {act.type === "FORM" && <FileText size={12} />}
                      {act.type === "PROJECT" && <FolderKanban size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-ink-800 truncate">
                          {act.title}
                        </span>
                        {act.badge && (
                          <span className="rounded bg-warm-100 px-1 py-0.2 text-[9px] font-bold text-ink-600">
                            {act.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-500 truncate mt-0.5">
                        {act.description}
                      </p>
                      <span className="text-[10px] text-ink-400">
                        {new Date(act.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connected Resources Summary */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold text-ink-900 uppercase tracking-wider border-b border-line pb-3">
              Workspace Resources
            </h3>
            <div className="space-y-2 text-xs">
              <Link
                href="/dashboard/forms"
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-warm-50 text-ink-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-brand-600" />
                  <span>Collection Forms</span>
                </div>
                <span className="font-semibold text-ink-900">{counts.forms}</span>
              </Link>
              <Link
                href="/dashboard/projects"
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-warm-50 text-ink-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderKanban size={14} className="text-sky-600" />
                  <span>Projects</span>
                </div>
                <span className="font-semibold text-ink-900">{counts.projects}</span>
              </Link>
              <Link
                href="/dashboard/customers"
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-warm-50 text-ink-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users2 size={14} className="text-emerald-600" />
                  <span>Customers</span>
                </div>
                <span className="font-semibold text-ink-900">{counts.customers}</span>
              </Link>
              <Link
                href="/dashboard/widgets"
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-warm-50 text-ink-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid size={14} className="text-purple-600" />
                  <span>Widgets</span>
                </div>
                <span className="font-semibold text-ink-900">{counts.widgets}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
