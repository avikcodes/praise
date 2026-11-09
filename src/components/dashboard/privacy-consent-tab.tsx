"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Database,
  Eye,
  FileCheck2,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { ConsentRecordDetail } from "@/types/privacy";
import { ProjectItem } from "@/components/dashboard/workspace-context";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { useToast } from "@/components/dashboard/toast-context";

interface PrivacyConsentTabProps {
  workspaceId: string;
  projects: ProjectItem[];
}

export function PrivacyConsentTab({ workspaceId, projects }: PrivacyConsentTabProps) {
  const [records, setRecords] = useState<ConsentRecordDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState<ConsentRecordDetail | null>(null);

  // Revoke Dialog State
  const [revokingRecord, setRevokingRecord] = useState<ConsentRecordDetail | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);

  const toast = useToast();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedProjectId !== "all") params.set("projectId", selectedProjectId);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (search.trim()) params.set("search", search.trim());

        const res = await fetch(`/api/workspaces/${workspaceId}/consent?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load consent records");
        }
        const data = await res.json();
        if (isMounted) {
          setRecords(data.records || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          toast.error("Error", err instanceof Error ? err.message : "Failed to load consent records");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [workspaceId, selectedProjectId, statusFilter, search, reloadTrigger, toast]);

  // Handle Workspace Data Export
  const handleExportWorkspaceData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/export?format=zip`);
      if (!res.ok) {
        throw new Error("Failed to generate workspace archive");
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `praise-workspace-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Export Complete", "Workspace data and consent audit ledger downloaded.");
    } catch (err: unknown) {
      toast.error("Export Failed", err instanceof Error ? err.message : "Error exporting workspace data");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Revoking Consent
  const handleConfirmRevoke = async () => {
    if (!revokingRecord) return;
    setIsSubmittingRevoke(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/consent/${revokingRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVOKE",
          reason: revokeReason.trim() || "Customer withdrawal request",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to revoke consent");
      }

      toast.success(
        "Consent Revoked",
        `Testimonial by ${revokingRecord.customerName} has been immediately archived and unpublished.`,
      );
      setRevokingRecord(null);
      setRevokeReason("");
      setReloadTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      toast.error("Revocation Failed", err instanceof Error ? err.message : "Failed to revoke consent");
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Policy Overview and Safeguards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Core Principles */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-ink-900 font-semibold text-xs sm:text-sm">
            <ShieldCheck size={16} className="text-brand-600" />
            <span>Explicit Permission Policy</span>
          </div>
          <p className="text-xs text-ink-600 leading-relaxed">
            Praise enforces explicit opt-in checkboxes on collection forms. Submitting feedback does not grant unlimited advertising rights; permission is logged with exact wording and version.
          </p>
          <div className="text-[11px] text-ink-500 space-y-1 pt-1 border-t border-line/60">
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <Check size={13} />
              <span>Version 1.0 Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <Check size={13} />
              <span>Separate Media Consent Supported</span>
            </div>
          </div>
        </div>

        {/* Withdrawal & Right to Erasure */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-ink-900 font-semibold text-xs sm:text-sm">
            <UserCheck size={16} className="text-brand-600" />
            <span>Customer Erasure &amp; Withdrawal</span>
          </div>
          <p className="text-xs text-ink-600 leading-relaxed">
            Customers may request withdrawal of their consent or complete data erasure at any time. When consent is withdrawn, public Walls of Love and widgets immediately withhold display.
          </p>
          <div className="text-[11px] text-ink-500 pt-1 border-t border-line/60 flex items-center gap-1.5">
            <Info size={13} className="text-ink-400" />
            <span>Withdrawals immediately archive live content</span>
          </div>
        </div>

        {/* Backup Recovery Tombstones */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-ink-900 font-semibold text-xs sm:text-sm">
            <Database size={16} className="text-brand-600" />
            <span>Backup Recovery Safeguards</span>
          </div>
          <p className="text-xs text-ink-600 leading-relaxed">
            To define how backups handle deleted records: Praise logs a persistent tombstone register. If disaster recovery backups are restored, previously erased or withdrawn content is never republished.
          </p>
          <div className="text-[11px] text-ink-500 pt-1 border-t border-line/60 flex items-center gap-1.5">
            <Lock size={13} className="text-brand-600" />
            <span>Safe physical media purge enforced</span>
          </div>
        </div>
      </div>

      {/* 2. Controls & Actions Header */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute left-3 top-2.5 text-ink-400" />
            <input
              type="text"
              placeholder="Search by customer, email, or wording..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-line pl-8 pr-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-800 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-800 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Consent</option>
            <option value="revoked">Revoked / Withdrawn</option>
          </select>

          <button
            type="button"
            onClick={() => setReloadTrigger((prev) => prev + 1)}
            title="Refresh records"
            className="rounded-lg border border-line p-1.5 text-ink-600 hover:bg-warm-100 transition-colors"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Export Full Workspace Archive Button */}
        <button
          type="button"
          onClick={handleExportWorkspaceData}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-warm-50 px-3.5 py-1.5 text-xs font-semibold text-ink-800 hover:bg-warm-100 transition-colors disabled:opacity-50 shadow-2xs"
        >
          {isExporting ? (
            <Loader2 size={13} className="animate-spin text-brand-600" />
          ) : (
            <ArrowDownToLine size={13} className="text-brand-600" />
          )}
          <span>{isExporting ? "Packaging Archive..." : "Export Workspace Archive & Ledger"}</span>
        </button>
      </div>

      {/* 3. Consent Audit Ledger Table */}
      <div className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-ink-900">
              Verifiable Consent Audit Ledger
            </h3>
            <p className="text-[11px] text-ink-500">
              Cryptographically timestamped permission records for all testimonial submissions.
            </p>
          </div>
          <span className="text-[11px] text-ink-500 font-mono">
            {records.length} record{records.length === 1 ? "" : "s"}
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center space-y-2">
            <Loader2 size={20} className="animate-spin text-brand-600 mx-auto" />
            <p className="text-xs text-ink-500">Loading consent records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <FileCheck2 size={24} className="text-ink-400 mx-auto" />
            <p className="text-xs font-medium text-ink-700">No consent records found</p>
            <p className="text-[11px] text-ink-500">
              Consent records are automatically logged whenever a respondent submits a collection form.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-warm-50/80 text-[11px] text-ink-600 border-b border-line">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Respondent</th>
                  <th className="py-2.5 px-4 font-semibold">Project &amp; Testimonial</th>
                  <th className="py-2.5 px-4 font-semibold">Version &amp; Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Permitted Uses</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {records.map((r) => {
                  const p = r.structuredConsent.permittedPurposes;
                  return (
                    <tr key={r.id} className="hover:bg-warm-50/40 transition-colors">
                      {/* Respondent */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink-900">{r.customerName}</div>
                        <div className="text-[11px] text-ink-500 font-mono">{r.customerEmail}</div>
                      </td>

                      {/* Project & Snippet */}
                      <td className="py-3 px-4 max-w-[240px]">
                        <span className="inline-block text-[10px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 mb-1">
                          {r.projectName || "Default Project"}
                        </span>
                        <p className="text-[11px] text-ink-700 line-clamp-1 italic">
                          &ldquo;{r.testimonialSnippet}&rdquo;
                        </p>
                      </td>

                      {/* Version & Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-[11px] text-ink-900">
                          {r.structuredConsent.version}
                        </div>
                        <div className="text-[10px] text-ink-400">
                          {new Date(r.grantedAt).toLocaleString()}
                        </div>
                      </td>

                      {/* Permitted Channels */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {p.publicWebsite && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                              Website
                            </span>
                          )}
                          {p.socialMedia && (
                            <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200">
                              Social
                            </span>
                          )}
                          {p.marketingMaterials && (
                            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                              Marketing
                            </span>
                          )}
                          {r.structuredConsent.mediaPermission && r.hasMedia && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                              Media
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {r.isConsentGranted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 size={12} />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <XCircle size={12} />
                            <span>Withdrawn</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-warm-100"
                        >
                          <Eye size={12} />
                          <span>Audit</span>
                        </button>

                        {r.isConsentGranted && (
                          <button
                            type="button"
                            onClick={() => {
                              setRevokingRecord(r);
                              setRevokeReason("");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                          >
                            <ShieldAlert size={12} />
                            <span>Withdraw</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Audit Inspection Modal */}
      {selectedRecord && (
        <ModalDialog
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          title="Consent Audit Record"
          description={`Verifiable permission record captured for ${selectedRecord.customerName}.`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Agreement statement */}
            <div className="rounded-xl border border-line bg-warm-50/70 p-3.5 space-y-1.5">
              <span className="text-[11px] font-semibold text-ink-900 block">
                Agreed Consent Language ({selectedRecord.structuredConsent.version})
              </span>
              <p className="text-ink-800 italic leading-relaxed bg-white p-2.5 rounded-lg border border-line">
                &ldquo;{selectedRecord.structuredConsent.statement}&rdquo;
              </p>
            </div>

            {/* Permissions breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-line p-3 space-y-1">
                <span className="text-[11px] font-semibold text-ink-900 block">
                  Permitted Usage Channels
                </span>
                <ul className="space-y-1 text-ink-700">
                  <li className="flex items-center gap-1.5">
                    {selectedRecord.structuredConsent.permittedPurposes.publicWebsite ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <XCircle size={12} className="text-rose-500" />
                    )}
                    <span>Public Website &amp; Widgets</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    {selectedRecord.structuredConsent.permittedPurposes.socialMedia ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <XCircle size={12} className="text-rose-500" />
                    )}
                    <span>Social Media Snippets</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    {selectedRecord.structuredConsent.permittedPurposes.marketingMaterials ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <XCircle size={12} className="text-rose-500" />
                    )}
                    <span>Marketing Case Studies</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-line p-3 space-y-1">
                <span className="text-[11px] font-semibold text-ink-900 block">
                  Media &amp; Attribution Scope
                </span>
                <ul className="space-y-1 text-ink-700">
                  <li className="flex items-center gap-1.5">
                    {selectedRecord.structuredConsent.mediaPermission ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <XCircle size={12} className="text-rose-500" />
                    )}
                    <span>Media Publishing Permitted</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    {selectedRecord.structuredConsent.allowNameDisplay ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <XCircle size={12} className="text-rose-500" />
                    )}
                    <span>Display Customer Name</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    {selectedRecord.structuredConsent.allowCompanyDisplay ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <XCircle size={12} className="text-rose-500" />
                    )}
                    <span>Display Company / Role</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Network tokens */}
            <div className="rounded-lg border border-line bg-warm-50/40 p-3 text-[11px] space-y-1">
              <div className="text-ink-600">
                <strong>Granted At:</strong> {new Date(selectedRecord.grantedAt).toISOString()}
              </div>
              {selectedRecord.revokedAt && (
                <div className="text-rose-700 font-medium">
                  <strong>Revoked At:</strong> {new Date(selectedRecord.revokedAt).toISOString()}
                  {selectedRecord.structuredConsent.revocationReason && (
                    <span> ({selectedRecord.structuredConsent.revocationReason})</span>
                  )}
                </div>
              )}
              {selectedRecord.ipAddress && (
                <div className="text-ink-500 font-mono">
                  <strong>Client Verification IP:</strong> {selectedRecord.ipAddress}
                </div>
              )}
              {selectedRecord.userAgent && (
                <div className="text-ink-500 font-mono truncate">
                  <strong>User Agent:</strong> {selectedRecord.userAgent}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-800 hover:bg-warm-100"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* 5. Revoke Consent Confirmation Dialog */}
      {revokingRecord && (
        <ModalDialog
          isOpen={Boolean(revokingRecord)}
          onClose={() => setRevokingRecord(null)}
          title="Withdraw / Revoke Customer Consent"
          description={`Process consent withdrawal for ${revokingRecord.customerName}.`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <p className="text-ink-700 leading-relaxed">
              Withdrawing consent will:
            </p>
            <ul className="list-disc pl-5 text-ink-600 space-y-1">
              <li>Mark the consent record as <strong>Revoked</strong> with current timestamp.</li>
              <li>Immediately unpublish and archive the associated testimonial.</li>
              <li>Prevent public Walls of Love and widgets from rendering this content.</li>
              <li>Register an entry in the tombstone register to prevent accidental restoration from backups.</li>
            </ul>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Reason for Revocation (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Customer requested withdrawal via email"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setRevokingRecord(null)}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100"
                disabled={isSubmittingRevoke}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isSubmittingRevoke}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isSubmittingRevoke && <Loader2 size={13} className="animate-spin" />}
                <span>Confirm Revocation &amp; Unpublish</span>
              </button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
