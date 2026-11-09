"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  Building,
  Check,
  Copy,
  Database,
  FileCheck2,
  HardDrive,
  Key,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/dashboard/status-pill";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import {
  WorkspaceItem,
  useWorkspace,
} from "@/components/dashboard/workspace-context";

function WorkspaceProfileForm({
  workspace,
  onSave,
  isSaving,
}: {
  workspace: WorkspaceItem;
  onSave: (name: string, slug: string) => Promise<void>;
  isSaving: boolean;
}) {
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [workspaceSlug, setWorkspaceSlug] = useState(workspace.slug);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(workspaceName, workspaceSlug);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-ink-900 mb-1">
            Workspace Name
          </label>
          <input
            type="text"
            required
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-900 mb-1">
            Workspace URL Identifier
          </label>
          <input
            type="text"
            value={workspaceSlug}
            onChange={(e) => setWorkspaceSlug(e.target.value)}
            className="w-full rounded-lg border border-line p-2 text-xs font-mono text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Quick counts preview */}
      {workspace.counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-line/60">
          <div className="rounded-lg bg-warm-50 p-2.5 text-center">
            <span className="block text-xs font-semibold text-ink-900">
              {workspace.counts.projects}
            </span>
            <span className="block text-[10px] text-ink-500">Projects</span>
          </div>
          <div className="rounded-lg bg-warm-50 p-2.5 text-center">
            <span className="block text-xs font-semibold text-ink-900">
              {workspace.counts.forms}
            </span>
            <span className="block text-[10px] text-ink-500">Forms</span>
          </div>
          <div className="rounded-lg bg-warm-50 p-2.5 text-center">
            <span className="block text-xs font-semibold text-ink-900">
              {workspace.counts.widgets}
            </span>
            <span className="block text-[10px] text-ink-500">Widgets</span>
          </div>
          <div className="rounded-lg bg-warm-50 p-2.5 text-center">
            <span className="block text-xs font-semibold text-ink-900">
              {workspace.counts.testimonials}
            </span>
            <span className="block text-[10px] text-ink-500">Testimonials</span>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          <span>Save Changes</span>
        </button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const {
    activeWorkspace,
    workspaces,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspace();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  // Current session user details
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; email?: string } | null>(null);

  // Real API Keys Management State
  const [apiKeys, setApiKeys] = useState<Array<{
    id: string;
    name: string;
    keyPrefix: string;
    type: "SECRET" | "PUBLISHABLE";
    role: "OWNER" | "ADMIN" | "MEMBER";
    createdAt: string;
    lastUsedAt: string | null;
  }>>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [createKeyModalOpen, setCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState<"SECRET" | "PUBLISHABLE">("SECRET");
  const [newKeyRole, setNewKeyRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newlyCreatedKeyToken, setNewlyCreatedKeyToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  // Fetch current user details
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch API keys for active workspace
  useEffect(() => {
    const wsId = activeWorkspace?.id;
    if (!wsId) return;
    let ignore = false;
    fetch(`/api/workspaces/${wsId}/api-keys`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data?.keys) {
          setApiKeys(data.keys);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setIsLoadingKeys(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeWorkspace?.id]);

  const refreshApiKeys = async () => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/api-keys`);
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch {
      // ignore
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace?.id || !newKeyName.trim()) return;

    setIsCreatingKey(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          type: newKeyType,
          role: newKeyRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create API key");
      }

      const data = await res.json();
      setNewlyCreatedKeyToken(data.rawKey);
      setNewKeyName("");
      toast.success("API Key Generated", "Copy your token now. It will not be shown again.");
      refreshApiKeys();
    } catch (err: unknown) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!activeWorkspace?.id) return;
    setRevokingKeyId(keyId);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/api-keys/${keyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
        toast.success("API Key Revoked", "The key was permanently deactivated.");
      } else {
        toast.error("Failed to Revoke", "Could not deactivate the selected key.");
      }
    } catch {
      toast.error("Error", "Network error revoking API key.");
    } finally {
      setRevokingKeyId(null);
    }
  };

  const handleExportWorkspace = async () => {
    if (!activeWorkspace) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/export?format=zip`);
      if (!res.ok) {
        throw new Error("Failed to generate export archive");
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `praise-workspace-${activeWorkspace.slug}-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Workspace Export Ready", "Downloaded archive with all records and verifiable consent audit ledger.");
    } catch (err: unknown) {
      toast.error("Export Failed", err instanceof Error ? err.message : "Error exporting workspace");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveGeneral = async (name: string, slug: string) => {
    if (!activeWorkspace) return;
    if (!name.trim()) {
      toast.error("Invalid name", "Workspace name cannot be empty.");
      return;
    }

    setIsSavingGeneral(true);
    const res = await updateWorkspace(activeWorkspace.id, {
      name: name.trim(),
      slug: slug.trim() || undefined,
    });
    setIsSavingGeneral(false);

    if (res.success) {
      toast.success(
        "Workspace updated",
        `Workspace saved as "${name.trim()}".`,
      );
    } else {
      toast.error("Failed to update workspace", res.error || "An error occurred");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    if (workspaces.length <= 1) {
      toast.error(
        "Action blocked",
        "You must retain at least one workspace. Create another workspace before deleting this one.",
      );
      setConfirmDeleteOpen(false);
      return;
    }

    setIsDeleting(true);
    const res = await deleteWorkspace(activeWorkspace.id);
    setIsDeleting(false);
    setConfirmDeleteOpen(false);

    if (res.success) {
      toast.success(
        "Workspace deleted",
        `Workspace "${activeWorkspace.name}" and all associated data have been permanently removed.`,
      );
    } else {
      toast.error("Failed to delete workspace", res.error || "An error occurred");
    }
  };

  const isOwner = activeWorkspace?.role === "OWNER";

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Settings"
        description="Manage workspace information, team members, storage infrastructure, and REST API access keys."
      />

      {/* 1. General Workspace Profile Card */}
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Building size={18} className="text-brand-600" />
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-ink-900">
                Workspace Profile
              </h2>
              <p className="text-xs text-ink-500">
                Configure the primary workspace identity and URL slug.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-warm-100 px-2.5 py-1 text-[11px] font-medium text-ink-700 capitalize">
            Role: {activeWorkspace?.role?.toLowerCase() || "owner"}
          </span>
        </div>

        {activeWorkspace && (
          <WorkspaceProfileForm
            key={activeWorkspace.id}
            workspace={activeWorkspace}
            onSave={handleSaveGeneral}
            isSaving={isSavingGeneral}
          />
        )}
      </div>

      {/* 2. Team Members Card */}
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Users size={18} className="text-brand-600" />
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-ink-900">
                Team &amp; Roles
              </h2>
              <p className="text-xs text-ink-500">
                Manage who has permission to review, moderate, and publish testimonials.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-line p-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs uppercase">
                {currentUser?.name ? currentUser.name.charAt(0) : "U"}
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-900 block">
                  {currentUser?.name || "Active User"} (You)
                </span>
                <span className="text-[11px] text-ink-500">
                  {currentUser?.email || "Current Account"}
                </span>
              </div>
            </div>
            <StatusPill status={activeWorkspace?.role || "OWNER"} variant="active" />
          </div>
        </div>
      </div>

      {/* 3. Storage Infrastructure */}
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-line pb-4">
          <HardDrive size={18} className="text-brand-600" />
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-ink-900">
              Media &amp; Database Storage
            </h2>
            <p className="text-xs text-ink-500">
              Local filesystem or S3-compatible media asset storage.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-line p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink-800 flex items-center gap-1.5">
                <Database size={13} className="text-brand-600" /> PostgreSQL
              </span>
              <StatusPill status="Connected" variant="approved" />
            </div>
            <p className="text-[11px] text-ink-500">
              Prisma ORM schema with strict workspace tenant boundaries.
            </p>
          </div>

          <div className="rounded-xl border border-line p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink-800 flex items-center gap-1.5">
                <HardDrive size={13} className="text-brand-600" /> Media Storage
              </span>
              <StatusPill status="Local Volume" variant="draft" />
            </div>
            <p className="text-[11px] text-ink-500">
              Audio, video, and avatars stored in container volume or S3 bucket.
            </p>
          </div>
        </div>
      </div>

      {/* 4. API Keys */}
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <Key size={18} className="text-brand-600" />
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-ink-900">
                API Access Keys
              </h2>
              <p className="text-xs text-ink-500">
                Access the Praise REST API programmatically from your applications.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewKeyName("");
              setNewKeyType("SECRET");
              setNewKeyRole("MEMBER");
              setNewlyCreatedKeyToken(null);
              setCreateKeyModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors shadow-2xs"
          >
            <Plus size={13} />
            <span>Create API Key</span>
          </button>
        </div>

        {/* Newly created token banner */}
        {newlyCreatedKeyToken && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
              <Check size={14} className="text-emerald-600" />
              <span>New API Key Generated — Copy it now!</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              For your security, this raw secret token will never be displayed again. Store it securely in your environment variables.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newlyCreatedKeyToken}
                className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 font-mono text-xs text-ink-900 select-all"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newlyCreatedKeyToken);
                  setCopiedToken(true);
                  setTimeout(() => setCopiedToken(false), 2000);
                  toast.success("Token Copied", "API key copied to clipboard.");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors shrink-0"
              >
                {copiedToken ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedToken ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        )}

        {/* List active keys */}
        {isLoadingKeys ? (
          <div className="flex items-center justify-center p-6 text-ink-400">
            <Loader2 size={18} className="animate-spin mr-2" />
            <span className="text-xs">Loading API keys...</span>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-500">
            No API keys generated yet. Click &ldquo;Create API Key&rdquo; to integrate with your custom backend or scripts.
          </div>
        ) : (
          <div className="divide-y divide-line/60 rounded-xl border border-line">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between p-3 text-xs gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-900">{k.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      k.type === "PUBLISHABLE" ? "bg-sky-100 text-sky-800" : "bg-purple-100 text-purple-800"
                    }`}>
                      {k.type}
                    </span>
                    <span className="text-[10px] text-ink-400 font-mono">
                      {k.keyPrefix}
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-400 flex items-center gap-2">
                    <span>Role: {k.role}</span>
                    <span>&bull;</span>
                    <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                    {k.lastUsedAt && (
                      <>
                        <span>&bull;</span>
                        <span>Last used: {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevokeKey(k.id)}
                  disabled={revokingKeyId === k.id}
                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  title="Revoke API key"
                >
                  {revokingKeyId === k.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Privacy, Consent & Data Portability */}
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-brand-600" />
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-ink-900">
                Privacy, Consent &amp; Data Exports
              </h2>
              <p className="text-xs text-ink-500">
                Manage respondent consent policies, audit records, and full workspace data archives.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            <FileCheck2 size={13} />
            <span>Open Consent Ledger</span>
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-line bg-warm-50/50 p-3.5 space-y-1.5">
            <span className="font-semibold text-ink-900 block text-xs">
              Verifiable Consent Records
            </span>
            <p className="text-[11px] text-ink-600 leading-relaxed">
              Every customer submission records explicit consent checkboxes, versioning, network verification tokens, and granular usage rights.
            </p>
            <Link
              href="/dashboard/projects"
              className="inline-block text-[11px] font-medium text-brand-600 hover:underline pt-1"
            >
              Review captured records in Projects &rarr;
            </Link>
          </div>

          <div className="rounded-xl border border-line bg-warm-50/50 p-3.5 space-y-1.5">
            <span className="font-semibold text-ink-900 block text-xs">
              Complete Workspace Export
            </span>
            <p className="text-[11px] text-ink-600 leading-relaxed">
              Download a comprehensive ZIP archive with all workspace data, projects, customer profiles, forms, media files, and CSV/JSON consent ledgers.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleExportWorkspace}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 hover:bg-warm-100 transition-colors disabled:opacity-50 shadow-2xs"
              >
                {isExporting ? (
                  <Loader2 size={13} className="animate-spin text-brand-600" />
                ) : (
                  <ArrowDownToLine size={13} className="text-brand-600" />
                )}
                <span>{isExporting ? "Exporting..." : "Download Full Workspace Archive"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Danger Zone */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/20 p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold text-rose-900 flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600" />
          <span>Danger Zone: Delete Workspace</span>
        </h2>
        <div className="text-xs text-rose-800 leading-relaxed space-y-2">
          <p>
            Deleting workspace <strong>&ldquo;{activeWorkspace?.name}&rdquo;</strong> will permanently purge:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>All associated projects and brand identities</li>
            <li>All collection forms, submission fields, and customer invitation links</li>
            <li>All moderated testimonials, video clips, and voice recordings</li>
            <li>All Wall of Love embeds and interactive widgets</li>
          </ul>
          <p className="font-medium text-rose-900">
            This action cannot be undone. You must have at least one other workspace available.
          </p>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={!isOwner}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
            <span>Delete Workspace &ldquo;{activeWorkspace?.name}&rdquo;</span>
          </button>
          {!isOwner && (
            <p className="mt-1 text-[11px] text-rose-600 italic">
              Only workspace Owners have permission to delete this workspace.
            </p>
          )}
        </div>
      </div>

      {/* Create API Key Modal Dialog */}
      <ModalDialog
        isOpen={createKeyModalOpen}
        onClose={() => setCreateKeyModalOpen(false)}
        title="Create New API Key"
        description="Generate an API key token to programmatically query and manage your testimonials."
        maxWidth="md"
      >
        <form onSubmit={handleCreateKey} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink-900 mb-1">
              Key Description / Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Zapier Sync, Mobile App, CI Pipeline"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-900 mb-1">
                Key Type
              </label>
              <select
                value={newKeyType}
                onChange={(e) => setNewKeyType(e.target.value as "SECRET" | "PUBLISHABLE")}
                className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              >
                <option value="SECRET">Secret Key (Full Access)</option>
                <option value="PUBLISHABLE">Publishable (Public Read-Only)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink-900 mb-1">
                Role Permission
              </label>
              <select
                value={newKeyRole}
                onChange={(e) => setNewKeyRole(e.target.value as "MEMBER" | "ADMIN")}
                className="w-full rounded-lg border border-line bg-white p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              >
                <option value="MEMBER">Member (Standard Operations)</option>
                <option value="ADMIN">Admin (Manage Forms & Settings)</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-warm-50 p-3 text-[11px] text-ink-600 space-y-1">
            <span className="font-semibold block text-ink-900">Security Notice:</span>
            <p>
              Secret keys start with <code className="font-mono text-purple-700">praise_live_sk_</code>. They have management access and should never be exposed in client-side code.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setCreateKeyModalOpen(false)}
              className="rounded-lg border border-line px-3 py-1.5 font-semibold text-ink-600 hover:bg-warm-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingKey || !newKeyName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {isCreatingKey ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <span>Generate Key</span>
              )}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteWorkspace}
        title={`Permanently Delete "${activeWorkspace?.name}"?`}
        message={`Are you completely sure you want to delete "${activeWorkspace?.name}"? All projects, collection forms, testimonials, and customer media assets under this workspace will be irreversibly erased.`}
        confirmLabel={isDeleting ? "Deleting..." : "Yes, Permanently Delete"}
        isDestructive
      />
    </div>
  );
}
