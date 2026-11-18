"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  EyeOff,
  FileSpreadsheet,
  Filter,
  HelpCircle,
  Inbox,
  Layers,
  Mail,
  MessageSquare,
  MessageSquareQuote,
  MousePointerClick,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { DataCard } from "@/components/dashboard/data-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  AnalyticsPeriod,
  CampaignAnalyticsResponse,
  CampaignChannel,
  CampaignDailyTrend,
  CampaignPerformanceItem,
} from "@/lib/analytics/types";

type CampaignAnalyticsViewProps = {
  workspaceId: string;
  period: AnalyticsPeriod;
  projectId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export function CampaignAnalyticsView({
  workspaceId,
  period,
  projectId,
  startDate,
  endDate,
}: CampaignAnalyticsViewProps) {
  const [channel, setChannel] = useState<CampaignChannel>("ALL");
  const [data, setData] = useState<CampaignAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTrend, setHoveredTrend] = useState<CampaignDailyTrend | null>(null);

  // Filters & Search
  const [campaignSearch, setCampaignSearch] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientStatusFilter, setRecipientStatusFilter] = useState("ALL");

  // Campaign Comparison Mode
  const [isComparing, setIsComparing] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchCampaignAnalytics() {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          period,
          channel,
        });
        if (projectId) params.set("projectId", projectId);
        if (startDate && endDate) {
          params.set("startDate", startDate);
          params.set("endDate", endDate);
        }

        const res = await fetch(`/api/workspaces/${workspaceId}/analytics/campaigns?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load campaign analytics");
        }

        const json: CampaignAnalyticsResponse = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load campaign analytics");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchCampaignAnalytics();
    return () => {
      isMounted = false;
    };
  }, [workspaceId, period, channel, projectId, startDate, endDate]);

  const summary = data?.summary;
  const dailyTrends = data?.dailyTrends || [];

  // Filtered campaigns
  const filteredCampaigns = (data?.campaigns || []).filter((c) =>
    c.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
    c.formTitle.toLowerCase().includes(campaignSearch.toLowerCase()) ||
    (c.templateName && c.templateName.toLowerCase().includes(campaignSearch.toLowerCase()))
  );

  // Filtered recipients
  const filteredRecipients = (data?.recipients || []).filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
      r.contact.toLowerCase().includes(recipientSearch.toLowerCase()) ||
      r.campaignName.toLowerCase().includes(recipientSearch.toLowerCase());

    const matchesStatus =
      recipientStatusFilter === "ALL" ||
      r.status.toUpperCase() === recipientStatusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  // Max value for daily trend bars
  const maxTrendSent = Math.max(...dailyTrends.map((d) => d.sent), 1);

  // Toggle selection for comparison
  const toggleCampaignComparison = (id: string) => {
    setSelectedCampaignIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const comparedCampaigns = (data?.campaigns || []).filter((c) =>
    selectedCampaignIds.includes(c.id)
  );

  // Export handlers
  const getExportUrl = (format: "csv" | "recipients-csv") => {
    const params = new URLSearchParams({
      period,
      channel,
      export: format,
    });
    if (projectId) params.set("projectId", projectId);
    if (startDate && endDate) {
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    }
    return `/api/workspaces/${workspaceId}/analytics/campaigns?${params.toString()}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-line bg-white p-5 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl border border-line bg-white animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center space-y-3">
        <p className="text-xs font-semibold text-rose-700">{error}</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Channel Switcher & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Channel Segmented Buttons */}
        <div className="inline-flex items-center rounded-xl border border-line bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setChannel("ALL")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              channel === "ALL"
                ? "bg-brand-500 text-white shadow-2xs"
                : "text-ink-600 hover:text-ink-900 hover:bg-warm-100"
            }`}
          >
            <Layers size={13} />
            <span>All Channels ({summary.totalCampaigns})</span>
          </button>

          <button
            type="button"
            onClick={() => setChannel("EMAIL")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              channel === "EMAIL"
                ? "bg-brand-500 text-white shadow-2xs"
                : "text-ink-600 hover:text-ink-900 hover:bg-warm-100"
            }`}
          >
            <Mail size={13} />
            <span>Email ({data?.campaigns.filter((c) => c.channel === "EMAIL").length})</span>
          </button>

          <button
            type="button"
            onClick={() => setChannel("SMS")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              channel === "SMS"
                ? "bg-brand-500 text-white shadow-2xs"
                : "text-ink-600 hover:text-ink-900 hover:bg-warm-100"
            }`}
          >
            <MessageSquare size={13} />
            <span>SMS ({data?.campaigns.filter((c) => c.channel === "SMS").length})</span>
          </button>
        </div>

        {/* Export & Compare Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsComparing(!isComparing);
              if (!isComparing && selectedCampaignIds.length === 0 && data.campaigns.length >= 2) {
                // Auto-select first 2 campaigns as starter comparison
                setSelectedCampaignIds([data.campaigns[0].id, data.campaigns[1].id]);
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all shadow-2xs ${
              isComparing
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-line bg-white text-ink-700 hover:bg-warm-100"
            }`}
          >
            <Trophy size={13} className={isComparing ? "text-brand-600" : "text-ink-500"} />
            <span>{isComparing ? "Close Comparison" : "Compare Campaigns"}</span>
            {selectedCampaignIds.length > 0 && isComparing && (
              <span className="rounded-full bg-brand-600 text-white text-[10px] px-1.5 py-0.2">
                {selectedCampaignIds.length}
              </span>
            )}
          </button>

          <a
            href={getExportUrl("csv")}
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
            title="Download Campaign Performance CSV"
          >
            <Download size={13} />
            <span>Export Campaigns</span>
          </a>

          <a
            href={getExportUrl("recipients-csv")}
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
            title="Download Detailed Recipient Audit CSV"
          >
            <FileSpreadsheet size={13} />
            <span>Export Audit Log</span>
          </a>
        </div>
      </div>

      {/* Provider-Reported vs Measured Events Methodology Pill */}
      <div className="rounded-2xl border border-line bg-warm-50/60 p-4 shadow-2xs space-y-2 text-xs text-ink-700">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
          <div className="flex items-center gap-2 font-bold text-ink-900">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>Measurement Transparency & Data Integrity</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 text-ink-600">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <strong>Provider-Reported:</strong> Delivery, Failures, Bounces
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <strong>Verified Measured:</strong> Link Clicks, Submissions
            </span>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-ink-600">
          <strong>Privacy & Open Tracking Notice:</strong> Traditional 1x1 image pixel opens are distorted by Apple Mail Privacy Protection (MPP) and corporate anti-spam crawlers which prefetch assets automatically. Rather than reporting inflated, inaccurate open metrics, Praise distinguishes reliable gateway receipts and grounds conversion reporting in <strong>verified measured events (clicks and completed reviews)</strong>.
        </p>
      </div>

      {/* 1. Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DataCard
          title="Recipients Enrolled"
          value={summary.totalRecipients.toLocaleString()}
          description={`${summary.totalSent.toLocaleString()} messages sent across ${summary.totalCampaigns} campaigns`}
          icon={Users}
        />

        <DataCard
          title="Deliverability Rate"
          value={`${summary.deliverabilityRate}%`}
          description={
            summary.totalSent > 0
              ? `${summary.totalDelivered.toLocaleString()} delivered • ${summary.totalFailed + summary.totalBounced} failed/bounced`
              : "No outbound messages yet"
          }
          icon={Send}
        />

        <DataCard
          title="Verified Link Clicks"
          value={summary.totalClicks.toLocaleString()}
          description={`${summary.clickRate}% click-through rate on personal tokens`}
          icon={MousePointerClick}
        />

        <DataCard
          title="Response & Reviews Rate"
          value={`${summary.responseRate}%`}
          description={`${summary.totalSubmissions.toLocaleString()} completed testimonials collected`}
          icon={MessageSquareQuote}
        />
      </div>

      {/* 2. Campaign Comparison Section (When Active) */}
      {isComparing && (
        <div className="rounded-2xl border-2 border-brand-300 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" />
                <h3 className="text-sm font-bold text-ink-900">Campaign Comparison Tool</h3>
              </div>
              <p className="text-xs text-ink-500 mt-0.5">
                Side-by-side performance comparison of selected outreach campaigns
              </p>
            </div>
            <div className="text-xs text-ink-500">
              Select campaigns in the table below to include them in this comparison
            </div>
          </div>

          {comparedCampaigns.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-400">
              Select 2 or more campaigns below to benchmark their deliverability and response rates.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-warm-50 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3 text-right">Recipients</th>
                    <th className="px-4 py-3 text-right">Messages Sent</th>
                    <th className="px-4 py-3 text-right">Deliverability</th>
                    <th className="px-4 py-3 text-right">Bounces / Failures</th>
                    <th className="px-4 py-3 text-right">Verified Clicks</th>
                    <th className="px-4 py-3 text-right">Click Rate</th>
                    <th className="px-4 py-3 text-right">Completed Reviews</th>
                    <th className="px-4 py-3 text-right">Response Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {comparedCampaigns.map((c) => {
                    const isWinner =
                      comparedCampaigns.length > 1 &&
                      c.responseRate === Math.max(...comparedCampaigns.map((o) => o.responseRate)) &&
                      c.responseRate > 0;

                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors ${
                          isWinner ? "bg-emerald-50/50" : "hover:bg-warm-50/50"
                        }`}
                      >
                        <td className="px-4 py-3.5 font-bold text-ink-900 flex items-center gap-2">
                          {isWinner && <Trophy size={14} className="text-amber-500 shrink-0" />}
                          <span>{c.name}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              c.channel === "EMAIL"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {c.channel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-ink-700">
                          {c.recipientsCount}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-ink-800">
                          {c.sentCount}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-ink-900">
                          {c.deliverabilityRate}%
                        </td>
                        <td className="px-4 py-3.5 text-right text-rose-600">
                          {c.failedCount + c.bouncedCount}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-indigo-700">
                          {c.clickedCount}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-indigo-700">
                          {c.clickRate}%
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-ink-900">
                          {c.submittedCount}
                        </td>
                        <td className="px-4 py-3.5 text-right font-extrabold">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md ${
                              isWinner
                                ? "bg-emerald-600 text-white"
                                : c.responseRate > 0
                                ? "text-emerald-700 bg-emerald-50"
                                : "text-ink-400"
                            }`}
                          >
                            {c.responseRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Daily Outbound & Response Activity Chart */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <Send size={16} className="text-brand-600" />
              <span>Invitation Activity Over Time</span>
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Daily dispatch volume vs verified clicks and completed submissions
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
              <span className="text-ink-600">Sent Messages</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
              <span className="text-ink-600">Verified Clicks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-ink-600">Completed Reviews</span>
            </div>
          </div>
        </div>

        {summary.totalSent === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No Invitation Messages Sent in this Period"
              description="Launch an email or SMS testimonial invitation campaign to reach out to customers and track delivery, clicks, and response rates."
              icon={Send}
              action={
                <Link
                  href="/dashboard/invitations"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
                >
                  <span>Go to Invitation Campaigns</span>
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
                    <span>Sent: <strong>{hoveredTrend.sent}</strong></span>
                    <span className="text-indigo-700">Clicks: <strong>{hoveredTrend.clicks}</strong></span>
                    <span className="text-emerald-700">Submissions: <strong>{hoveredTrend.submissions}</strong></span>
                    {hoveredTrend.failedOrBounced > 0 && (
                      <span className="text-rose-700">Failed/Bounced: <strong>{hoveredTrend.failedOrBounced}</strong></span>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-ink-400 italic">Hover over any bar to view daily activity</span>
              )}
            </div>

            <div className="h-44 flex items-end gap-1 sm:gap-2 pt-4 px-1 border-b border-line">
              {dailyTrends.map((trend) => {
                const total = trend.sent;
                const heightPercent = total > 0 ? Math.max((total / maxTrendSent) * 100, 8) : 0;
                const isHovered = hoveredTrend?.date === trend.date;

                return (
                  <div
                    key={trend.date}
                    onMouseEnter={() => setHoveredTrend(trend)}
                    onMouseLeave={() => setHoveredTrend(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {total > 0 ? (
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[26px] rounded-t flex flex-col justify-end transition-all ${
                          isHovered ? "ring-2 ring-brand-500 ring-offset-1 scale-105" : "hover:opacity-90"
                        } bg-brand-500`}
                      >
                        {trend.submissions > 0 && (
                          <div
                            style={{ height: `${Math.min((trend.submissions / total) * 100, 100)}%` }}
                            className="w-full bg-emerald-400 rounded-t"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-full max-w-[26px] h-1 bg-warm-200 rounded-t" />
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

      {/* 4. Individual Campaign Performance Table */}
      <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <Inbox size={16} className="text-brand-600" />
              <span>Invitation Campaigns Breakdown</span>
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Performance metrics, deliverability, and response rates per campaign
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-2.5 top-2.5 text-ink-400" />
            <input
              type="text"
              value={campaignSearch}
              onChange={(e) => setCampaignSearch(e.target.value)}
              placeholder="Filter campaigns..."
              className="w-full rounded-lg border border-line pl-8 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-500">
            {campaignSearch
              ? "No campaigns match your search query."
              : "No invitation campaigns created yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-warm-50/70 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  {isComparing && <th className="px-3 py-3 w-8">Compare</th>}
                  <th className="px-5 py-3">Campaign Name</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Recipients</th>
                  <th className="px-4 py-3 text-right">Messages Sent</th>
                  <th className="px-4 py-3 text-right">Deliverability</th>
                  <th className="px-4 py-3 text-right">Bounces/Failed</th>
                  <th className="px-4 py-3 text-right">Verified Clicks</th>
                  <th className="px-4 py-3 text-right">Submissions</th>
                  <th className="px-4 py-3 text-right">Response Rate</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-warm-50/50 transition-colors">
                    {isComparing && (
                      <td className="px-3 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedCampaignIds.includes(c.id)}
                          onChange={() => toggleCampaignComparison(c.id)}
                          className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                    )}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-ink-900">{c.name}</div>
                      <span className="text-[11px] text-ink-400">
                        Form: {c.formTitle}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.channel === "EMAIL"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {c.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : c.status === "SENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-warm-100 text-ink-600 border border-line"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-ink-700">
                      {c.recipientsCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-ink-900">
                      {c.sentCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-ink-900">
                      {c.deliverabilityRate}%
                    </td>
                    <td className="px-4 py-3.5 text-right text-rose-600">
                      {c.failedCount + c.bouncedCount}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-indigo-700">
                      {c.clickedCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-ink-900">
                      {c.submittedCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-emerald-700">
                      {c.responseRate}%
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/dashboard/invitations`}
                        className="rounded px-2 py-1 text-[11px] font-semibold text-brand-600 hover:text-brand-800 hover:bg-warm-100 transition-colors"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Performance by Invitation Template */}
      <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-line">
          <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
            <Mail size={16} className="text-brand-600" />
            <span>Performance by Invitation Template</span>
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">
            Effectiveness and conversion rates across different subject lines and message copy
          </p>
        </div>

        {(data?.templatePerformance || []).length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-500">
            No invitation template metrics available for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-warm-50/70 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Template Name</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3 text-right">Campaigns Used In</th>
                  <th className="px-4 py-3 text-right">Total Sent</th>
                  <th className="px-4 py-3 text-right">Deliverability Rate</th>
                  <th className="px-4 py-3 text-right">Verified Clicks</th>
                  <th className="px-4 py-3 text-right">Click Rate</th>
                  <th className="px-4 py-3 text-right">Completed Submissions</th>
                  <th className="px-4 py-3 text-right">Response Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(data?.templatePerformance || []).map((t) => (
                  <tr key={t.templateId} className="hover:bg-warm-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-ink-900">
                      {t.templateName}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.channel === "EMAIL"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {t.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-ink-700">
                      {t.campaignsCount}
                    </td>
                    <td className="px-4 py-3.5 text-right text-ink-800">
                      {t.sentCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-ink-900">
                      {t.deliverabilityRate}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-indigo-700">
                      {t.clickedCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-indigo-700">
                      {t.clickRate}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-ink-900">
                      {t.submittedCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-emerald-700">
                      {t.responseRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Recipient-Level Status & Audit Trail Table */}
      <div className="rounded-2xl border border-line bg-white shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <Users size={16} className="text-brand-600" />
              <span>Recipient Status & Delivery Audit Trail</span>
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Granular recipient delivery timestamps, click verification, and bounce diagnostics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Status Filter */}
            <select
              value={recipientStatusFilter}
              onChange={(e) => setRecipientStatusFilter(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted Review</option>
              <option value="CLICKED">Clicked Link</option>
              <option value="DELIVERED">Delivered</option>
              <option value="SENT">Sent</option>
              <option value="BOUNCED">Bounced</option>
              <option value="FAILED">Failed</option>
            </select>

            {/* Recipient Search */}
            <div className="relative w-full sm:w-56">
              <Search size={13} className="absolute left-2.5 top-2.5 text-ink-400" />
              <input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Search recipient..."
                className="w-full rounded-lg border border-line pl-8 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {filteredRecipients.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-500">
            {recipientSearch || recipientStatusFilter !== "ALL"
              ? "No recipients match your filter criteria."
              : "No recipient records found for this period."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-warm-50/70 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Delivery Timeline</th>
                  <th className="px-4 py-3 text-right">Review Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredRecipients.map((r) => (
                  <tr key={r.id} className="hover:bg-warm-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-ink-900">
                      {r.name}
                      {r.company && <div className="text-[11px] font-normal text-ink-400">{r.company}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.channel === "EMAIL"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {r.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-ink-600">
                      {r.contact}
                    </td>
                    <td className="px-4 py-3.5 text-ink-700">
                      {r.campaignName}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.status === "SUBMITTED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : r.status === "CLICKED"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : r.status === "DELIVERED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : r.status === "BOUNCED" || r.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-warm-100 text-ink-600 border border-line"
                        }`}
                      >
                        {r.status}
                      </span>
                      {(r.errorMessage || r.bounceReason) && (
                        <div className="text-[10px] text-rose-600 mt-0.5 truncate max-w-xs" title={r.errorMessage || r.bounceReason || ""}>
                          {r.errorMessage || r.bounceReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-ink-500 space-y-0.5">
                      {r.sentAt && <div>Sent: {new Date(r.sentAt).toLocaleDateString()}</div>}
                      {r.clickedAt && <div className="text-indigo-600">Clicked: {new Date(r.clickedAt).toLocaleDateString()}</div>}
                      {r.submittedAt && <div className="text-emerald-700 font-semibold">Submitted: {new Date(r.submittedAt).toLocaleDateString()}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold">
                      {r.testimonialId ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                          <CheckCircle2 size={11} />
                          <span>Submitted</span>
                        </span>
                      ) : (
                        <span className="text-ink-400 text-[11px] italic">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
