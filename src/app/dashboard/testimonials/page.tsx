"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowUpDown,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MessageSquareQuote,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
  Tag as TagIcon,
  Trash2,
  Upload,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { TestimonialMedia } from "@/components/ui/testimonial-media";
import { ExportModal } from "@/components/dashboard/export-modal";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";

type FilterTab = "all" | "pending" | "approved" | "rejected" | "archived";
type ViewMode = "inbox" | "cards";

export type TagItem = {
  id: string;
  name: string;
  color?: string | null;
  createdAt?: string;
  testimonialCount?: number;
};

export type ProjectOption = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
};

export type TestimonialItem = {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  formId?: string | null;
  content: string;
  rating: number;
  type: "TEXT" | "VIDEO" | "AUDIO";
  status: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
  isFeatured: boolean;
  submittedAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
    title?: string | null;
    avatarUrl?: string | null;
    socialHandle?: string | null;
  } | null;
  form?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  project?: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
  } | null;
  consentRecord?: {
    id: string;
    customerName: string;
    customerEmail: string;
    consentText: string;
    grantedAt: string;
    ipAddress?: string | null;
  } | null;
  mediaAssets?: {
    id: string;
    url: string;
    type: "IMAGE" | "VIDEO" | "AUDIO";
    mimeType: string;
    fileSizeBytes?: number | null;
    durationSeconds?: number | null;
    posterUrl?: string | null;
  }[];
  tags?: {
    testimonialId: string;
    tagId: string;
    tag: TagItem;
  }[];
};

const PRESET_TAG_COLORS = [
  "#7049D8", // Praise Purple
  "#10B981", // Emerald
  "#0EA5E9", // Sky
  "#F59E0B", // Amber
  "#F43F5E", // Rose
  "#8B5CF6", // Violet
  "#64748B", // Slate
];

function TestimonialsContent() {
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial states from URL params to preserve filters on reload/navigation
  const activeTab = (searchParams.get("status") as FilterTab) || "pending";
  const search = searchParams.get("search") || "";
  const ratingFilter = searchParams.get("rating") || "all";
  const projectFilter = searchParams.get("projectId") || "all";
  const formatFilter = searchParams.get("type") || "all";
  const tagFilter = searchParams.get("tagId") || "all";
  const dateRangeFilter = searchParams.get("dateRange") || "all";
  const sortBy = searchParams.get("sortBy") || "submittedAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const [viewMode, setViewMode] = useState<ViewMode>("inbox");
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    pending: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
    all: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Available filter options
  const [workspaceTags, setWorkspaceTags] = useState<TagItem[]>([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<ProjectOption[]>([]);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<
    "APPROVE" | "REJECT" | "ARCHIVE" | "RESTORE" | "DELETE" | null
  >(null);

  // Inspection modal state
  const [selectedTestimonial, setSelectedTestimonial] = useState<TestimonialItem | null>(null);

  // Single deletion confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Tag management modal state
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#7049D8");
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [tagActionLoading, setTagActionLoading] = useState(false);

  // Export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Single item action in-progress
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const toast = useToast();
  const workspaceId = activeWorkspace?.id;

  // Helper to update URL params cleanly without resetting other filter states
  const updateQueryParam = useCallback(
    (paramsToUpdate: Record<string, string | number | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      Object.entries(paramsToUpdate).forEach(([key, val]) => {
        if (val === null || val === "" || val === "all") {
          current.delete(key);
        } else {
          current.set(key, String(val));
        }
      });
      // Always reset to page 1 unless page itself was updated
      if (!("page" in paramsToUpdate)) {
        current.delete("page");
      }
      setSelectedIds([]);
      router.replace(`${pathname}?${current.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // Load tags and projects for workspace filter dropdowns
  const fetchFilterOptions = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const [tagsRes, projRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/tags`),
        fetch(`/api/workspaces/${workspaceId}/projects`),
      ]);
      if (tagsRes.ok) {
        const json = await tagsRes.json();
        setWorkspaceTags(json.tags || []);
      }
      if (projRes.ok) {
        const json = await projRes.json();
        setWorkspaceProjects(json.projects || []);
      }
    } catch (err) {
      console.error("Failed to load tags or projects:", err);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function loadOptions() {
      try {
        const [tagsRes, projRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/tags`),
          fetch(`/api/workspaces/${workspaceId}/projects`),
        ]);
        if (tagsRes.ok && isMounted) {
          const json = await tagsRes.json();
          setWorkspaceTags(json.tags || []);
        }
        if (projRes.ok && isMounted) {
          const json = await projRes.json();
          setWorkspaceProjects(json.projects || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load tags or projects:", err);
        }
      }
    }

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  // Main fetch for testimonials with all filters, search, sorting, and pagination
  const fetchTestimonials = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.append("status", activeTab);
      if (formatFilter !== "all") params.append("type", formatFilter);
      if (ratingFilter !== "all") params.append("rating", ratingFilter);
      if (projectFilter !== "all") params.append("projectId", projectFilter);
      if (tagFilter !== "all") params.append("tagId", tagFilter);
      if (dateRangeFilter !== "all") params.append("dateRange", dateRangeFilter);
      if (sortBy) params.append("sortBy", sortBy);
      if (sortOrder) params.append("sortOrder", sortOrder);
      if (page) params.append("page", String(page));
      params.append("limit", "25");
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        setTestimonials(data.testimonials || []);
        if (data.counts) setCounts(data.counts);
        if (data.pagination) setPagination(data.pagination);

        // Keep selectedTestimonial in sync if open
        setSelectedTestimonial((curr) => {
          if (!curr) return null;
          return (
            (data.testimonials || []).find((t: TestimonialItem) => t.id === curr.id) ||
            curr
          );
        });
      }
    } catch (err) {
      console.error("Failed to load testimonials:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    workspaceId,
    activeTab,
    formatFilter,
    ratingFilter,
    projectFilter,
    tagFilter,
    dateRangeFilter,
    sortBy,
    sortOrder,
    page,
    search,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTestimonials();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchTestimonials]);

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleUpdateStatus = async (
    testimonialId: string,
    newStatus: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED",
  ) => {
    if (!workspaceId) return;
    setActionInProgress(testimonialId);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${testimonialId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (res.ok) {
        toast.success(
          newStatus === "APPROVED"
            ? "Testimonial Approved"
            : newStatus === "REJECTED"
              ? "Testimonial Rejected"
              : newStatus === "ARCHIVED"
                ? "Testimonial Archived"
                : "Restored to Pending",
          `Testimonial moved to ${newStatus.toLowerCase()}.`,
        );

        setTestimonials((prev) =>
          prev.map((t) => (t.id === testimonialId ? { ...t, status: newStatus } : t)),
        );
        if (selectedTestimonial?.id === testimonialId) {
          setSelectedTestimonial((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        fetchTestimonials();
      } else {
        toast.error("Action Failed", "Could not update status. Please try again.");
      }
    } catch {
      toast.error("Network Error", "Unable to update testimonial status.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!workspaceId || !deletingId) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${deletingId}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        toast.success("Testimonial Deleted", "Record permanently removed.");
        if (selectedTestimonial?.id === deletingId) {
          setSelectedTestimonial(null);
        }
        setDeletingId(null);
        setSelectedIds((prev) => prev.filter((id) => id !== deletingId));
        fetchTestimonials();
      } else {
        toast.error("Failed to Delete", "Please try again.");
      }
    } catch {
      toast.error("Network Error", "Unable to delete testimonial.");
    }
  };

  const handleDeleteMedia = async (assetId: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/media/${assetId}`,
        { method: "DELETE" },
      );

      if (res.ok) {
        toast.success("Media Asset Deleted", "Attachment removed permanently.");
        fetchTestimonials();
      } else {
        toast.error("Failed to Delete Media", "Please try again.");
      }
    } catch {
      toast.error("Network Error", "Unable to delete media asset.");
    }
  };

  // Toggle tag on a testimonial
  const handleToggleTag = async (testimonial: TestimonialItem, tagId: string) => {
    if (!workspaceId) return;
    const currentTagIds = (testimonial.tags || []).map((t) => t.tagId);
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId];

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${testimonial.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds: newTagIds }),
        },
      );

      if (res.ok) {
        const json = await res.json();
        if (json.testimonial) {
          setTestimonials((prev) =>
            prev.map((t) => (t.id === testimonial.id ? json.testimonial : t)),
          );
          if (selectedTestimonial?.id === testimonial.id) {
            setSelectedTestimonial(json.testimonial);
          }
        }
        fetchFilterOptions();
      } else {
        toast.error("Tag Update Failed", "Unable to update tags.");
      }
    } catch {
      toast.error("Network Error", "Unable to update tag association.");
    }
  };

  // ---------------------------------------------------------------------------
  // Bulk Actions
  // ---------------------------------------------------------------------------

  const handleSelectAll = () => {
    if (selectedIds.length === testimonials.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(testimonials.map((t) => t.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const executeBulkAction = async (
    action: "APPROVE" | "REJECT" | "ARCHIVE" | "RESTORE" | "DELETE",
    restoreTo: "APPROVED" | "PENDING" = "APPROVED",
  ) => {
    if (!workspaceId || selectedIds.length === 0) return;
    setIsBulkExecuting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          testimonialIds: selectedIds,
          restoreTo,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Bulk Action Completed", data.message || `Processed ${selectedIds.length} testimonials.`);
        setSelectedIds([]);
        setBulkConfirmAction(null);
        fetchTestimonials();
      } else {
        toast.error("Bulk Action Failed", "Please try again.");
      }
    } catch {
      toast.error("Network Error", "Unable to complete bulk moderation.");
    } finally {
      setIsBulkExecuting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Tag Creation & Management
  // ---------------------------------------------------------------------------

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !newTagName.trim()) return;
    setTagActionLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        toast.success("Tag Created", `Tag "${json.tag.name}" is ready to use.`);
        setNewTagName("");
        fetchFilterOptions();
      } else {
        const err = await res.json();
        toast.error("Failed to Create Tag", err.error || "Please try again.");
      }
    } catch {
      toast.error("Network Error", "Unable to create tag.");
    } finally {
      setTagActionLoading(false);
    }
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !editingTag || !editingTag.name.trim()) return;
    setTagActionLoading(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/tags/${editingTag.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editingTag.name.trim(),
            color: editingTag.color,
          }),
        },
      );

      if (res.ok) {
        toast.success("Tag Updated", "Tag saved successfully.");
        setEditingTag(null);
        fetchFilterOptions();
        fetchTestimonials();
      } else {
        toast.error("Failed to Update Tag", "Please try again.");
      }
    } catch {
      toast.error("Network Error", "Unable to update tag.");
    } finally {
      setTagActionLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tags/${tagId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Tag Removed", "Tag was deleted from the workspace.");
        if (tagFilter === tagId) {
          updateQueryParam({ tagId: null });
        }
        fetchFilterOptions();
        fetchTestimonials();
      } else {
        toast.error("Failed to Delete Tag", "Please try again.");
      }
    } catch {
      toast.error("Network Error", "Unable to remove tag.");
    }
  };

  // Check if any non-status filter is active
  const hasActiveFilters = Boolean(
    search.trim() ||
      ratingFilter !== "all" ||
      projectFilter !== "all" ||
      tagFilter !== "all" ||
      dateRangeFilter !== "all" ||
      formatFilter !== "all",
  );

  const clearAllFilters = () => {
    updateQueryParam({
      search: null,
      rating: null,
      projectId: null,
      tagId: null,
      dateRange: null,
      type: null,
      page: null,
    });
  };

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "pending", label: "Pending Moderation", count: counts.pending || 0 },
    { id: "approved", label: "Approved", count: counts.approved || 0 },
    { id: "rejected", label: "Rejected", count: counts.rejected || 0 },
    { id: "archived", label: "Archived", count: counts.archived || 0 },
    { id: "all", label: "All Testimonials", count: counts.all || 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testimonial Management"
        description="Approve, reject, organize, tag, and moderate customer testimonials across your entire workspace."
        badge={
          counts.pending > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              {counts.pending} awaiting moderation
            </span>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/testimonials/import"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
            >
              <Upload size={13} className="text-brand-600" />
              <span>Import</span>
            </Link>
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
            >
              <Download size={13} className="text-brand-600" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={() => setIsTagManagerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
            >
              <TagIcon size={13} className="text-brand-600" />
              <span>Manage Tags ({workspaceTags.length})</span>
            </button>
            <button
              type="button"
              onClick={fetchTestimonials}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
              title="Refresh queue"
            >
              <RefreshCw size={13} className="text-ink-500" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/dashboard/forms"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
            >
              <Plus size={14} />
              <span>Share Form</span>
            </Link>
          </div>
        }
      />

      {/* ------------------------------------------------------------- */}
      {/* 1. Status Filter Tabs */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-line pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => updateQueryParam({ status: tab.id })}
              className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "border-brand-500 text-brand-600 font-semibold"
                  : "border-transparent text-ink-500 hover:border-line hover:text-ink-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[10px] ${
                  isActive
                    ? "bg-brand-50 text-brand-700 font-bold"
                    : "bg-warm-100 text-ink-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Comprehensive Filter, Search & Sort Toolbar */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs space-y-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search text + customer */}
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-2.5 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => updateQueryParam({ search: e.target.value })}
              placeholder="Search quote text, author, email, company..."
              className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Filter by Project */}
          <select
            value={projectFilter}
            onChange={(e) => updateQueryParam({ projectId: e.target.value })}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {workspaceProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Filter by Rating */}
          <select
            value={ratingFilter}
            onChange={(e) => updateQueryParam({ rating: e.target.value })}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Star Ratings</option>
            <option value="5">★★★★★ 5 Stars Only</option>
            <option value="4">★★★★☆ 4 Stars Only</option>
            <option value="3">★★★☆☆ 3 Stars Only</option>
            <option value="2">★★☆☆☆ 2 Stars Only</option>
            <option value="1">★☆☆☆☆ 1 Star Only</option>
          </select>

          {/* Filter by Tag */}
          <select
            value={tagFilter}
            onChange={(e) => updateQueryParam({ tagId: e.target.value })}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Tags</option>
            {workspaceTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                🏷️ {tag.name} ({tag.testimonialCount ?? 0})
              </option>
            ))}
          </select>
        </div>

        {/* Second Row: Date Filter + Sort By + View Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-ink-600">
              <Calendar size={13} className="text-ink-400" />
              <select
                value={dateRangeFilter}
                onChange={(e) => updateQueryParam({ dateRange: e.target.value })}
                className="rounded-lg border border-line bg-white px-2 py-1 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 text-ink-600">
              <ArrowUpDown size={13} className="text-ink-400" />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [by, ord] = e.target.value.split("-");
                  updateQueryParam({ sortBy: by, sortOrder: ord });
                }}
                className="rounded-lg border border-line bg-white px-2 py-1 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
              >
                <option value="submittedAt-desc">Newest Submissions First</option>
                <option value="submittedAt-asc">Oldest Submissions First</option>
                <option value="rating-desc">Highest Rating First</option>
                <option value="rating-asc">Lowest Rating First</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 rounded-md bg-warm-100 px-2.5 py-1 text-xs font-medium text-ink-600 hover:bg-warm-200 transition-colors"
              >
                <RotateCcw size={11} />
                <span>Reset filters</span>
              </button>
            )}
          </div>

          {/* View mode toggle & Results count */}
          <div className="flex items-center gap-3">
            <span className="text-ink-500 text-[11px]">
              Showing <strong className="text-ink-900">{testimonials.length}</strong> of{" "}
              <strong className="text-ink-900">{pagination.total}</strong> items
            </span>

            <div className="flex items-center rounded-lg border border-line bg-warm-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("inbox")}
                className={`rounded-md p-1.5 text-xs transition-colors ${
                  viewMode === "inbox"
                    ? "bg-white text-ink-900 shadow-2xs font-semibold"
                    : "text-ink-500 hover:text-ink-800"
                }`}
                title="Table Inbox Layout"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`rounded-md p-1.5 text-xs transition-colors ${
                  viewMode === "cards"
                    ? "bg-white text-ink-900 shadow-2xs font-semibold"
                    : "text-ink-500 hover:text-ink-800"
                }`}
                title="Card Grid Layout"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Floating Bulk Moderation Bar (When >= 1 item selected) */}
      {/* ------------------------------------------------------------- */}
      {selectedIds.length > 0 && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/90 p-3 shadow-sm flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white text-[11px] font-bold">
              {selectedIds.length}
            </span>
            <span>testimonials selected for bulk action</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {activeTab !== "approved" && (
              <button
                type="button"
                disabled={isBulkExecuting}
                onClick={() => executeBulkAction("APPROVE")}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs disabled:opacity-50"
              >
                <Check size={12} />
                <span>Bulk Approve</span>
              </button>
            )}

            {activeTab !== "rejected" && (
              <button
                type="button"
                disabled={isBulkExecuting}
                onClick={() => executeBulkAction("REJECT")}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1 font-semibold text-rose-700 hover:bg-rose-50 transition-colors shadow-2xs disabled:opacity-50"
              >
                <X size={12} />
                <span>Bulk Reject</span>
              </button>
            )}

            {activeTab !== "archived" && (
              <button
                type="button"
                disabled={isBulkExecuting}
                onClick={() => executeBulkAction("ARCHIVE")}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1 font-medium text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs disabled:opacity-50"
              >
                <Archive size={12} />
                <span>Bulk Archive</span>
              </button>
            )}

            {activeTab === "archived" && (
              <button
                type="button"
                disabled={isBulkExecuting}
                onClick={() => executeBulkAction("RESTORE", "APPROVED")}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs disabled:opacity-50"
              >
                <RotateCcw size={12} />
                <span>Restore to Approved</span>
              </button>
            )}

            <button
              type="button"
              disabled={isBulkExecuting}
              onClick={() => setBulkConfirmAction("DELETE")}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1 font-medium text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs disabled:opacity-50"
            >
              <Trash2 size={12} />
              <span>Bulk Delete</span>
            </button>

            <button
              type="button"
              disabled={isBulkExecuting}
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1 font-medium text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs disabled:opacity-50"
            >
              <Download size={12} className="text-brand-600" />
              <span>Export Selected ({selectedIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[11px] text-brand-700 hover:underline px-2"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. Main List: Inbox Table or Cards View */}
      {/* ------------------------------------------------------------- */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-14 text-center">
          <Loader2 size={24} className="animate-spin text-brand-500 mx-auto" />
          <p className="text-xs text-ink-500 mt-2">Loading testimonials...</p>
        </div>
      ) : testimonials.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-8 shadow-xs">
          <EmptyState
            icon={MessageSquareQuote}
            title={
              hasActiveFilters
                ? "No matching testimonials found"
                : `No ${activeTab} testimonials`
            }
            description={
              hasActiveFilters
                ? "Try clearing your search query or adjusting your filters to see more results."
                : activeTab === "pending"
                  ? "Your moderation queue is clear. New customer submissions will appear here for review."
                  : `There are currently no testimonials in status "${activeTab}".`
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
                >
                  <RotateCcw size={13} />
                  <span>Clear active filters</span>
                </button>
              ) : (
                <Link
                  href="/dashboard/forms"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
                >
                  <Plus size={14} />
                  <span>Create or Share Form</span>
                </Link>
              )
            }
          />
        </div>
      ) : viewMode === "inbox" ? (
        /* TABLE INBOX VIEW */
        <div className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-warm-50/70 text-ink-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        testimonials.length > 0 &&
                        selectedIds.length === testimonials.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-line text-brand-500 focus:ring-brand-500"
                      aria-label="Select all testimonials on this page"
                    />
                  </th>
                  <th className="py-3 px-3 font-semibold">Respondent</th>
                  <th className="py-3 px-3 font-semibold">Testimonial Preview</th>
                  <th className="py-3 px-3 font-semibold">Rating</th>
                  <th className="py-3 px-3 font-semibold">Media</th>
                  <th className="py-3 px-3 font-semibold">Tags</th>
                  <th className="py-3 px-3 font-semibold">Project &amp; Source</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {testimonials.map((item) => {
                  const customer = item.customer;
                  const isPending = item.status === "PENDING";
                  const isApproved = item.status === "APPROVED";
                  const isRejected = item.status === "REJECTED";
                  const isArchived = item.status === "ARCHIVED";
                  const isBusy = actionInProgress === item.id;
                  const hasMedia = Boolean(item.mediaAssets && item.mediaAssets.length > 0);
                  const isVideo = Boolean(hasMedia && item.mediaAssets?.some((m) => m.type === "VIDEO"));
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedTestimonial(item)}
                      className={`hover:bg-warm-50/70 cursor-pointer transition-colors group ${
                        isSelected ? "bg-brand-50/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectOne(item.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-line text-brand-500 focus:ring-brand-500"
                          aria-label={`Select testimonial by ${customer?.name || "respondent"}`}
                        />
                      </td>

                      {/* Author */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {customer?.avatarUrl ? (
                            <div className="h-7 w-7 rounded-full overflow-hidden border border-line shrink-0 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={customer.avatarUrl}
                                alt={customer.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                              {customer?.name ? customer.name.slice(0, 2) : "AN"}
                            </div>
                          )}
                          <div className="min-w-0 max-w-[140px]">
                            <div className="font-semibold text-ink-900 truncate">
                              {customer?.name || "Anonymous"}
                            </div>
                            <div className="text-[11px] text-ink-400 truncate">
                              {customer?.company || customer?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Content Preview */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="text-ink-700 line-clamp-1 italic group-hover:text-ink-900">
                          &ldquo;{item.content}&rdquo;
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.rating ? (
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={11}
                                className={
                                  s <= item.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-ink-200 fill-transparent"
                                }
                              />
                            ))}
                            <span className="text-[11px] font-semibold text-ink-700 ml-1">
                              {item.rating}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-400 italic">Unrated</span>
                        )}
                      </td>

                      {/* Media */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {hasMedia ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                            <Video size={10} />
                            <span>{isVideo ? "Video" : "Image"}</span>
                          </span>
                        ) : (
                          <span className="text-ink-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Tags */}
                      <td
                        className="py-3 px-3 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-wrap items-center gap-1 max-w-[160px]">
                          {item.tags && item.tags.length > 0 ? (
                            item.tags.map(({ tag }) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[10px] font-medium border"
                                style={{
                                  backgroundColor: `${tag.color || "#7049D8"}15`,
                                  borderColor: `${tag.color || "#7049D8"}40`,
                                  color: tag.color || "#7049D8",
                                }}
                              >
                                <span>{tag.name}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-ink-300 text-[11px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Project & Source */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {item.project && (
                            <div className="flex items-center gap-1 text-[11px] text-ink-700 font-medium truncate max-w-[120px]">
                              <span
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: item.project.color || "#7049D8",
                                }}
                              />
                              <span className="truncate">{item.project.name}</span>
                            </div>
                          )}
                          {item.form && (
                            <div className="flex items-center gap-1 text-[10px] text-ink-400 truncate max-w-[120px]">
                              <FileText size={10} className="shrink-0" />
                              <span className="truncate">{item.form.title}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            isPending
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : isApproved
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isRejected
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-warm-100 text-ink-600 border-line"
                          }`}
                        >
                          {isPending && <Clock size={10} />}
                          {isApproved && <CheckCircle2 size={10} />}
                          {isRejected && <XCircle size={10} />}
                          {isArchived && <Archive size={10} />}
                          <span>{item.status}</span>
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 whitespace-nowrap text-ink-500 text-[11px]">
                        {new Date(item.submittedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleUpdateStatus(item.id, "APPROVED")}
                                title="Approve Testimonial"
                                className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                              >
                                {isBusy ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Check size={13} />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleUpdateStatus(item.id, "REJECTED")}
                                title="Reject Testimonial"
                                className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-50"
                              >
                                <X size={13} />
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateStatus(item.id, "ARCHIVED")}
                              title="Archive Testimonial"
                              className="rounded-md p-1.5 text-ink-500 hover:bg-warm-100 hover:text-ink-800 transition-colors"
                            >
                              <Archive size={13} />
                            </button>
                          )}

                          {(isRejected || isArchived) && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleUpdateStatus(item.id, "APPROVED")}
                              title="Restore to Approved"
                              className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedTestimonial(item)}
                            title="Inspect Testimonial Details"
                            className="rounded-md p-1.5 text-ink-500 hover:bg-warm-100 hover:text-ink-800 transition-colors"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingId(item.id)}
                            title="Delete"
                            className="rounded-md p-1.5 text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS GRID VIEW */
        <div className="grid gap-4">
          {testimonials.map((item) => {
            const customer = item.customer;
            const consent = item.consentRecord;
            const isPending = item.status === "PENDING";
            const isApproved = item.status === "APPROVED";
            const isRejected = item.status === "REJECTED";
            const isArchived = item.status === "ARCHIVED";
            const isBusy = actionInProgress === item.id;
            const isSelected = selectedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className={`rounded-2xl border border-line bg-white p-5 shadow-xs hover:border-line-dark transition-colors space-y-3.5 ${
                  isSelected ? "border-brand-400 ring-1 ring-brand-300" : ""
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(item.id)}
                      className="rounded border-line text-brand-500 focus:ring-brand-500"
                    />

                    {customer?.avatarUrl ? (
                      <div className="h-9 w-9 rounded-full overflow-hidden border border-line shrink-0 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={customer.avatarUrl}
                          alt={customer.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {customer?.name ? customer.name.slice(0, 2) : "AN"}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-900 text-xs">
                          {customer?.name || "Anonymous Respondent"}
                        </span>
                        {customer?.company && (
                          <span className="text-[11px] text-ink-500">
                            &bull; {customer.company}
                          </span>
                        )}
                        {customer?.title && (
                          <span className="text-[11px] text-ink-400">
                            ({customer.title})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-400">
                        {customer?.email}
                      </div>
                    </div>
                  </div>

                  {/* Rating + Status */}
                  <div className="flex items-center gap-3">
                    {item.rating ? (
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            className={
                              s <= item.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-ink-200 fill-transparent"
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-400 italic">Unrated</span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        isPending
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : isApproved
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isRejected
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-warm-100 text-ink-600 border-line"
                      }`}
                    >
                      {isPending && <Clock size={10} />}
                      {isApproved && <CheckCircle2 size={10} />}
                      {isRejected && <XCircle size={10} />}
                      {isArchived && <Archive size={10} />}
                      <span>{item.status}</span>
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="rounded-xl bg-warm-50/60 p-3.5 border border-line/60 text-xs text-ink-800 leading-relaxed whitespace-pre-line">
                  {item.content}
                </div>

                {/* Tags row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {item.tags &&
                    item.tags.map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border"
                        style={{
                          backgroundColor: `${tag.color || "#7049D8"}15`,
                          borderColor: `${tag.color || "#7049D8"}40`,
                          color: tag.color || "#7049D8",
                        }}
                      >
                        <span>{tag.name}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleTag(item, tag.id)}
                          className="hover:opacity-75"
                          title="Remove tag"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}

                  {/* Tag adder button */}
                  {workspaceTags.length > 0 && (
                    <div className="relative group inline-block">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-0.5 text-[10px] font-medium text-ink-600 hover:bg-warm-100"
                      >
                        <Plus size={10} />
                        <span>Tag</span>
                      </button>
                      <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-white border border-line rounded-lg shadow-lg p-1.5 z-20 min-w-[140px] space-y-0.5">
                        {workspaceTags.map((tag) => {
                          const isAssigned = (item.tags || []).some((t) => t.tagId === tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleToggleTag(item, tag.id)}
                              className="w-full flex items-center justify-between px-2 py-1 text-[11px] rounded hover:bg-warm-50 text-left"
                            >
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: tag.color || "#7049D8" }}
                                />
                                <span>{tag.name}</span>
                              </span>
                              {isAssigned && <Check size={11} className="text-emerald-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Playback */}
                {item.mediaAssets && item.mediaAssets.length > 0 && (
                  <div className="space-y-3 pt-1">
                    {item.mediaAssets.map((media) => (
                      <TestimonialMedia
                        key={media.id}
                        media={media}
                        canDelete={true}
                        canDownload={true}
                        onDelete={handleDeleteMedia}
                      />
                    ))}
                  </div>
                )}

                {/* Footer metadata & Moderation Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-line/50 text-[11px] text-ink-500">
                  <div className="flex flex-wrap items-center gap-3">
                    {item.form && (
                      <Link
                        href={`/p/${item.form.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-ink-600 hover:text-brand-600 transition-colors"
                      >
                        <ExternalLink size={11} />
                        <span>Form: {item.form.title}</span>
                      </Link>
                    )}

                    {item.project && (
                      <span className="inline-flex items-center gap-1 text-ink-600">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: item.project.color || "#7049D8",
                          }}
                        />
                        <span>Project: {item.project.name}</span>
                      </span>
                    )}

                    {consent && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] font-medium">
                        <ShieldCheck size={11} />
                        <span>Consent Captured</span>
                      </span>
                    )}

                    <span className="text-ink-400">
                      {new Date(item.submittedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedTestimonial(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
                    >
                      <Eye size={12} />
                      <span>Details</span>
                    </button>

                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleUpdateStatus(item.id, "APPROVED")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs disabled:opacity-50"
                        >
                          <Check size={12} />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleUpdateStatus(item.id, "REJECTED")}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
                        >
                          <X size={12} />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(item.id, "ARCHIVED")}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-xs font-medium text-ink-600 hover:bg-warm-100 transition-colors"
                      >
                        <Archive size={12} />
                        <span>Archive</span>
                      </button>
                    )}

                    {(isRejected || isArchived) && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(item.id, "APPROVED")}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <RotateCcw size={12} />
                        <span>Restore to Approved</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDeletingId(item.id)}
                      className="rounded-lg border border-line bg-white p-1 text-ink-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete permanently"
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

      {/* ------------------------------------------------------------- */}
      {/* 5. Pagination Bar */}
      {/* ------------------------------------------------------------- */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-ink-600">
          <div>
            Showing Page <strong className="text-ink-900">{pagination.page}</strong> of{" "}
            <strong className="text-ink-900">{pagination.totalPages}</strong> (
            {pagination.total} total results)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => updateQueryParam({ page: pagination.page - 1 })}
              className="rounded-lg border border-line bg-white px-3 py-1.5 font-medium hover:bg-warm-100 disabled:opacity-50 transition-colors"
            >
              &larr; Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateQueryParam({ page: pagination.page + 1 })}
              className="rounded-lg border border-line bg-white px-3 py-1.5 font-medium hover:bg-warm-100 disabled:opacity-50 transition-colors"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. Detailed Testimonial Inspection Modal */}
      {/* ------------------------------------------------------------- */}
      {selectedTestimonial && (
        <ModalDialog
          isOpen={Boolean(selectedTestimonial)}
          onClose={() => setSelectedTestimonial(null)}
          title="Testimonial Details"
          description={`Submitted on ${new Date(
            selectedTestimonial.submittedAt,
          ).toLocaleString()}`}
          maxWidth="3xl"
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <button
                type="button"
                onClick={() => setDeletingId(selectedTestimonial.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 size={13} />
                <span>Delete Permanently</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedTestimonial.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      disabled={actionInProgress === selectedTestimonial.id}
                      onClick={() =>
                        handleUpdateStatus(selectedTestimonial.id, "REJECTED")
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      <X size={13} />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionInProgress === selectedTestimonial.id}
                      onClick={() =>
                        handleUpdateStatus(selectedTestimonial.id, "APPROVED")
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                    >
                      <Check size={13} />
                      <span>Approve Testimonial</span>
                    </button>
                  </>
                )}

                {selectedTestimonial.status === "APPROVED" && (
                  <>
                    <Link
                      href={`/t/${selectedTestimonial.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
                      title="Open dedicated public testimonial page"
                    >
                      <ExternalLink size={13} />
                      <span>Public Link</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(selectedTestimonial.id, "ARCHIVED")
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
                    >
                      <Archive size={13} />
                      <span>Archive</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(selectedTestimonial.id, "PENDING")
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <Clock size={13} />
                      <span>Move to Pending</span>
                    </button>
                  </>
                )}

                {(selectedTestimonial.status === "REJECTED" ||
                  selectedTestimonial.status === "ARCHIVED") && (
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateStatus(selectedTestimonial.id, "APPROVED")
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                  >
                    <RotateCcw size={13} />
                    <span>Restore to Approved</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedTestimonial(null)}
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Customer Profile Header */}
            <div className="rounded-xl border border-line bg-warm-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {selectedTestimonial.customer?.avatarUrl ? (
                  <div className="h-12 w-12 rounded-full overflow-hidden border border-line shrink-0 bg-white shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedTestimonial.customer.avatarUrl}
                      alt={selectedTestimonial.customer.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-sm uppercase shrink-0 shadow-2xs">
                    {selectedTestimonial.customer?.name
                      ? selectedTestimonial.customer.name.slice(0, 2)
                      : "CU"}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-sm text-ink-900">
                    {selectedTestimonial.customer?.name || "Anonymous Respondent"}
                  </h4>
                  <div className="text-xs text-ink-500 flex flex-wrap items-center gap-2 mt-0.5">
                    {selectedTestimonial.customer?.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={11} className="text-ink-400" />
                        <span>{selectedTestimonial.customer.email}</span>
                      </span>
                    )}
                    {selectedTestimonial.customer?.company && (
                      <span className="flex items-center gap-1">
                        <Building2 size={11} className="text-ink-400" />
                        <span>{selectedTestimonial.customer.company}</span>
                      </span>
                    )}
                    {selectedTestimonial.customer?.title && (
                      <span className="text-ink-400">
                        ({selectedTestimonial.customer.title})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and Rating */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                {selectedTestimonial.rating ? (
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={15}
                          className={
                            s <= selectedTestimonial.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-ink-200 fill-transparent"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-ink-800 ml-1">
                      {selectedTestimonial.rating}.0
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-ink-400 italic">No rating given</span>
                )}

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                    selectedTestimonial.status === "PENDING"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : selectedTestimonial.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedTestimonial.status === "REJECTED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-warm-100 text-ink-600 border-line"
                  }`}
                >
                  {selectedTestimonial.status === "PENDING" && <Clock size={11} />}
                  {selectedTestimonial.status === "APPROVED" && <CheckCircle2 size={11} />}
                  {selectedTestimonial.status === "REJECTED" && <XCircle size={11} />}
                  {selectedTestimonial.status === "ARCHIVED" && <Archive size={11} />}
                  <span>{selectedTestimonial.status}</span>
                </span>

                {selectedTestimonial.status === "APPROVED" && (
                  <Link
                    href={`/t/${selectedTestimonial.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors shadow-2xs"
                    title="Open dedicated public testimonial page"
                  >
                    <ExternalLink size={11} />
                    <span>Public Page</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Tags on this testimonial */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                  Tags &amp; Categories
                </label>
                <button
                  type="button"
                  onClick={() => setIsTagManagerOpen(true)}
                  className="text-[11px] text-brand-600 hover:underline"
                >
                  Configure Tags
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {selectedTestimonial.tags && selectedTestimonial.tags.length > 0 ? (
                  selectedTestimonial.tags.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border"
                      style={{
                        backgroundColor: `${tag.color || "#7049D8"}15`,
                        borderColor: `${tag.color || "#7049D8"}40`,
                        color: tag.color || "#7049D8",
                      }}
                    >
                      <span>{tag.name}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleTag(selectedTestimonial, tag.id)}
                        className="hover:opacity-75"
                        title="Remove tag from this review"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-ink-400 italic">No tags assigned.</span>
                )}

                {/* Add Tag Dropdown */}
                {workspaceTags.length > 0 && (
                  <div className="relative group inline-block">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-0.5 text-xs font-medium text-ink-700 hover:bg-warm-100"
                    >
                      <Plus size={11} />
                      <span>Add Tag</span>
                    </button>
                    <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-white border border-line rounded-lg shadow-lg p-1.5 z-20 min-w-[150px] space-y-0.5">
                      {workspaceTags.map((tag) => {
                        const isAssigned = (selectedTestimonial.tags || []).some(
                          (t) => t.tagId === tag.id,
                        );
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleToggleTag(selectedTestimonial, tag.id)}
                            className="w-full flex items-center justify-between px-2 py-1 text-xs rounded hover:bg-warm-50 text-left"
                          >
                            <span className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: tag.color || "#7049D8" }}
                              />
                              <span>{tag.name}</span>
                            </span>
                            {isAssigned && <Check size={12} className="text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Testimonial Content */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                Full Testimonial Content
              </label>
              <div className="rounded-xl border border-line bg-white p-4 text-xs sm:text-sm text-ink-900 leading-relaxed whitespace-pre-line shadow-2xs">
                {selectedTestimonial.content}
              </div>
            </div>

            {/* Media Player */}
            {selectedTestimonial.mediaAssets &&
              selectedTestimonial.mediaAssets.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                    Attached Media Asset ({selectedTestimonial.mediaAssets.length})
                  </label>
                  <div className="space-y-3">
                    {selectedTestimonial.mediaAssets.map((media) => (
                      <TestimonialMedia
                        key={media.id}
                        media={media}
                        canDelete={true}
                        canDownload={true}
                        onDelete={handleDeleteMedia}
                      />
                    ))}
                  </div>
                </div>
              )}

            {/* Project & Form Details */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-line p-3 space-y-1 bg-warm-50/30">
                <span className="text-[11px] text-ink-400 font-medium">Source Form</span>
                {selectedTestimonial.form ? (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink-900">
                      {selectedTestimonial.form.title}
                    </span>
                    <Link
                      href={`/p/${selectedTestimonial.form.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline"
                    >
                      <span>Public Form</span>
                      <ExternalLink size={11} />
                    </Link>
                  </div>
                ) : (
                  <p className="text-ink-600 italic">Direct Submission</p>
                )}
              </div>

              <div className="rounded-xl border border-line p-3 space-y-1 bg-warm-50/30">
                <span className="text-[11px] text-ink-400 font-medium">Assigned Project</span>
                {selectedTestimonial.project ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: selectedTestimonial.project.color || "#7049D8",
                      }}
                    />
                    <span className="font-semibold text-ink-900">
                      {selectedTestimonial.project.name}
                    </span>
                  </div>
                ) : (
                  <p className="text-ink-600 italic">Workspace Default</p>
                )}
              </div>
            </div>

            {/* GDPR Consent Card */}
            {selectedTestimonial.consentRecord && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                  <ShieldCheck size={15} className="text-emerald-600" />
                  <span>Verified Marketing Consent Captured</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed italic bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                  &ldquo;{selectedTestimonial.consentRecord.consentText}&rdquo;
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-emerald-700 pt-0.5">
                  <span>
                    Granted by {selectedTestimonial.consentRecord.customerName} (
                    {selectedTestimonial.consentRecord.customerEmail})
                  </span>
                  <span>
                    {new Date(
                      selectedTestimonial.consentRecord.grantedAt,
                    ).toLocaleString()}
                    {selectedTestimonial.consentRecord.ipAddress &&
                      ` • IP: ${selectedTestimonial.consentRecord.ipAddress}`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </ModalDialog>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. Tag Management Modal Dialog */}
      {/* ------------------------------------------------------------- */}
      <ModalDialog
        isOpen={isTagManagerOpen}
        onClose={() => {
          setIsTagManagerOpen(false);
          setEditingTag(null);
        }}
        title="Workspace Tags"
        description="Organize customer proof with custom tags (e.g. Enterprise, Bug Feedback, Feature Love)."
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Create or Edit Tag Form */}
          <form
            onSubmit={editingTag ? handleUpdateTag : handleCreateTag}
            className="rounded-xl border border-line bg-warm-50/60 p-4 space-y-3 text-xs"
          >
            <div className="font-semibold text-ink-900 text-xs">
              {editingTag ? `Edit Tag "${editingTag.name}"` : "Create New Tag"}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={editingTag ? editingTag.name : newTagName}
                onChange={(e) =>
                  editingTag
                    ? setEditingTag({ ...editingTag, name: e.target.value })
                    : setNewTagName(e.target.value)
                }
                placeholder="Tag name (e.g. Enterprise, Mobile, Design)..."
                required
                className="flex-1 w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
              />

              {/* Color Presets */}
              <div className="flex items-center gap-1.5 shrink-0">
                {PRESET_TAG_COLORS.map((c) => {
                  const isCurrent = (editingTag ? editingTag.color : newTagColor) === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        editingTag
                          ? setEditingTag({ ...editingTag, color: c })
                          : setNewTagColor(c)
                      }
                      className={`h-5 w-5 rounded-full transition-transform ${
                        isCurrent ? "scale-125 ring-2 ring-brand-500 ring-offset-1" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                      title={`Select color ${c}`}
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={tagActionLoading}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {tagActionLoading ? "Saving..." : editingTag ? "Update" : "Add Tag"}
                </button>
                {editingTag && (
                  <button
                    type="button"
                    onClick={() => setEditingTag(null)}
                    className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-warm-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Existing Tags Table */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
              Workspace Tag Directory ({workspaceTags.length})
            </span>

            {workspaceTags.length === 0 ? (
              <p className="text-xs text-ink-400 italic py-2">
                No tags created yet. Use the form above to add your first tag.
              </p>
            ) : (
              <div className="rounded-xl border border-line divide-y divide-line overflow-hidden text-xs">
                {workspaceTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-2.5 hover:bg-warm-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color || "#7049D8" }}
                      />
                      <span className="font-semibold text-ink-900">{tag.name}</span>
                      <span className="text-[11px] text-ink-400">
                        ({tag.testimonialCount ?? 0} {tag.testimonialCount === 1 ? "review" : "reviews"})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingTag(tag)}
                        className="text-[11px] font-medium text-ink-600 hover:text-brand-600 px-2 py-0.5 rounded hover:bg-warm-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-[11px] font-medium text-rose-600 hover:text-rose-700 px-2 py-0.5 rounded hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ModalDialog>

      {/* ------------------------------------------------------------- */}
      {/* 8. Single Deletion Confirmation Dialog */}
      {/* ------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Testimonial"
        message="Are you sure you want to permanently delete this testimonial? This action removes the testimonial text, linked media assets, and consent records. This cannot be undone."
        confirmLabel="Delete Permanently"
        isDestructive={true}
      />

      {/* ------------------------------------------------------------- */}
      {/* 9. Bulk Deletion Confirmation Dialog */}
      {/* ------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={bulkConfirmAction === "DELETE"}
        onClose={() => setBulkConfirmAction(null)}
        onConfirm={() => executeBulkAction("DELETE")}
        title="Delete Selected Testimonials"
        message={`Are you sure you want to permanently delete ${selectedIds.length} selected testimonials? All associated files, tags, and consent logs will be removed immediately. This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} Records`}
        isDestructive={true}
      />

      {/* ------------------------------------------------------------- */}
      {/* 10. Testimonial Export Modal */}
      {/* ------------------------------------------------------------- */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedIds={selectedIds}
        currentFilters={{
          projectId: projectFilter,
          status: activeTab,
          rating: ratingFilter,
          dateRange: dateRangeFilter,
          search: search,
        }}
        totalCount={counts.all}
      />
    </div>
  );
}

export default function TestimonialsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-line bg-white p-14 text-center">
          <Loader2 size={24} className="animate-spin text-brand-500 mx-auto" />
          <p className="text-xs text-ink-500 mt-2">Loading testimonial inbox...</p>
        </div>
      }
    >
      <TestimonialsContent />
    </Suspense>
  );
}
