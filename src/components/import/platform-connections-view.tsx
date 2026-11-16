"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Star,
  Loader2,
  Plug,
  Info,
  Lock,
  ArrowRight,
  Eye,
  Check,
  X,
  FileSpreadsheet,
  Clock,
  Calendar,
  Settings2,
  RotateCcw,
  History,
} from "lucide-react";
import { useToast } from "@/components/dashboard/toast-context";
import { NormalizedImportItem } from "@/lib/import/external-types";

interface PlatformConnectionsViewProps {
  workspaceId: string;
  projects?: Array<{ id: string; name: string }>;
  onNavigateToManual?: (platformId: string) => void;
}

export function PlatformConnectionsView({
  workspaceId,
  projects = [],
  onNavigateToManual,
}: PlatformConnectionsViewProps) {
  const toast = useToast();

  const [connections, setConnections] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Connection Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("GOOGLE");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Direct Sync & Preview State
  const [activeSyncingId, setActiveSyncingId] = useState<string | null>(null);
  const [previewReviews, setPreviewReviews] = useState<{
    connectionId: string;
    platform: string;
    accountName: string;
    items: NormalizedImportItem[];
    duplicateCount: number;
  } | null>(null);
  const [isImportingSync, setIsImportingSync] = useState(false);
  const [syncProjectId, setSyncProjectId] = useState<string>("");

  // Sync Settings Modal State
  const [settingsModalConn, setSettingsModalConn] = useState<any | null>(null);
  const [editSyncEnabled, setEditSyncEnabled] = useState(false);
  const [editSyncFrequency, setEditSyncFrequency] = useState("DAILY");
  const [editTargetProjectId, setEditTargetProjectId] = useState("");
  const [editMaxRetries, setEditMaxRetries] = useState(3);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Sync History Modal State
  const [historyModalConn, setHistoryModalConn] = useState<any | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load active connections and catalog
  const loadConnections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/connections`);
      const data = await res.json();
      if (res.ok) {
        setConnections(data.connections || []);
        setCatalog(data.catalog || []);
      }
    } catch (err) {
      console.error("Failed to load connections:", err);
      toast.error("Failed to load connections", "Could not retrieve connected review accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadConnections();
    }
  }, [workspaceId]);

  // Handle Save / Connect
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsValidating(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          credentials,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to validate credentials.");
      }

      toast.success(
        "Connection Established",
        `Successfully verified and connected ${data.connection.accountName || selectedPlatform}.`
      );
      setIsModalOpen(false);
      setCredentials({});
      loadConnections();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Validation failed.");
    } finally {
      setIsValidating(false);
    }
  };

  // Handle Live Permission Validation Test
  const handleTestConnection = async (connectionId: string, name: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/connections/${connectionId}/validate`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        toast.success("Validation Succeeded", `Live API connection to ${name} is valid and operational.`);
        loadConnections();
      } else {
        toast.error("Validation Failed", data.error || `Could not verify credentials for ${name}.`);
        loadConnections();
      }
    } catch (err) {
      toast.error("Error", "Validation test request failed.");
    }
  };

  // Handle Disconnect
  const handleDisconnect = async (connectionId: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to disconnect ${name}? Existing imported testimonials will not be deleted, but automated sync will stop.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/connections/${connectionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Disconnected", `${name} has been removed.`);
        loadConnections();
      } else {
        toast.error("Failed to Disconnect", "Could not remove connection.");
      }
    } catch (err) {
      toast.error("Error", "Could not complete disconnection request.");
    }
  };

  // Handle Direct Sync / Retry Trigger
  const handleExecuteSync = async (connection: any, isRetry: boolean = false) => {
    setActiveSyncingId(connection.id);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/connections/${connection.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerType: isRetry ? "RETRY" : "MANUAL",
          limit: 50,
          defaultProjectId: connection.targetProjectId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute synchronization.");
      }

      if (data.success) {
        toast.success(
          "Sync Complete",
          `Imported ${data.itemsImported} new reviews into moderation queue (${data.duplicatesSkipped} duplicates skipped).`
        );
      } else {
        toast.error("Sync Failed", data.error || "Provider reported an error during sync.");
      }
      loadConnections();
    } catch (err: unknown) {
      toast.error("Sync Failed", err instanceof Error ? err.message : "Could not complete sync.");
      loadConnections();
    } finally {
      setActiveSyncingId(null);
    }
  };

  // Toggle Scheduled Sync directly from card
  const handleToggleScheduledSync = async (conn: any) => {
    const nextState = !conn.syncEnabled;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/connections/${conn.id}/sync`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syncEnabled: nextState,
          syncFrequency: conn.syncFrequency || "DAILY",
        }),
      });

      if (res.ok) {
        toast.success(
          nextState ? "Scheduled Sync Enabled" : "Scheduled Sync Paused",
          nextState
            ? `Sync scheduled every ${conn.syncFrequency.toLowerCase().replace(/_/g, " ")}.`
            : "Automated review sync is now paused."
        );
        loadConnections();
      } else {
        toast.error("Failed", "Could not update sync schedule.");
      }
    } catch {
      toast.error("Error", "Failed to toggle scheduled sync.");
    }
  };

  // Open Sync Settings Modal
  const openSyncSettings = (conn: any) => {
    setSettingsModalConn(conn);
    setEditSyncEnabled(Boolean(conn.syncEnabled));
    setEditSyncFrequency(conn.syncFrequency || "DAILY");
    setEditTargetProjectId(conn.targetProjectId || "");
    setEditMaxRetries(conn.maxRetries || 3);
  };

  // Save Sync Settings
  const handleSaveSyncSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsModalConn) return;

    setIsSavingSettings(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/connections/${settingsModalConn.id}/sync`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            syncEnabled: editSyncEnabled,
            syncFrequency: editSyncFrequency,
            targetProjectId: editTargetProjectId || null,
            maxRetries: Number(editMaxRetries) || 3,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update sync settings.");
      }

      toast.success("Settings Saved", "Scheduled synchronization configuration updated.");
      setSettingsModalConn(null);
      loadConnections();
    } catch (err: unknown) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Open Sync History Modal
  const openSyncHistory = async (conn: any) => {
    setHistoryModalConn(conn);
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/connections/${conn.id}/sync?limit=25`);
      const data = await res.json();
      if (res.ok) {
        setSyncLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load sync history:", err);
      toast.error("Error", "Could not load synchronization logs.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const activeProviderInfo = catalog.find((c) => c.platformId === selectedPlatform);

  return (
    <div className="space-y-6">
      {/* Header & Connect Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-ink-900 flex items-center gap-2">
            <Plug size={18} className="text-brand-500" />
            <span>Connected External Review Accounts &amp; Sync</span>
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Connect verified platform APIs to automatically synchronize new customer reviews into your moderation queue on a configurable schedule.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadConnections}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-brand-600 transition-colors"
          >
            <Plus size={14} />
            <span>Connect Account</span>
          </button>
        </div>
      </div>

      {/* Security & Token Protection Guarantee Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-950 flex items-start gap-3 shadow-2xs">
        <div className="p-1 rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
          <ShieldCheck size={18} />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold">Automated Synchronization &amp; Content Integrity Guarantees</h4>
          <p className="text-emerald-900/90 leading-relaxed text-[11px]">
            API credentials are encrypted at rest with AES-256-GCM. Newly synchronized reviews are strictly ingested in <code className="font-mono font-bold text-emerald-950">PENDING</code> moderation status and will never publish automatically. Existing testimonials and manual human edits are 100% preserved.
          </p>
        </div>
      </div>

      {/* Connected Accounts List */}
      {isLoading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-xs text-ink-400">
          <Loader2 size={16} className="animate-spin text-brand-500" />
          <span>Loading verified connections &amp; sync schedules...</span>
        </div>
      ) : connections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-warm-50/40 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-line shadow-2xs flex items-center justify-center text-brand-500 mx-auto">
            <Plug size={22} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-ink-900">No Connected External Accounts Yet</h4>
            <p className="text-[11px] text-ink-500 max-w-md mx-auto mt-0.5">
              Connect your Google Places profile, Trustpilot Business, Product Hunt, or G2 listing to pull accessible customer reviews directly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600 transition-colors"
          >
            <Plus size={14} />
            <span>Connect First Review Platform</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map((conn) => {
            const isError = conn.status === "ERROR";
            const isExpired = conn.status === "EXPIRED" || conn.tokenHealth?.isExpired;
            const isExpiringSoon = conn.tokenHealth?.isExpiringSoon;
            const isSyncing = activeSyncingId === conn.id || conn.lastSyncStatus === "RUNNING";

            return (
              <div
                key={conn.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all ${
                  isExpired
                    ? "border-rose-300 ring-1 ring-rose-300"
                    : isError
                    ? "border-amber-300"
                    : "border-line hover:border-brand-300"
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 font-bold flex items-center justify-center border border-brand-200 shadow-2xs text-xs">
                        {conn.platform[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-ink-900 leading-snug">
                          {conn.accountName || `${conn.platform} Account`}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-ink-400 mt-0.5">
                          <span className="font-mono">{conn.accountIdentifier}</span>
                          <span>&bull;</span>
                          <span className="capitalize">{conn.platform.toLowerCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isExpired ? (
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          Expired
                        </span>
                      ) : isError ? (
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          Sync Error
                        </span>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Connected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Token Expiry Alert Banner */}
                  {conn.tokenHealth?.alertLevel !== "HEALTHY" && (
                    <div
                      className={`rounded-xl p-2.5 text-[11px] flex items-start gap-2 border ${
                        conn.tokenHealth.alertLevel === "ERROR"
                          ? "bg-rose-50/80 border-rose-200 text-rose-800"
                          : "bg-amber-50/80 border-amber-200 text-amber-900"
                      }`}
                    >
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                      <div className="leading-snug">
                        <span className="font-bold">Token Health Alert: </span>
                        <span>{conn.tokenHealth.alertMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* Scheduled Synchronization Status Widget */}
                  <div className="rounded-xl bg-warm-50/70 p-3 border border-line/60 text-[11px] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-ink-800">
                        <Clock size={12} className="text-brand-500" />
                        <span>Scheduled Sync</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded-md ${
                            conn.syncEnabled
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-warm-200/80 text-ink-600"
                          }`}
                        >
                          {conn.syncEnabled ? conn.syncFrequency : "Disabled"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleScheduledSync(conn)}
                          title={conn.syncEnabled ? "Pause automated sync" : "Enable automated sync"}
                          className={`w-7 h-4 rounded-full transition-colors flex items-center p-0.5 ${
                            conn.syncEnabled ? "bg-brand-500 justify-end" : "bg-warm-300 justify-start"
                          }`}
                        >
                          <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line/50 text-[10px] text-ink-600">
                      <div>
                        <span className="text-ink-400 block">Last Sync:</span>
                        <span className="font-medium text-ink-800">
                          {conn.lastSyncAt ? (
                            <>
                              {new Date(conn.lastSyncAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              ({new Date(conn.lastSyncAt).toLocaleDateString()})
                            </>
                          ) : (
                            <span className="italic text-ink-400">Never synced</span>
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-ink-400 block">Next Sync:</span>
                        <span className="font-medium text-ink-800">
                          {conn.syncEnabled && conn.nextSyncAt ? (
                            new Date(conn.nextSyncAt).toLocaleDateString() ===
                            new Date().toLocaleDateString() ? (
                              `Today at ${new Date(conn.nextSyncAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            ) : (
                              new Date(conn.nextSyncAt).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            )
                          ) : (
                            <span className="italic text-ink-400">Not scheduled</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {conn.retryCount > 0 && isError && (
                      <div className="text-[10px] text-amber-800 bg-amber-100/60 rounded-lg px-2 py-1 flex items-center justify-between">
                        <span>
                          Retry attempt {conn.retryCount} of {conn.maxRetries}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleExecuteSync(conn, true)}
                          className="font-bold underline hover:text-amber-950 flex items-center gap-1"
                        >
                          <RotateCcw size={10} />
                          <span>Retry Now</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {conn.lastError && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-[10px] text-rose-700 flex items-start gap-1.5">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{conn.lastError}</span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-line/60 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openSyncSettings(conn)}
                      title="Configure sync frequency & target project"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line bg-white hover:bg-warm-100 text-[11px] font-semibold text-ink-700 transition-colors"
                    >
                      <Settings2 size={12} />
                      <span>Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openSyncHistory(conn)}
                      title="View synchronization history ledger"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line bg-white hover:bg-warm-100 text-[11px] font-semibold text-ink-700 transition-colors"
                    >
                      <History size={12} />
                      <span>History</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isError && (
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={() => handleExecuteSync(conn, true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-2xs transition-colors disabled:opacity-50"
                      >
                        {isSyncing ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <RotateCcw size={11} />
                        )}
                        <span>Retry</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => handleExecuteSync(conn, false)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold shadow-2xs transition-colors disabled:opacity-50"
                    >
                      {isSyncing ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <RefreshCw size={11} />
                      )}
                      <span>Sync Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDisconnect(conn.id, conn.accountName || conn.platform)}
                      title="Disconnect and remove credentials"
                      className="p-1 rounded-lg border border-line bg-white text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Platform Requirements & API Status Reference Guide */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-brand-500" />
          <h3 className="text-xs sm:text-sm font-bold text-ink-900">
            Platform API Requirements &amp; Capabilities Directory
          </h3>
        </div>
        <p className="text-xs text-ink-500 leading-relaxed">
          Praise connects only to official, authorized platform developer APIs. To maintain transparency, here is the availability status for each major review platform:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {catalog.map((cat) => (
            <div
              key={cat.platformId}
              className="rounded-xl border border-line/80 bg-warm-50/40 p-3.5 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink-900 text-xs">{cat.name}</span>
                {cat.supportsLiveApi ? (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.2 text-[9px] font-bold uppercase">
                    Official API
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.2 text-[9px] font-bold uppercase">
                    Manual Export Only
                  </span>
                )}
              </div>

              <p className="text-[11px] text-ink-600 leading-relaxed">
                {cat.supportsLiveApi
                  ? `Supports automated live review retrieval via ${cat.authType.replace(/_/g, " ")}.`
                  : cat.unsupportedReason}
              </p>

              {!cat.supportsLiveApi && (
                <div className="pt-2 border-t border-line/60">
                  <button
                    type="button"
                    onClick={() => onNavigateToManual?.(cat.platformId)}
                    className="text-[10px] font-bold text-brand-600 hover:underline flex items-center gap-1"
                  >
                    <FileSpreadsheet size={11} />
                    <span>Open {cat.name} Manual Export Guide &rarr;</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CONNECT PROVIDER ACCOUNT */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink-900">Connect External Review Account</h3>
                <p className="text-[11px] text-ink-500">Validate live credentials against official developer APIs</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-400 hover:text-ink-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConnect} className="p-5 space-y-4">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed font-medium">{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">
                  Select Provider
                </label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => {
                    setSelectedPlatform(e.target.value);
                    setCredentials({});
                    setFormError(null);
                  }}
                  className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink-900 font-medium focus:border-brand-500 focus:outline-none"
                >
                  <option value="GOOGLE">Google Reviews (Places API)</option>
                  <option value="TRUSTPILOT">Trustpilot Business API</option>
                  <option value="PRODUCT_HUNT">Product Hunt GraphQL API</option>
                  <option value="G2">G2 Partner API</option>
                  <option value="FACEBOOK">Facebook Page Ratings (Meta Graph API)</option>
                </select>
              </div>

              {/* Dynamic Credential Fields per platform */}
              {selectedPlatform === "GOOGLE" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Google Places API Key <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="AIzaSy..."
                      value={credentials.apiKey || ""}
                      onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                      className="w-full rounded-xl border border-line p-2.5 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-ink-400 mt-0.5">
                      Created in Google Cloud Console with the Places API enabled.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Google Business Place ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ChIJ..."
                      value={credentials.placeId || ""}
                      onChange={(e) => setCredentials({ ...credentials, placeId: e.target.value })}
                      className="w-full rounded-xl border border-line p-2.5 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-ink-400 mt-0.5">
                      Locate your Place ID via Google&apos;s Place ID Finder tool.
                    </p>
                  </div>
                </div>
              )}

              {selectedPlatform === "TRUSTPILOT" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Trustpilot API Key <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Trustpilot API Key"
                      value={credentials.apiKey || ""}
                      onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                      className="w-full rounded-xl border border-line p-2.5 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Business Unit ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5abcdef0123456789abcdef0"
                      value={credentials.businessUnitId || ""}
                      onChange={(e) =>
                        setCredentials({ ...credentials, businessUnitId: e.target.value })
                      }
                      className="w-full rounded-xl border border-line p-2.5 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedPlatform === "PRODUCT_HUNT" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Product Hunt Developer Bearer Token <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Developer Access Token"
                      value={credentials.apiToken || ""}
                      onChange={(e) => setCredentials({ ...credentials, apiToken: e.target.value })}
                      className="w-full rounded-xl border border-line p-2.5 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Post Slug <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. praise or my-product"
                      value={credentials.postSlug || ""}
                      onChange={(e) => setCredentials({ ...credentials, postSlug: e.target.value })}
                      className="w-full rounded-xl border border-line p-2.5 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedPlatform === "G2" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      G2 Partner API Token <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="G2 API Token"
                      value={credentials.apiToken || ""}
                      onChange={(e) => setCredentials({ ...credentials, apiToken: e.target.value })}
                      className="w-full rounded-xl border border-line p-2.5 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Product Slug or ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. praise-software"
                      value={credentials.productId || ""}
                      onChange={(e) =>
                        setCredentials({ ...credentials, productId: e.target.value })
                      }
                      className="w-full rounded-xl border border-line p-2.5 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedPlatform === "FACEBOOK" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Page Access Token <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="EAA..."
                      value={credentials.pageAccessToken || ""}
                      onChange={(e) =>
                        setCredentials({ ...credentials, pageAccessToken: e.target.value })
                      }
                      className="w-full rounded-xl border border-line p-2.5 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Facebook Page ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="1234567890"
                      value={credentials.pageId || ""}
                      onChange={(e) => setCredentials({ ...credentials, pageId: e.target.value })}
                      className="w-full rounded-xl border border-line p-2.5 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-line flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isValidating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {isValidating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Validating Live API Permissions...</span>
                    </>
                  ) : (
                    <>
                      <span>Test &amp; Save Connection</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SYNC SETTINGS & SCHEDULE CONFIGURATION */}
      {/* ========================================================================= */}
      {settingsModalConn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                  <Settings2 size={16} className="text-brand-500" />
                  <span>Configure Sync: {settingsModalConn.accountName || settingsModalConn.platform}</span>
                </h3>
                <p className="text-[11px] text-ink-500">Automated incremental review synchronization</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalConn(null)}
                className="text-ink-400 hover:text-ink-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSyncSettings} className="p-5 space-y-4 text-xs">
              {/* Enable / Disable Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-warm-50/70 border border-line">
                <div>
                  <h4 className="font-bold text-ink-900">Enable Scheduled Synchronization</h4>
                  <p className="text-[11px] text-ink-500">Automatically pull new reviews on schedule</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditSyncEnabled(!editSyncEnabled)}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                    editSyncEnabled ? "bg-brand-500 justify-end" : "bg-warm-300 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Sync Frequency */}
              <div>
                <label className="block font-semibold text-ink-900 mb-1">
                  Sync Frequency
                </label>
                <select
                  value={editSyncFrequency}
                  onChange={(e) => setEditSyncFrequency(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink-900 font-medium focus:border-brand-500 focus:outline-none"
                >
                  <option value="HOURLY">Hourly (Every 1 hour)</option>
                  <option value="EVERY_6_HOURS">Every 6 Hours</option>
                  <option value="EVERY_12_HOURS">Every 12 Hours</option>
                  <option value="DAILY">Daily (Every 24 hours)</option>
                  <option value="WEEKLY">Weekly (Every 7 days)</option>
                </select>
                <p className="text-[10px] text-ink-400 mt-1">
                  Praise uses incremental cursors to retrieve only fresh reviews since your last sync.
                </p>
              </div>

              {/* Assign Default Project */}
              <div>
                <label className="block font-semibold text-ink-900 mb-1">
                  Assign to Project (Optional)
                </label>
                <select
                  value={editTargetProjectId}
                  onChange={(e) => setEditTargetProjectId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink-900 font-medium focus:border-brand-500 focus:outline-none"
                >
                  <option value="">General Workspace (No project)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max Retries */}
              <div>
                <label className="block font-semibold text-ink-900 mb-1">
                  Max Safe Retries on Failure
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={editMaxRetries}
                  onChange={(e) => setEditMaxRetries(parseInt(e.target.value, 10) || 3)}
                  className="w-full rounded-xl border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none"
                />
                <p className="text-[10px] text-ink-400 mt-0.5">
                  Transient network/provider errors retry automatically with exponential backoff.
                </p>
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSettingsModalConn(null)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {isSavingSettings ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Sync Schedule</span>
                      <Check size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SYNC HISTORY LEDGER */}
      {/* ========================================================================= */}
      {historyModalConn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-white shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-line flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                  <History size={16} className="text-brand-500" />
                  <span>Sync History: {historyModalConn.accountName || historyModalConn.platform}</span>
                </h3>
                <p className="text-[11px] text-ink-500">
                  Audit ledger of previous scheduled and manual review synchronization runs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalConn(null)}
                className="text-ink-400 hover:text-ink-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {isLoadingHistory ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-ink-400">
                  <Loader2 size={16} className="animate-spin text-brand-500" />
                  <span>Loading synchronization history...</span>
                </div>
              ) : syncLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-ink-400 space-y-1">
                  <p className="font-semibold text-ink-700">No sync runs recorded yet</p>
                  <p className="text-[11px]">Sync runs will appear here as soon as a manual or scheduled sync completes.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {syncLogs.map((log) => {
                    const isSuccess = log.status === "SUCCESS";
                    return (
                      <div
                        key={log.id}
                        className={`rounded-xl border p-3 text-xs space-y-1.5 transition-all ${
                          isSuccess
                            ? "border-emerald-200/80 bg-emerald-50/20"
                            : "border-rose-200 bg-rose-50/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                                isSuccess
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {log.status}
                            </span>
                            <span className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">
                              Trigger: {log.triggerType}
                            </span>
                          </div>

                          <div className="text-[10px] text-ink-400 flex items-center gap-1.5">
                            {log.durationMs !== null && <span>{log.durationMs}ms</span>}
                            <span>&bull;</span>
                            <span>{new Date(log.startedAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-ink-700 pt-0.5">
                          <div>
                            <span className="text-ink-400">Fetched: </span>
                            <span className="font-bold">{log.itemsFetched}</span>
                          </div>
                          <div>
                            <span className="text-ink-400">New Imported: </span>
                            <span className="font-bold text-emerald-700">+{log.itemsImported}</span>
                          </div>
                          <div>
                            <span className="text-ink-400">Duplicates Skipped: </span>
                            <span className="font-semibold text-ink-600">{log.duplicatesSkipped}</span>
                          </div>
                        </div>

                        {log.errorMessage && (
                          <div className="rounded-lg bg-rose-50 p-2 text-[10px] text-rose-700 border border-rose-200/60 flex items-start gap-1">
                            <AlertTriangle size={11} className="shrink-0 mt-0.5 text-rose-600" />
                            <span>{log.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-line bg-warm-50/50 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryModalConn(null)}
                className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
