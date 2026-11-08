"use client";

import React, { useState } from "react";
import {
  Archive,
  Check,
  Download,
  FileCode,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";

export type ExportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedIds?: string[];
  currentFilters?: {
    projectId?: string;
    status?: string;
    rating?: string;
    dateRange?: string;
    search?: string;
  };
  totalCount?: number;
};

export function ExportModal({
  isOpen,
  onClose,
  selectedIds = [],
  currentFilters = {},
  totalCount = 0,
}: ExportModalProps) {
  const { activeWorkspace, projects } = useWorkspace();
  const toast = useToast();
  const workspaceId = activeWorkspace?.id;

  // Format selection: "csv" | "json" | "zip"
  const [format, setFormat] = useState<"csv" | "json" | "zip">("csv");

  // Scope: "all" | "selected" | "filtered"
  const hasSelected = selectedIds.length > 0;
  const [scope, setScope] = useState<"all" | "selected" | "filtered">(
    hasSelected ? "selected" : "all"
  );

  // Filter overrides
  const [projectFilter, setProjectFilter] = useState(currentFilters.projectId || "all");
  const [statusFilter, setStatusFilter] = useState(currentFilters.status || "all");
  const [ratingFilter, setRatingFilter] = useState(currentFilters.rating || "all");
  const [dateRangeFilter, setDateRangeFilter] = useState(currentFilters.dateRange || "all");

  // Privacy & media toggles
  const [includeCustomerInfo, setIncludeCustomerInfo] = useState(true);
  const [anonymizeEmails, setAnonymizeEmails] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(true);

  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (!workspaceId) return;

    setIsExporting(true);
    try {
      const payload: Record<string, unknown> = {
        format,
        includeCustomerInfo,
        anonymizeEmails,
        includeMedia: format === "zip" ? includeMedia : false,
      };

      if (scope === "selected") {
        payload.testimonialIds = selectedIds;
      } else if (scope === "filtered") {
        payload.projectId = currentFilters.projectId || projectFilter;
        payload.status = currentFilters.status || statusFilter;
        payload.rating = currentFilters.rating || ratingFilter;
        payload.dateRange = currentFilters.dateRange || dateRangeFilter;
        payload.search = currentFilters.search || null;
      } else {
        // "all" with custom filter overrides if selected
        if (projectFilter !== "all") payload.projectId = projectFilter;
        if (statusFilter !== "all") payload.status = statusFilter;
        if (ratingFilter !== "all") payload.rating = ratingFilter;
        if (dateRangeFilter !== "all") payload.dateRange = dateRangeFilter;
      }

      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Export failed with status ${res.status}`);
      }

      // Extract filename from Content-Disposition header if available
      const disposition = res.headers.get("content-disposition");
      let downloadFilename = `praise-export-${activeWorkspace?.slug || "export"}.${
        format === "zip" ? "zip" : format === "json" ? "json" : "csv"
      }`;

      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          downloadFilename = match[1];
        }
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error("Export generated an empty file.");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(
        "Export Complete",
        `Successfully downloaded ${downloadFilename} (${(blob.size / 1024).toFixed(1)} KB)`
      );
      onClose();
    } catch (err: unknown) {
      console.error("Export error:", err);
      const message =
        err instanceof Error ? err.message : "Could not complete the export.";
      toast.error("Export Failed", message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Export Testimonials"
      description="Download customer reviews, metadata, and media assets in your preferred format."
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs">
        {/* Format Selector Cards */}
        <div>
          <label className="block text-xs font-semibold text-ink-900 mb-2">
            1. Select Export Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* CSV */}
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                format === "csv"
                  ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500 shadow-2xs"
                  : "border-line bg-white hover:bg-warm-50/70"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <FileSpreadsheet size={16} />
                </div>
                {format === "csv" && <Check size={14} className="text-brand-600 font-bold" />}
              </div>
              <span className="font-semibold text-ink-900 text-xs">CSV Spreadsheet</span>
              <p className="text-[11px] text-ink-500 mt-1 leading-snug">
                Standard tabular format. Re-importable into Praise or spreadsheet tools.
              </p>
            </button>

            {/* JSON */}
            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                format === "json"
                  ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500 shadow-2xs"
                  : "border-line bg-white hover:bg-warm-50/70"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <FileCode size={16} />
                </div>
                {format === "json" && <Check size={14} className="text-brand-600 font-bold" />}
              </div>
              <span className="font-semibold text-ink-900 text-xs">JSON Document</span>
              <p className="text-[11px] text-ink-500 mt-1 leading-snug">
                Full structured data with nested customer records, tags, and media links.
              </p>
            </button>

            {/* ZIP Bundle */}
            <button
              type="button"
              onClick={() => setFormat("zip")}
              className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                format === "zip"
                  ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500 shadow-2xs"
                  : "border-line bg-white hover:bg-warm-50/70"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                  <Archive size={16} />
                </div>
                {format === "zip" && <Check size={14} className="text-brand-600 font-bold" />}
              </div>
              <span className="font-semibold text-ink-900 text-xs">Complete ZIP Archive</span>
              <p className="text-[11px] text-ink-500 mt-1 leading-snug">
                Includes CSV, JSON, manifest, and all original photos &amp; video files.
              </p>
            </button>
          </div>
        </div>

        {/* Scope Selector */}
        <div>
          <label className="block text-xs font-semibold text-ink-900 mb-2">
            2. Choose Export Scope
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {hasSelected && (
              <label
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  scope === "selected"
                    ? "border-brand-500 bg-brand-50/40 text-brand-900 font-semibold"
                    : "border-line bg-white text-ink-700 hover:bg-warm-50"
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  value="selected"
                  checked={scope === "selected"}
                  onChange={() => setScope("selected")}
                  className="sr-only"
                />
                <span>Selected Testimonials ({selectedIds.length})</span>
              </label>
            )}

            <label
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                scope === "all"
                  ? "border-brand-500 bg-brand-50/40 text-brand-900 font-semibold"
                  : "border-line bg-white text-ink-700 hover:bg-warm-50"
              }`}
            >
              <input
                type="radio"
                name="exportScope"
                value="all"
                checked={scope === "all"}
                onChange={() => setScope("all")}
                className="sr-only"
              />
              <span>All Testimonials in Workspace ({totalCount})</span>
            </label>

            <label
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                scope === "filtered"
                  ? "border-brand-500 bg-brand-50/40 text-brand-900 font-semibold"
                  : "border-line bg-white text-ink-700 hover:bg-warm-50"
              }`}
            >
              <input
                type="radio"
                name="exportScope"
                value="filtered"
                checked={scope === "filtered"}
                onChange={() => setScope("filtered")}
                className="sr-only"
              />
              <span>Current Inbox Filters</span>
            </label>
          </div>
        </div>

        {/* Filter Refinements (when scope is "all") */}
        {scope === "all" && (
          <div className="p-3.5 rounded-xl border border-line bg-warm-50/50 space-y-3">
            <span className="font-medium text-ink-800 text-[11px] block">
              Filter Options (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-ink-600 mb-1">Project</label>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-ink-600 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="APPROVED">Approved Only</option>
                  <option value="PENDING">Pending Moderation</option>
                  <option value="ARCHIVED">Archived</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-ink-600 mb-1">Star Rating</label>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                >
                  <option value="all">All Ratings (1 - 5 stars)</option>
                  <option value="5">5 Stars only</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-ink-600 mb-1">Date Range</label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                >
                  <option value="all">All Time</option>
                  <option value="7d">Past 7 days</option>
                  <option value="30d">Past 30 days</option>
                  <option value="90d">Past 90 days</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Data & Privacy Options */}
        <div className="space-y-2 pt-1 border-t border-line">
          <label className="block text-xs font-semibold text-ink-900 mb-1">
            3. Privacy &amp; Media Settings
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-ink-700">
            <input
              type="checkbox"
              checked={includeCustomerInfo}
              onChange={(e) => setIncludeCustomerInfo(e.target.checked)}
              className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
            />
            <span>Include customer details (Name, Company, Job Title, Website, Avatar)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-ink-700">
            <input
              type="checkbox"
              checked={anonymizeEmails}
              onChange={(e) => setAnonymizeEmails(e.target.checked)}
              className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
            />
            <span>Anonymize / Mask customer emails (e.g. ja***@acme.com)</span>
          </label>

          {format === "zip" && (
            <label className="flex items-center gap-2 cursor-pointer text-ink-700 font-medium text-brand-900">
              <input
                type="checkbox"
                checked={includeMedia}
                onChange={(e) => setIncludeMedia(e.target.checked)}
                className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
              />
              <span>Download and bundle original media files (images &amp; videos)</span>
            </label>
          )}
        </div>

        {/* Security & Re-import Info */}
        <div className="rounded-xl border border-line bg-warm-50/60 p-3.5 text-[11px] text-ink-600 flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-brand-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Data is strictly isolated to <strong>{activeWorkspace?.name}</strong>. Exported CSV and JSON files preserve original dates, ratings, and tags, and can be directly re-imported into Praise at any time.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-2xs disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            <span>
              {isExporting
                ? "Preparing Export..."
                : `Download ${format.toUpperCase()}`}
            </span>
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
