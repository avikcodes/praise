"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  HelpCircle,
  Info,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import type {
  CustomDomainSummary,
  DomainStatus,
  DomainTargetType,
  TlsProvisioningMode,
  DomainDnsInstructions,
} from "@/types/domains";

export default function CustomDomainsDashboard() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const toast = useToast();

  const [domains, setDomains] = useState<CustomDomainSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Targets for selection
  const [availableWalls, setAvailableWalls] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [availableBrands, setAvailableBrands] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  // Add Domain Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [targetType, setTargetType] = useState<DomainTargetType>("WALL_OF_LOVE");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [tlsMode, setTlsMode] = useState<TlsProvisioningMode>("REVERSE_PROXY");

  // DNS & Proxy Guidance Drawer
  const [instructionsDomain, setInstructionsDomain] = useState<CustomDomainSummary | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<DomainDnsInstructions | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<"caddy" | "nginx" | "traefik" | "cloudflare">("caddy");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Reassignment Modal
  const [reassigningDomain, setReassigningDomain] = useState<CustomDomainSummary | null>(null);
  const [reassignTargetType, setReassignTargetType] = useState<DomainTargetType>("WALL_OF_LOVE");
  const [reassignTargetId, setReassignTargetId] = useState("");

  const fetchDomains = async () => {
    if (!activeWorkspace?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/domains`);
      if (res.ok) {
        const data = await res.json();
        setDomains(data.domains || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load domains", "Could not fetch custom domain list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    if (!activeWorkspace?.id) return;
    try {
      const [wallsRes, brandsRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/walls`),
        fetch(`/api/workspaces/${workspaceId}/brands`),
      ]);
      if (wallsRes.ok) {
        const wData = await wallsRes.json();
        setAvailableWalls(wData.walls || []);
      }
      if (brandsRes.ok) {
        const bData = await brandsRes.json();
        setAvailableBrands(bData.brands || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDomains();
    fetchTargets();
  }, [activeWorkspace?.id]);

  const handleOpenAdd = () => {
    setNewDomain("");
    setTargetType("WALL_OF_LOVE");
    setSelectedTargetId(availableWalls[0]?.id || "");
    setTlsMode("REVERSE_PROXY");
    setIsAddModalOpen(true);
  };

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace?.id) return;

    try {
      setSubmitting(true);
      const payload = {
        domain: newDomain,
        targetType,
        wallOfLoveId: targetType === "WALL_OF_LOVE" ? selectedTargetId : null,
        brandId: targetType === "BRAND_PAGE" ? selectedTargetId : null,
        tlsProvisioning: tlsMode,
        canonicalRedirect: true,
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register custom domain.");
      }

      toast.success("Domain Registered", `Added ${newDomain}. Configure your DNS to activate.`);
      setIsAddModalOpen(false);
      fetchDomains();

      // Automatically open DNS instructions
      if (data.instructions) {
        setInstructionsDomain(data);
        setDnsInstructions(data.instructions);
      }
    } catch (err: any) {
      toast.error("Error adding domain", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (domain: CustomDomainSummary) => {
    if (!activeWorkspace?.id) return;
    try {
      setVerifyingId(domain.id);
      const res = await fetch(`/api/workspaces/${workspaceId}/domains/${domain.id}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.verified) {
        toast.success("Domain Verified!", data.message);
      } else {
        toast.info("Verification Pending", data.message || "DNS records not yet propagated.");
      }
      fetchDomains();
    } catch (err) {
      toast.error("Verification error", "Could not complete DNS verification check.");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleOpenInstructions = async (domain: CustomDomainSummary) => {
    setInstructionsDomain(domain);
    if (!activeWorkspace?.id) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/domains/${domain.id}`);
      if (res.ok) {
        const data = await res.json();
        setDnsInstructions(data.instructions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenReassign = (domain: CustomDomainSummary) => {
    setReassigningDomain(domain);
    setReassignTargetType(domain.targetType);
    setReassignTargetId(domain.targetType === "WALL_OF_LOVE" ? domain.wallOfLoveId || "" : domain.brandId || "");
  };

  const handleSaveReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace?.id || !reassigningDomain) return;

    try {
      const payload = {
        targetType: reassignTargetType,
        wallOfLoveId: reassignTargetType === "WALL_OF_LOVE" ? reassignTargetId : null,
        brandId: reassignTargetType === "BRAND_PAGE" ? reassignTargetId : null,
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/domains/${reassigningDomain.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reassign target.");
      }

      toast.success("Target Reassigned", `Domain now routes to selected ${reassignTargetType === "WALL_OF_LOVE" ? "Wall of Love" : "Brand Profile"}.`);
      setReassigningDomain(null);
      fetchDomains();
    } catch (err: any) {
      toast.error("Reassign failed", err.message);
    }
  };

  const handleDeleteDomain = async (domain: CustomDomainSummary) => {
    if (!activeWorkspace?.id) return;
    if (!confirm(`Are you sure you want to remove "${domain.domain}"? This will free the hostname immediately.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/domains/${domain.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Domain Removed", `Freed hostname ${domain.domain}.`);
        fetchDomains();
      }
    } catch (err) {
      toast.error("Delete failed", "Could not remove custom domain.");
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success("Copied", "Copied to clipboard.");
  };

  const activeCount = domains.filter((d) => d.status === "ACTIVE" || d.status === "VERIFIED").length;
  const pendingCount = domains.filter((d) => d.status === "PENDING_VERIFICATION").length;
  const failedCount = domains.filter((d) => d.status === "FAILED" || d.status === "MISCONFIGURED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Domains"
        description="Publish your Walls of Love and Brand Profiles on custom hostnames (e.g. reviews.yourbrand.com) with reverse-proxy TLS compatibility."
        actions={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600 transition-colors"
          >
            <Plus size={14} />
            <span>Add Custom Domain</span>
          </button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-xs font-semibold text-ink-500">Registered Domains</div>
          <div className="text-2xl font-bold text-ink-900 mt-1">{domains.length}</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-xs font-semibold text-ink-500">Active &amp; Routing</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-xs font-semibold text-ink-500">Pending Verification</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-xs font-semibold text-ink-500">Failed / Needs Review</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{failedCount}</div>
        </div>
      </div>

      {/* Deployment & TLS Architecture Notice */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
        <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">Self-Hosted Reverse-Proxy Architecture</div>
          <p className="leading-relaxed text-blue-800">
            Praise runs behind your reverse proxy (such as Caddy, Nginx with Certbot, Traefik, or Cloudflare SSL). Praise dynamically routes incoming traffic matching your verified hostname and guarantees canonical URLs. Ensure your proxy passes the <code className="bg-blue-100 px-1 rounded font-mono">Host</code> and <code className="bg-blue-100 px-1 rounded font-mono">X-Forwarded-Host</code> headers.
          </p>
        </div>
      </div>

      {/* Domain Cards / Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-ink-400">Loading custom domains...</div>
      ) : domains.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white p-12 text-center space-y-3">
          <Network size={36} className="mx-auto text-ink-300" />
          <h3 className="text-sm font-bold text-ink-800">No custom domains added yet</h3>
          <p className="text-xs text-ink-500 max-w-sm mx-auto">
            Connect a custom subdomain (such as praise.mybrand.com or reviews.acme.com) to present your public wall or brand page seamlessly.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 transition-colors"
          >
            <Plus size={14} />
            <span>Add Custom Domain</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((dom) => {
            const isVerified = dom.status === "ACTIVE" || dom.status === "VERIFIED";
            const isVerifying = verifyingId === dom.id;

            return (
              <div
                key={dom.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-brand-300 transition-all"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <a
                      href={`https://${dom.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-bold text-ink-900 hover:text-brand-600 flex items-center gap-1.5"
                    >
                      <span>{dom.domain}</span>
                      <ExternalLink size={13} className="text-ink-400" />
                    </a>

                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        dom.status === "ACTIVE" || dom.status === "VERIFIED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : dom.status === "PENDING_VERIFICATION"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isVerified ? "bg-emerald-500" : dom.status === "PENDING_VERIFICATION" ? "bg-amber-500" : "bg-rose-500"
                        }`}
                      />
                      <span>
                        {dom.status === "ACTIVE"
                          ? "Active & Verified"
                          : dom.status === "VERIFIED"
                          ? "Verified"
                          : dom.status === "PENDING_VERIFICATION"
                          ? "Pending DNS"
                          : "Verification Failed"}
                      </span>
                    </span>

                    <span className="text-[10px] font-bold uppercase rounded-md bg-sand-100 px-2 py-0.5 text-ink-600">
                      {dom.tlsProvisioning.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                    <span>Routes to:</span>
                    <span className="font-semibold text-ink-800">
                      {dom.targetType === "WALL_OF_LOVE" ? "Wall of Love" : "Brand Profile"} — {dom.targetName}
                    </span>
                    {dom.lastCheckedAt && (
                      <>
                        <span>•</span>
                        <span>Checked {new Date(dom.lastCheckedAt).toLocaleTimeString()}</span>
                      </>
                    )}
                  </div>

                  {dom.errorMessage && (
                    <div className="text-[11px] text-rose-600 font-medium pt-0.5 flex items-center gap-1">
                      <AlertTriangle size={12} className="shrink-0" />
                      <span className="line-clamp-1">{dom.errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() => handleVerify(dom)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line text-xs font-bold text-ink-700 hover:bg-sand-50 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={isVerifying ? "animate-spin" : ""} />
                    <span>{isVerifying ? "Verifying..." : "Verify DNS"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenInstructions(dom)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line text-xs font-bold text-ink-700 hover:bg-sand-50 transition-colors"
                  >
                    <Server size={12} />
                    <span>DNS &amp; Proxy Setup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenReassign(dom)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line text-xs font-bold text-ink-700 hover:bg-sand-50 transition-colors"
                  >
                    <span>Reassign</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteDomain(dom)}
                    title="Remove Domain"
                    className="p-1.5 text-ink-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Domain Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-line shadow-xl max-w-lg w-full my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink-900">Add Custom Domain</h2>
                <p className="text-xs text-ink-500">Associate your hostname with a Wall of Love or Brand Profile.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-ink-400 hover:text-ink-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDomain} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Domain Hostname *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. reviews.mybrand.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-line focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                />
                <p className="text-[11px] text-ink-400 mt-1">
                  Enter your FQDN subdomain or apex domain. Do not include http:// or https://.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">Target Resource *</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType("WALL_OF_LOVE");
                      setSelectedTargetId(availableWalls[0]?.id || "");
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      targetType === "WALL_OF_LOVE"
                        ? "bg-brand-50 text-brand-700 border-brand-300"
                        : "bg-sand-50/50 text-ink-600 border-line hover:bg-sand-50"
                    }`}
                  >
                    Wall of Love
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType("BRAND_PAGE");
                      setSelectedTargetId(availableBrands[0]?.id || "");
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      targetType === "BRAND_PAGE"
                        ? "bg-brand-50 text-brand-700 border-brand-300"
                        : "bg-sand-50/50 text-ink-600 border-line hover:bg-sand-50"
                    }`}
                  >
                    Brand Page
                  </button>
                </div>

                {targetType === "WALL_OF_LOVE" ? (
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-line focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    {availableWalls.map((wall) => (
                      <option key={wall.id} value={wall.id}>
                        {wall.name} (/w/{wall.slug})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-line focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    {availableBrands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name} (/b/{brand.slug})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-900 mb-1">TLS / Reverse Proxy Setup</label>
                <select
                  value={tlsMode}
                  onChange={(e) => setTlsMode(e.target.value as TlsProvisioningMode)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-line focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="REVERSE_PROXY">Fronting Reverse Proxy (Caddy, Nginx, Traefik)</option>
                  <option value="CLOUDFLARE_SSL">Cloudflare Edge SSL (Proxied CNAME)</option>
                  <option value="MANUAL_TLS">Manual TLS / Custom Certificate</option>
                </select>
                <p className="text-[11px] text-ink-400 mt-1">
                  Praise relies on your reverse proxy to manage TLS. Automatic certificates are handled at your proxy boundary.
                </p>
              </div>

              <div className="pt-4 border-t border-line flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-ink-600 hover:bg-sand-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || (!selectedTargetId && (availableWalls.length > 0 || availableBrands.length > 0))}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add Domain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassigningDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-line shadow-xl max-w-md w-full my-8 p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-ink-900">Reassign Domain Target</h2>
              <p className="text-xs text-ink-500">Change which page {reassigningDomain.domain} points to.</p>
            </div>

            <form onSubmit={handleSaveReassign} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReassignTargetType("WALL_OF_LOVE");
                    setReassignTargetId(availableWalls[0]?.id || "");
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    reassignTargetType === "WALL_OF_LOVE"
                      ? "bg-brand-50 text-brand-700 border-brand-300"
                      : "bg-sand-50/50 text-ink-600 border-line"
                  }`}
                >
                  Wall of Love
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReassignTargetType("BRAND_PAGE");
                    setReassignTargetId(availableBrands[0]?.id || "");
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    reassignTargetType === "BRAND_PAGE"
                      ? "bg-brand-50 text-brand-700 border-brand-300"
                      : "bg-sand-50/50 text-ink-600 border-line"
                  }`}
                >
                  Brand Page
                </button>
              </div>

              {reassignTargetType === "WALL_OF_LOVE" ? (
                <select
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-line"
                >
                  {availableWalls.map((wall) => (
                    <option key={wall.id} value={wall.id}>
                      {wall.name} (/w/{wall.slug})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-line"
                >
                  {availableBrands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name} (/b/{brand.slug})
                    </option>
                  ))}
                </select>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setReassigningDomain(null)}
                  className="px-4 py-2 text-xs font-bold text-ink-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-brand-500 text-white rounded-xl hover:bg-brand-600"
                >
                  Update Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DNS Configuration & Reverse Proxy Guidance Modal */}
      {instructionsDomain && dnsInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-line shadow-xl max-w-2xl w-full my-8 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink-900">
                  DNS &amp; Reverse-Proxy Setup for {instructionsDomain.domain}
                </h2>
                <p className="text-xs text-ink-500">Add the records below to your DNS provider, then configure your reverse proxy.</p>
              </div>
              <button
                type="button"
                onClick={() => setInstructionsDomain(null)}
                className="p-1 text-ink-400 hover:text-ink-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* DNS Records Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                  Step 1: Required DNS Records
                </h3>
                <div className="rounded-2xl border border-line overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-sand-50/80 border-b border-line text-left text-ink-700 font-bold">
                      <tr>
                        <th className="p-3">Type</th>
                        <th className="p-3">Host / Name</th>
                        <th className="p-3">Value / Target</th>
                        <th className="p-3">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {dnsInstructions.records.map((rec, idx) => (
                        <tr key={idx} className="hover:bg-sand-50/40">
                          <td className="p-3 font-mono font-bold text-brand-700">{rec.type}</td>
                          <td className="p-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[140px]">{rec.host}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(rec.host, `host-${idx}`)}
                                className="text-ink-400 hover:text-ink-800"
                              >
                                {copiedKey === `host-${idx}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>
                          <td className="p-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[180px]">{rec.value}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(rec.value, `val-${idx}`)}
                                className="text-ink-400 hover:text-ink-800"
                              >
                                {copiedKey === `val-${idx}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-[11px] text-ink-500">{rec.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reverse Proxy Configurations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                    Step 2: Reverse Proxy Configuration (TLS)
                  </h3>
                  <div className="flex items-center gap-1 bg-sand-100 p-0.5 rounded-xl text-xs font-bold">
                    {(["caddy", "nginx", "traefik", "cloudflare"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveSnippetTab(tab)}
                        className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                          activeSnippetTab === tab ? "bg-white text-ink-900 shadow-2xs" : "text-ink-500 hover:text-ink-800"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative rounded-2xl bg-[#0F172A] p-4 text-xs font-mono text-slate-100 overflow-x-auto shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      const snippet =
                        activeSnippetTab === "caddy"
                          ? dnsInstructions.reverseProxyGuidance.caddySnippet
                          : activeSnippetTab === "nginx"
                          ? dnsInstructions.reverseProxyGuidance.nginxSnippet
                          : activeSnippetTab === "traefik"
                          ? dnsInstructions.reverseProxyGuidance.traefikSnippet
                          : dnsInstructions.reverseProxyGuidance.cloudflareNote;
                      copyToClipboard(snippet, "snippet");
                    }}
                    className="absolute top-3 right-3 text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg text-[10px]"
                  >
                    {copiedKey === "snippet" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === "snippet" ? "Copied" : "Copy Config"}</span>
                  </button>

                  <pre className="pt-4 pr-16 whitespace-pre">
                    {activeSnippetTab === "caddy" && dnsInstructions.reverseProxyGuidance.caddySnippet}
                    {activeSnippetTab === "nginx" && dnsInstructions.reverseProxyGuidance.nginxSnippet}
                    {activeSnippetTab === "traefik" && dnsInstructions.reverseProxyGuidance.traefikSnippet}
                    {activeSnippetTab === "cloudflare" && dnsInstructions.reverseProxyGuidance.cloudflareNote}
                  </pre>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line bg-sand-50/50 flex items-center justify-between">
              <span className="text-[11px] text-ink-500">
                DNS propagation typically completes within 5 to 60 minutes.
              </span>
              <button
                type="button"
                onClick={() => {
                  handleVerify(instructionsDomain);
                  setInstructionsDomain(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 transition-colors"
              >
                <RefreshCw size={12} />
                <span>Verify Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
