"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Check,
  Download,
  Edit2,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MessageSquare,
  MessageSquareQuote,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag as TagIcon,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Users2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";

export type AssociatedProject = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  brandName?: string | null;
};

export type AssociatedBrand = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

export type CustomerTagItem = {
  id: string;
  name: string;
  color?: string | null;
};

export type CustomerItem = {
  id: string;
  name: string;
  email: string | null;
  rawEmail: string;
  company?: string | null;
  title?: string | null;
  avatarUrl?: string | null;
  website?: string | null;
  stage: string;
  customAttributes?: Record<string, any>;
  tags: CustomerTagItem[];
  tagIds: string[];
  notesCount: number;
  testimonialCount: number;
  associatedProjects: AssociatedProject[];
  associatedBrands: AssociatedBrand[];
  createdAt: string;
  updatedAt: string;
  latestSubmission?: {
    id: string;
    rating: number | null;
    status: string;
    submittedAt: string;
  } | null;
};

export type CustomerStage = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  color?: string | null;
  order: number;
  isDefault: boolean;
  isSystem: boolean;
  customerCount?: number;
};

export type CustomerAttributeDef = {
  id: string;
  key: string;
  name: string;
  type: string;
  options?: string[];
  description?: string | null;
  order: number;
};

export type CustomerSegment = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  isDynamic: boolean;
  filterRules: any;
  customerCount: number;
};

export default function CustomersPage() {
  const { activeWorkspace } = useWorkspace();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [stages, setStages] = useState<CustomerStage[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [attributeDefs, setAttributeDefs] = useState<CustomerAttributeDef[]>([]);
  const [workspaceTags, setWorkspaceTags] = useState<{ id: string; name: string; color?: string | null }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; slug: string; color?: string | null }[]>([]);

  // Filtering and view state
  const [search, setSearch] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [isLoading, setIsLoading] = useState(true);

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  // Modal dialog states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isManageStagesModalOpen, setIsManageStagesModalOpen] = useState(false);
  const [isSaveSegmentModalOpen, setIsSaveSegmentModalOpen] = useState(false);
  const [isBulkStageModalOpen, setIsBulkStageModalOpen] = useState(false);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [bulkTargetStage, setBulkTargetStage] = useState("PROMOTER");
  const [bulkSelectedTagIds, setBulkSelectedTagIds] = useState<string[]>([]);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // Form input states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [formStage, setFormStage] = useState("NEW");
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [formCustomAttributes, setFormCustomAttributes] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Import state
  const [importCsvText, setImportCsvText] = useState("");
  const [importUpdateExisting, setImportUpdateExisting] = useState(true);
  const [importDefaultStage, setImportDefaultStage] = useState("NEW");
  const [isImporting, setIsImporting] = useState(false);
  const [importResultSummary, setImportResultSummary] = useState<string | null>(null);

  // Save Segment state
  const [newSegmentName, setNewSegmentName] = useState("");
  const [newSegmentDesc, setNewSegmentDesc] = useState("");
  const [newSegmentColor, setNewSegmentColor] = useState("#7049D8");
  const [isSavingSegment, setIsSavingSegment] = useState(false);

  // Manage Stages & Attributes Form State
  const [newStageName, setNewStageName] = useState("");
  const [newStageKey, setNewStageKey] = useState("");
  const [newStageColor, setNewStageColor] = useState("#10B981");
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrType, setNewAttrType] = useState("TEXT");
  const [newAttrOptions, setNewAttrOptions] = useState("");
  const [isCreatingAttr, setIsCreatingAttr] = useState(false);

  const toast = useToast();
  const workspaceId = activeWorkspace?.id;

  // Load CRM Metadata (Stages, Attributes, Segments, Tags, Projects)
  const fetchCrmMetadata = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const [stagesRes, attrsRes, segsRes, tagsRes, projsRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/customers/stages`),
        fetch(`/api/workspaces/${workspaceId}/customers/attributes`),
        fetch(`/api/workspaces/${workspaceId}/customers/segments`),
        fetch(`/api/workspaces/${workspaceId}/tags`),
        fetch(`/api/workspaces/${workspaceId}/projects`),
      ]);

      if (stagesRes.ok) {
        const d = await stagesRes.json();
        setStages(d.stages || []);
      }
      if (attrsRes.ok) {
        const d = await attrsRes.json();
        setAttributeDefs(d.attributes || []);
      }
      if (segsRes.ok) {
        const d = await segsRes.json();
        setSegments(d.segments || []);
      }
      if (tagsRes.ok) {
        const d = await tagsRes.json();
        setWorkspaceTags(d.tags || []);
      }
      if (projsRes.ok) {
        const d = await projsRes.json();
        setProjects(d.projects || []);
      }
    } catch {
      // ignore
    }
  }, [workspaceId]);

  // Fetch customers with active filters
  const fetchCustomers = useCallback(
    async (showLoading = true) => {
      if (!workspaceId) return;
      if (showLoading) setIsLoading(true);

      try {
        const url = new URL(
          `/api/workspaces/${workspaceId}/customers`,
          window.location.origin
        );
        if (search.trim()) url.searchParams.set("search", search.trim());
        if (stageFilter !== "all") url.searchParams.set("stage", stageFilter);
        if (tagFilter !== "all") url.searchParams.set("tagId", tagFilter);
        if (projectFilter !== "all") url.searchParams.set("projectId", projectFilter);
        if (activityFilter !== "all") url.searchParams.set("activity", activityFilter);
        if (selectedSegmentId !== "all") url.searchParams.set("segmentId", selectedSegmentId);
        if (sortBy) url.searchParams.set("sortBy", sortBy);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.customers || []);
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error("Failed to Load Customers", err.error || "Could not retrieve records.");
        }
      } catch (err) {
        console.error("Failed to load customers:", err);
        toast.error("Network Error", "Could not connect to Praise customer API.");
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [workspaceId, search, stageFilter, tagFilter, projectFilter, activityFilter, selectedSegmentId, sortBy, toast]
  );

  useEffect(() => {
    if (!workspaceId) return;
    fetchCrmMetadata();
  }, [workspaceId, fetchCrmMetadata]);

  useEffect(() => {
    if (!workspaceId) return;
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 150);

    return () => clearTimeout(timer);
  }, [workspaceId, fetchCustomers]);

  // Open Add modal with clean state
  const handleOpenAddModal = () => {
    setFormName("");
    setFormEmail("");
    setFormCompany("");
    setFormTitle("");
    setFormWebsite("");
    setFormAvatarUrl("");
    setFormStage(stages.find((s) => s.isDefault)?.key || "NEW");
    setFormTagIds([]);
    setFormCustomAttributes({});
    setEditingCustomer(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (c: CustomerItem) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormEmail(c.email || "");
    setFormCompany(c.company || "");
    setFormTitle(c.title || "");
    setFormWebsite(c.website || "");
    setFormAvatarUrl(c.avatarUrl || "");
    setFormStage(c.stage || "NEW");
    setFormTagIds(c.tagIds || []);
    setFormCustomAttributes(c.customAttributes || {});
    setIsAddModalOpen(true);
  };

  // Submit Add or Edit Customer
  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setIsSubmitting(true);

    try {
      const payload = {
        name: formName.trim(),
        email: formEmail.trim() || undefined,
        company: formCompany.trim() || null,
        title: formTitle.trim() || null,
        website: formWebsite.trim() || null,
        avatarUrl: formAvatarUrl.trim() || null,
        stage: formStage,
        tagIds: formTagIds,
        customAttributes: formCustomAttributes,
      };

      const url = editingCustomer
        ? `/api/workspaces/${workspaceId}/customers/${editingCustomer.id}`
        : `/api/workspaces/${workspaceId}/customers`;

      const res = await fetch(url, {
        method: editingCustomer ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save customer profile.");
      }

      toast.success(
        editingCustomer ? "Profile Updated" : "Customer Created",
        `Saved profile for ${data.customer.name}.`
      );
      setIsAddModalOpen(false);
      fetchCustomers();
      fetchCrmMetadata();
    } catch (err: unknown) {
      toast.error(
        "Save Failed",
        err instanceof Error ? err.message : "Error saving customer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete customer
  const handleDeleteCustomer = async () => {
    if (!workspaceId || !deletingCustomer) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/customers/${deletingCustomer.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Customer Deleted", "Customer profile removed.");
        setDeletingCustomer(null);
        setSelectedIds((prev) => prev.filter((id) => id !== deletingCustomer.id));
        fetchCustomers();
        fetchCrmMetadata();
      } else {
        toast.error("Delete Failed", "Could not delete customer.");
      }
    } catch {
      toast.error("Network Error", "Unable to delete customer.");
    }
  };

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Stage Update Execution
  const handleExecuteBulkStage = async () => {
    if (!workspaceId || selectedIds.length === 0) return;
    setIsBulkExecuting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/customers/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "STAGE",
          customerIds: selectedIds,
          stage: bulkTargetStage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Stages Updated", data.message);
        setIsBulkStageModalOpen(false);
        setSelectedIds([]);
        fetchCustomers();
        fetchCrmMetadata();
      } else {
        toast.error("Bulk Update Failed", data.error || "Could not update stages.");
      }
    } catch {
      toast.error("Network Error", "Bulk stage update failed.");
    } finally {
      setIsBulkExecuting(false);
    }
  };

  // Bulk Tagging Execution
  const handleExecuteBulkTag = async () => {
    if (!workspaceId || selectedIds.length === 0 || bulkSelectedTagIds.length === 0) return;
    setIsBulkExecuting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/customers/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TAG",
          customerIds: selectedIds,
          tagIds: bulkSelectedTagIds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Tags Applied", data.message);
        setIsBulkTagModalOpen(false);
        setBulkSelectedTagIds([]);
        setSelectedIds([]);
        fetchCustomers();
      } else {
        toast.error("Failed", data.error || "Could not apply tags.");
      }
    } catch {
      toast.error("Network Error", "Bulk tagging failed.");
    } finally {
      setIsBulkExecuting(false);
    }
  };

  // Bulk Delete Execution
  const handleExecuteBulkDelete = async () => {
    if (!workspaceId || selectedIds.length === 0) return;
    setIsBulkExecuting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/customers/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE",
          customerIds: selectedIds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Customers Deleted", data.message);
        setIsBulkDeleteConfirmOpen(false);
        setSelectedIds([]);
        fetchCustomers();
        fetchCrmMetadata();
      } else {
        toast.error("Failed", data.error || "Could not delete records.");
      }
    } catch {
      toast.error("Network Error", "Bulk delete failed.");
    } finally {
      setIsBulkExecuting(false);
    }
  };

  // Contact Import Handler
  const handleExecuteImport = async () => {
    if (!workspaceId || !importCsvText.trim()) return;
    setIsImporting(true);
    setImportResultSummary(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/customers/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText: importCsvText,
          updateExisting: importUpdateExisting,
          defaultStage: importDefaultStage,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Import Complete", data.message);
        setImportResultSummary(data.message);
        setImportCsvText("");
        fetchCustomers();
        fetchCrmMetadata();
      } else {
        toast.error("Import Failed", data.error || "Could not parse or import contacts.");
      }
    } catch {
      toast.error("Network Error", "Unable to complete contact import.");
    } finally {
      setIsImporting(false);
    }
  };

  // Contact Export Handler
  const handleExecuteExport = async (format: "csv" | "json") => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/customers/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          customerIds: selectedIds.length > 0 ? selectedIds : undefined,
          stage: stageFilter !== "all" ? stageFilter : undefined,
          tagId: tagFilter !== "all" ? tagFilter : undefined,
          search: search.trim() || undefined,
        }),
      });

      if (format === "csv") {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `praise-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Export Complete", "CSV file downloaded.");
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `praise-contacts-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Export Complete", "JSON data exported.");
      }
      setIsExportModalOpen(false);
    } catch {
      toast.error("Export Failed", "Could not export contacts.");
    }
  };

  // Save Dynamic Segment Handler
  const handleSaveDynamicSegment = async () => {
    if (!workspaceId || !newSegmentName.trim()) return;
    setIsSavingSegment(true);
    try {
      const filterRules = {
        stages: stageFilter !== "all" ? [stageFilter] : undefined,
        tagIds: tagFilter !== "all" ? [tagFilter] : undefined,
        searchQuery: search.trim() || undefined,
        hasApprovedTestimonial: activityFilter === "with_reviews" ? true : undefined,
        minTestimonials: activityFilter === "multiple" ? 2 : undefined,
      };

      const res = await fetch(`/api/workspaces/${workspaceId}/customers/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSegmentName.trim(),
          description: newSegmentDesc.trim() || null,
          color: newSegmentColor,
          filterRules,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Segment Created", `Dynamic segment "${data.segment.name}" saved.`);
        setIsSaveSegmentModalOpen(false);
        setNewSegmentName("");
        setNewSegmentDesc("");
        fetchCrmMetadata();
      } else {
        toast.error("Failed to Save Segment", data.error || "Could not save.");
      }
    } catch {
      toast.error("Network Error", "Unable to create segment.");
    } finally {
      setIsSavingSegment(false);
    }
  };

  // Create Stage Handler
  const handleCreateStage = async () => {
    if (!workspaceId || !newStageName.trim()) return;
    setIsCreatingStage(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/customers/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStageName.trim(),
          key: newStageKey.trim() || undefined,
          color: newStageColor,
          order: stages.length + 1,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Stage Created", `Added "${data.stage.name}" to lifecycle stages.`);
        setNewStageName("");
        setNewStageKey("");
        fetchCrmMetadata();
      } else {
        toast.error("Failed", data.error || "Could not create stage.");
      }
    } catch {
      toast.error("Error", "Could not create stage.");
    } finally {
      setIsCreatingStage(false);
    }
  };

  // Create Custom Attribute Handler
  const handleCreateAttribute = async () => {
    if (!workspaceId || !newAttrName.trim()) return;
    setIsCreatingAttr(true);
    try {
      const options = newAttrType === "SELECT" && newAttrOptions.trim()
        ? newAttrOptions.split(/[,\n]/).map((o) => o.trim()).filter(Boolean)
        : undefined;

      const res = await fetch(`/api/workspaces/${workspaceId}/customers/attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAttrName.trim(),
          key: newAttrKey.trim() || undefined,
          type: newAttrType,
          options,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Attribute Created", `Added custom field "${data.attribute.name}".`);
        setNewAttrName("");
        setNewAttrKey("");
        setNewAttrOptions("");
        fetchCrmMetadata();
      } else {
        toast.error("Failed", data.error || "Could not create attribute.");
      }
    } catch {
      toast.error("Error", "Could not create attribute.");
    } finally {
      setIsCreatingAttr(false);
    }
  };

  const getStageMeta = (key: string) => {
    const s = stages.find((st) => st.key.toUpperCase() === key.toUpperCase());
    if (s) return s;
    return {
      key,
      name: key.charAt(0) + key.slice(1).toLowerCase(),
      color: "#64748B",
    };
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    stageFilter !== "all" ||
    tagFilter !== "all" ||
    projectFilter !== "all" ||
    activityFilter !== "all" ||
    selectedSegmentId !== "all";

  const clearAllFilters = () => {
    setSearch("");
    setStageFilter("all");
    setTagFilter("all");
    setProjectFilter("all");
    setActivityFilter("all");
    setSelectedSegmentId("all");
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header with CRM Action Controls */}
      {/* ------------------------------------------------------------- */}
      <PageHeader
        title="Customer CRM & Advocacy"
        description="Lightweight customer directory tracking testimonial submitters, advocates, lifecycle stages, and brand relations."
        badge={`${customers.length} Contacts`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
            >
              <Upload size={13} className="text-brand-600" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
            >
              <Download size={13} className="text-brand-600" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => setIsManageStagesModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
              title="Customize lifecycle stages and custom fields"
            >
              <Settings size={13} className="text-ink-500" />
              <span>CRM Settings</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
            >
              <UserPlus size={14} />
              <span>Add Customer</span>
            </button>
          </div>
        }
      />

      {/* ------------------------------------------------------------- */}
      {/* 2. Customer Segments Quick Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-3 border-b border-line pb-2 overflow-x-auto text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Layers size={12} className="text-brand-600" />
            <span>Segments:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedSegmentId("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
              selectedSegmentId === "all"
                ? "bg-brand-500 text-white shadow-2xs"
                : "bg-white text-ink-600 border border-line hover:bg-warm-100"
            }`}
          >
            All Contacts ({customers.length})
          </button>

          {segments.map((seg) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => setSelectedSegmentId(seg.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                selectedSegmentId === seg.id
                  ? "bg-brand-500 text-white shadow-2xs font-semibold"
                  : "bg-white text-ink-700 border border-line hover:bg-warm-100"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: seg.color || "#7049D8" }}
              />
              <span>{seg.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedSegmentId === seg.id ? "bg-white/20 text-white" : "bg-warm-100 text-ink-500"
                }`}
              >
                {seg.customerCount}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsSaveSegmentModalOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline shrink-0"
        >
          <Sparkles size={12} />
          <span>Save Current View as Segment</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Search & Filter Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-line shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company, title..."
              className="w-full rounded-xl border border-line bg-warm-50/50 pl-9 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Lifecycle Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Stages</option>
            {stages.map((st) => (
              <option key={st.id} value={st.key}>
                Stage: {st.name}
              </option>
            ))}
          </select>

          {/* Tag Filter */}
          {workspaceTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="all">All Tags</option>
              {workspaceTags.map((t) => (
                <option key={t.id} value={t.id}>
                  Tag: {t.name}
                </option>
              ))}
            </select>
          )}

          {/* Project Filter */}
          {projects.length > 0 && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Project: {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Activity / Testimonial Filter */}
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Activity</option>
            <option value="with_reviews">With Testimonials</option>
            <option value="multiple">Repeat Reviewers (2+)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="newest">Sort: Recently Added</option>
            <option value="name">Sort: Name (A-Z)</option>
            <option value="testimonialsCount">Sort: Most Reviews</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* View mode toggle (Table / Cards) */}
        <div className="flex items-center gap-1 border-l border-line pl-3 self-end lg:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-lg border transition-colors ${
              viewMode === "table"
                ? "bg-warm-100 text-ink-900 border-line shadow-2xs"
                : "border-transparent text-ink-400 hover:text-ink-600"
            }`}
            title="Table View"
          >
            <List size={14} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`p-1.5 rounded-lg border transition-colors ${
              viewMode === "cards"
                ? "bg-warm-100 text-ink-900 border-line shadow-2xs"
                : "border-transparent text-ink-400 hover:text-ink-600"
            }`}
            title="Cards View"
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Bulk Action Floating Toolbar */}
      {/* ------------------------------------------------------------- */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-2xl border border-brand-200 bg-white/95 px-5 py-3 shadow-xl backdrop-blur-md text-xs">
          <span className="font-semibold text-ink-900 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white font-bold">
              {selectedIds.length}
            </span>
            <span>Selected</span>
          </span>

          <div className="h-4 w-px bg-line" />

          <button
            type="button"
            onClick={() => setIsBulkStageModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1 font-medium text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
          >
            <span>Update Stage</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkTagModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1 font-medium text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
          >
            <TagIcon size={12} className="text-brand-600" />
            <span>Apply Tags</span>
          </button>

          <button
            type="button"
            onClick={() => handleExecuteExport("csv")}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1 font-medium text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
          >
            <Download size={12} className="text-brand-600" />
            <span>Export Selected</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkDeleteConfirmOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1 font-medium text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs"
          >
            <Trash2 size={12} />
            <span>Delete Selected</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-[11px] text-brand-700 hover:underline px-2"
          >
            Deselect All
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. Main Customer List (Table or Card View) */}
      {/* ------------------------------------------------------------- */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-14 text-center">
          <Loader2 size={24} className="animate-spin text-brand-500 mx-auto" />
          <p className="text-xs text-ink-500 mt-2">Loading customer CRM directory...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-8 shadow-xs">
          <EmptyState
            icon={Users2}
            title={hasActiveFilters ? "No matching contacts found" : "No customers in CRM yet"}
            description={
              hasActiveFilters
                ? "Try adjusting your search query, lifecycle stage filter, or tag selection."
                : "Customers are automatically profiled when submitting testimonials, or you can import an existing contact list."
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
                >
                  Clear all filters
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
                  >
                    Import Contacts (CSV)
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600"
                  >
                    Add Customer
                  </button>
                </div>
              )
            }
          />
        </div>
      ) : viewMode === "table" ? (
        /* TABLE CRM VIEW */
        <div className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-warm-50/70 text-ink-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={customers.length > 0 && selectedIds.length === customers.length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-line text-brand-500 focus:ring-brand-500"
                      aria-label="Select all customers"
                    />
                  </th>
                  <th className="py-3 px-3 font-semibold">Customer / Advocate</th>
                  <th className="py-3 px-3 font-semibold">Lifecycle Stage</th>
                  <th className="py-3 px-3 font-semibold">Company &amp; Role</th>
                  <th className="py-3 px-3 font-semibold">Tags</th>
                  <th className="py-3 px-3 font-semibold">Associated Projects</th>
                  <th className="py-3 px-3 font-semibold text-center">Reviews</th>
                  <th className="py-3 px-3 font-semibold">Notes</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customers.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  const stageMeta = getStageMeta(c.stage);

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-warm-50/70 transition-colors group ${
                        isSelected ? "bg-brand-50/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(c.id)}
                          className="rounded border-line text-brand-500 focus:ring-brand-500"
                          aria-label={`Select ${c.name}`}
                        />
                      </td>

                      {/* Name & Contact */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {c.avatarUrl ? (
                            <div className="h-8 w-8 rounded-full overflow-hidden border border-line shrink-0 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={c.avatarUrl}
                                alt={c.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {c.name ? c.name.slice(0, 2) : "CU"}
                            </div>
                          )}
                          <div className="min-w-0 max-w-[170px]">
                            <Link
                              href={`/dashboard/customers/${c.id}`}
                              className="font-semibold text-ink-900 hover:text-brand-600 transition-colors truncate block"
                            >
                              {c.name}
                            </Link>
                            <div className="text-[11px] text-ink-400 truncate flex items-center gap-1">
                              {c.email ? (
                                <span>{c.email}</span>
                              ) : (
                                <span className="italic text-ink-400">No email</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Lifecycle Stage Badge */}
                      <td className="py-3 px-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shadow-2xs"
                          style={{
                            backgroundColor: `${stageMeta.color}15`,
                            color: stageMeta.color || "#10B981",
                            borderColor: `${stageMeta.color}35`,
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: stageMeta.color || "#10B981" }}
                          />
                          <span>{stageMeta.name}</span>
                        </span>
                      </td>

                      {/* Company & Role */}
                      <td className="py-3 px-3 max-w-[160px]">
                        <div className="font-medium text-ink-800 truncate">
                          {c.company || <span className="text-ink-400 italic font-normal">None</span>}
                        </div>
                        <div className="text-[11px] text-ink-400 truncate">
                          {c.title || (c.website ? <span className="text-brand-600">{c.website}</span> : "—")}
                        </div>
                      </td>

                      {/* Tags */}
                      <td className="py-3 px-3 max-w-[150px]">
                        <div className="flex flex-wrap items-center gap-1">
                          {c.tags.length === 0 ? (
                            <span className="text-ink-400 text-[10px] italic">—</span>
                          ) : (
                            c.tags.map((t) => (
                              <span
                                key={t.id}
                                className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium border"
                                style={{
                                  backgroundColor: `${t.color || "#7049D8"}12`,
                                  color: t.color || "#7049D8",
                                  borderColor: `${t.color || "#7049D8"}30`,
                                }}
                              >
                                {t.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Associated Projects & Brands */}
                      <td className="py-3 px-3 max-w-[160px]">
                        <div className="flex flex-wrap items-center gap-1">
                          {c.associatedProjects.length === 0 ? (
                            <span className="text-ink-400 text-[10px] italic">None</span>
                          ) : (
                            c.associatedProjects.map((p) => (
                              <span
                                key={p.id}
                                className="inline-flex items-center gap-1 rounded bg-warm-50 px-1.5 py-0.5 text-[10px] text-ink-600 border border-line truncate max-w-[130px]"
                                title={`Project: ${p.name}${p.brandName ? ` (${p.brandName})` : ""}`}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: p.color || "#7049D8" }}
                                />
                                <span className="truncate">{p.name}</span>
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Testimonial Count & Rating */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                            c.testimonialCount > 0
                              ? "bg-brand-50 text-brand-700 border border-brand-200"
                              : "bg-warm-100 text-ink-500"
                          }`}
                        >
                          <MessageSquareQuote size={11} />
                          <span>{c.testimonialCount}</span>
                        </span>
                      </td>

                      {/* Notes count */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {c.notesCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-ink-600">
                            <FileText size={11} className="text-brand-600" />
                            <span>{c.notesCount} note{c.notesCount === 1 ? "" : "s"}</span>
                          </span>
                        ) : (
                          <span className="text-ink-400 text-[10px] italic">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/customers/${c.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
                          >
                            <span>Profile</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1 rounded-lg border border-line bg-white text-ink-500 hover:text-brand-600 hover:bg-warm-50 transition-colors"
                            title="Edit profile"
                          >
                            <Edit2 size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingCustomer(c)}
                            className="p-1 rounded-lg border border-line bg-white text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete customer"
                          >
                            <Trash2 size={12} />
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
        /* CARDS CRM VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => {
            const isSelected = selectedIds.includes(c.id);
            const stageMeta = getStageMeta(c.stage);

            return (
              <div
                key={c.id}
                className={`rounded-2xl border bg-white p-4 space-y-3.5 transition-all shadow-xs ${
                  isSelected ? "border-brand-500 ring-2 ring-brand-500/10 bg-brand-50/20" : "border-line"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(c.id)}
                      className="rounded border-line text-brand-500 focus:ring-brand-500"
                    />
                    {c.avatarUrl ? (
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-line shrink-0 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.avatarUrl} alt={c.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {c.name ? c.name.slice(0, 2) : "CU"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/customers/${c.id}`}
                        className="font-semibold text-ink-900 hover:text-brand-600 truncate block text-sm"
                      >
                        {c.name}
                      </Link>
                      <div className="text-[11px] text-ink-400 truncate">
                        {c.email || "No email"}
                      </div>
                    </div>
                  </div>

                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shadow-2xs shrink-0"
                    style={{
                      backgroundColor: `${stageMeta.color}15`,
                      color: stageMeta.color || "#10B981",
                      borderColor: `${stageMeta.color}35`,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: stageMeta.color || "#10B981" }}
                    />
                    <span>{stageMeta.name}</span>
                  </span>
                </div>

                <div className="text-xs space-y-1 pt-1 border-t border-line/60 text-ink-600">
                  {(c.company || c.title) && (
                    <div className="flex items-center gap-1 text-[11px]">
                      <Building2 size={12} className="text-ink-400 shrink-0" />
                      <span className="truncate">
                        {c.title ? `${c.title} at ` : ""}
                        <strong>{c.company}</strong>
                      </span>
                    </div>
                  )}

                  {c.website && (
                    <div className="flex items-center gap-1 text-[11px]">
                      <Globe size={12} className="text-ink-400 shrink-0" />
                      <a
                        href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 hover:underline truncate"
                      >
                        {c.website}
                      </a>
                    </div>
                  )}
                </div>

                {/* Tags and Projects */}
                <div className="space-y-1.5 pt-1">
                  {c.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t.id}
                          className="px-1.5 py-0.2 rounded text-[10px] font-medium border"
                          style={{
                            backgroundColor: `${t.color || "#7049D8"}12`,
                            color: t.color || "#7049D8",
                            borderColor: `${t.color || "#7049D8"}30`,
                          }}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {c.associatedProjects.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-ink-500">
                      {c.associatedProjects.map((p) => (
                        <span key={p.id} className="bg-warm-100 px-1.5 py-0.5 rounded text-ink-600">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer stats & buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-ink-500">
                    <span className="font-semibold text-brand-700">
                      {c.testimonialCount} review{c.testimonialCount === 1 ? "" : "s"}
                    </span>
                    <span>•</span>
                    <span>{c.notesCount} note{c.notesCount === 1 ? "" : "s"}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/dashboard/customers/${c.id}`}
                      className="px-2.5 py-1 rounded-lg border border-line bg-white text-ink-700 font-semibold hover:bg-warm-100 text-[11px]"
                    >
                      View CRM 360
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(c)}
                      className="p-1 rounded-lg border border-line text-ink-500 hover:bg-warm-100"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. Modal: Add / Edit Customer with CRM Fields */}
      {/* ------------------------------------------------------------- */}
      <ModalDialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingCustomer ? "Edit Customer Profile" : "Add Customer Profile"}
        description="Configure contact information, lifecycle advocacy stage, tags, and custom CRM attributes."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="customer-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              <span>{editingCustomer ? "Save Changes" : "Create Customer"}</span>
            </button>
          </div>
        }
      >
        <form id="customer-form" onSubmit={handleSubmitCustomer} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-900 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-900 mb-1">Email Address</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-900 mb-1">Company / Organization</label>
              <input
                type="text"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-900 mb-1">Job Title / Role</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Head of Engineering"
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-900 mb-1">Website URL</label>
              <input
                type="url"
                value={formWebsite}
                onChange={(e) => setFormWebsite(e.target.value)}
                placeholder="https://acme.com"
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-900 mb-1">Lifecycle Stage</label>
              <select
                value={formStage}
                onChange={(e) => setFormStage(e.target.value)}
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              >
                {stages.map((st) => (
                  <option key={st.id} value={st.key}>
                    {st.name} ({st.key})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags Selector */}
          {workspaceTags.length > 0 && (
            <div>
              <label className="block font-semibold text-ink-900 mb-1">Customer Tags</label>
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-line bg-warm-50/50 max-h-32 overflow-y-auto">
                {workspaceTags.map((tag) => {
                  const isChecked = formTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setFormTagIds((prev) =>
                          prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        isChecked
                          ? "bg-brand-50 text-brand-900 border-brand-300 font-semibold"
                          : "bg-white text-ink-600 border-line hover:bg-warm-100"
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: tag.color || "#7049D8" }}
                      />
                      <span>{tag.name}</span>
                      {isChecked && <Check size={12} className="text-brand-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Custom Attributes */}
          {attributeDefs.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-line">
              <span className="text-xs font-semibold text-ink-900 block">Custom Customer Attributes</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attributeDefs.map((attr) => (
                  <div key={attr.id}>
                    <label className="block text-[11px] font-medium text-ink-700 mb-0.5">
                      {attr.name}
                    </label>
                    {attr.type === "SELECT" && attr.options && attr.options.length > 0 ? (
                      <select
                        value={formCustomAttributes[attr.key] || ""}
                        onChange={(e) =>
                          setFormCustomAttributes((prev) => ({
                            ...prev,
                            [attr.key]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                      >
                        <option value="">Select option...</option>
                        {attr.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={attr.type === "NUMBER" ? "number" : attr.type === "DATE" ? "date" : "text"}
                        value={formCustomAttributes[attr.key] || ""}
                        onChange={(e) =>
                          setFormCustomAttributes((prev) => ({
                            ...prev,
                            [attr.key]: e.target.value,
                          }))
                        }
                        placeholder={attr.description || `Enter ${attr.name}`}
                        className="w-full rounded-xl border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </ModalDialog>

      {/* ------------------------------------------------------------- */}
      {/* 7. Modal: Import Contacts (CSV/JSON) with Duplicate Avoidance */}
      {/* ------------------------------------------------------------- */}
      <ModalDialog
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportResultSummary(null);
        }}
        title="Import Customer Contacts"
        description="Upload or paste contact lists with automatic duplicate detection and safe profile merging."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isImporting || !importCsvText.trim()}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50"
            >
              {isImporting && <Loader2 size={13} className="animate-spin" />}
              <span>Import Contacts</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {importResultSummary && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 font-medium">
              {importResultSummary}
            </div>
          )}

          <div className="space-y-1">
            <label className="font-semibold text-ink-900 block">Paste CSV Contacts</label>
            <p className="text-[11px] text-ink-500">
              Columns supported: <code>name, email, company, title, website, stage, tags</code>
            </p>
            <textarea
              rows={6}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder={`name,email,company,title,stage,tags\nAlice Smith,alice@acme.com,Acme Corp,CTO,Promoter,"Enterprise; VIP"\nBob Jones,bob@techstart.io,TechStart,Founder,Champion,PowerUser`}
              className="w-full rounded-xl border border-line p-3 font-mono text-[11px] text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-line">
            <div>
              <label className="font-semibold text-ink-900 block mb-1">Default Stage for New Contacts</label>
              <select
                value={importDefaultStage}
                onChange={(e) => setImportDefaultStage(e.target.value)}
                className="w-full rounded-xl border border-line p-2 text-xs text-ink-900"
              >
                {stages.map((st) => (
                  <option key={st.id} value={st.key}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink-800">
                <input
                  type="checkbox"
                  checked={importUpdateExisting}
                  onChange={(e) => setImportUpdateExisting(e.target.checked)}
                  className="rounded border-line text-brand-500 focus:ring-brand-500"
                />
                <span>Update existing profiles on matching email (Never creates duplicates)</span>
              </label>
            </div>
          </div>
        </div>
      </ModalDialog>

      {/* ------------------------------------------------------------- */}
      {/* 8. Modal: Export Contacts (CSV / JSON) */}
      {/* ------------------------------------------------------------- */}
      <ModalDialog
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Contacts & Advocates"
        description="Download your filtered customer list or selected contacts."
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleExecuteExport("csv")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600"
            >
              <Download size={13} />
              <span>Download CSV</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecuteExport("json")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              <span>Download JSON</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-ink-600">
          <p>
            You are about to export{" "}
            <strong>
              {selectedIds.length > 0 ? `${selectedIds.length} selected contacts` : `all ${customers.length} filtered contacts`}
            </strong>
            .
          </p>
          <div className="rounded-xl border border-line bg-warm-50/50 p-3 text-[11px] space-y-1 text-ink-500">
            <div>Export contains:</div>
            <ul className="list-disc list-inside text-ink-700 space-y-0.5">
              <li>Full contact credentials (name, email, company, role, website)</li>
              <li>Advocacy lifecycle stage and assigned tags</li>
              <li>Testimonial submission counts</li>
              <li>Associated projects and brand reviews</li>
              <li>Custom CRM attribute values</li>
            </ul>
          </div>
        </div>
      </ModalDialog>

      {/* ------------------------------------------------------------- */}
      {/* 9. Modal: Manage Stages & Custom Attributes */}
      {/* ------------------------------------------------------------- */}
      <ModalDialog
        isOpen={isManageStagesModalOpen}
        onClose={() => setIsManageStagesModalOpen(false)}
        title="Customize Lifecycle Stages & Fields"
        description="Tailor customer lifecycle stages and define custom attributes for your workspace."
        maxWidth="2xl"
        footer={
          <button
            type="button"
            onClick={() => setIsManageStagesModalOpen(false)}
            className="rounded-lg border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
          >
            Done
          </button>
        }
      >
        <div className="space-y-6 text-xs max-h-[70vh] overflow-y-auto pr-1">
          {/* Lifecycle Stages Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink-900 text-sm">Customer Lifecycle Stages</span>
              <span className="text-[11px] text-ink-400">Total: {stages.length}</span>
            </div>

            <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
              {stages.map((st) => (
                <div key={st.id} className="p-2.5 flex items-center justify-between bg-white hover:bg-warm-50/50">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: st.color || "#10B981" }}
                    />
                    <div>
                      <span className="font-semibold text-ink-900">{st.name}</span>
                      <span className="text-[10px] text-ink-400 ml-2">({st.key})</span>
                      {st.description && (
                        <p className="text-[10px] text-ink-500">{st.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-ink-500">
                    {st.customerCount ?? 0} customers
                  </div>
                </div>
              ))}
            </div>

            {/* Add custom stage form */}
            <div className="p-3 bg-warm-50/60 rounded-xl border border-line space-y-2">
              <span className="font-semibold text-ink-800 text-[11px]">Add Custom Stage</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Stage Name (e.g. VIP VIP)"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="rounded-lg border border-line p-1.5 text-xs"
                />
                <input
                  type="text"
                  placeholder="Key (e.g. VIP)"
                  value={newStageKey}
                  onChange={(e) => setNewStageKey(e.target.value)}
                  className="rounded-lg border border-line p-1.5 text-xs uppercase"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer"
                  />
                  <button
                    type="button"
                    disabled={isCreatingStage || !newStageName.trim()}
                    onClick={handleCreateStage}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    Add Stage
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Attributes Section */}
          <div className="space-y-3 pt-3 border-t border-line">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink-900 text-sm">Custom Customer Attributes</span>
              <span className="text-[11px] text-ink-400">Total: {attributeDefs.length}</span>
            </div>

            {attributeDefs.length > 0 ? (
              <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
                {attributeDefs.map((attr) => (
                  <div key={attr.id} className="p-2.5 flex items-center justify-between bg-white">
                    <div>
                      <span className="font-semibold text-ink-900">{attr.name}</span>
                      <span className="text-[10px] text-ink-400 ml-2">
                        key: <code>{attr.key}</code> • Type: {attr.type}
                      </span>
                      {attr.options && attr.options.length > 0 && (
                        <p className="text-[10px] text-brand-600">
                          Options: {attr.options.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-400 italic">No custom attributes defined yet.</p>
            )}

            {/* Add custom attribute form */}
            <div className="p-3 bg-warm-50/60 rounded-xl border border-line space-y-2">
              <span className="font-semibold text-ink-800 text-[11px]">Add Custom Attribute</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Field Name (e.g. Plan)"
                  value={newAttrName}
                  onChange={(e) => setNewAttrName(e.target.value)}
                  className="rounded-lg border border-line p-1.5 text-xs"
                />
                <input
                  type="text"
                  placeholder="Key (e.g. plan)"
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  className="rounded-lg border border-line p-1.5 text-xs lowercase"
                />
                <select
                  value={newAttrType}
                  onChange={(e) => setNewAttrType(e.target.value)}
                  className="rounded-lg border border-line p-1.5 text-xs"
                >
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                  <option value="SELECT">Select Dropdown</option>
                </select>
              </div>

              {newAttrType === "SELECT" && (
                <input
                  type="text"
                  placeholder="Comma-separated options: Free, Starter, Pro, Enterprise"
                  value={newAttrOptions}
                  onChange={(e) => setNewAttrOptions(e.target.value)}
                  className="w-full rounded-lg border border-line p-1.5 text-xs"
                />
              )}

              <button
                type="button"
                disabled={isCreatingAttr || !newAttrName.trim()}
                onClick={handleCreateAttribute}
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Add Attribute Definition
              </button>
            </div>
          </div>
        </div>
      </ModalDialog>

      {/* ------------------------------------------------------------- */}
      {/* 10. Modal: Save Current View as Dynamic Segment */}
      {/* ------------------------------------------------------------- */}
      <ModalDialog
        isOpen={isSaveSegmentModalOpen}
        onClose={() => setIsSaveSegmentModalOpen(false)}
        title="Save as Dynamic Segment"
        description="Save your current filters as a dynamic segment that automatically updates as contacts change."
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsSaveSegmentModalOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSavingSegment || !newSegmentName.trim()}
              onClick={handleSaveDynamicSegment}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50"
            >
              {isSavingSegment && <Loader2 size={13} className="animate-spin" />}
              <span>Save Segment</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-ink-900 block mb-1">Segment Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Active Promoters, 2+ Testimonials"
              value={newSegmentName}
              onChange={(e) => setNewSegmentName(e.target.value)}
              className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-ink-900 block mb-1">Description (optional)</label>
            <input
              type="text"
              placeholder="Audience description or advocacy goal"
              value={newSegmentDesc}
              onChange={(e) => setNewSegmentDesc(e.target.value)}
              className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-line bg-warm-50/50 p-3 text-[11px] text-ink-600 space-y-1">
            <div className="font-semibold text-ink-800">Current Filter Criteria Captured:</div>
            <div>Stage: <strong>{stageFilter === "all" ? "Any" : stageFilter}</strong></div>
            <div>Tag: <strong>{tagFilter === "all" ? "Any" : tagFilter}</strong></div>
            <div>Activity: <strong>{activityFilter}</strong></div>
            {search && <div>Search query: <strong>{search}</strong></div>}
          </div>
        </div>
      </ModalDialog>

      {/* ------------------------------------------------------------- */}
      {/* 11. Modal: Bulk Update Stage */}
      {/* ------------------------------------------------------------- */}
      <ModalDialog
        isOpen={isBulkStageModalOpen}
        onClose={() => setIsBulkStageModalOpen(false)}
        title="Bulk Update Lifecycle Stage"
        description={`Select new advocacy stage to apply across all ${selectedIds.length} selected customers.`}
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsBulkStageModalOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isBulkExecuting}
              onClick={handleExecuteBulkStage}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50"
            >
              {isBulkExecuting && <Loader2 size={13} className="animate-spin" />}
              <span>Update {selectedIds.length} Customers</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <label className="font-semibold text-ink-900 block">Target Lifecycle Stage</label>
          <select
            value={bulkTargetStage}
            onChange={(e) => setBulkTargetStage(e.target.value)}
            className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900"
          >
            {stages.map((st) => (
              <option key={st.id} value={st.key}>
                {st.name} ({st.key})
              </option>
            ))}
          </select>
        </div>
      </ModalDialog>

      {/* ------------------------------------------------------------- */}
      {/* 12. Modal: Bulk Apply Tags */}
      {/* ------------------------------------------------------------- */}
      <ModalDialog
        isOpen={isBulkTagModalOpen}
        onClose={() => setIsBulkTagModalOpen(false)}
        title="Apply Tags in Bulk"
        description={`Choose tags to associate with ${selectedIds.length} selected customers.`}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsBulkTagModalOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isBulkExecuting || bulkSelectedTagIds.length === 0}
              onClick={handleExecuteBulkTag}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50"
            >
              {isBulkExecuting && <Loader2 size={13} className="animate-spin" />}
              <span>Apply {bulkSelectedTagIds.length} Tag(s)</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          {workspaceTags.length === 0 ? (
            <p className="text-ink-400 italic">No workspace tags found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
              {workspaceTags.map((tag) => {
                const isChecked = bulkSelectedTagIds.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-brand-50/50 border-brand-400 text-brand-900"
                        : "bg-white border-line hover:bg-warm-50 text-ink-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setBulkSelectedTagIds((prev) =>
                          prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                        );
                      }}
                      className="rounded border-line text-brand-500 focus:ring-brand-500"
                    />
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color || "#7049D8" }}
                    />
                    <span className="truncate">{tag.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </ModalDialog>

      {/* ------------------------------------------------------------- */}
      {/* 13. Single & Bulk Delete Confirm Dialogs */}
      {/* ------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={Boolean(deletingCustomer)}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer Profile"
        message={`Are you sure you want to delete profile for "${deletingCustomer?.name}"? Associated historical testimonials will be retained.`}
        confirmLabel="Delete Customer"
        isDestructive={true}
      />

      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={handleExecuteBulkDelete}
        title="Bulk Delete Customer Profiles"
        message={`Are you sure you want to delete ${selectedIds.length} selected customer records? This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} Customers`}
        isDestructive={true}
      />
    </div>
  );
}
