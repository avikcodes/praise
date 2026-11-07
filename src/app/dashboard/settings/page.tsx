"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building,
  Check,
  Copy,
  Database,
  HardDrive,
  Key,
  Loader2,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/dashboard/status-pill";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
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

  const [copiedKey, setCopiedKey] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

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

  const copyKey = () => {
    navigator.clipboard.writeText("prz_live_9f82d1c7a4b0e51782390a");
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success("API Key Copied", "Token copied to clipboard.");
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
              <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                A
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-900 block">
                  Admin User (You)
                </span>
                <span className="text-[11px] text-ink-500">admin@praise.local</span>
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
        <div className="flex items-center gap-2.5 border-b border-line pb-4">
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

        <div className="rounded-xl border border-line bg-warm-50 p-3 flex items-center justify-between gap-3 text-xs">
          <div className="truncate">
            <span className="font-semibold text-ink-900 block text-[11px]">
              Production Read &amp; Write Key
            </span>
            <code className="text-[11px] text-ink-600 font-mono">
              prz_live_••••••••••••••••••••••••••••
            </code>
          </div>

          <button
            type="button"
            onClick={copyKey}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors shrink-0"
          >
            {copiedKey ? (
              <>
                <Check size={12} className="text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. Danger Zone */}
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
