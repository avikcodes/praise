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

  // Sync / Preview State
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
        throw new Error(data.error || "Failed to connect provider.");
      }

      toast.success(
        "Connection Established",
        `Successfully connected ${data.connection?.accountName || selectedPlatform}.`
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

  // Handle Live Validation of Existing Connection
  const handleTestConnection = async (connectionId: string, name: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/connections/${connectionId}/validate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.result?.valid) {
        toast.error("Validation Failed", data.result?.error || "Token or credentials rejected by provider.");
      } else {
        toast.success("Connection Active", `Verified live permissions for ${name}.`);
      }
      loadConnections();
    } catch (err) {
      toast.error("Validation Error", "Could not reach provider API.");
    }
  };

  // Handle Disconnect
  const handleDisconnect = async (connectionId: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}? Your previously imported testimonials will remain preserved.`)) {
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

  // Handle Fetch & Preview Sync
  const handleFetchSync = async (connection: any) => {
    setActiveSyncingId(connection.id);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/connections/${connection.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync reviews.");
      }

      setPreviewReviews({
        connectionId: connection.id,
        platform: connection.platform,
        accountName: connection.accountName || connection.platform,
        items: data.preview?.items || [],
        duplicateCount: data.preview?.duplicateCount || 0,
      });
    } catch (err: unknown) {
      toast.error("Sync Failed", err instanceof Error ? err.message : "Could not retrieve reviews.");
      loadConnections();
    } finally {
      setActiveSyncingId(null);
    }
  };

  // Commit Synced Reviews
  const handleCommitSync = async () => {
    if (!previewReviews) return;

    const itemsToImport = previewReviews.items.filter((i) => i.selected);
    if (itemsToImport.length === 0) {
      toast.error("No Reviews Selected", "Please select at least one review to import.");
      return;
    }

    setIsImportingSync(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/import/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: previewReviews.platform,
          items: itemsToImport,
          defaultProjectId: syncProjectId || undefined,
          skipDuplicates: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import synced reviews.");
      }

      toast.success(
        "Reviews Imported",
        `Imported ${data.result.importedCount} reviews into your moderation queue as PENDING.`
      );
      setPreviewReviews(null);
      loadConnections();
    } catch (err: unknown) {
      toast.error("Import Error", err instanceof Error ? err.message : "Failed to save reviews.");
    } finally {
      setIsImportingSync(false);
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
            <span>Connected External Review Accounts</span>
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Connect verified official APIs to pull customer reviews, validate live permissions, and sync new reviews directly into your moderation queue.
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
          <h4 className="font-bold">Credential Protection &amp; Moderation Integrity</h4>
          <p className="text-emerald-900/90 leading-relaxed text-[11px]">
            API keys and OAuth tokens are encrypted at rest using AES-256-GCM and never exposed to the browser. All synced testimonials are held in <code className="font-mono font-bold text-emerald-950">PENDING</code> moderation status and remain unpublished until reviewed.
          </p>
        </div>
      </div>

      {/* Connected Accounts List */}
      {isLoading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-xs text-ink-400">
          <Loader2 size={16} className="animate-spin text-brand-500" />
          <span>Loading verified connections...</span>
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
            const isSyncing = activeSyncingId === conn.id;

            return (
              <div
                key={conn.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-brand-300 transition-all"
              >
                <div className="space-y-3">
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

                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        isError
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {conn.status}
                    </span>
                  </div>

                  {/* Masked Credentials Preview */}
                  <div className="rounded-xl bg-warm-50/70 p-2.5 border border-line/60 text-[10px] space-y-1 font-mono">
                    <div className="flex items-center justify-between text-ink-500">
                      <span className="flex items-center gap-1">
                        <Lock size={10} className="text-emerald-600" />
                        <span>Protected Credential</span>
                      </span>
                      <span className="text-[9px] text-emerald-700 font-semibold uppercase">Encrypted at rest</span>
                    </div>
                    {Object.entries(conn.maskedCredentials || {}).map(([key, maskedVal]) => (
                      <div key={key} className="flex items-center justify-between text-ink-700">
                        <span className="text-ink-400">{key}:</span>
                        <span className="font-bold">{String(maskedVal)}</span>
                      </div>
                    ))}
                  </div>

                  {conn.lastError && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-[10px] text-rose-700 flex items-start gap-1.5">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span>{conn.lastError}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-line/60 flex items-center justify-between gap-2 text-xs">
                  <div className="text-[10px] text-ink-400">
                    {conn.lastSyncAt ? (
                      <span>Last synced: {new Date(conn.lastSyncAt).toLocaleDateString()}</span>
                    ) : (
                      <span className="italic">Never synced</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTestConnection(conn.id, conn.accountName || conn.platform)}
                      title="Test live API permissions"
                      className="px-2.5 py-1 rounded-lg border border-line bg-white hover:bg-warm-100 text-[11px] font-semibold text-ink-700 transition-colors"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => handleFetchSync(conn)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold shadow-2xs transition-colors disabled:opacity-50"
                    >
                      {isSyncing ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <RefreshCw size={11} />
                      )}
                      <span>Sync Reviews</span>
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
      {/* MODAL 2: SYNC PREVIEW & DUPLICATE DETECTION */}
      {/* ========================================================================= */}
      {previewReviews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-line flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-ink-900">
                  Synced Reviews Preview ({previewReviews.accountName})
                </h3>
                <p className="text-[11px] text-ink-500">
                  {previewReviews.items.length} reviews retrieved &bull; {previewReviews.duplicateCount} duplicate candidates detected
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReviews(null)}
                className="text-ink-400 hover:text-ink-700"
              >
                <X size={16} />
              </button>
            </div>

            {/* Options Bar */}
            <div className="px-5 py-3 border-b border-line bg-warm-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-ink-700 mr-2">Assign Project:</label>
                <select
                  value={syncProjectId}
                  onChange={(e) => setSyncProjectId(e.target.value)}
                  className="rounded-lg border border-line bg-white px-2 py-1 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                >
                  <option value="">General (No project)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[11px] text-ink-500">
                <span className="font-bold text-emerald-700">
                  {previewReviews.items.filter((i) => i.selected).length}
                </span>{" "}
                of {previewReviews.items.length} selected for pending import
              </div>
            </div>

            {/* Review List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {previewReviews.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-3.5 text-xs space-y-2 transition-all ${
                    item.isDuplicateCandidate
                      ? "border-amber-300 bg-amber-50/30"
                      : item.selected
                      ? "border-brand-300 bg-white shadow-2xs"
                      : "border-line bg-warm-50/40 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => {
                          const updated = [...previewReviews.items];
                          updated[idx] = { ...item, selected: !item.selected };
                          setPreviewReviews({ ...previewReviews, items: updated });
                        }}
                        className="rounded border-line text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                      />
                      <span className="font-bold text-ink-900">{item.authorName}</span>
                      {item.authorCompany && (
                        <span className="text-[10px] text-ink-500">({item.authorCompany})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {item.rating && (
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={11}
                              className={
                                s <= item.rating!
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-ink-200 fill-transparent"
                              }
                            />
                          ))}
                        </div>
                      )}
                      {item.isDuplicateCandidate && (
                        <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[9px] font-bold">
                          Duplicate
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-ink-700 pl-5 text-[11px] leading-relaxed line-clamp-3">
                    {item.content}
                  </p>

                  <div className="pl-5 pt-1 flex items-center justify-between text-[10px] text-ink-400">
                    <span>
                      {item.originalDate ? new Date(item.originalDate).toLocaleDateString() : ""}
                    </span>
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 hover:underline flex items-center gap-0.5"
                      >
                        <span>Original Link</span>
                        <ExternalLink size={9} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-line bg-warm-50/50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setPreviewReviews(null)}
                className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                disabled={isImportingSync || previewReviews.items.filter((i) => i.selected).length === 0}
                onClick={handleCommitSync}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {isImportingSync ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Importing into Moderation Queue...</span>
                  </>
                ) : (
                  <>
                    <span>Import {previewReviews.items.filter((i) => i.selected).length} Reviews as Pending</span>
                    <Check size={13} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
