"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Edit2,
  ExternalLink,
  Layers,
  Loader2,
  MessageSquareQuote,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { defaultWallOfLoveConfig, sanitizePublicSlug } from "@/lib/widgets/utils";
import {
  WallOfLoveConfig,
  WidgetDetail,
  WidgetLayout,
  WidgetOrdering,
  WidgetThemeMode,
} from "@/types/widgets";

export default function WidgetsPage() {
  const { activeWorkspace, projects } = useWorkspace();
  const toast = useToast();
  const workspaceId = activeWorkspace?.id;

  const [widgets, setWidgets] = useState<WidgetDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetDetail | null>(null);
  const [sharingWidget, setSharingWidget] = useState<WidgetDetail | null>(null);
  const [deletingWidget, setDeletingWidget] = useState<WidgetDetail | null>(null);

  // Form State for Create & Edit
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formProjectId, setFormProjectId] = useState<string>("all");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLayout, setFormLayout] = useState<WidgetLayout>("masonry");
  const [formTheme, setFormTheme] = useState<WidgetThemeMode>("warm");
  const [formAccentColor, setFormAccentColor] = useState("#7049D8");
  const [formOrdering, setFormOrdering] = useState<WidgetOrdering>("featured_first");
  const [formShowRatings, setFormShowRatings] = useState(true);
  const [formShowCompany, setFormShowCompany] = useState(true);
  const [formShowAvatar, setFormShowAvatar] = useState(true);
  const [formShowDate, setFormShowDate] = useState(true);
  const [formShowTags, setFormShowTags] = useState(true);
  const [formShowFeaturedBadge, setFormShowFeaturedBadge] = useState(true);
  const [formMinRating, setFormMinRating] = useState(0);
  const [formCtaEnabled, setFormCtaEnabled] = useState(true);
  const [formCtaLabel, setFormCtaLabel] = useState("Share Your Praise");
  const [formCtaUrl, setFormCtaUrl] = useState("");
  const [formCtaSecondaryEnabled, setFormCtaSecondaryEnabled] = useState(false);
  const [formCtaSecondaryLabel, setFormCtaSecondaryLabel] = useState("Visit Website");
  const [formCtaSecondaryUrl, setFormCtaSecondaryUrl] = useState("");
  const [formAllowVideo, setFormAllowVideo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copy state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Active form tab: "general" | "appearance" | "ordering" | "cta"
  const [activeFormTab, setActiveFormTab] = useState<"general" | "appearance" | "ordering" | "cta">("general");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function loadWidgets() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/widgets`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setWidgets(data.widgets || []);
        }
      } catch (err) {
        console.error("Failed to load widgets:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadWidgets();

    return () => {
      isMounted = false;
    };
  }, [workspaceId, refreshKey]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const base = defaultWallOfLoveConfig(
      `${activeWorkspace?.name || "Product"} Wall of Love`,
      `${activeWorkspace?.slug || "product"}-love`
    );
    setFormName(base.title);
    setFormSlug(base.slug);
    setFormProjectId("all");
    setFormTitle(base.title);
    setFormDescription(base.description);
    setFormLayout(base.layout);
    setFormTheme(base.theme);
    setFormAccentColor(base.accentColor);
    setFormOrdering(base.ordering);
    setFormShowRatings(base.showRatings);
    setFormShowCompany(base.showCompany);
    setFormShowAvatar(base.showAvatar);
    setFormShowDate(base.showDate);
    setFormShowTags(base.showTags);
    setFormShowFeaturedBadge(base.showFeaturedBadge);
    setFormMinRating(base.minRating);
    setFormCtaEnabled(base.ctaEnabled);
    setFormCtaLabel(base.ctaLabel);
    setFormCtaUrl(base.ctaUrl);
    setFormCtaSecondaryEnabled(base.ctaSecondaryEnabled);
    setFormCtaSecondaryLabel(base.ctaSecondaryLabel);
    setFormCtaSecondaryUrl(base.ctaSecondaryUrl);
    setFormAllowVideo(base.allowVideoPlayback);
    setActiveFormTab("general");
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal prefilled
  const handleOpenEdit = (w: WidgetDetail) => {
    setEditingWidget(w);
    setFormName(w.name);
    setFormSlug(w.config.slug || w.id);
    setFormProjectId(w.projectId || "all");
    setFormTitle(w.config.title);
    setFormDescription(w.config.description);
    setFormLayout(w.config.layout);
    setFormTheme(w.config.theme);
    setFormAccentColor(w.config.accentColor);
    setFormOrdering(w.config.ordering);
    setFormShowRatings(w.config.showRatings);
    setFormShowCompany(w.config.showCompany);
    setFormShowAvatar(w.config.showAvatar);
    setFormShowDate(w.config.showDate);
    setFormShowTags(w.config.showTags);
    setFormShowFeaturedBadge(w.config.showFeaturedBadge);
    setFormMinRating(w.config.minRating);
    setFormCtaEnabled(w.config.ctaEnabled);
    setFormCtaLabel(w.config.ctaLabel);
    setFormCtaUrl(w.config.ctaUrl);
    setFormCtaSecondaryEnabled(w.config.ctaSecondaryEnabled);
    setFormCtaSecondaryLabel(w.config.ctaSecondaryLabel);
    setFormCtaSecondaryUrl(w.config.ctaSecondaryUrl);
    setFormAllowVideo(w.config.allowVideoPlayback);
    setActiveFormTab("general");
  };

  // Create submission
  const handleCreateWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    if (!formName.trim()) {
      toast.error("Validation Error", "Please provide a name for this Wall of Love.");
      return;
    }

    setIsSubmitting(true);
    try {
      const configPayload: WallOfLoveConfig = {
        slug: sanitizePublicSlug(formSlug || formName),
        title: formTitle.trim() || formName.trim(),
        description: formDescription.trim(),
        layout: formLayout,
        theme: formTheme,
        accentColor: formAccentColor,
        ordering: formOrdering,
        showRatings: formShowRatings,
        showCompany: formShowCompany,
        showAvatar: formShowAvatar,
        showDate: formShowDate,
        showTags: formShowTags,
        showSource: true,
        showFeaturedBadge: formShowFeaturedBadge,
        minRating: formMinRating,
        ctaEnabled: formCtaEnabled,
        ctaLabel: formCtaLabel.trim(),
        ctaUrl: formCtaUrl.trim(),
        ctaSecondaryEnabled: formCtaSecondaryEnabled,
        ctaSecondaryLabel: formCtaSecondaryLabel.trim(),
        ctaSecondaryUrl: formCtaSecondaryUrl.trim(),
        allowVideoPlayback: formAllowVideo,
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/widgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          type: "WALL_OF_LOVE",
          theme: formTheme.toUpperCase(),
          projectId: formProjectId === "all" ? null : formProjectId,
          config: configPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create Wall of Love.");
      }

      toast.success(
        "Wall of Love Published",
        `Created "${data.widget.name}". View it at /w/${data.widget.config.slug}`
      );
      setIsCreateModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      toast.error("Error", err instanceof Error ? err.message : "Creation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit submission
  const handleUpdateWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !editingWidget) return;

    setIsSubmitting(true);
    try {
      const configPayload: WallOfLoveConfig = {
        slug: sanitizePublicSlug(formSlug || editingWidget.name),
        title: formTitle.trim() || formName.trim(),
        description: formDescription.trim(),
        layout: formLayout,
        theme: formTheme,
        accentColor: formAccentColor,
        ordering: formOrdering,
        showRatings: formShowRatings,
        showCompany: formShowCompany,
        showAvatar: formShowAvatar,
        showDate: formShowDate,
        showTags: formShowTags,
        showSource: true,
        showFeaturedBadge: formShowFeaturedBadge,
        minRating: formMinRating,
        ctaEnabled: formCtaEnabled,
        ctaLabel: formCtaLabel.trim(),
        ctaUrl: formCtaUrl.trim(),
        ctaSecondaryEnabled: formCtaSecondaryEnabled,
        ctaSecondaryLabel: formCtaSecondaryLabel.trim(),
        ctaSecondaryUrl: formCtaSecondaryUrl.trim(),
        allowVideoPlayback: formAllowVideo,
      };

      const res = await fetch(
        `/api/workspaces/${workspaceId}/widgets/${editingWidget.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            type: "WALL_OF_LOVE",
            theme: formTheme.toUpperCase(),
            projectId: formProjectId === "all" ? null : formProjectId,
            config: configPayload,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update widget.");
      }

      toast.success("Settings Saved", `Updated "${data.widget.name}".`);
      setEditingWidget(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      toast.error("Update Failed", err instanceof Error ? err.message : "Error saving");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete submission
  const handleDeleteWidget = async () => {
    if (!workspaceId || !deletingWidget) return;

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/widgets/${deletingWidget.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Widget Deleted", `Removed "${deletingWidget.name}".`);
        setWidgets((prev) => prev.filter((w) => w.id !== deletingWidget.id));
      }
    } catch {
      toast.error("Error", "Could not delete widget.");
    } finally {
      setDeletingWidget(null);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Public Wall of Love &amp; Widgets"
        description="Publish approved customer testimonials on dedicated public pages and generate copy-and-paste embed snippets."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
            >
              <Plus size={14} />
              <span>Create Wall of Love</span>
            </button>
          </div>
        }
      />

      {/* Main Wall of Love Cards Grid */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-xs">
          <Loader2 size={24} className="animate-spin text-brand-500 mx-auto" />
          <p className="text-xs text-ink-500 mt-2">Loading your Walls of Love...</p>
        </div>
      ) : widgets.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
          <EmptyState
            icon={Layers}
            title="No Wall of Love created yet"
            description="Create a dedicated public page showcasing your approved testimonials with customizable layouts, light/dark modes, and call-to-action buttons."
            action={
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
              >
                <Plus size={14} />
                <span>Create Your First Wall of Love</span>
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {widgets.map((w) => {
            const publicPath = `/w/${w.config.slug || w.id}`;

            return (
              <div
                key={w.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-xs hover:border-line-dark transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200 shrink-0">
                        <Layers size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-ink-900 leading-snug">
                          {w.name}
                        </h2>
                        <span className="text-[11px] font-mono text-ink-500 flex items-center gap-1 mt-0.5">
                          <span>/w/{w.config.slug}</span>
                        </span>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Live
                    </span>
                  </div>

                  <p className="text-xs text-ink-600 mt-3 line-clamp-2 leading-relaxed">
                    {w.config.description || "Real customer testimonials and reviews."}
                  </p>

                  {/* Attributes Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-line text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-md bg-warm-100 px-2 py-0.5 font-medium text-ink-700">
                      <MessageSquareQuote size={11} className="text-brand-600" />
                      <span>{w.approvedCount || 0} approved reviews</span>
                    </span>

                    {w.project && (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 border border-line bg-white shadow-2xs font-medium text-ink-700">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: w.project.color || "#7049D8" }}
                        />
                        <span>{w.project.name}</span>
                      </span>
                    )}

                    <span className="inline-flex items-center rounded-md bg-warm-50 px-2 py-0.5 text-ink-600 capitalize">
                      {w.config.layout} &bull; {w.config.theme}
                    </span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
                  <a
                    href={publicPath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    <span>View Public Page</span>
                    <ExternalLink size={11} />
                  </a>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSharingWidget(w)}
                      className="p-1.5 rounded-lg border border-line text-ink-600 hover:bg-warm-100 transition-colors"
                      title="Share link &amp; Embed code"
                    >
                      <Share2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(w)}
                      className="p-1.5 rounded-lg border border-line text-ink-600 hover:bg-warm-100 transition-colors"
                      title="Edit Wall Settings"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingWidget(w)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Wall of Love"
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

      {/* CREATE & EDIT MODAL */}
      <ModalDialog
        isOpen={isCreateModalOpen || Boolean(editingWidget)}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingWidget(null);
        }}
        title={editingWidget ? `Edit "${editingWidget.name}"` : "Create Public Wall of Love"}
        description="Publish a dedicated, beautiful social proof page showcasing approved customer testimonials."
        maxWidth="2xl"
      >
        <form onSubmit={editingWidget ? handleUpdateWidget : handleCreateWidget} className="space-y-4">
          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-line gap-2 text-xs font-semibold">
            {[
              { id: "general", label: "General & Slug" },
              { id: "appearance", label: "Layout & Theme" },
              { id: "ordering", label: "Ordering & Display" },
              { id: "cta", label: "Call to Action" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveFormTab(t.id as typeof activeFormTab)}
                className={`py-2 px-3 border-b-2 transition-colors ${
                  activeFormTab === t.id
                    ? "border-brand-500 text-brand-600 font-bold"
                    : "border-transparent text-ink-500 hover:text-ink-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: GENERAL */}
          {activeFormTab === "general" && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1">
                    Wall Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!editingWidget) {
                        setFormSlug(sanitizePublicSlug(e.target.value));
                      }
                    }}
                    placeholder="e.g. Acme Customer Love"
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1">
                    Public Page Slug <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <span className="rounded-l-lg border border-r-0 border-line bg-warm-100 px-2.5 py-1.5 text-xs text-ink-500">
                      /w/
                    </span>
                    <input
                      type="text"
                      required
                      value={formSlug}
                      onChange={(e) => setFormSlug(sanitizePublicSlug(e.target.value))}
                      placeholder="acme-love"
                      className="w-full rounded-r-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1">
                  Associated Project
                </label>
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="all">All Projects in Workspace</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-ink-400 mt-1">
                  Choose whether this Wall of Love displays testimonials from a specific project or your whole workspace.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1">
                  Public Page Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Loved by 1,000+ teams worldwide"
                  className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1">
                  Public Page Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="See how creators, engineers, and teams use our product every day."
                  className="w-full rounded-lg border border-line bg-white p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE & THEME */}
          {activeFormTab === "appearance" && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1">
                    Layout Style
                  </label>
                  <select
                    value={formLayout}
                    onChange={(e) => setFormLayout(e.target.value as WidgetLayout)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="masonry">Masonry (Pinterest-style columns)</option>
                    <option value="grid">Responsive 3-Column Grid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1">
                    Color Theme
                  </label>
                  <select
                    value={formTheme}
                    onChange={(e) => setFormTheme(e.target.value as WidgetThemeMode)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="warm">Praise Warm (Beige / Warm Tone)</option>
                    <option value="light">Crisp Light (White / Slate)</option>
                    <option value="dark">Midnight Dark (Deep Zinc / Obsidian)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1">
                  Brand Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formAccentColor}
                    onChange={(e) => setFormAccentColor(e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border border-line p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={formAccentColor}
                    onChange={(e) => setFormAccentColor(e.target.value)}
                    className="w-28 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-mono text-ink-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERING & DISPLAY */}
          {activeFormTab === "ordering" && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1">
                    Testimonial Ordering
                  </label>
                  <select
                    value={formOrdering}
                    onChange={(e) => setFormOrdering(e.target.value as WidgetOrdering)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="featured_first">Featured / Pinned First (Recommended)</option>
                    <option value="highest_rated">Highest Rated (5★ reviews first)</option>
                    <option value="newest">Most Recent</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1">
                    Minimum Rating Filter
                  </label>
                  <select
                    value={formMinRating}
                    onChange={(e) => setFormMinRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value={0}>Show all approved ratings (1-5★)</option>
                    <option value={4}>4 Stars and above only (4-5★)</option>
                    <option value={5}>5 Stars only (5★)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-line text-xs">
                <span className="block font-semibold text-ink-900 mb-2">Display Elements</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-ink-700">
                    <input
                      type="checkbox"
                      checked={formShowRatings}
                      onChange={(e) => setFormShowRatings(e.target.checked)}
                      className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <span>Show Star Ratings</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-ink-700">
                    <input
                      type="checkbox"
                      checked={formShowCompany}
                      onChange={(e) => setFormShowCompany(e.target.checked)}
                      className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <span>Show Customer Company &amp; Role</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-ink-700">
                    <input
                      type="checkbox"
                      checked={formShowAvatar}
                      onChange={(e) => setFormShowAvatar(e.target.checked)}
                      className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <span>Show Customer Avatar / Photo</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-ink-700">
                    <input
                      type="checkbox"
                      checked={formShowDate}
                      onChange={(e) => setFormShowDate(e.target.checked)}
                      className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <span>Show Submission Date</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-ink-700">
                    <input
                      type="checkbox"
                      checked={formShowFeaturedBadge}
                      onChange={(e) => setFormShowFeaturedBadge(e.target.checked)}
                      className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <span>Show &ldquo;Featured Story&rdquo; Badges</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-ink-700">
                    <input
                      type="checkbox"
                      checked={formAllowVideo}
                      onChange={(e) => setFormAllowVideo(e.target.checked)}
                      className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <span>Allow Direct Video Playback</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CALL TO ACTION */}
          {activeFormTab === "cta" && (
            <div className="space-y-4 pt-1">
              {/* Primary CTA */}
              <div className="p-3.5 rounded-xl border border-line bg-warm-50/50 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink-900 text-xs">
                  <input
                    type="checkbox"
                    checked={formCtaEnabled}
                    onChange={(e) => setFormCtaEnabled(e.target.checked)}
                    className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span>Enable Primary Call to Action Button</span>
                </label>

                {formCtaEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-ink-700 mb-1">
                        Button Label
                      </label>
                      <input
                        type="text"
                        value={formCtaLabel}
                        onChange={(e) => setFormCtaLabel(e.target.value)}
                        placeholder="Share Your Praise"
                        className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-ink-700 mb-1">
                        Destination URL
                      </label>
                      <input
                        type="text"
                        value={formCtaUrl}
                        onChange={(e) => setFormCtaUrl(e.target.value)}
                        placeholder="/p/feedback or https://yourproduct.com"
                        className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Secondary CTA */}
              <div className="p-3.5 rounded-xl border border-line bg-warm-50/50 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink-900 text-xs">
                  <input
                    type="checkbox"
                    checked={formCtaSecondaryEnabled}
                    onChange={(e) => setFormCtaSecondaryEnabled(e.target.checked)}
                    className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span>Enable Secondary Button</span>
                </label>

                {formCtaSecondaryEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-ink-700 mb-1">
                        Button Label
                      </label>
                      <input
                        type="text"
                        value={formCtaSecondaryLabel}
                        onChange={(e) => setFormCtaSecondaryLabel(e.target.value)}
                        placeholder="Visit Website"
                        className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-ink-700 mb-1">
                        Destination URL
                      </label>
                      <input
                        type="text"
                        value={formCtaSecondaryUrl}
                        onChange={(e) => setFormCtaSecondaryUrl(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Save Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingWidget(null);
              }}
              className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-2xs disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              <span>{editingWidget ? "Save Changes" : "Publish Wall of Love"}</span>
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* SHARE & EMBED DIALOG */}
      {sharingWidget && (
        <ModalDialog
          isOpen={Boolean(sharingWidget)}
          onClose={() => setSharingWidget(null)}
          title={`Share & Embed "${sharingWidget.name}"`}
          description="Embed this Wall of Love on your landing page or share the standalone public link."
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Public Standalone Link */}
            <div>
              <label className="block font-semibold text-ink-900 mb-1.5">
                Shareable Public Wall Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${origin}/w/${sharingWidget.config.slug || sharingWidget.id}`}
                  className="w-full rounded-lg border border-line bg-warm-50 px-3 py-1.5 font-mono text-xs text-ink-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${origin}/w/${sharingWidget.config.slug || sharingWidget.id}`
                    );
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                    toast.success("Link Copied", "Public link copied to clipboard.");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 font-semibold text-ink-700 hover:bg-warm-100 transition-colors shrink-0"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
                <a
                  href={`/w/${sharingWidget.config.slug || sharingWidget.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg border border-line bg-white text-ink-600 hover:bg-warm-100 transition-colors shrink-0"
                  title="Open in new tab"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>

            {/* iFrame Embed */}
            <div>
              <label className="block font-semibold text-ink-900 mb-1.5">
                Responsive HTML iFrame Embed
              </label>
              <div className="relative">
                <pre className="rounded-xl border border-line bg-warm-100 p-3 font-mono text-[11px] text-ink-900 overflow-x-auto">
                  {`<iframe src="${origin}/w/${sharingWidget.config.slug || sharingWidget.id}" width="100%" height="800" frameborder="0"></iframe>`}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<iframe src="${origin}/w/${sharingWidget.config.slug || sharingWidget.id}" width="100%" height="800" frameborder="0"></iframe>`
                    );
                    setCopiedEmbed(true);
                    setTimeout(() => setCopiedEmbed(false), 2000);
                    toast.success("Snippet Copied", "iFrame code copied to clipboard.");
                  }}
                  className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-white border border-line px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-warm-50 shadow-2xs"
                >
                  {copiedEmbed ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  <span>{copiedEmbed ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingWidget)}
        onClose={() => setDeletingWidget(null)}
        onConfirm={handleDeleteWidget}
        title="Delete Wall of Love"
        message={
          deletingWidget
            ? `Are you sure you want to delete "${deletingWidget.name}"? The public link /w/${deletingWidget.config.slug} will become unavailable. Your approved testimonials will remain safe.`
            : "Are you sure you want to delete this widget?"
        }
        confirmLabel="Delete Widget"
        isDestructive
      />
    </div>
  );
}
