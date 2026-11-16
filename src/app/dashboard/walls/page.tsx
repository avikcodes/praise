"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  Heart,
  Layers,
  LayoutGrid,
  Loader2,
  MessageSquareQuote,
  MoreVertical,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Share2,
  Sparkles,
  Star,
  Trash2,
  X,
  CopyPlus,
  Globe,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";

interface WallSummary {
  id: string;
  projectId?: string | null;
  name: string;
  slug: string;
  title: string | null;
  description: string | null;
  theme: string;
  layout: string;
  ordering: string;
  isPublished: boolean;
  minRating: number;
  primaryColor: string | null;
  customLogoUrl: string | null;
  ctaEnabled: boolean;
  ctaLabel: string | null;
  ctaUrl: string | null;
  ctaSecondaryEnabled: boolean;
  ctaSecondaryLabel: string | null;
  ctaSecondaryUrl: string | null;
  showRatings: boolean;
  showCompany: boolean;
  showAvatar: boolean;
  showDate: boolean;
  showTags: boolean;
  showSource: boolean;
  showFeaturedBadge: boolean;
  allowVideoPlayback: boolean;
  showStats: boolean;
  viewsCount: number;
  approvedCount: number;
  publicUrl: string;
  tagFilterList: string[];
  selectedTestimonialIdList: string[];
  project: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

const THEMES = [
  { id: "WARM", name: "Warm Editorial", bg: "bg-[#FAF7F2]", border: "border-[#E9E4DB]", text: "text-ink-900", desc: "Cream paper & amber" },
  { id: "LIGHT", name: "Modern Light", bg: "bg-white", border: "border-slate-200", text: "text-slate-900", desc: "Crisp SaaS white" },
  { id: "DARK", name: "Slate Dark", bg: "bg-[#121417]", border: "border-ink-800", text: "text-white", desc: "Sleek graphite charcoal" },
  { id: "MIDNIGHT", name: "Midnight Navy", bg: "bg-[#0B0F19]", border: "border-indigo-900/60", text: "text-white", desc: "Cosmic indigo & violet" },
  { id: "EMERALD", name: "Sage Emerald", bg: "bg-[#F3F8F5]", border: "border-[#D0E5DA]", text: "text-[#123023]", desc: "Organic botanical green" },
  { id: "SUNSET", name: "Sunset Terracotta", bg: "bg-[#FFF8F5]", border: "border-[#F3DDD5]", text: "text-[#331C14]", desc: "Warm peach & rose" },
  { id: "MINIMAL", name: "Monochrome Minimal", bg: "bg-white", border: "border-black", text: "text-black", desc: "Stark contrast editorial" },
];

export default function WallsOfLovePage() {
  const toast = useToast();
  const { activeWorkspace, projects } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  const [walls, setWalls] = useState<WallSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  // Modal State (Create / Edit)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingWallId, setEditingWallId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "branding" | "content" | "cta">("general");

  // Form fields
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    projectId: "",
    title: "",
    description: "",
    theme: "WARM",
    layout: "MASONRY",
    ordering: "FEATURED_FIRST",
    isPublished: true,
    minRating: 0,
    primaryColor: "#7049D8",
    customLogoUrl: "",
    ctaEnabled: true,
    ctaLabel: "Share Your Praise",
    ctaUrl: "",
    ctaSecondaryEnabled: false,
    ctaSecondaryLabel: "Try Praise Free",
    ctaSecondaryUrl: "",
    showRatings: true,
    showCompany: true,
    showAvatar: true,
    showDate: true,
    showTags: true,
    showSource: true,
    showFeaturedBadge: true,
    allowVideoPlayback: true,
    showStats: true,
    selectionMode: "all" as "all" | "tags" | "manual",
    tagFilterList: [] as string[],
    selectedTestimonialIdList: [] as string[],
  });

  const [availableTestimonials, setAvailableTestimonials] = useState<any[]>([]);
  const [workspaceTags, setWorkspaceTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Preview Modal State
  const [previewWall, setPreviewWall] = useState<WallSummary | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Load walls
  const loadWalls = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/walls`);
      const data = await res.json();
      if (res.ok) {
        setWalls(data.walls || []);
      }
    } catch (err) {
      console.error("Failed to load walls:", err);
      toast.error("Error", "Could not load Walls of Love.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadWalls();
    }
  }, [workspaceId]);

  // Load tags and available testimonials for editor
  const loadEditorData = async (wallId?: string) => {
    if (!workspaceId) return;
    try {
      // Load workspace tags
      const tagsRes = await fetch(`/api/workspaces/${workspaceId}/tags`);
      const tagsData = await tagsRes.json();
      if (tagsRes.ok) {
        setWorkspaceTags((tagsData.tags || []).map((t: any) => t.name));
      }

      // If editing existing wall, fetch full details & available testimonials
      if (wallId) {
        const wallRes = await fetch(`/api/workspaces/${workspaceId}/walls/${wallId}`);
        const wallData = await wallRes.json();
        if (wallRes.ok) {
          const w = wallData.wall;
          setAvailableTestimonials(wallData.availableTestimonials || []);
          setFormData({
            name: w.name || "",
            slug: w.slug || "",
            projectId: w.projectId || "",
            title: w.title || "",
            description: w.description || "",
            theme: w.theme || "WARM",
            layout: w.layout || "MASONRY",
            ordering: w.ordering || "FEATURED_FIRST",
            isPublished: Boolean(w.isPublished),
            minRating: w.minRating || 0,
            primaryColor: w.primaryColor || "#7049D8",
            customLogoUrl: w.customLogoUrl || "",
            ctaEnabled: w.ctaEnabled ?? true,
            ctaLabel: w.ctaLabel || "Share Your Praise",
            ctaUrl: w.ctaUrl || "",
            ctaSecondaryEnabled: Boolean(w.ctaSecondaryEnabled),
            ctaSecondaryLabel: w.ctaSecondaryLabel || "Try Praise Free",
            ctaSecondaryUrl: w.ctaSecondaryUrl || "",
            showRatings: w.showRatings ?? true,
            showCompany: w.showCompany ?? true,
            showAvatar: w.showAvatar ?? true,
            showDate: w.showDate ?? true,
            showTags: w.showTags ?? true,
            showSource: w.showSource ?? true,
            showFeaturedBadge: w.showFeaturedBadge ?? true,
            allowVideoPlayback: w.allowVideoPlayback ?? true,
            showStats: w.showStats ?? true,
            selectionMode:
              w.selectedTestimonialIdList?.length > 0
                ? "manual"
                : w.tagFilterList?.length > 0
                ? "tags"
                : "all",
            tagFilterList: w.tagFilterList || [],
            selectedTestimonialIdList: w.selectedTestimonialIdList || [],
          });
        }
      } else {
        // Fetch approved testimonials for picker
        const tRes = await fetch(`/api/workspaces/${workspaceId}/testimonials?status=APPROVED&limit=100`);
        const tData = await tRes.json();
        if (tRes.ok) {
          setAvailableTestimonials(
            (tData.testimonials || []).map((t: any) => ({
              id: t.id,
              content: t.content,
              rating: t.rating,
              customerName: t.customer?.name || "Customer",
              customerCompany: t.customer?.company,
              tags: (t.tags || []).map((item: any) => item.tag?.name).filter(Boolean),
            }))
          );
        }
      }
    } catch (err) {
      console.error("Failed to load editor data:", err);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingWallId(null);
    setFormError(null);
    setActiveTab("general");
    setFormData({
      name: "",
      slug: "",
      projectId: "",
      title: "",
      description: "",
      theme: "WARM",
      layout: "MASONRY",
      ordering: "FEATURED_FIRST",
      isPublished: true,
      minRating: 0,
      primaryColor: "#7049D8",
      customLogoUrl: "",
      ctaEnabled: true,
      ctaLabel: "Share Your Praise",
      ctaUrl: "",
      ctaSecondaryEnabled: false,
      ctaSecondaryLabel: "Try Praise Free",
      ctaSecondaryUrl: "",
      showRatings: true,
      showCompany: true,
      showAvatar: true,
      showDate: true,
      showTags: true,
      showSource: true,
      showFeaturedBadge: true,
      allowVideoPlayback: true,
      showStats: true,
      selectionMode: "all",
      tagFilterList: [],
      selectedTestimonialIdList: [],
    });
    setIsEditorOpen(true);
    loadEditorData();
  };

  // Open Edit Modal
  const handleOpenEdit = (wall: WallSummary) => {
    setEditingWallId(wall.id);
    setFormError(null);
    setActiveTab("general");
    setIsEditorOpen(true);
    loadEditorData(wall.id);
  };

  // Save Wall
  const handleSaveWall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    setFormError(null);
    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        tagFilter: formData.selectionMode === "tags" ? formData.tagFilterList : null,
        selectedTestimonialIds:
          formData.selectionMode === "manual" ? formData.selectedTestimonialIdList : null,
      };

      const url = editingWallId
        ? `/api/workspaces/${workspaceId}/walls/${editingWallId}`
        : `/api/workspaces/${workspaceId}/walls`;

      const method = editingWallId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save Wall of Love.");
      }

      toast.success(
        editingWallId ? "Wall Updated" : "Wall Created",
        `"${data.wall.name}" has been saved.`
      );
      setIsEditorOpen(false);
      loadWalls();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Publish
  const handleTogglePublish = async (wall: WallSummary) => {
    const nextState = !wall.isPublished;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/walls/${wall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: nextState }),
      });

      if (res.ok) {
        toast.success(
          nextState ? "Wall Published" : "Wall Unpublished",
          `"${wall.name}" is now ${nextState ? "live and publicly accessible" : "private/draft"}.`
        );
        loadWalls();
      }
    } catch {
      toast.error("Error", "Could not toggle publish state.");
    }
  };

  // Duplicate Wall
  const handleDuplicate = async (wall: WallSummary) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/walls/${wall.id}/duplicate`, {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Wall Duplicated", `Created draft copy: "${data.wall.name}".`);
        loadWalls();
      } else {
        toast.error("Failed to Duplicate", data.error || "Could not duplicate wall.");
      }
    } catch {
      toast.error("Error", "Duplication request failed.");
    }
  };

  // Delete Wall
  const handleDelete = async (wall: WallSummary) => {
    if (!confirm(`Are you sure you want to delete "${wall.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/walls/${wall.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Wall Deleted", `"${wall.name}" was removed.`);
        loadWalls();
      } else {
        toast.error("Failed to Delete", "Could not delete wall.");
      }
    } catch {
      toast.error("Error", "Delete request failed.");
    }
  };

  // Copy Link
  const handleCopyLink = (slug: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${origin}/w/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
    toast.success("Link Copied", `Copied public Wall URL to clipboard: ${fullUrl}`);
  };

  // Filtered list
  const filteredWalls = walls.filter((w) => {
    if (selectedProjectId !== "all" && w.projectId !== selectedProjectId) return false;
    if (statusFilter === "published" && !w.isPublished) return false;
    if (statusFilter === "draft" && w.isPublished) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        w.name.toLowerCase().includes(q) ||
        w.slug.toLowerCase().includes(q) ||
        (w.title && w.title.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalWalls = walls.length;
  const publishedCount = walls.filter((w) => w.isPublished).length;
  const totalViews = walls.reduce((sum, w) => sum + (w.viewsCount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Walls of Love"
        description="Publish multiple customized showcase walls for different products, customer personas, or marketing landing pages."
        actions={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600 transition-colors"
          >
            <Plus size={14} />
            <span>Create New Wall</span>
          </button>
        }
      />

      {/* Overview Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-ink-500 flex items-center justify-between">
            <span>Total Walls</span>
            <Layers size={13} className="text-brand-500" />
          </div>
          <p className="text-2xl font-black text-ink-900 mt-1">{totalWalls}</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-ink-500 flex items-center justify-between">
            <span>Published Live</span>
            <Globe size={13} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-1">{publishedCount}</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-ink-500 flex items-center justify-between">
            <span>Draft Walls</span>
            <Sliders size={13} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-ink-900 mt-1">{totalWalls - publishedCount}</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-ink-500 flex items-center justify-between">
            <span>Public Impressions</span>
            <Eye size={13} className="text-brand-500" />
          </div>
          <p className="text-2xl font-black text-ink-900 mt-1">{totalViews}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-line bg-white shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search walls by name or slug..."
            className="w-full rounded-xl border border-line bg-warm-50/50 pl-9 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center rounded-xl border border-line bg-warm-50/70 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                statusFilter === "all" ? "bg-white text-ink-900 shadow-2xs" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              All ({walls.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                statusFilter === "published" ? "bg-white text-ink-900 shadow-2xs" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                statusFilter === "draft" ? "bg-white text-ink-900 shadow-2xs" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              Drafts ({totalWalls - publishedCount})
            </button>
          </div>

          {/* Project Filter */}
          {projects.length > 0 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs text-ink-900 focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={loadWalls}
            className="p-1.5 rounded-xl border border-line hover:bg-warm-100 text-ink-600 transition-colors"
            title="Refresh list"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Walls Grid */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-xs text-ink-400">
          <Loader2 size={16} className="animate-spin text-brand-500" />
          <span>Loading Walls of Love...</span>
        </div>
      ) : filteredWalls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-warm-50/40 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-line shadow-2xs flex items-center justify-center text-brand-500 mx-auto">
            <Heart size={22} className="fill-brand-500/20 text-brand-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-900">No Walls of Love Found</h3>
            <p className="text-xs text-ink-500 max-w-sm mx-auto mt-0.5">
              Create separate Walls of Love tailored for different landing pages, marketing campaigns, or customer tiers.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600 transition-colors"
          >
            <Plus size={14} />
            <span>Create First Wall of Love</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWalls.map((wall) => {
            const themeConfig = THEMES.find((t) => t.id === wall.theme) || THEMES[0];

            return (
              <div
                key={wall.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-brand-300 transition-all group"
              >
                <div className="space-y-3">
                  {/* Top Row: Name, Project, Publish Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-sm text-ink-900 leading-snug group-hover:text-brand-600 transition-colors">
                        {wall.name}
                      </h3>
                      {wall.project && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.2 rounded-full border border-brand-200">
                          {wall.project.name}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTogglePublish(wall)}
                      title={wall.isPublished ? "Click to unpublish" : "Click to publish live"}
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors ${
                        wall.isPublished
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      {wall.isPublished ? "Published" : "Draft"}
                    </button>
                  </div>

                  {/* Public URL Chip with Copy & Open */}
                  <div className="rounded-xl bg-warm-50/70 p-2 border border-line/70 flex items-center justify-between text-xs font-mono text-ink-700">
                    <span className="text-[11px] truncate mr-2">/w/{wall.slug}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(wall.slug)}
                        title="Copy public URL"
                        className="p-1 rounded-md hover:bg-white text-ink-400 hover:text-ink-800 transition-colors"
                      >
                        {copiedSlug === wall.slug ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      <a
                        href={wall.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open public page"
                        className="p-1 rounded-md hover:bg-white text-ink-400 hover:text-brand-600 transition-colors"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  {/* Configuration Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-ink-600">
                    <span className="px-2 py-0.5 rounded-md bg-warm-100 font-medium">
                      Theme: {themeConfig.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-warm-100 font-medium capitalize">
                      {wall.layout.toLowerCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      {wall.approvedCount} reviews
                    </span>
                  </div>

                  {wall.description && (
                    <p className="text-[11px] text-ink-500 line-clamp-2 leading-relaxed">
                      {wall.description}
                    </p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-line/60 flex items-center justify-between gap-1 text-xs">
                  <div className="text-[10px] text-ink-400">
                    <span>{wall.viewsCount || 0} views</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(wall)}
                      title="Duplicate this wall"
                      className="p-1.5 rounded-lg border border-line bg-white hover:bg-warm-100 text-ink-600 transition-colors"
                    >
                      <CopyPlus size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(wall)}
                      title="Edit wall configuration"
                      className="px-2.5 py-1 rounded-lg border border-line bg-white hover:bg-warm-100 text-[11px] font-semibold text-ink-800 transition-colors"
                    >
                      Edit
                    </button>
                    <a
                      href={wall.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold shadow-2xs transition-colors"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(wall)}
                      title="Delete wall"
                      className="p-1.5 rounded-lg border border-line bg-white hover:bg-rose-50 hover:text-rose-600 text-ink-400 transition-colors"
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

      {/* ========================================================================= */}
      {/* MODAL: WALL OF LOVE CREATOR & EDITOR */}
      {/* ========================================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-line bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-line flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                  <Heart size={16} className="text-brand-500 fill-brand-500/20" />
                  <span>{editingWallId ? `Edit: ${formData.name}` : "Create New Wall of Love"}</span>
                </h3>
                <p className="text-[11px] text-ink-500">
                  Publish an independent customer praise showcase for any product or campaign
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-ink-400 hover:text-ink-700"
              >
                <X size={16} />
              </button>
            </div>

            {/* Editor Tabs */}
            <div className="flex items-center px-5 border-b border-line bg-warm-50/50 shrink-0 text-xs overflow-x-auto">
              {[
                { id: "general", label: "General & Slug" },
                { id: "branding", label: "Theme & Hero" },
                { id: "content", label: "Testimonials & Filter" },
                { id: "cta", label: "Calls to Action" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2.5 px-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "border-brand-500 text-brand-600 font-bold"
                      : "border-transparent text-ink-500 hover:text-ink-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveWall} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {formError}
                </div>
              )}

              {/* TAB 1: GENERAL & SLUG */}
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-ink-900 mb-1">
                      Wall Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Enterprise Wall of Love"
                      value={formData.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          name: val,
                          slug: editingWallId ? formData.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
                        });
                      }}
                      className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:outline-none focus:border-brand-500"
                    />
                    <p className="text-[10px] text-ink-400 mt-0.5">
                      Internal reference for this showcase wall.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-900 mb-1">
                      Public URL Slug <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center rounded-xl border border-line bg-warm-50/50 px-3 py-2 text-xs">
                      <span className="text-ink-400 font-mono">/w/</span>
                      <input
                        type="text"
                        required
                        placeholder="enterprise"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                        className="flex-1 bg-transparent font-mono text-ink-900 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-ink-400 mt-0.5">
                      Canonical public URL for this Wall of Love.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-900 mb-1">
                      Associate with Project (Brand)
                    </label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink-900 focus:outline-none focus:border-brand-500"
                    >
                      <option value="">All Projects (Workspace Wide)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-line bg-warm-50/60">
                    <div>
                      <h4 className="font-bold text-ink-900">Publish Immediately</h4>
                      <p className="text-[10px] text-ink-500">
                        When enabled, this Wall of Love is accessible to public visitors.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}
                      className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                        formData.isPublished ? "bg-brand-500 justify-end" : "bg-warm-300 justify-start"
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: BRANDING & THEME */}
              {activeTab === "branding" && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-ink-900 mb-1">
                      Hero Headline / Page Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Loved by 5,000+ Fast-Growing Teams"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-900 mb-1">
                      Hero Subheadline / Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. See how engineering and growth teams use Praise to showcase authentic customer love."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Theme Selector with Swatches */}
                  <div>
                    <label className="block font-semibold text-ink-900 mb-2">
                      Public Wall Theme
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {THEMES.map((th) => {
                        const isSelected = formData.theme === th.id;
                        return (
                          <button
                            key={th.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, theme: th.id })}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/20"
                                : "border-line hover:border-brand-300"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-ink-900 text-xs">{th.name}</span>
                              {isSelected && <CheckCircle2 size={12} className="text-brand-500" />}
                            </div>
                            <div className={`h-6 rounded-md ${th.bg} border ${th.border} mb-1 flex items-center px-2 text-[9px] ${th.text}`}>
                              Sample Card
                            </div>
                            <span className="text-[10px] text-ink-500">{th.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Layout Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-ink-900 mb-1">
                        Layout Structure
                      </label>
                      <select
                        value={formData.layout}
                        onChange={(e) => setFormData({ ...formData, layout: e.target.value })}
                        className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink-900 focus:outline-none focus:border-brand-500"
                      >
                        <option value="MASONRY">Masonry (Dynamic Heights)</option>
                        <option value="GRID">Structured Equal Grid</option>
                        <option value="CAROUSEL">Horizontal Carousel</option>
                        <option value="LIST">Single Column Feed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-900 mb-1">
                        Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.primaryColor || "#7049D8"}
                          onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                          className="w-9 h-9 rounded-xl border border-line cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={formData.primaryColor || "#7049D8"}
                          onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                          className="flex-1 rounded-xl border border-line p-2 text-xs font-mono text-ink-900 uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TESTIMONIALS & CONTENT FILTERING */}
              {activeTab === "content" && (
                <div className="space-y-4">
                  {/* Selection Mode */}
                  <div>
                    <label className="block font-semibold text-ink-900 mb-1.5">
                      Testimonial Curation Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "all", label: "All Approved", desc: "Every public review" },
                        { id: "tags", label: "Filter by Tags", desc: "Match specific tags" },
                        { id: "manual", label: "Hand-Pick Reviews", desc: "Curate individually" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, selectionMode: m.id as any })}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            formData.selectionMode === m.id
                              ? "border-brand-500 bg-brand-50/30 ring-1 ring-brand-500"
                              : "border-line hover:border-brand-300"
                          }`}
                        >
                          <span className="font-bold text-ink-900 block text-xs">{m.label}</span>
                          <span className="text-[10px] text-ink-500">{m.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mode: Tags Multi-Select */}
                  {formData.selectionMode === "tags" && (
                    <div className="space-y-2 p-3.5 rounded-xl border border-line bg-warm-50/50">
                      <label className="block font-semibold text-ink-900">
                        Include Testimonials with Any of These Tags:
                      </label>
                      {workspaceTags.length === 0 ? (
                        <p className="text-[11px] text-ink-500 italic">
                          No tags found in this workspace yet. Tag your testimonials in the Testimonials tab first.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {workspaceTags.map((t) => {
                            const isSelected = formData.tagFilterList.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  const updated = isSelected
                                    ? formData.tagFilterList.filter((x) => x !== t)
                                    : [...formData.tagFilterList, t];
                                  setFormData({ ...formData, tagFilterList: updated });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  isSelected
                                    ? "bg-brand-500 text-white shadow-2xs"
                                    : "bg-white border border-line text-ink-700 hover:bg-warm-100"
                                }`}
                              >
                                {t} {isSelected && "✓"}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode: Manual Testimonial Picker */}
                  {formData.selectionMode === "manual" && (
                    <div className="space-y-2 p-3.5 rounded-xl border border-line bg-warm-50/50">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-ink-900">
                          Curated Reviews ({formData.selectedTestimonialIdList.length} selected):
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (formData.selectedTestimonialIdList.length === availableTestimonials.length) {
                              setFormData({ ...formData, selectedTestimonialIdList: [] });
                            } else {
                              setFormData({
                                ...formData,
                                selectedTestimonialIdList: availableTestimonials.map((t) => t.id),
                              });
                            }
                          }}
                          className="text-[11px] font-bold text-brand-600 hover:underline"
                        >
                          {formData.selectedTestimonialIdList.length === availableTestimonials.length
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 border border-line/60 rounded-xl bg-white p-2">
                        {availableTestimonials.map((t) => {
                          const isChecked = formData.selectedTestimonialIdList.includes(t.id);
                          return (
                            <label
                              key={t.id}
                              className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                                isChecked ? "bg-brand-50/60" : "hover:bg-warm-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const updated = isChecked
                                    ? formData.selectedTestimonialIdList.filter((id) => id !== t.id)
                                    : [...formData.selectedTestimonialIdList, t.id];
                                  setFormData({ ...formData, selectedTestimonialIdList: updated });
                                }}
                                className="mt-0.5 rounded border-line text-brand-600"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-ink-900 truncate">
                                    {t.customerName}
                                  </span>
                                  {t.customerCompany && (
                                    <span className="text-[10px] text-ink-400 truncate">
                                      ({t.customerCompany})
                                    </span>
                                  )}
                                  {t.rating && (
                                    <span className="text-amber-500 font-bold text-[10px]">
                                      ★ {t.rating}
                                    </span>
                                  )}
                                </div>
                                <p className="text-ink-600 line-clamp-1 text-[11px]">
                                  {t.content}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ordering & Min Rating */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-ink-900 mb-1">
                        Testimonial Ordering
                      </label>
                      <select
                        value={formData.ordering}
                        onChange={(e) => setFormData({ ...formData, ordering: e.target.value })}
                        className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink-900 focus:outline-none focus:border-brand-500"
                      >
                        <option value="FEATURED_FIRST">Featured Reviews First</option>
                        <option value="NEWEST">Newest Reviews First</option>
                        <option value="HIGHEST_RATED">Highest Rated First (5 Stars)</option>
                        <option value="OLDEST">Oldest Reviews First</option>
                        <option value="RANDOM">Random / Shuffled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-ink-900 mb-1">
                        Minimum Rating Filter
                      </label>
                      <select
                        value={formData.minRating}
                        onChange={(e) => setFormData({ ...formData, minRating: parseInt(e.target.value, 10) || 0 })}
                        className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink-900 focus:outline-none focus:border-brand-500"
                      >
                        <option value="0">All Ratings (1 to 5 Stars)</option>
                        <option value="3">3 Stars and Above</option>
                        <option value="4">4 Stars and Above</option>
                        <option value="5">5 Stars Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CALL TO ACTION (CTA) */}
              {activeTab === "cta" && (
                <div className="space-y-4">
                  {/* Primary CTA */}
                  <div className="p-3.5 rounded-xl border border-line bg-warm-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-ink-900">Primary Call to Action</h4>
                        <p className="text-[10px] text-ink-500">Main button in hero and header</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, ctaEnabled: !formData.ctaEnabled })}
                        className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                          formData.ctaEnabled ? "bg-brand-500 justify-end" : "bg-warm-300 justify-start"
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                      </button>
                    </div>

                    {formData.ctaEnabled && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line/60">
                        <div>
                          <label className="block font-semibold text-ink-900 mb-1">
                            Button Label
                          </label>
                          <input
                            type="text"
                            placeholder="Share Your Praise"
                            value={formData.ctaLabel}
                            onChange={(e) => setFormData({ ...formData, ctaLabel: e.target.value })}
                            className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:outline-none focus:border-brand-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-ink-900 mb-1">
                            Destination URL
                          </label>
                          <input
                            type="text"
                            placeholder="https://..."
                            value={formData.ctaUrl}
                            onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                            className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:outline-none focus:border-brand-500 bg-white font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Secondary CTA */}
                  <div className="p-3.5 rounded-xl border border-line bg-warm-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-ink-900">Secondary Call to Action</h4>
                        <p className="text-[10px] text-ink-500">Optional auxiliary button in hero</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, ctaSecondaryEnabled: !formData.ctaSecondaryEnabled })}
                        className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 ${
                          formData.ctaSecondaryEnabled ? "bg-brand-500 justify-end" : "bg-warm-300 justify-start"
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                      </button>
                    </div>

                    {formData.ctaSecondaryEnabled && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line/60">
                        <div>
                          <label className="block font-semibold text-ink-900 mb-1">
                            Button Label
                          </label>
                          <input
                            type="text"
                            placeholder="Try Product Free"
                            value={formData.ctaSecondaryLabel}
                            onChange={(e) => setFormData({ ...formData, ctaSecondaryLabel: e.target.value })}
                            className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:outline-none focus:border-brand-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-ink-900 mb-1">
                            Destination URL
                          </label>
                          <input
                            type="text"
                            placeholder="https://yoursite.com/signup"
                            value={formData.ctaSecondaryUrl}
                            onChange={(e) => setFormData({ ...formData, ctaSecondaryUrl: e.target.value })}
                            className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:outline-none focus:border-brand-500 bg-white font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-line flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving Wall...</span>
                    </>
                  ) : (
                    <>
                      <span>{editingWallId ? "Save Changes" : "Create Wall of Love"}</span>
                      <Check size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
