"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowUpDown,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Film,
  Globe,
  History,
  Languages,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MessageSquare,
  MessageSquareQuote,
  Mic,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Split,
  Star,
  Tag as TagIcon,
  Trash2,
  Upload,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { formatTimestampSrt, SubtitleSegment, buildEstimatedSegmentsFromText } from "@/lib/video/subtitles";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { TestimonialMedia } from "@/components/ui/testimonial-media";
import { ExportModal } from "@/components/dashboard/export-modal";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { parseConsentPayload } from "@/lib/privacy/format";

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
  recordingQuestionsJson?: string | null;
  sourceType?: string | null;
  sourceUrl?: string | null;
  importBatchId?: string | null;
  importSourceDetailsJson?: string | null;
  isFlaggedDuplicate?: boolean;
  duplicateOfId?: string | null;
  notes?: Array<{
    id: string;
    content: string;
    authorName?: string | null;
    authorEmail?: string | null;
    createdAt: string;
  }>;
  moderationActivities?: Array<{
    id: string;
    action: string;
    actorName?: string | null;
    details?: string | null;
    createdAt: string;
  }>;
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
  transcription?: {
    id: string;
    workspaceId: string;
    mediaAssetId: string;
    testimonialId?: string | null;
    provider: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    text?: string | null;
    rawText?: string | null;
    language?: string | null;
    confidence?: number | null;
    durationSeconds?: number | null;
    errorMessage?: string | null;
    attempts?: number;
    isEdited?: boolean;
    editedAt?: string | null;
    completedAt?: string | null;
  } | null;
  videoExportJobs?: {
    id: string;
    status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
    progress: number;
    aspectRatio: "ORIGINAL" | "RATIO_16_9" | "RATIO_9_16" | "RATIO_1_1" | "RATIO_4_5";
    resolutionProfile: "RES_720P" | "RES_1080P" | "RES_4K";
    burnSubtitles: boolean;
    subtitleFont: string;
    subtitleSize: string;
    subtitlePosition: string;
    subtitleColor: string;
    outputUrl?: string | null;
    fileSizeBytes?: number | null;
    sourceResolution?: string | null;
    errorMessage?: string | null;
    createdAt: string;
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
  const sourceFilter = searchParams.get("sourceType") || "all";
  const duplicatesFilter = searchParams.get("duplicatesOnly") === "true";
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
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [selectedBulkTagIds, setSelectedBulkTagIds] = useState<string[]>([]);
  const [isApplyingBulkTags, setIsApplyingBulkTags] = useState(false);

  // Inspection modal state & tabs
  const [selectedTestimonial, setSelectedTestimonial] = useState<TestimonialItem | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<"content" | "notes" | "history">("content");

  // Internal Notes state
  const [internalNotes, setInternalNotes] = useState<
    Array<{ id: string; content: string; authorName?: string | null; authorEmail?: string | null; createdAt: string }>
  >([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Moderation Activity History state
  const [activityHistory, setActivityHistory] = useState<
    Array<{ id: string; action: string; actorName?: string | null; details?: string | null; metadataJson?: string | null; createdAt: string }>
  >([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Duplicate Detection state
  const [itemDuplicates, setItemDuplicates] = useState<any[]>([]);
  const [isLoadingItemDuplicates, setIsLoadingItemDuplicates] = useState(false);
  const [isDuplicateScannerOpen, setIsDuplicateScannerOpen] = useState(false);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [duplicateClusters, setDuplicateClusters] = useState<any[]>([]);
  const [activeClusterForReview, setActiveClusterForReview] = useState<any | null>(null);
  const [isMergingPair, setIsMergingPair] = useState(false);
  const [mergePrimaryId, setMergePrimaryId] = useState<string>("");

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

  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [transcriptEditText, setTranscriptEditText] = useState("");
  const [transcriptEditLang, setTranscriptEditLang] = useState("");
  const [isSavingTranscript, setIsSavingTranscript] = useState(false);

  // Video Studio (Subtitles & Video Export) state
  const [studioActiveTab, setStudioActiveTab] = useState<"subtitles" | "export">("subtitles");
  const [subtitleSegments, setSubtitleSegments] = useState<SubtitleSegment[]>([]);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);
  const [isSavingSubtitles, setIsSavingSubtitles] = useState(false);
  const [exportAspectRatio, setExportAspectRatio] = useState<"ORIGINAL" | "RATIO_16_9" | "RATIO_9_16" | "RATIO_1_1" | "RATIO_4_5">("ORIGINAL");
  const [exportResolution, setExportResolution] = useState<"RES_720P" | "RES_1080P" | "RES_4K">("RES_1080P");
  const [exportBurnSubtitles, setExportBurnSubtitles] = useState(true);
  const [exportSubtitleFont, setExportSubtitleFont] = useState<"sans-serif" | "serif" | "monospace">("sans-serif");
  const [exportSubtitleSize, setExportSubtitleSize] = useState<"small" | "medium" | "large">("medium");
  const [exportSubtitlePosition, setExportSubtitlePosition] = useState<"bottom" | "middle" | "top">("bottom");
  const [exportSubtitleColor, setExportSubtitleColor] = useState("#ffffff");
  const [isStartingExport, setIsStartingExport] = useState(false);
  const [exportJobs, setExportJobs] = useState<TestimonialItem["videoExportJobs"]>([]);

  const handleOpenTestimonial = (item: TestimonialItem) => {
    setSelectedTestimonial(item);
    setDetailModalTab("content");
    setNewNoteText("");
    setIsEditingTranscript(false);
    setTranscriptEditText(item.transcription?.text || "");
    setTranscriptEditLang(item.transcription?.language || "en");
    setExportJobs(item.videoExportJobs || []);
    setStudioActiveTab("subtitles");
    if (workspaceId) {
      fetchNotes(item.id);
      fetchActivity(item.id);
      fetchItemDuplicates(item.id);
      if (item.type === "VIDEO" || item.mediaAssets?.some((m) => m.type === "VIDEO")) {
        fetchSubtitles(item.id);
        fetchExportJobs(item.id);
      }
    }
  };

  const fetchNotes = async (testimonialId: string) => {
    if (!workspaceId) return;
    setIsLoadingNotes(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/${testimonialId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setInternalNotes(data.notes || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleAddNote = async (testimonialId: string) => {
    if (!workspaceId || !newNoteText.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/${testimonialId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNoteText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Note Added", "Internal team note saved.");
        setInternalNotes((prev) => [data.note, ...prev]);
        setNewNoteText("");
        fetchActivity(testimonialId);
      } else {
        toast.error("Failed", "Could not save internal note.");
      }
    } catch {
      toast.error("Network Error", "Unable to save team note.");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (testimonialId: string, noteId: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/${testimonialId}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Note Removed", "Internal note deleted.");
        setInternalNotes((prev) => prev.filter((n) => n.id !== noteId));
        fetchActivity(testimonialId);
      }
    } catch {
      toast.error("Error", "Could not delete note.");
    }
  };

  const fetchActivity = async (testimonialId: string) => {
    if (!workspaceId) return;
    setIsLoadingActivity(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/${testimonialId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivityHistory(data.activities || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const fetchItemDuplicates = async (testimonialId: string) => {
    if (!workspaceId) return;
    setIsLoadingItemDuplicates(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/${testimonialId}/duplicates`);
      if (res.ok) {
        const data = await res.json();
        setItemDuplicates(data.matches || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingItemDuplicates(false);
    }
  };

  const handleDismissDuplicate = async (testimonialId: string, matchedId?: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/${testimonialId}/duplicates/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchedTestimonialId: matchedId }),
      });
      if (res.ok) {
        toast.success("Alert Dismissed", "Records confirmed distinct.");
        setItemDuplicates((prev) => prev.filter((m) => m.matchedTestimonialId !== matchedId));
        setDuplicateClusters((prev) => prev.filter((c) => !c.pairKey.includes(testimonialId)));
        setActiveClusterForReview(null);
        fetchTestimonials();
      }
    } catch {
      toast.error("Error", "Could not dismiss duplicate alert.");
    }
  };

  const handleMergeDuplicates = async (primaryId: string, duplicateId: string) => {
    if (!workspaceId) return;
    setIsMergingPair(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/${primaryId}/duplicates/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duplicateId,
          mergeTags: true,
          mergeNotes: true,
          actionOnDuplicate: "ARCHIVE",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Merge Successful", data.message || "Testimonials merged.");
        setItemDuplicates((prev) => prev.filter((m) => m.matchedTestimonialId !== duplicateId));
        setDuplicateClusters((prev) => prev.filter((c) => !c.pairKey.includes(duplicateId)));
        setActiveClusterForReview(null);
        if (selectedTestimonial?.id === duplicateId) {
          setSelectedTestimonial(null);
        } else if (selectedTestimonial?.id === primaryId) {
          fetchNotes(primaryId);
          fetchActivity(primaryId);
        }
        fetchTestimonials();
      } else {
        toast.error("Merge Failed", data.error || "Could not merge records.");
      }
    } catch {
      toast.error("Network Error", "Unable to execute merge.");
    } finally {
      setIsMergingPair(false);
    }
  };

  const handleScanWorkspaceDuplicates = async () => {
    if (!workspaceId) return;
    setIsScanningDuplicates(true);
    setIsDuplicateScannerOpen(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/duplicates`);
      if (res.ok) {
        const data = await res.json();
        setDuplicateClusters(data.duplicateClusters || []);
        if (data.duplicateClusters?.length > 0) {
          toast.success("Duplicates Detected", `Found ${data.duplicateClusters.length} possible duplicate cluster(s).`);
        } else {
          toast.success("Scan Complete", "No duplicate testimonials found.");
        }
      }
    } catch {
      toast.error("Error", "Unable to complete duplicate scan.");
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  const handleExecuteBulkTagging = async () => {
    if (!workspaceId || selectedIds.length === 0 || selectedBulkTagIds.length === 0) return;
    setIsApplyingBulkTags(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/testimonials/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TAG",
          testimonialIds: selectedIds,
          tagIds: selectedBulkTagIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Bulk Tagging Complete", data.message);
        setIsBulkTagModalOpen(false);
        setSelectedBulkTagIds([]);
        setSelectedIds([]);
        fetchTestimonials();
      } else {
        toast.error("Failed", "Unable to apply bulk tags.");
      }
    } catch {
      toast.error("Network Error", "Bulk tagging failed.");
    } finally {
      setIsApplyingBulkTags(false);
    }
  };

  const toast = useToast();
  const workspaceId =
    activeWorkspace && !activeWorkspace.id.startsWith("ws-default")
      ? activeWorkspace.id
      : undefined;

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
      if (sourceFilter !== "all") params.append("sourceType", sourceFilter);
      if (duplicatesFilter) params.append("duplicatesOnly", "true");
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
    sourceFilter,
    duplicatesFilter,
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

  const handleRetryTranscription = async (testimonialId: string) => {
    if (!workspaceId) return;
    setIsTranscribing(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${testimonialId}/transcribe`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate transcription.");
      }
      toast.success("Transcription Queued", "Processing in the background.");
      if (data.transcription) {
        setSelectedTestimonial((prev) =>
          prev && prev.id === testimonialId
            ? { ...prev, transcription: data.transcription }
            : prev,
        );
        setTestimonials((prev) =>
          prev.map((t) =>
            t.id === testimonialId ? { ...t, transcription: data.transcription } : t,
          ),
        );
      }
    } catch (err: unknown) {
      toast.error(
        "Transcription Failed",
        err instanceof Error ? err.message : "Error initiating transcription.",
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSaveManualTranscript = async (
    testimonialId: string,
    syncToQuote = false,
  ) => {
    if (!workspaceId || !transcriptEditText.trim()) return;
    setIsSavingTranscript(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${testimonialId}/transcript`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: transcriptEditText.trim(),
            language: transcriptEditLang.trim() || undefined,
            syncToTestimonialContent: syncToQuote,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save transcript.");
      }
      toast.success(
        "Transcript Saved",
        syncToQuote
          ? "Transcript and testimonial quote updated."
          : "Transcript updated successfully.",
      );
      setIsEditingTranscript(false);
      if (data.transcription) {
        setSelectedTestimonial((prev) => {
          if (!prev || prev.id !== testimonialId) return prev;
          return {
            ...prev,
            transcription: data.transcription,
            content: syncToQuote ? transcriptEditText.trim() : prev.content,
          };
        });
        setTestimonials((prev) =>
          prev.map((t) => {
            if (t.id !== testimonialId) return t;
            return {
              ...t,
              transcription: data.transcription,
              content: syncToQuote ? transcriptEditText.trim() : t.content,
            };
          }),
        );
      }
    } catch (err: unknown) {
      toast.error(
        "Failed to Save",
        err instanceof Error ? err.message : "Error saving transcript.",
      );
    } finally {
      setIsSavingTranscript(false);
    }
  };

  const fetchSubtitles = async (testimonialId: string) => {
    if (!workspaceId) return;
    setIsLoadingSubtitles(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${testimonialId}/subtitles`,
      );
      if (res.ok) {
        const data = await res.json();
        setSubtitleSegments(data.segments || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingSubtitles(false);
    }
  };

  const fetchExportJobs = async (testimonialId: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${testimonialId}/video-export`,
      );
      if (res.ok) {
        const data = await res.json();
        setExportJobs(data.jobs || []);
      }
    } catch {
      // ignore
    }
  };

  const handleSaveSubtitles = async (testimonialId: string) => {
    if (!workspaceId) return;
    setIsSavingSubtitles(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${testimonialId}/subtitles`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments: subtitleSegments }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save subtitles.");
      }
      toast.success("Subtitles Saved", "Timed captions updated successfully.");
      if (data.transcription) {
        setSelectedTestimonial((prev) =>
          prev && prev.id === testimonialId
            ? { ...prev, transcription: data.transcription }
            : prev,
        );
      }
    } catch (err: unknown) {
      toast.error(
        "Failed to Save",
        err instanceof Error ? err.message : "Error saving subtitles.",
      );
    } finally {
      setIsSavingSubtitles(false);
    }
  };

  const handleAddSubtitleSegment = () => {
    setSubtitleSegments((prev) => {
      const last = prev[prev.length - 1];
      const start = last ? Math.round((last.end + 0.2) * 10) / 10 : 0;
      const end = Math.round((start + 2.5) * 10) / 10;
      return [
        ...prev,
        {
          id: prev.length + 1,
          start,
          end,
          text: "",
        },
      ];
    });
  };

  const handleDeleteSubtitleSegment = (index: number) => {
    setSubtitleSegments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateSubtitleSegment = (
    index: number,
    field: "start" | "end" | "text",
    value: string | number,
  ) => {
    setSubtitleSegments((prev) =>
      prev.map((seg, idx) => {
        if (idx !== index) return seg;
        return {
          ...seg,
          [field]: field === "text" ? value : parseFloat(String(value)) || 0,
        };
      }),
    );
  };

  const handleStartVideoExport = async (testimonialId: string) => {
    if (!workspaceId) return;
    setIsStartingExport(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${testimonialId}/video-export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aspectRatio: exportAspectRatio,
            resolutionProfile: exportResolution,
            burnSubtitles: exportBurnSubtitles,
            subtitleFont: exportSubtitleFont,
            subtitleSize: exportSubtitleSize,
            subtitlePosition: exportSubtitlePosition,
            subtitleColor: exportSubtitleColor,
            customSegments:
              subtitleSegments.length > 0 ? subtitleSegments : undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start export job.");
      }
      toast.success(
        "Export Job Queued",
        "Video processing initialized in background.",
      );
      if (data.job) {
        setExportJobs((prev) => [data.job, ...(prev || [])]);
      }
    } catch (err: unknown) {
      toast.error(
        "Export Failed",
        err instanceof Error ? err.message : "Error starting video export.",
      );
    } finally {
      setIsStartingExport(false);
    }
  };

  const handleRetryVideoExport = async (
    testimonialId: string,
    jobId: string,
  ) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${testimonialId}/video-export/${jobId}/retry`,
        {
          method: "POST",
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to retry export.");
      }
      toast.success("Job Re-queued", "Video export re-queued for processing.");
      fetchExportJobs(testimonialId);
    } catch (err: unknown) {
      toast.error(
        "Retry Failed",
        err instanceof Error ? err.message : "Error retrying export.",
      );
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
      sourceFilter !== "all" ||
      duplicatesFilter ||
      dateRangeFilter !== "all" ||
      formatFilter !== "all",
  );

  const clearAllFilters = () => {
    updateQueryParam({
      search: null,
      rating: null,
      projectId: null,
      tagId: null,
      sourceType: null,
      duplicatesOnly: null,
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
            <button
              type="button"
              onClick={handleScanWorkspaceDuplicates}
              disabled={isScanningDuplicates}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-2xs hover:bg-amber-100 disabled:opacity-50 transition-colors"
              title="Detect duplicate testimonials using multi-signal analysis"
            >
              {isScanningDuplicates ? <Loader2 size={13} className="animate-spin text-amber-600" /> : <Copy size={13} className="text-amber-600" />}
              <span>Scan Duplicates</span>
            </button>
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
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
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

          {/* Filter by Source Type */}
          <select
            value={sourceFilter}
            onChange={(e) => updateQueryParam({ sourceType: e.target.value })}
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="FORM">Public Forms</option>
            <option value="IMPORT">CSV/JSON Import</option>
            <option value="TWITTER">Twitter / X</option>
            <option value="GOOGLE_REVIEWS">Google Reviews</option>
            <option value="G2">G2 Crowd</option>
            <option value="CAPTERRA">Capterra</option>
            <option value="MANUAL">Manual Entry</option>
          </select>

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

        {/* Second Row: Date Filter + Sort By + Duplicate Toggle + View Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Duplicates Toggle Pill */}
            <button
              type="button"
              onClick={() => updateQueryParam({ duplicatesOnly: duplicatesFilter ? null : "true" })}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                duplicatesFilter
                  ? "bg-amber-100 text-amber-900 border-amber-300 shadow-2xs"
                  : "bg-white text-ink-600 border-line hover:bg-warm-100"
              }`}
            >
              <Copy size={12} className={duplicatesFilter ? "text-amber-700" : "text-ink-400"} />
              <span>Flagged Duplicates</span>
            </button>
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
                onClick={() => setBulkConfirmAction("APPROVE")}
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
                onClick={() => setBulkConfirmAction("REJECT")}
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
                onClick={() => setBulkConfirmAction("ARCHIVE")}
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
              onClick={() => {
                setSelectedBulkTagIds([]);
                setIsBulkTagModalOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-3 py-1 font-semibold text-brand-700 hover:bg-brand-50 transition-colors shadow-2xs disabled:opacity-50"
            >
              <TagIcon size={12} className="text-brand-600" />
              <span>Bulk Tag</span>
            </button>

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
                  const isAudio = Boolean(hasMedia && item.mediaAssets?.some((m) => m.type === "AUDIO"));
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenTestimonial(item)}
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

                      {/* Media & Transcription */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {hasMedia ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                              {isVideo ? <Video size={10} /> : isAudio ? <Mic size={10} /> : <FileText size={10} />}
                              <span>{isVideo ? "Video" : isAudio ? "Audio" : "Image"}</span>
                            </span>
                            {item.transcription && (
                              <span
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-medium border ${
                                  item.transcription.status === "COMPLETED"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : item.transcription.status === "FAILED"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-sky-50 text-sky-700 border-sky-200"
                                }`}
                              >
                                {item.transcription.status === "COMPLETED" ? (
                                  <span>Transcript ({item.transcription.language || "auto"})</span>
                                ) : item.transcription.status === "FAILED" ? (
                                  <span>Transcript Failed</span>
                                ) : (
                                  <span className="flex items-center gap-0.5">
                                    <Loader2 size={8} className="animate-spin" />
                                    <span>Transcribing...</span>
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
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
                          {item.sourceType && item.sourceType !== "FORM" && (
                            <div className="flex items-center gap-1 text-[9px] text-brand-700 font-semibold uppercase">
                              <Globe size={9} className="shrink-0" />
                              <span>{item.sourceType}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            {item.isFlaggedDuplicate && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-300 font-bold">
                                <AlertTriangle size={8} />
                                <span>Duplicate</span>
                              </span>
                            )}
                            {item.notes && item.notes.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-ink-600 bg-warm-100 px-1 py-0.2 rounded font-medium">
                                <MessageSquare size={8} />
                                <span>{item.notes.length}</span>
                              </span>
                            )}
                          </div>
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
                            onClick={() => handleOpenTestimonial(item)}
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

                {/* Transcription Preview in Card */}
                {item.transcription && (
                  <div className="rounded-xl border border-line bg-warm-50/50 p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-ink-700">
                        <Languages size={12} className="text-brand-600" />
                        <span>Transcript ({item.transcription.language || "auto"})</span>
                        {item.transcription.isEdited && (
                          <span className="text-[9px] text-brand-600 font-normal italic">
                            (Edited)
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${
                          item.transcription.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.transcription.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}
                      >
                        {item.transcription.status}
                      </span>
                    </div>
                    {item.transcription.status === "COMPLETED" && item.transcription.text && (
                      <p className="line-clamp-2 text-ink-600 italic text-[11px]">
                        &ldquo;{item.transcription.text}&rdquo;
                      </p>
                    )}
                    {item.transcription.status === "FAILED" && (
                      <div className="flex items-center justify-between text-rose-700 text-[10px]">
                        <span className="truncate">{item.transcription.errorMessage || "Processing failed"}</span>
                        <button
                          type="button"
                          onClick={() => handleRetryTranscription(item.id)}
                          className="font-semibold underline ml-2 shrink-0"
                        >
                          Retry
                        </button>
                      </div>
                    )}
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
                      onClick={() => handleOpenTestimonial(item)}
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
            {/* Modal Navigation Tabs: Content, Internal Notes, Activity History */}
            <div className="flex items-center gap-1 border-b border-line pb-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => setDetailModalTab("content")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  detailModalTab === "content"
                    ? "bg-brand-50 text-brand-700 font-semibold shadow-2xs"
                    : "text-ink-600 hover:bg-warm-100"
                }`}
              >
                <FileText size={13} />
                <span>Content &amp; Media</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailModalTab("notes")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  detailModalTab === "notes"
                    ? "bg-brand-50 text-brand-700 font-semibold shadow-2xs"
                    : "text-ink-600 hover:bg-warm-100"
                }`}
              >
                <MessageSquare size={13} />
                <span>Internal Team Notes</span>
                {internalNotes.length > 0 && (
                  <span className="rounded-full bg-brand-100 px-1.5 py-0.2 text-[10px] font-bold text-brand-800">
                    {internalNotes.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDetailModalTab("history")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  detailModalTab === "history"
                    ? "bg-brand-50 text-brand-700 font-semibold shadow-2xs"
                    : "text-ink-600 hover:bg-warm-100"
                }`}
              >
                <History size={13} />
                <span>Activity &amp; Submission History</span>
                {activityHistory.length > 0 && (
                  <span className="rounded-full bg-warm-200 px-1.5 py-0.2 text-[10px] font-medium text-ink-700">
                    {activityHistory.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: Content & Media */}
            {detailModalTab === "content" && (
              <div className="space-y-5">
                {/* Duplicate Alert Banner if flagged */}
                {(itemDuplicates.length > 0 || selectedTestimonial.isFlaggedDuplicate) && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Possible Duplicate Testimonial Detected</span>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          {itemDuplicates[0]?.summary || "Multi-signal matching indicates this record may duplicate an existing submission."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (itemDuplicates[0]) {
                            setActiveClusterForReview({
                              confidenceScore: itemDuplicates[0].confidenceScore,
                              matchedSignals: itemDuplicates[0].matchedSignals,
                              signalBreakdown: itemDuplicates[0].signalBreakdown,
                              summary: itemDuplicates[0].summary,
                              testimonialA: selectedTestimonial,
                              testimonialB: itemDuplicates[0].matchedTestimonial,
                            });
                            setIsDuplicateScannerOpen(true);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700 transition-colors shadow-2xs"
                      >
                        <Copy size={12} />
                        <span>Compare &amp; Resolve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismissDuplicate(selectedTestimonial.id, itemDuplicates[0]?.matchedTestimonialId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                      >
                        <span>Dismiss Alert</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Source & Import Attribution Details */}
                <div className="rounded-xl border border-line bg-warm-50/40 p-3.5 text-xs space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Globe size={13} className="text-brand-600" />
                      <span>Source &amp; Import Attribution</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700 border border-brand-200 uppercase">
                      {selectedTestimonial.sourceType || "FORM"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-ink-700 text-[11px] pt-1">
                    <div>
                      <span className="text-ink-400 block text-[10px] font-medium">Original Source URL:</span>
                      {selectedTestimonial.sourceUrl ? (
                        <a
                          href={selectedTestimonial.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-600 hover:underline flex items-center gap-1 truncate font-medium mt-0.5"
                        >
                          <span className="truncate">{selectedTestimonial.sourceUrl}</span>
                          <ExternalLink size={10} className="shrink-0" />
                        </a>
                      ) : (
                        <span className="text-ink-400 italic">Direct Public Form Submission</span>
                      )}
                    </div>

                    <div>
                      <span className="text-ink-400 block text-[10px] font-medium">Import Batch Details:</span>
                      {selectedTestimonial.importSourceDetailsJson ? (() => {
                        try {
                          const meta = JSON.parse(selectedTestimonial.importSourceDetailsJson);
                          return (
                            <span className="text-ink-700 block mt-0.5 font-medium">
                              {meta.sourceLabel || "Bulk Batch"} &bull; Row #{meta.rowNumber || "N/A"}{" "}
                              {meta.importedAt && `• ${new Date(meta.importedAt).toLocaleDateString()}`}
                            </span>
                          );
                        } catch {
                          return <span className="text-ink-500">{selectedTestimonial.importSourceDetailsJson}</span>;
                        }
                      })() : (
                        <span className="text-ink-400 italic">Submitted organically (not imported)</span>
                      )}
                    </div>
                  </div>
                </div>

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
                    {selectedTestimonial.customer?.email && (
                      <Link
                        href={`/dashboard/rewards?thankYouCustomer=${encodeURIComponent(selectedTestimonial.customer.name || "Customer")}&email=${encodeURIComponent(selectedTestimonial.customer.email)}`}
                        className="inline-flex items-center gap-1 rounded bg-brand-50 border border-brand-200 px-2 py-0.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-100 transition-colors ml-1"
                        title="Send customer appreciation thank-you"
                      >
                        <Sparkles size={10} />
                        <span>Send Thank-You</span>
                      </Link>
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

            {/* Audio & Video Transcription Section */}
            {(selectedTestimonial.type === "VIDEO" ||
              selectedTestimonial.type === "AUDIO" ||
              selectedTestimonial.mediaAssets?.some((m) => m.type === "VIDEO" || m.type === "AUDIO")) && (
              <div className="space-y-2 rounded-2xl border border-line bg-warm-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Mic size={15} className="text-brand-600" />
                    <h5 className="font-semibold text-xs text-ink-900 uppercase tracking-wider">
                      Media Transcription &amp; Captions
                    </h5>
                    {selectedTestimonial.transcription && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          selectedTestimonial.transcription.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : selectedTestimonial.transcription.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-sky-50 text-sky-700 border-sky-200"
                        }`}
                      >
                        {selectedTestimonial.transcription.status === "COMPLETED" && <CheckCircle2 size={10} />}
                        {selectedTestimonial.transcription.status === "FAILED" && <AlertCircle size={10} />}
                        {(selectedTestimonial.transcription.status === "PENDING" ||
                          selectedTestimonial.transcription.status === "PROCESSING") && (
                          <Loader2 size={10} className="animate-spin" />
                        )}
                        <span>{selectedTestimonial.transcription.status}</span>
                      </span>
                    )}
                    {selectedTestimonial.transcription?.language && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-ink-600 border border-line">
                        <Languages size={10} />
                        <span>{selectedTestimonial.transcription.language.toUpperCase()}</span>
                      </span>
                    )}
                    {selectedTestimonial.transcription?.isEdited && (
                      <span className="rounded bg-brand-50 text-brand-700 border border-brand-200 px-1.5 py-0.2 text-[10px] font-medium italic">
                        Edited Manually
                      </span>
                    )}
                  </div>

                  {/* Top action button */}
                  <div className="flex items-center gap-2">
                    {(!selectedTestimonial.transcription || selectedTestimonial.transcription.status === "FAILED") && (
                      <button
                        type="button"
                        onClick={() => handleRetryTranscription(selectedTestimonial.id)}
                        disabled={isTranscribing}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 disabled:opacity-50 transition-colors"
                      >
                        {isTranscribing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        <span>{selectedTestimonial.transcription ? "Retry Transcription" : "Transcribe Media"}</span>
                      </button>
                    )}
                    {selectedTestimonial.transcription?.status === "COMPLETED" && !isEditingTranscript && (
                      <button
                        type="button"
                        onClick={() => {
                          setTranscriptEditText(selectedTestimonial.transcription?.text || "");
                          setTranscriptEditLang(selectedTestimonial.transcription?.language || "en");
                          setIsEditingTranscript(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
                      >
                        <Edit3 size={12} />
                        <span>Edit Transcript</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Body Content based on Transcription status */}
                {selectedTestimonial.transcription?.status === "FAILED" && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs space-y-2 text-rose-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Transcription Processing Error:</span>
                        <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                          {selectedTestimonial.transcription.errorMessage || "Transcription service could not process this audio."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-rose-200/60">
                      <button
                        type="button"
                        onClick={() => handleRetryTranscription(selectedTestimonial.id)}
                        disabled={isTranscribing}
                        className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 shadow-2xs"
                      >
                        {isTranscribing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                        <span>Retry Job</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTranscriptEditText("");
                          setTranscriptEditLang("en");
                          setIsEditingTranscript(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        <Edit3 size={11} />
                        <span>Supply Transcript Manually</span>
                      </button>
                    </div>
                  </div>
                )}

                {(selectedTestimonial.transcription?.status === "PENDING" ||
                  selectedTestimonial.transcription?.status === "PROCESSING") && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 text-xs text-sky-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Loader2 size={16} className="animate-spin text-sky-600 shrink-0" />
                      <div>
                        <span className="font-semibold block">Transcription in Progress...</span>
                        <span className="text-[11px] text-sky-600">
                          The audio stream is being processed in the background using the configured transcription service.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchTestimonials()}
                      className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-white px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 shadow-2xs"
                    >
                      <RefreshCw size={11} />
                      <span>Refresh</span>
                    </button>
                  </div>
                )}

                {/* Edit Form */}
                {isEditingTranscript && (
                  <div className="rounded-xl border border-brand-200 bg-white p-3 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-900">Edit / Correct Transcript</span>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-ink-500 font-medium">Lang:</label>
                        <input
                          type="text"
                          value={transcriptEditLang}
                          onChange={(e) => setTranscriptEditLang(e.target.value)}
                          placeholder="en"
                          maxLength={5}
                          className="w-14 rounded border border-line px-1.5 py-0.5 text-xs text-ink-800 uppercase"
                        />
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      value={transcriptEditText}
                      onChange={(e) => setTranscriptEditText(e.target.value)}
                      placeholder="Type or correct transcription text here..."
                      className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingTranscript(false)}
                        className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-600 hover:bg-warm-100"
                      >
                        Cancel
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveManualTranscript(selectedTestimonial.id, true)}
                          disabled={isSavingTranscript || !transcriptEditText.trim()}
                          className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
                          title="Save transcript and update the main testimonial quote with this text"
                        >
                          <Save size={11} />
                          <span>Save &amp; Sync Quote</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveManualTranscript(selectedTestimonial.id, false)}
                          disabled={isSavingTranscript || !transcriptEditText.trim()}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 shadow-2xs"
                        >
                          {isSavingTranscript ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          <span>Save Transcript</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Completed Transcript View */}
                {selectedTestimonial.transcription?.status === "COMPLETED" && !isEditingTranscript && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-line bg-white p-3.5 text-xs text-ink-900 leading-relaxed whitespace-pre-line shadow-2xs">
                      {selectedTestimonial.transcription.text}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-400">
                      <div className="flex items-center gap-2">
                        <span>Provider: {selectedTestimonial.transcription.provider}</span>
                        {selectedTestimonial.transcription.completedAt && (
                          <span>
                            • Transcribed {new Date(selectedTestimonial.transcription.completedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedTestimonial.transcription?.text) {
                              navigator.clipboard.writeText(selectedTestimonial.transcription.text);
                              toast.success("Copied", "Transcript copied to clipboard.");
                            }
                          }}
                          className="inline-flex items-center gap-1 hover:text-ink-700 text-ink-500 font-medium"
                        >
                          <Copy size={10} />
                          <span>Copy Transcript</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRetryTranscription(selectedTestimonial.id)}
                          disabled={isTranscribing}
                          className="inline-flex items-center gap-1 hover:text-brand-600 text-ink-500 font-medium ml-2"
                        >
                          <RefreshCw size={10} />
                          <span>Re-transcribe</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Video Studio: Subtitle Timing & Video Export */}
            {(selectedTestimonial.type === "VIDEO" ||
              selectedTestimonial.mediaAssets?.some((m) => m.type === "VIDEO")) && (
              <div className="space-y-3 rounded-2xl border border-brand-200 bg-white p-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <Film size={16} className="text-brand-600" />
                    <div>
                      <h5 className="font-bold text-xs text-ink-900 uppercase tracking-wider">
                        Video Studio &amp; Export
                      </h5>
                      <span className="text-[11px] text-ink-500">
                        Edit subtitle timestamps, burn captions, and export HD/4K social formats
                      </span>
                    </div>
                  </div>

                  {/* Studio Navigation Tabs */}
                  <div className="inline-flex rounded-lg bg-warm-100 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setStudioActiveTab("subtitles")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                        studioActiveTab === "subtitles"
                          ? "bg-white text-ink-900 shadow-2xs"
                          : "text-ink-600 hover:text-ink-900"
                      }`}
                    >
                      <FileText size={12} />
                      <span>Subtitles &amp; Timings ({subtitleSegments.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudioActiveTab("export")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                        studioActiveTab === "export"
                          ? "bg-white text-ink-900 shadow-2xs"
                          : "text-ink-600 hover:text-ink-900"
                      }`}
                    >
                      <Sliders size={12} />
                      <span>Export Video ({exportJobs?.length || 0})</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: Subtitle Segment Timing & Editor */}
                {studioActiveTab === "subtitles" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleAddSubtitleSegment}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-warm-100"
                        >
                          <Plus size={11} />
                          <span>Add Segment</span>
                        </button>
                        {subtitleSegments.length === 0 && selectedTestimonial.transcription?.text && (
                          <button
                            type="button"
                            onClick={() => {
                              const est = buildEstimatedSegmentsFromText(
                                selectedTestimonial.transcription!.text!,
                                selectedTestimonial.transcription?.durationSeconds || 30,
                              );
                              setSubtitleSegments(est);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                          >
                            <Sparkles size={11} />
                            <span>Auto-generate Timestamps</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Download SRT */}
                        <a
                          href={`/api/workspaces/${workspaceId}/testimonials/${selectedTestimonial.id}/subtitles?format=srt&download=1`}
                          download
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-warm-100 shadow-2xs"
                          title="Download SubRip (.srt) subtitle file"
                        >
                          <Download size={11} />
                          <span>Download SRT</span>
                        </a>

                        {/* Download VTT */}
                        <a
                          href={`/api/workspaces/${workspaceId}/testimonials/${selectedTestimonial.id}/subtitles?format=vtt&download=1`}
                          download
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-warm-100 shadow-2xs"
                          title="Download WebVTT (.vtt) subtitle file"
                        >
                          <Download size={11} />
                          <span>Download VTT</span>
                        </a>

                        {/* Save Subtitles */}
                        <button
                          type="button"
                          onClick={() => handleSaveSubtitles(selectedTestimonial.id)}
                          disabled={isSavingSubtitles || subtitleSegments.length === 0}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 shadow-2xs"
                        >
                          {isSavingSubtitles ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Save size={11} />
                          )}
                          <span>Save Subtitles</span>
                        </button>
                      </div>
                    </div>

                    {/* Subtitle Segments List */}
                    {isLoadingSubtitles ? (
                      <div className="flex items-center justify-center p-8 text-ink-400 gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs">Loading subtitle segments...</span>
                      </div>
                    ) : subtitleSegments.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-500 space-y-1">
                        <p>No subtitle segments configured yet.</p>
                        <p className="text-[11px] text-ink-400">
                          Add segments manually or click &ldquo;Auto-generate Timestamps&rdquo; to divide your transcript into timed captions.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                        {subtitleSegments.map((seg, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-line bg-warm-50/50 p-2 text-xs"
                          >
                            <span className="h-5 w-5 rounded-full bg-brand-100 text-brand-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>

                            {/* Timing inputs */}
                            <div className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={seg.start}
                                onChange={(e) =>
                                  handleUpdateSubtitleSegment(idx, "start", e.target.value)
                                }
                                title="Start time in seconds"
                                className="w-16 rounded border border-line bg-white px-1.5 py-1 text-right text-ink-900"
                              />
                              <span className="text-ink-400">&rarr;</span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={seg.end}
                                onChange={(e) =>
                                  handleUpdateSubtitleSegment(idx, "end", e.target.value)
                                }
                                title="End time in seconds"
                                className="w-16 rounded border border-line bg-white px-1.5 py-1 text-right text-ink-900"
                              />
                              <span className="text-ink-400 text-[10px]">
                                ({formatTimestampSrt(seg.start).slice(3, 8)})
                              </span>
                            </div>

                            {/* Text input */}
                            <input
                              type="text"
                              value={seg.text}
                              onChange={(e) =>
                                handleUpdateSubtitleSegment(idx, "text", e.target.value)
                              }
                              placeholder="Subtitle caption text..."
                              className="flex-1 rounded border border-line bg-white px-2.5 py-1 text-xs text-ink-900"
                            />

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSubtitleSegment(idx)}
                              className="rounded p-1 text-ink-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                              title="Delete segment"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Video Export Controls & Aspect Ratio */}
                {studioActiveTab === "export" && (
                  <div className="space-y-4 text-xs">
                    {/* Controls Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Aspect Ratio & Resolution Profile */}
                      <div className="space-y-3">
                        {/* Aspect Ratio */}
                        <div>
                          <label className="text-[11px] font-semibold text-ink-600 uppercase tracking-wider block mb-1.5">
                            Target Aspect Ratio
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: "ORIGINAL", label: "Source Ratio", desc: "Keep original" },
                              { id: "RATIO_16_9", label: "16:9 Landscape", desc: "YouTube / Desktop" },
                              { id: "RATIO_9_16", label: "9:16 Vertical", desc: "Reels / TikTok" },
                              { id: "RATIO_1_1", label: "1:1 Square", desc: "Instagram Feed" },
                              { id: "RATIO_4_5", label: "4:5 Portrait", desc: "Social Media" },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setExportAspectRatio(opt.id as any)}
                                className={`rounded-xl border p-2 text-left transition-colors ${
                                  exportAspectRatio === opt.id
                                    ? "border-brand-500 bg-brand-50/50 font-semibold text-brand-900 ring-1 ring-brand-500"
                                    : "border-line bg-white hover:bg-warm-50 text-ink-700"
                                }`}
                              >
                                <span className="block text-xs">{opt.label}</span>
                                <span className="block text-[10px] text-ink-400 font-normal">
                                  {opt.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Resolution Profile */}
                        <div>
                          <label className="text-[11px] font-semibold text-ink-600 uppercase tracking-wider block mb-1.5">
                            Export Resolution Profile
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { id: "RES_720P", label: "720p HD", desc: "Fast & lightweight" },
                              { id: "RES_1080P", label: "1080p Full HD", desc: "Recommended" },
                              { id: "RES_4K", label: "4K Ultra HD", desc: "Requires UHD source" },
                            ].map((res) => (
                              <button
                                key={res.id}
                                type="button"
                                onClick={() => setExportResolution(res.id as any)}
                                className={`rounded-xl border p-2 text-left transition-colors ${
                                  exportResolution === res.id
                                    ? "border-brand-500 bg-brand-50/50 font-semibold text-brand-900 ring-1 ring-brand-500"
                                    : "border-line bg-white hover:bg-warm-50 text-ink-700"
                                }`}
                              >
                                <span className="block text-xs">{res.label}</span>
                                <span className="block text-[10px] text-ink-400 font-normal">
                                  {res.desc}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* 4K Source Resolution Notice */}
                          {exportResolution === "RES_4K" && (
                            <div className="mt-2 rounded-lg bg-amber-50 p-2.5 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                              <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                              <span>
                                <strong>Hardware &amp; Quality Notice:</strong> 4K Ultra HD export requires source video recorded at 1440p or 4K. Low-resolution footage (720p/1080p) will be rejected to prevent artificial pixelation.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Subtitle Burn & Styling Options */}
                      <div className="space-y-3 bg-warm-50/40 p-3 rounded-xl border border-line/60">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-ink-700 uppercase tracking-wider">
                            Burn Captions Into Video
                          </label>
                          <input
                            type="checkbox"
                            checked={exportBurnSubtitles}
                            onChange={(e) => setExportBurnSubtitles(e.target.checked)}
                            className="rounded border-line text-brand-500 focus:ring-brand-500 h-4 w-4"
                          />
                        </div>

                        {exportBurnSubtitles && (
                          <div className="space-y-2.5 pt-1">
                            {/* Font Family */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-ink-500 font-medium block mb-1">
                                  Font Style
                                </label>
                                <select
                                  value={exportSubtitleFont}
                                  onChange={(e) => setExportSubtitleFont(e.target.value as any)}
                                  className="w-full rounded border border-line bg-white p-1 text-xs text-ink-800"
                                >
                                  <option value="sans-serif">Sans-serif (Modern)</option>
                                  <option value="serif">Serif (Editorial)</option>
                                  <option value="monospace">Monospace (Code)</option>
                                </select>
                              </div>

                              {/* Size */}
                              <div>
                                <label className="text-[10px] text-ink-500 font-medium block mb-1">
                                  Text Size
                                </label>
                                <select
                                  value={exportSubtitleSize}
                                  onChange={(e) => setExportSubtitleSize(e.target.value as any)}
                                  className="w-full rounded border border-line bg-white p-1 text-xs text-ink-800"
                                >
                                  <option value="small">Small (Subtle)</option>
                                  <option value="medium">Medium (Standard)</option>
                                  <option value="large">Large (High-impact)</option>
                                </select>
                              </div>
                            </div>

                            {/* Position & Color */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-ink-500 font-medium block mb-1">
                                  Position
                                </label>
                                <select
                                  value={exportSubtitlePosition}
                                  onChange={(e) => setExportSubtitlePosition(e.target.value as any)}
                                  className="w-full rounded border border-line bg-white p-1 text-xs text-ink-800"
                                >
                                  <option value="bottom">Bottom (Standard)</option>
                                  <option value="middle">Middle (Center)</option>
                                  <option value="top">Top (Headlines)</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] text-ink-500 font-medium block mb-1">
                                  Caption Color
                                </label>
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  {[
                                    { color: "#ffffff", label: "White" },
                                    { color: "#ffeb3b", label: "Yellow" },
                                    { color: "#7049d8", label: "Purple" },
                                  ].map((c) => (
                                    <button
                                      key={c.color}
                                      type="button"
                                      onClick={() => setExportSubtitleColor(c.color)}
                                      className={`h-6 w-6 rounded-full border shadow-2xs ${
                                        exportSubtitleColor === c.color
                                          ? "ring-2 ring-brand-500 ring-offset-1"
                                          : "border-line"
                                      }`}
                                      style={{ backgroundColor: c.color }}
                                      title={c.label}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleStartVideoExport(selectedTestimonial.id)}
                            disabled={isStartingExport}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-2xs"
                          >
                            {isStartingExport ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Film size={13} />
                            )}
                            <span>Start Video Export Job</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Export Job History & Status */}
                    {exportJobs && exportJobs.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-line">
                        <label className="text-[11px] font-semibold text-ink-600 uppercase tracking-wider block">
                          Export History &amp; Downloads ({exportJobs.length})
                        </label>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {exportJobs.map((job) => (
                            <div
                              key={job.id}
                              className="rounded-xl border border-line bg-white p-3 space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                                      job.status === "COMPLETED"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : job.status === "FAILED"
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : "bg-sky-50 text-sky-700 border-sky-200"
                                    }`}
                                  >
                                    {job.status === "COMPLETED" && <CheckCircle2 size={10} />}
                                    {job.status === "FAILED" && <AlertCircle size={10} />}
                                    {(job.status === "QUEUED" || job.status === "PROCESSING") && (
                                      <Loader2 size={10} className="animate-spin" />
                                    )}
                                    <span>{job.status}</span>
                                  </span>

                                  <span className="font-semibold text-ink-900 text-xs">
                                    {job.resolutionProfile.replace("RES_", "")} &bull;{" "}
                                    {job.aspectRatio.replace("RATIO_", "")}
                                  </span>

                                  {job.burnSubtitles && (
                                    <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200 font-medium">
                                      Captions Burned
                                    </span>
                                  )}
                                </div>

                                <span className="text-[10px] text-ink-400">
                                  {new Date(job.createdAt).toLocaleTimeString()}
                                </span>
                              </div>

                              {/* Progress bar for running jobs */}
                              {(job.status === "QUEUED" || job.status === "PROCESSING") && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] text-sky-700 font-medium">
                                    <span>Processing video encode...</span>
                                    <span>{job.progress}%</span>
                                  </div>
                                  <div className="w-full bg-sky-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                                      style={{ width: `${Math.max(5, job.progress)}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Error and retry control for failed jobs */}
                              {job.status === "FAILED" && (
                                <div className="flex items-center justify-between text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                                  <span className="text-[11px] truncate mr-2">
                                    {job.errorMessage || "Transcoding pipeline error"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRetryVideoExport(selectedTestimonial.id, job.id)}
                                    className="font-bold underline text-[11px] shrink-0 hover:text-rose-900"
                                  >
                                    Retry Export
                                  </button>
                                </div>
                              )}

                              {/* Completed download link */}
                              {job.status === "COMPLETED" && job.outputUrl && (
                                <div className="flex items-center justify-between pt-1 text-xs">
                                  <span className="text-[11px] text-ink-500">
                                    {job.fileSizeBytes
                                      ? `${(job.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                                      : "Ready for download"}
                                  </span>
                                  <a
                                    href={`${job.outputUrl}?download=1`}
                                    download
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs"
                                  >
                                    <Download size={11} />
                                    <span>Download Video</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Guided Recording Prompts Connected to Testimonial */}
            {selectedTestimonial.recordingQuestionsJson && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-brand-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Video size={12} className="text-brand-600" />
                  <span>Guided Recording Prompts Answered</span>
                </label>
                <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 space-y-2 text-xs">
                  {(() => {
                    try {
                      const questions = JSON.parse(selectedTestimonial.recordingQuestionsJson);
                      if (Array.isArray(questions)) {
                        return (
                          <div className="space-y-1.5">
                            {questions.map((q: { id?: string; text?: string; label?: string } | string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-ink-800">
                                <span className="h-4 w-4 rounded-full bg-brand-100 text-brand-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <span>{typeof q === "string" ? q : q.text || q.label}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                    } catch {
                      return <span className="text-ink-600">{selectedTestimonial.recordingQuestionsJson}</span>;
                    }
                    return null;
                  })()}
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

            {/* Verified Consent & Permissions Card */}
            {selectedTestimonial.consentRecord && (() => {
              const consentPayload = parseConsentPayload(selectedTestimonial.consentRecord.consentText);
              return (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                      <ShieldCheck size={15} className="text-emerald-600" />
                      <span>Verified Permission Logged ({consentPayload.version})</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-mono">
                      {new Date(selectedTestimonial.consentRecord.grantedAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-[11px] text-emerald-800 leading-relaxed italic bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                    &ldquo;{consentPayload.statement}&rdquo;
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-emerald-800 pt-1 border-t border-emerald-200/60">
                    <div>
                      <span className="font-semibold block">Permitted Uses:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {consentPayload.permittedPurposes.publicWebsite && (
                          <span className="bg-emerald-100/70 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                            Website
                          </span>
                        )}
                        {consentPayload.permittedPurposes.socialMedia && (
                          <span className="bg-emerald-100/70 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                            Social
                          </span>
                        )}
                        {consentPayload.permittedPurposes.marketingMaterials && (
                          <span className="bg-emerald-100/70 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                            Marketing
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold block">Attribution &amp; Media:</span>
                      <span className="text-emerald-700">
                        {consentPayload.mediaPermission ? "Media Permitted" : "Media Restricted"} •{" "}
                        {consentPayload.allowNameDisplay ? "Name Permitted" : "Anonymous"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-emerald-700 pt-0.5 border-t border-emerald-200/40">
                    <span>
                      Granted by {selectedTestimonial.consentRecord.customerName} (
                      {selectedTestimonial.consentRecord.customerEmail})
                    </span>
                    {selectedTestimonial.consentRecord.ipAddress && (
                      <span className="font-mono">
                        Verification IP: {selectedTestimonial.consentRecord.ipAddress}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
            {/* End of TAB 1: Content & Media */}
            </div>
          )}

          {/* TAB 2: Internal Team Notes */}
          {detailModalTab === "notes" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3.5 flex items-start justify-between gap-2 text-xs text-brand-900 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <MessageSquare size={16} className="text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Confidential Team Notes</span>
                    <p className="text-[11px] text-brand-700 mt-0.5 leading-relaxed">
                      Team notes are strictly internal to authorized workspace members. They are never shown to respondents or rendered in public widgets.
                    </p>
                  </div>
                </div>
              </div>

              {/* Note Composer */}
              <div className="space-y-2 rounded-xl border border-line bg-white p-3.5 shadow-2xs">
                <label className="text-[11px] font-semibold text-ink-600 uppercase tracking-wider block">
                  Add Internal Note
                </label>
                <textarea
                  rows={3}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Record customer context, deal stage, moderation rationale, or verification notes..."
                  className="w-full rounded-xl border border-line bg-warm-50/30 p-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={!newNoteText.trim() || isAddingNote}
                    onClick={() => handleAddNote(selectedTestimonial.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {isAddingNote ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    <span>Save Team Note</span>
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider block">
                  Existing Notes ({internalNotes.length})
                </span>
                {isLoadingNotes ? (
                  <div className="p-8 text-center text-xs text-ink-400">Loading notes...</div>
                ) : internalNotes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-ink-400 italic rounded-xl border border-dashed border-line">
                    No internal team notes recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {internalNotes.map((note) => (
                      <div key={note.id} className="rounded-xl border border-line bg-white p-3.5 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-ink-900">
                            {note.authorName || "Team Member"}
                          </span>
                          <div className="flex items-center gap-2 text-ink-400">
                            <span>{new Date(note.createdAt).toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(selectedTestimonial.id, note.id)}
                              className="text-ink-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                              title="Delete note"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-ink-800 whitespace-pre-line leading-relaxed">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Activity & Submission History */}
          {detailModalTab === "history" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-warm-50/40 p-3.5 text-xs space-y-2 shadow-2xs">
                <span className="font-semibold text-ink-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <History size={13} className="text-brand-600" />
                  <span>Submission &amp; Moderation Ledger</span>
                </span>
                <p className="text-[11px] text-ink-600 leading-relaxed">
                  Every lifecycle transition, approval change, and tag application is verifiably preserved in this audit trail.
                </p>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {isLoadingActivity ? (
                  <div className="p-8 text-center text-xs text-ink-400">Loading audit history...</div>
                ) : activityHistory.length === 0 ? (
                  <div className="rounded-xl border border-line bg-white p-3.5 text-xs text-ink-700 flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Initial Submission</span>
                      <p className="text-[11px] text-ink-500 mt-0.5">
                        Recorded on {new Date(selectedTestimonial.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  activityHistory.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 text-xs shadow-2xs">
                      <div className="h-6 w-6 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0 mt-0.5 text-brand-700 font-bold text-[10px]">
                        <History size={11} />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink-900">
                            {act.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-ink-400 shrink-0 font-mono">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-600 leading-relaxed">
                          {act.details || `Logged by ${act.actorName || "System"}`}
                        </p>
                        {act.actorName && (
                          <span className="text-[10px] text-ink-400 block pt-0.5">
                            Actor: {act.actorName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
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
      {/* 9. Bulk Moderation Confirmation Dialogs */}
      {/* ------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={bulkConfirmAction === "APPROVE"}
        onClose={() => setBulkConfirmAction(null)}
        onConfirm={() => executeBulkAction("APPROVE")}
        title="Approve Selected Testimonials"
        message={`Are you sure you want to approve ${selectedIds.length} testimonials? Approved testimonials become visible on active public widgets and walls.`}
        confirmLabel={`Approve ${selectedIds.length} Testimonials`}
        isDestructive={false}
      />

      <ConfirmDialog
        isOpen={bulkConfirmAction === "REJECT"}
        onClose={() => setBulkConfirmAction(null)}
        onConfirm={() => executeBulkAction("REJECT")}
        title="Reject Selected Testimonials"
        message={`Are you sure you want to reject ${selectedIds.length} testimonials? Rejected testimonials are hidden from public display.`}
        confirmLabel={`Reject ${selectedIds.length} Testimonials`}
        isDestructive={true}
      />

      <ConfirmDialog
        isOpen={bulkConfirmAction === "ARCHIVE"}
        onClose={() => setBulkConfirmAction(null)}
        onConfirm={() => executeBulkAction("ARCHIVE")}
        title="Archive Selected Testimonials"
        message={`Are you sure you want to archive ${selectedIds.length} testimonials? They will be retained in your workspace archive and hidden from default views.`}
        confirmLabel={`Archive ${selectedIds.length} Testimonials`}
        isDestructive={false}
      />

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
      {/* 10. Bulk Tagging Modal */}
      {/* ------------------------------------------------------------- */}
      <ModalDialog
        isOpen={isBulkTagModalOpen}
        onClose={() => setIsBulkTagModalOpen(false)}
        title="Apply Tags in Bulk"
        description={`Select workspace tags to apply across all ${selectedIds.length} selected testimonials.`}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsBulkTagModalOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isApplyingBulkTags || selectedBulkTagIds.length === 0}
              onClick={handleExecuteBulkTagging}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {isApplyingBulkTags && <Loader2 size={13} className="animate-spin" />}
              <span>Apply {selectedBulkTagIds.length} Tag{selectedBulkTagIds.length === 1 ? "" : "s"}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-ink-600">
            Choose which tags to associate with the {selectedIds.length} selected testimonial records:
          </p>
          {workspaceTags.length === 0 ? (
            <div className="rounded-xl border border-line bg-warm-50/50 p-4 text-center text-xs text-ink-500">
              No tags found in workspace. Create tags first in Tag Manager.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
              {workspaceTags.map((tag) => {
                const isChecked = selectedBulkTagIds.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? "border-brand-500 bg-brand-50/40 text-brand-900"
                        : "border-line bg-white hover:bg-warm-50 text-ink-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedBulkTagIds((prev) =>
                          prev.includes(tag.id)
                            ? prev.filter((id) => id !== tag.id)
                            : [...prev, tag.id]
                        );
                      }}
                      className="rounded border-line text-brand-500 focus:ring-brand-500"
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color || "#7049D8" }}
                    />
                    <span className="text-xs font-medium truncate">{tag.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </ModalDialog>

      {/* ------------------------------------------------------------- */}
      {/* 11. Duplicate Detection Scanner Modal */}
      {/* ------------------------------------------------------------- */}
      <ModalDialog
        isOpen={isDuplicateScannerOpen}
        onClose={() => {
          setIsDuplicateScannerOpen(false);
          setActiveClusterForReview(null);
        }}
        title="Duplicate Detection Scanner"
        description="Analyze workspace testimonials for potential duplicates across normalized text, customer identity, source URL, and media hash."
        maxWidth="3xl"
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              <ShieldAlert size={14} className="shrink-0" />
              <span>Human Review Required: Testimonials are never automatically deleted or merged without explicit confirmation.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsDuplicateScannerOpen(false);
                setActiveClusterForReview(null);
              }}
              className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors self-end"
            >
              Close Scanner
            </button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {isScanningDuplicates ? (
            <div className="rounded-xl border border-line bg-warm-50/50 p-12 text-center space-y-3">
              <Loader2 size={24} className="animate-spin text-brand-600 mx-auto" />
              <div className="text-xs font-medium text-ink-800">
                Scanning workspace testimonials for duplicate signals...
              </div>
              <p className="text-[11px] text-ink-500 max-w-sm mx-auto">
                Comparing normalized content, customer email/identity, original source URLs, and media file hashes.
              </p>
            </div>
          ) : duplicateClusters.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-8 text-center space-y-2">
              <CheckCircle2 size={24} className="text-emerald-600 mx-auto" />
              <div className="text-xs font-semibold text-emerald-900">
                No Duplicates Detected
              </div>
              <p className="text-[11px] text-emerald-700 max-w-md mx-auto">
                All testimonials in this workspace appear unique based on current matching criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-ink-600 px-1">
                <span>
                  Found <strong className="text-ink-900">{duplicateClusters.length}</strong> possible duplicate cluster{duplicateClusters.length === 1 ? "" : "s"}:
                </span>
                <button
                  type="button"
                  onClick={handleScanWorkspaceDuplicates}
                  disabled={isScanningDuplicates}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  <RefreshCw size={11} />
                  <span>Rescan</span>
                </button>
              </div>

              {duplicateClusters.map((cluster, idx) => {
                const primary = cluster.primary || cluster.testimonialA;
                const duplicate = cluster.duplicate || cluster.testimonialB;
                const signals = cluster.signals || cluster.signalBreakdown || [];
                const compositeScore = cluster.compositeScore ?? cluster.confidenceScore ?? 0;
                if (!primary || !duplicate) return null;
                return (
                  <div
                    key={cluster.pairKey || idx}
                    className="rounded-xl border border-line bg-white shadow-2xs overflow-hidden"
                  >
                    {/* Header with Match Score & Matching Signals */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-warm-50/80 border-b border-line text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink-900">Cluster #{idx + 1}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            compositeScore >= 0.85
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {Math.round(compositeScore * 100)}% Match
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {signals.map((sig: any, sIdx: number) => (
                          <span
                            key={sIdx}
                            className="text-[10px] bg-white border border-line px-2 py-0.5 rounded-md text-ink-600 font-medium"
                          >
                            {sig.type === "TEXT_EXACT" && "Identical Text"}
                            {sig.type === "TEXT_SIMILAR" && `Similar Text (${Math.round((sig.score || 0) * 100)}%)`}
                            {sig.type === "CUSTOMER_IDENTITY" && "Same Customer"}
                            {sig.type === "SOURCE_URL" && "Identical Source URL"}
                            {sig.type === "MEDIA_HASH" && "Matching Media File"}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Side-by-Side Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line text-xs">
                      {/* Left: Record A */}
                      <div className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink-900">
                            {primary.customer?.name || "Anonymous"}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-line bg-warm-50 text-ink-600">
                            {primary.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-400">
                          {primary.customer?.email || primary.customer?.company || "No contact info"} •{" "}
                          {new Date(primary.submittedAt).toLocaleDateString()}
                        </div>
                        <div className="text-ink-700 bg-warm-50/60 p-2.5 rounded-lg border border-line/60 italic text-[11px] line-clamp-3">
                          &ldquo;{primary.content}&rdquo;
                        </div>
                        {primary.sourceType && (
                          <div className="text-[10px] text-ink-400">
                            Source: <span className="font-medium text-ink-600">{primary.sourceType}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Record B */}
                      <div className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink-900">
                            {duplicate.customer?.name || "Anonymous"}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-line bg-warm-50 text-ink-600">
                            {duplicate.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-400">
                          {duplicate.customer?.email || duplicate.customer?.company || "No contact info"} •{" "}
                          {new Date(duplicate.submittedAt).toLocaleDateString()}
                        </div>
                        <div className="text-ink-700 bg-warm-50/60 p-2.5 rounded-lg border border-line/60 italic text-[11px] line-clamp-3">
                          &ldquo;{duplicate.content}&rdquo;
                        </div>
                        {duplicate.sourceType && (
                          <div className="text-[10px] text-ink-400">
                            Source: <span className="font-medium text-ink-600">{duplicate.sourceType}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Resolution Actions */}
                    <div className="p-3 bg-warm-50/50 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] text-ink-500">
                        Human Confirmation:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDismissDuplicate(primary.id, duplicate.id)}
                          className="px-2.5 py-1 rounded-lg border border-line bg-white text-ink-700 font-medium hover:bg-warm-100 transition-colors text-[11px]"
                        >
                          Keep Both (Distinct)
                        </button>
                        <button
                          type="button"
                          disabled={isMergingPair}
                          onClick={() => handleMergeDuplicates(primary.id, duplicate.id)}
                          className="px-2.5 py-1 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors text-[11px] disabled:opacity-50"
                        >
                          Merge into Record A
                        </button>
                        <button
                          type="button"
                          disabled={isMergingPair}
                          onClick={() => handleMergeDuplicates(duplicate.id, primary.id)}
                          className="px-2.5 py-1 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 font-medium hover:bg-brand-100 transition-colors text-[11px] disabled:opacity-50"
                        >
                          Merge into Record B
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ModalDialog>

      {/* ------------------------------------------------------------- */}
      {/* 12. Testimonial Export Modal */}
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
