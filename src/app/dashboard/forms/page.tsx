"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Inbox,
  Loader2,
  Mic,
  Palette,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Sliders,
  Trash2,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/dashboard/status-pill";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { CollectionFormDetail } from "@/types/form-builder";
import { FormBuilder } from "@/components/dashboard/forms/form-builder";
import { cn } from "@/lib/utils";

export default function FormsPage() {
  const { activeWorkspace } = useWorkspace();
  const toast = useToast();

  const [forms, setForms] = useState<CollectionFormDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Builder Mode State
  const [isBuilding, setIsBuilding] = useState(false);
  const [editingForm, setEditingForm] = useState<CollectionFormDetail | null>(null);

  // Management Hub State
  const [managingForm, setManagingForm] = useState<CollectionFormDetail | null>(null);
  const [manageTab, setManageTab] = useState<"overview" | "appearance" | "settings">("overview");

  // Share & Delete Modals State
  const [shareForm, setShareForm] = useState<CollectionFormDetail | null>(null);
  const [deletingForm, setDeletingForm] = useState<CollectionFormDetail | null>(null);
  const [regeneratingSlugForm, setRegeneratingSlugForm] = useState<CollectionFormDetail | null>(null);

  const [isDuplicatingId, setIsDuplicatingId] = useState<string | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);
  const [isRegeneratingSlug, setIsRegeneratingSlug] = useState(false);
  const [copied, setCopied] = useState(false);

  // Manage tab local edit states
  const [mgmtThankYou, setMgmtThankYou] = useState("");
  const [mgmtRedirectUrl, setMgmtRedirectUrl] = useState("");
  const [mgmtLogoUrl, setMgmtLogoUrl] = useState("");
  const [mgmtAccentColor, setMgmtAccentColor] = useState("#7049D8");
  const [mgmtTheme, setMgmtTheme] = useState("warm");
  const [isSavingMgmt, setIsSavingMgmt] = useState(false);

  const isOwnerOrAdmin =
    activeWorkspace?.role === "OWNER" || activeWorkspace?.role === "ADMIN";

  // Fetch forms from API when activeWorkspace changes
  useEffect(() => {
    const wsId = activeWorkspace?.id;
    if (!wsId || wsId.startsWith("ws-default")) {
      return;
    }

    let isMounted = true;
    async function fetchForms() {
      try {
        const res = await fetch(`/api/workspaces/${wsId}/forms`);
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.forms)) {
            setForms(data.forms);
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchForms();
    return () => {
      isMounted = false;
    };
  }, [activeWorkspace?.id]);

  // Open Management Hub
  const openManageHub = (form: CollectionFormDetail) => {
    setManagingForm(form);
    setManageTab("overview");
    setMgmtThankYou(form.thankYouMessage || "Thank you for sharing your feedback with us!");
    setMgmtRedirectUrl(form.redirectUrl || "");
    setMgmtLogoUrl(form.customLogoUrl || "");
    setMgmtAccentColor(form.accentColor || "#7049D8");
    setMgmtTheme(form.theme || "warm");
  };

  // Filter forms by search query
  const filteredForms = forms.filter(
    (f) =>
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.slug.toLowerCase().includes(search.toLowerCase()) ||
      f.headerPrompt.toLowerCase().includes(search.toLowerCase()),
  );

  // Start Form Builder
  const handleOpenCreate = () => {
    setEditingForm(null);
    setIsBuilding(true);
  };

  const handleOpenEdit = (form: CollectionFormDetail) => {
    setEditingForm(form);
    setIsBuilding(true);
    setManagingForm(null);
  };

  const handleSaveSuccess = (saved: CollectionFormDetail) => {
    setForms((prev) => {
      const index = prev.findIndex((f) => f.id === saved.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
    setIsBuilding(false);
    setEditingForm(null);
  };

  // Toggle Published Status (Publish / Unpublish)
  const handleTogglePublished = async (form: CollectionFormDetail) => {
    if (!activeWorkspace?.id) return;
    setIsUpdatingStatusId(form.id);

    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/forms/${form.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: !form.isPublished }),
        },
      );
      const data = await res.json();
      if (res.ok && data.form) {
        setForms((prev) =>
          prev.map((f) => (f.id === form.id ? { ...f, isPublished: !form.isPublished } : f)),
        );
        if (managingForm?.id === form.id) {
          setManagingForm((prev) => (prev ? { ...prev, isPublished: !form.isPublished } : null));
        }
        toast.success(
          form.isPublished ? "Form unpublished" : "Form published",
          `"${form.title}" is now ${form.isPublished ? "unpublished" : "published and live"}.`,
        );
      } else {
        toast.error("Failed to update status", data.error || "An error occurred");
      }
    } catch {
      toast.error("Error", "Network error updating form status");
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  // Toggle Submissions Enabled (Enable / Pause submissions)
  const handleToggleSubmissions = async (form: CollectionFormDetail) => {
    if (!activeWorkspace?.id) return;
    setIsUpdatingStatusId(form.id);

    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/forms/${form.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionsEnabled: !form.submissionsEnabled }),
        },
      );
      const data = await res.json();
      if (res.ok && data.form) {
        setForms((prev) =>
          prev.map((f) =>
            f.id === form.id ? { ...f, submissionsEnabled: !form.submissionsEnabled } : f,
          ),
        );
        if (managingForm?.id === form.id) {
          setManagingForm((prev) =>
            prev ? { ...prev, submissionsEnabled: !form.submissionsEnabled } : null,
          );
        }
        toast.success(
          form.submissionsEnabled ? "Submissions paused" : "Submissions enabled",
          `"${form.title}" is ${form.submissionsEnabled ? "no longer accepting" : "now accepting"} responses.`,
        );
      } else {
        toast.error("Failed to update submissions", data.error || "An error occurred");
      }
    } catch {
      toast.error("Error", "Network error updating submission status");
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  // Save Settings & Appearance from Management Hub
  const handleSaveMgmtSettings = async () => {
    if (!activeWorkspace?.id || !managingForm) return;
    setIsSavingMgmt(true);

    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/forms/${managingForm.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thankYouMessage: mgmtThankYou.trim() || undefined,
            redirectUrl: mgmtRedirectUrl.trim() || undefined,
            customLogoUrl: mgmtLogoUrl.trim() || undefined,
            accentColor: mgmtAccentColor,
            theme: mgmtTheme,
          }),
        },
      );
      const data = await res.json();

      if (res.ok && data.form) {
        setForms((prev) =>
          prev.map((f) => (f.id === managingForm.id ? { ...f, ...data.form } : f)),
        );
        setManagingForm((prev) => (prev ? { ...prev, ...data.form } : null));
        toast.success("Settings saved", `Form settings updated successfully.`);
      } else {
        toast.error("Failed to save settings", data.error || "An error occurred");
      }
    } catch {
      toast.error("Error", "Network error saving settings");
    } finally {
      setIsSavingMgmt(false);
    }
  };

  // Regenerate Public Slug
  const handleConfirmRegenerateSlug = async () => {
    if (!activeWorkspace?.id || !regeneratingSlugForm) return;
    setIsRegeneratingSlug(true);

    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/forms/${regeneratingSlugForm.id}/regenerate-slug`,
        { method: "POST" },
      );
      const data = await res.json();

      if (res.ok && data.form) {
        setForms((prev) =>
          prev.map((f) =>
            f.id === regeneratingSlugForm.id ? { ...f, slug: data.newSlug } : f,
          ),
        );
        if (managingForm?.id === regeneratingSlugForm.id) {
          setManagingForm((prev) => (prev ? { ...prev, slug: data.newSlug } : null));
        }
        toast.success(
          "Slug regenerated",
          `Public link updated to /p/${data.newSlug}.`,
        );
        setRegeneratingSlugForm(null);
      } else {
        toast.error("Failed to regenerate slug", data.error || "An error occurred");
      }
    } catch {
      toast.error("Error", "Network error regenerating slug");
    } finally {
      setIsRegeneratingSlug(false);
    }
  };

  // Duplicate Form Action
  const handleDuplicate = async (form: CollectionFormDetail) => {
    if (!activeWorkspace?.id) return;
    setIsDuplicatingId(form.id);

    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/forms/${form.id}/duplicate`,
        { method: "POST" },
      );
      const data = await res.json();

      if (res.ok && data.form) {
        toast.success("Form duplicated", `Created copy "${data.form.title}".`);
        setForms((prev) => [data.form, ...prev]);
      } else {
        toast.error("Failed to duplicate", data.error || "An error occurred");
      }
    } catch {
      toast.error("Error", "Network error duplicating form");
    } finally {
      setIsDuplicatingId(null);
    }
  };

  // Delete Form Action
  const handleConfirmDelete = async () => {
    if (!activeWorkspace?.id || !deletingForm) return;

    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/forms/${deletingForm.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();

      if (res.ok) {
        toast.success(
          "Form deleted",
          `"${deletingForm.title}" has been deleted. Submitted testimonials remain preserved.`,
        );
        setForms((prev) => prev.filter((f) => f.id !== deletingForm.id));
        if (managingForm?.id === deletingForm.id) {
          setManagingForm(null);
        }
        setDeletingForm(null);
      } else {
        toast.error("Failed to delete", data.error || "An error occurred");
      }
    } catch {
      toast.error("Error", "Network error deleting form");
    }
  };

  const copyShareUrl = (slug: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied", "Shareable URL copied to clipboard.");
  };

  // If in Form Builder mode, show full builder interface
  if (isBuilding) {
    return (
      <FormBuilder
        initialForm={editingForm}
        onSaveSuccess={handleSaveSuccess}
        onCancel={() => {
          setIsBuilding(false);
          setEditingForm(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collection Forms"
        description="Build, brand, publish, and manage testimonial invitation forms for your customer base."
        actions={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
          >
            <Plus size={14} />
            <span>Create Form</span>
          </button>
        }
      />

      {/* Search and stats bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search forms by title, prompt, or slug..."
            className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <span className="text-xs text-ink-500">
          Showing {filteredForms.length} of {forms.length} forms
        </span>
      </div>

      {/* Forms Table */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <Loader2 size={24} className="mx-auto animate-spin text-brand-600 mb-2" />
          <p className="text-xs text-ink-600">Loading collection forms...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/50 p-12 text-center">
          <Inbox size={36} className="mx-auto text-ink-300 mb-3" />
          <h3 className="text-sm font-semibold text-ink-900 mb-1">
            {search ? "No matching forms found" : "No collection forms created yet"}
          </h3>
          <p className="text-xs text-ink-500 max-w-sm mx-auto mb-4">
            {search
              ? "Try searching for a different keyword or slug identifier."
              : "Create your first collection form to send to customers for video, audio, or written testimonials."}
          </p>
          {!search && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              <Plus size={14} />
              <span>Create First Form</span>
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-warm-50 border-b border-line text-ink-700">
                <tr>
                  <th className="p-3.5 font-semibold">Form Title &amp; Prompt</th>
                  <th className="p-3.5 font-semibold">Public Link</th>
                  <th className="p-3.5 font-semibold">Allowed Formats</th>
                  <th className="p-3.5 font-semibold">Questions</th>
                  <th className="p-3.5 font-semibold">Submissions</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70 text-ink-800">
                {filteredForms.map((form) => (
                  <tr key={form.id} className="hover:bg-warm-50/50 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openManageHub(form)}
                          className="font-semibold text-ink-900 hover:text-brand-600 text-left transition-colors"
                        >
                          {form.title}
                        </button>
                        {form.project && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium border"
                            style={{
                              borderColor: form.project.color
                                ? `${form.project.color}40`
                                : "#e5e7eb",
                              backgroundColor: form.project.color
                                ? `${form.project.color}15`
                                : "#f3f4f6",
                              color: form.project.color || "#374151",
                            }}
                          >
                            {form.project.name}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-500 mt-0.5 truncate max-w-xs">
                        {form.headerPrompt}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => copyShareUrl(form.slug)}
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-brand-600 hover:text-brand-700 hover:underline"
                        title="Click to copy public link"
                      >
                        <span>/p/{form.slug}</span>
                        <Copy size={12} className="text-ink-400" />
                      </button>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-ink-600 text-[11px]">
                        {form.allowVideo && (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-warm-100 px-1.5 py-0.5"
                            title="Video review enabled"
                          >
                            <Video size={11} className="text-brand-600" />
                            <span>Video</span>
                          </span>
                        )}
                        {form.allowAudio && (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-warm-100 px-1.5 py-0.5"
                            title="Audio review enabled"
                          >
                            <Mic size={11} className="text-brand-600" />
                            <span>Audio</span>
                          </span>
                        )}
                        {form.allowText && (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-warm-100 px-1.5 py-0.5"
                            title="Text review enabled"
                          >
                            <FileText size={11} className="text-ink-500" />
                            <span>Text</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-ink-600">
                      {form.fields?.length || 0} custom
                    </td>

                    <td className="p-3.5 font-semibold text-ink-900">
                      {form.submissionsCount || 0}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <StatusPill
                          status={form.isPublished ? "Published" : "Draft"}
                          variant={form.isPublished ? "active" : "draft"}
                        />
                        {!form.submissionsEnabled && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            Paused
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openManageHub(form)}
                          className="rounded p-1.5 text-ink-500 hover:bg-warm-100 hover:text-ink-900 transition-colors"
                          title="Manage Form"
                        >
                          <Settings size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(form)}
                          className="rounded p-1.5 text-ink-500 hover:bg-warm-100 hover:text-ink-900 transition-colors"
                          title="Edit in builder"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(form)}
                          disabled={isDuplicatingId === form.id}
                          className="rounded p-1.5 text-ink-500 hover:bg-warm-100 hover:text-ink-900 transition-colors disabled:opacity-40"
                          title="Duplicate form"
                        >
                          {isDuplicatingId === form.id ? (
                            <Loader2 size={13} className="animate-spin text-brand-600" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShareForm(form)}
                          className="rounded p-1.5 text-ink-500 hover:bg-warm-100 hover:text-ink-900 transition-colors"
                          title="Share link"
                        >
                          <Share2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingForm(form)}
                          className="rounded p-1.5 text-ink-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete form"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- FORM MANAGEMENT HUB MODAL -------------------- */}
      <ModalDialog
        isOpen={managingForm !== null}
        onClose={() => setManagingForm(null)}
        title={managingForm?.title || "Manage Form"}
        description={`Configure status, appearance, public link, and post-submission actions for /p/${managingForm?.slug || ""}`}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => {
                if (managingForm) {
                  handleOpenEdit(managingForm);
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold"
            >
              <Edit2 size={13} />
              <span>Open in Full Form Builder &rarr;</span>
            </button>

            <button
              type="button"
              onClick={() => setManagingForm(null)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100"
            >
              Done
            </button>
          </div>
        }
      >
        {managingForm && (
          <div className="space-y-5">
            {/* Manage Tabs */}
            <div className="flex border-b border-line gap-2">
              <button
                type="button"
                onClick={() => setManageTab("overview")}
                className={cn(
                  "pb-2 text-xs font-semibold transition-colors flex items-center gap-1.5 border-b-2",
                  manageTab === "overview"
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-ink-500 hover:text-ink-800",
                )}
              >
                <Sliders size={13} />
                <span>Overview &amp; Link</span>
              </button>

              <button
                type="button"
                onClick={() => setManageTab("appearance")}
                className={cn(
                  "pb-2 text-xs font-semibold transition-colors flex items-center gap-1.5 border-b-2",
                  manageTab === "appearance"
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-ink-500 hover:text-ink-800",
                )}
              >
                <Palette size={13} />
                <span>Appearance &amp; Brand</span>
              </button>

              <button
                type="button"
                onClick={() => setManageTab("settings")}
                className={cn(
                  "pb-2 text-xs font-semibold transition-colors flex items-center gap-1.5 border-b-2",
                  manageTab === "settings"
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-ink-500 hover:text-ink-800",
                )}
              >
                <Settings size={13} />
                <span>Post-Submission &amp; Actions</span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW & LINK */}
            {manageTab === "overview" && (
              <div className="space-y-4">
                {/* Status and Submission Stat Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl border border-line bg-warm-50 p-3">
                    <span className="text-[10px] text-ink-500 uppercase tracking-wider block font-semibold">
                      Public Status
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          managingForm.isPublished ? "bg-emerald-500" : "bg-ink-300",
                        )}
                      />
                      <span className="text-xs font-semibold text-ink-900">
                        {managingForm.isPublished ? "Published" : "Unpublished"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-warm-50 p-3">
                    <span className="text-[10px] text-ink-500 uppercase tracking-wider block font-semibold">
                      Submissions
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          managingForm.submissionsEnabled ? "bg-emerald-500" : "bg-amber-500",
                        )}
                      />
                      <span className="text-xs font-semibold text-ink-900">
                        {managingForm.submissionsEnabled ? "Accepting" : "Paused"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-warm-50 p-3">
                    <span className="text-[10px] text-ink-500 uppercase tracking-wider block font-semibold">
                      Total Responses
                    </span>
                    <div className="mt-1 text-xs font-bold text-ink-900">
                      {managingForm.submissionsCount || 0} testimonials
                    </div>
                  </div>
                </div>

                {/* Direct Public Form Link Box */}
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Public Customer URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${managingForm.slug}`}
                      className="w-full rounded-lg border border-line bg-warm-50 p-2 text-xs font-mono text-ink-900"
                    />
                    <button
                      type="button"
                      onClick={() => copyShareUrl(managingForm.slug)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 shrink-0"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                {/* Preview Link */}
                <div className="flex items-center justify-between rounded-xl border border-line p-3 bg-warm-50/50">
                  <div className="text-xs">
                    <span className="font-semibold text-ink-900 block">
                      Customer Experience Preview
                    </span>
                    <span className="text-[11px] text-ink-500">
                      Open and test the live testimonial form as an end customer.
                    </span>
                  </div>

                  <a
                    href={`/p/${managingForm.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
                  >
                    <Eye size={13} />
                    <span>Open Preview</span>
                    <ExternalLink size={11} className="text-ink-400" />
                  </a>
                </div>

                {/* Quick Toggle Controls */}
                <div className="space-y-2 pt-2 border-t border-line/70">
                  <div className="flex items-center justify-between rounded-xl border border-line p-3">
                    <div>
                      <span className="font-semibold text-xs text-ink-900 block">
                        Publish Form Publicly
                      </span>
                      <span className="text-[11px] text-ink-500">
                        {managingForm.isPublished
                          ? "Form is live and reachable at /p/[slug]"
                          : "Form is currently hidden from public visitors"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePublished(managingForm)}
                      disabled={isUpdatingStatusId === managingForm.id}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                        managingForm.isPublished
                          ? "border border-line bg-white text-ink-700 hover:bg-warm-50"
                          : "bg-brand-500 text-white hover:bg-brand-600",
                      )}
                    >
                      {isUpdatingStatusId === managingForm.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Globe size={12} />
                      )}
                      <span>{managingForm.isPublished ? "Unpublish" : "Publish Form"}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-line p-3">
                    <div>
                      <span className="font-semibold text-xs text-ink-900 block">
                        Enable Customer Submissions
                      </span>
                      <span className="text-[11px] text-ink-500">
                        {managingForm.submissionsEnabled
                          ? "Currently accepting incoming reviews"
                          : "Temporarily blocked from receiving new responses"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSubmissions(managingForm)}
                      disabled={isUpdatingStatusId === managingForm.id}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                        managingForm.submissionsEnabled
                          ? "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "bg-brand-500 text-white hover:bg-brand-600",
                      )}
                    >
                      {isUpdatingStatusId === managingForm.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : managingForm.submissionsEnabled ? (
                        <PauseCircle size={12} />
                      ) : (
                        <PlayCircle size={12} />
                      )}
                      <span>
                        {managingForm.submissionsEnabled ? "Pause Submissions" : "Resume Submissions"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Slug Regeneration Section (Owners & Admins) */}
                <div className="rounded-xl border border-line p-3.5 bg-warm-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-ink-900 block">
                        Regenerate Public Slug
                      </span>
                      <span className="text-[11px] text-ink-500">
                        Current: <code className="font-mono text-ink-700">/p/{managingForm.slug}</code>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRegeneratingSlugForm(managingForm)}
                      disabled={!isOwnerOrAdmin}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors disabled:opacity-40"
                    >
                      <RefreshCw size={12} />
                      <span>Regenerate Slug</span>
                    </button>
                  </div>
                  {!isOwnerOrAdmin && (
                    <p className="text-[10px] text-ink-400 italic">
                      Only workspace Owners and Admins have permission to regenerate public slugs.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: APPEARANCE & BRANDING */}
            {manageTab === "appearance" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Custom Brand Logo URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={mgmtLogoUrl}
                    onChange={(e) => setMgmtLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.svg"
                    className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-[10px] text-ink-400">
                    Displayed at the top of the customer-facing form. Leave empty for default Praise logo.
                  </p>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-ink-900">
                    Primary Accent Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { name: "Praise Purple", hex: "#7049D8" },
                      { name: "Ocean Blue", hex: "#0284c7" },
                      { name: "Emerald Green", hex: "#059669" },
                      { name: "Amber Sun", hex: "#d97706" },
                      { name: "Rose Crimson", hex: "#e11d48" },
                      { name: "Midnight Slate", hex: "#334155" },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setMgmtAccentColor(c.hex)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors",
                          mgmtAccentColor.toLowerCase() === c.hex.toLowerCase()
                            ? "border-brand-500 bg-brand-50 text-ink-900 font-semibold"
                            : "border-line bg-white text-ink-600 hover:bg-warm-50",
                        )}
                      >
                        <span
                          className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="color"
                      value={mgmtAccentColor}
                      onChange={(e) => setMgmtAccentColor(e.target.value)}
                      className="h-8 w-8 rounded cursor-pointer border border-line bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={mgmtAccentColor}
                      onChange={(e) => setMgmtAccentColor(e.target.value)}
                      placeholder="#7049D8"
                      className="w-32 rounded-lg border border-line p-1.5 text-xs font-mono text-ink-900"
                    />
                    <span className="text-[11px] text-ink-500">Custom Hex Code</span>
                  </div>
                </div>

                {/* Theme Style */}
                <div className="space-y-2 pt-1 border-t border-line/60">
                  <label className="block text-xs font-semibold text-ink-900">
                    Background Theme Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "warm", label: "Warm Natural", desc: "Warm white" },
                      { id: "light", label: "Minimal Clean", desc: "Crisp white" },
                      { id: "dark", label: "Modern Dark", desc: "Dark theme" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setMgmtTheme(t.id)}
                        className={cn(
                          "rounded-xl border p-2.5 text-left transition-colors",
                          mgmtTheme === t.id
                            ? "border-brand-500 bg-brand-50/50 shadow-2xs"
                            : "border-line bg-white hover:bg-warm-50",
                        )}
                      >
                        <span className="block text-xs font-semibold text-ink-900">
                          {t.label}
                        </span>
                        <span className="block text-[10px] text-ink-500 mt-0.5">
                          {t.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveMgmtSettings}
                    disabled={isSavingMgmt}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
                  >
                    {isSavingMgmt && <Loader2 size={12} className="animate-spin" />}
                    <span>Save Appearance</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: POST-SUBMISSION & SETTINGS */}
            {manageTab === "settings" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Custom Thank-You Message
                  </label>
                  <textarea
                    rows={2}
                    value={mgmtThankYou}
                    onChange={(e) => setMgmtThankYou(e.target.value)}
                    placeholder="Thank you for sharing your feedback with us!"
                    className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-[11px] text-ink-500">
                    Shown immediately on the confirmation screen upon successful review submission.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Optional Redirect URL
                  </label>
                  <input
                    type="url"
                    value={mgmtRedirectUrl}
                    onChange={(e) => setMgmtRedirectUrl(e.target.value)}
                    placeholder="https://yoursite.com/thank-you"
                    className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="mt-1 text-[11px] text-ink-500">
                    If configured, customers are automatically forwarded to this URL after submitting.
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveMgmtSettings}
                    disabled={isSavingMgmt}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
                  >
                    {isSavingMgmt && <Loader2 size={12} className="animate-spin" />}
                    <span>Save Post-Submission Settings</span>
                  </button>
                </div>

                {/* Danger Zone: Delete Form */}
                <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-3.5 space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-rose-900 block flex items-center gap-1">
                        <AlertTriangle size={13} className="text-rose-600" />
                        <span>Delete Form</span>
                      </span>
                      <span className="text-[11px] text-rose-700">
                        Permanently delete this collection form.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeletingForm(managingForm)}
                      className="rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      Delete Form
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ModalDialog>

      {/* Share Form Modal Dialog */}
      <ModalDialog
        isOpen={shareForm !== null}
        onClose={() => setShareForm(null)}
        title="Share Collection Form"
        description="Share this public link directly with customers via email, Slack, or embed it on your website."
        footer={
          <button
            type="button"
            onClick={() => setShareForm(null)}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100"
          >
            Close
          </button>
        }
      >
        {shareForm && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Direct Invitation Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${shareForm.slug}`}
                  className="w-full rounded-lg border border-line bg-warm-50 p-2 text-xs font-mono text-ink-900"
                />
                <button
                  type="button"
                  onClick={() => copyShareUrl(shareForm.slug)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-warm-50/60 p-3 text-xs space-y-1">
              <span className="font-semibold text-ink-900 block text-xs">
                Preview Customer Experience
              </span>
              <p className="text-[11px] text-ink-500">
                You can test submitting a testimonial through this public link in a separate tab.
              </p>
              <div className="pt-2">
                <a
                  href={`/p/${shareForm.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-semibold"
                >
                  <span>Open Public Form</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Regenerate Slug Confirmation Dialog */}
      <ConfirmDialog
        isOpen={regeneratingSlugForm !== null}
        onClose={() => setRegeneratingSlugForm(null)}
        onConfirm={handleConfirmRegenerateSlug}
        title="Regenerate Public Slug?"
        message={`Are you sure you want to regenerate the public link slug for "${regeneratingSlugForm?.title}"? Any existing links sent to customers or embedded on your site will stop working immediately.`}
        confirmLabel={isRegeneratingSlug ? "Regenerating..." : "Yes, Regenerate Slug"}
        isDestructive
      />

      {/* Delete Form Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingForm !== null}
        onClose={() => setDeletingForm(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete Form "${deletingForm?.title}"?`}
        message="Are you sure you want to delete this collection form and its questions? Any testimonials already collected through this form will remain safely preserved in your workspace."
        confirmLabel="Yes, Delete Form"
        isDestructive
      />
    </div>
  );
}
