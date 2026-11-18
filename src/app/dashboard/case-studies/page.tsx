"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe,
  Inbox,
  Layers,
  Layout,
  LayoutGrid,
  Loader2,
  MoreVertical,
  Pause,
  Play,
  Plus,
  QrCode,
  Quote,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users2,
  Video,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataCard } from "@/components/dashboard/data-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { CASE_STUDY_TEMPLATES } from "@/lib/case-studies/templates";
import {
  CaseStudyFormDetail,
  CaseStudyResponseDetail,
  CaseStudyResponseStatus,
  CaseStudyTemplateItem,
} from "@/lib/case-studies/types";
import type { CustomerStoryDetail } from "@/lib/customer-stories/types";
import { CaseStudyBuilder } from "@/components/dashboard/case-studies/case-study-builder";
import { ResponseDetailModal } from "@/components/dashboard/case-studies/response-detail-modal";
import { StoryListView } from "@/components/dashboard/customer-stories/story-list-view";
import { StoryEditorModal } from "@/components/dashboard/customer-stories/story-editor-modal";
import { cn } from "@/lib/utils";

type ActiveTab = "responses" | "stories" | "forms" | "templates";

export default function CaseStudiesPage() {
  const { activeWorkspace, activeProject } = useWorkspace();
  const workspaceId =
    activeWorkspace && !activeWorkspace.id.startsWith("ws-default")
      ? activeWorkspace.id
      : undefined;
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>("responses");
  const [forms, setForms] = useState<CaseStudyFormDetail[]>([]);
  const [responses, setResponses] = useState<CaseStudyResponseDetail[]>([]);
  const [customerStories, setCustomerStories] = useState<CustomerStoryDetail[]>([]);
  const [templates, setTemplates] = useState<CaseStudyTemplateItem[]>(CASE_STUDY_TEMPLATES);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals & Builders
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<CaseStudyFormDetail | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<CaseStudyResponseDetail | null>(null);
  const [editingStory, setEditingStory] = useState<CustomerStoryDetail | null>(null);
  const [shareForm, setShareForm] = useState<CaseStudyFormDetail | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Deletion confirm
  const [deletingForm, setDeletingForm] = useState<CaseStudyFormDetail | null>(null);
  const [deletingResponse, setDeletingResponse] = useState<CaseStudyResponseDetail | null>(null);

  // Fetch all data
  const fetchData = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const [formsRes, respRes, projRes, brandRes, tmplRes, storiesRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/case-studies/forms`),
        fetch(`/api/workspaces/${workspaceId}/case-studies/responses`),
        fetch(`/api/workspaces/${workspaceId}/projects`),
        fetch(`/api/workspaces/${workspaceId}/brands`),
        fetch(`/api/workspaces/${workspaceId}/case-studies/templates`),
        fetch(`/api/workspaces/${workspaceId}/customer-stories`),
      ]);

      if (formsRes.ok) {
        const d = await formsRes.json();
        setForms(d.forms || []);
      }
      if (respRes.ok) {
        const d = await respRes.json();
        setResponses(d.responses || []);
      }
      if (projRes.ok) {
        const d = await projRes.json();
        setProjects(d.projects || []);
      }
      if (brandRes.ok) {
        const d = await brandRes.json();
        setBrands(d.brands || []);
      }
      if (tmplRes.ok) {
        const d = await tmplRes.json();
        setTemplates(d.templates || CASE_STUDY_TEMPLATES);
      }
      if (storiesRes.ok) {
        const d = await storiesRes.json();
        setCustomerStories(d.stories || []);
      }
    } catch (err: any) {
      toast.error("Failed to load data", err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  // Filtered Responses
  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (activeProject && r.projectId && r.projectId !== activeProject.id) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          r.companyName.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerEmail.toLowerCase().includes(q) ||
          (r.editorialTitle && r.editorialTitle.toLowerCase().includes(q)) ||
          r.resultsAchieved.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [responses, statusFilter, activeProject, search]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = responses.length;
    const approved = responses.filter((r) => r.status === "APPROVED" || r.status === "PUBLISHED").length;
    const underReview = responses.filter((r) => r.status === "UNDER_REVIEW" || r.status === "SUBMITTED").length;
    let totalOutcomes = 0;
    responses.forEach((r) => {
      totalOutcomes += r.measurableOutcomes.length;
    });
    return {
      total,
      approved,
      underReview,
      totalOutcomes,
      activeForms: forms.filter((f) => f.status === "ACTIVE").length,
    };
  }, [responses, forms]);

  // Copy share URL
  const handleCopyLink = (slug: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const url = `${origin}/cs/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success("Link Copied", "Public case study collection URL copied to clipboard.");
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  // Quick Approve response
  const handleQuickApprove = async (r: CaseStudyResponseDetail) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/case-studies/responses/${r.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "APPROVED" }),
        }
      );
      if (!res.ok) throw new Error("Failed to approve");
      const data = await res.json();
      setResponses((prev) => prev.map((item) => (item.id === r.id ? data.response : item)));
      toast.success("Case Study Approved", `Approved "${r.companyName}" case study.`);
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to approve response.");
    }
  };

  // Toggle Form Status (ACTIVE <-> PAUSED)
  const handleToggleFormStatus = async (f: CaseStudyFormDetail) => {
    if (!workspaceId) return;
    const nextStatus = f.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/case-studies/forms/${f.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      if (!res.ok) throw new Error("Failed to update status");
      const data = await res.json();
      setForms((prev) => prev.map((item) => (item.id === f.id ? data.form : item)));
      toast.success("Form Updated", `Form is now ${nextStatus.toLowerCase()}.`);
    } catch (err: any) {
      toast.error("Error", err.message || "Failed to update form.");
    }
  };

  // Delete Form
  const handleDeleteForm = async () => {
    if (!workspaceId || !deletingForm) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/case-studies/forms/${deletingForm.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete form");
      setForms((prev) => prev.filter((f) => f.id !== deletingForm.id));
      toast.success("Form Deleted", `Deleted "${deletingForm.title}".`);
      setDeletingForm(null);
    } catch (err: any) {
      toast.error("Delete Error", err.message);
    }
  };

  // Delete Response
  const handleDeleteResponse = async () => {
    if (!workspaceId || !deletingResponse) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/case-studies/responses/${deletingResponse.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete response");
      setResponses((prev) => prev.filter((r) => r.id !== deletingResponse.id));
      toast.success("Response Deleted", "Case study response deleted.");
      setDeletingResponse(null);
    } catch (err: any) {
      toast.error("Delete Error", err.message);
    }
  };

  const statusColors = {
    SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
    UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PUBLISHED: "bg-brand-50 text-brand-700 border-brand-200",
    ARCHIVED: "bg-neutral-100 text-neutral-600 border-neutral-300",
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <PageHeader
        title="Customer Case Studies"
        description="Collect, review, and curate structured customer success stories, measurable outcomes, and quotes."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsRefreshing(true);
                fetchData();
              }}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                setEditingForm(null);
                setIsBuilderOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
            >
              <Plus size={14} />
              <span>Create Case Study Form</span>
            </button>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DataCard
          title="Total Stories Received"
          value={stats.total.toString()}
          description={`${stats.underReview} pending review`}
          icon={BookOpen}
        />
        <DataCard
          title="Approved & Published"
          value={stats.approved.toString()}
          description="Verified for marketing & brand pages"
          icon={CheckCircle2}
        />
        <DataCard
          title="Active Collection Forms"
          value={stats.activeForms.toString()}
          description="Live public collection links"
          icon={Globe}
        />
        <DataCard
          title="Measurable Metrics Logged"
          value={stats.totalOutcomes.toString()}
          description="Quantifiable business outcomes"
          icon={TrendingUp}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-line pb-px">
        <button
          type="button"
          onClick={() => setActiveTab("responses")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all",
            activeTab === "responses"
              ? "border-brand-500 text-brand-600 bg-brand-50/40"
              : "border-transparent text-ink-600 hover:text-ink-900 hover:border-warm-300"
          )}
        >
          <BookOpen size={14} />
          <span>Case Studies & Responses</span>
          {responses.length > 0 && (
            <span className="rounded-full bg-brand-100 text-brand-700 px-1.5 py-0.2 text-[10px]">
              {responses.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stories")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all",
            activeTab === "stories"
              ? "border-brand-500 text-brand-600 bg-brand-50/40"
              : "border-transparent text-ink-600 hover:text-ink-900 hover:border-warm-300"
          )}
        >
          <Sparkles size={14} className="text-brand-600" />
          <span>Published Stories</span>
          {customerStories.length > 0 && (
            <span className="rounded-full bg-brand-100 text-brand-700 px-1.5 py-0.2 text-[10px]">
              {customerStories.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("forms")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all",
            activeTab === "forms"
              ? "border-brand-500 text-brand-600 bg-brand-50/40"
              : "border-transparent text-ink-600 hover:text-ink-900 hover:border-warm-300"
          )}
        >
          <Inbox size={14} />
          <span>Collection Forms</span>
          {forms.length > 0 && (
            <span className="rounded-full bg-warm-100 text-ink-600 px-1.5 py-0.2 text-[10px]">
              {forms.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all",
            activeTab === "templates"
              ? "border-brand-500 text-brand-600 bg-brand-50/40"
              : "border-transparent text-ink-600 hover:text-ink-900 hover:border-warm-300"
          )}
        >
          <Layout size={14} />
          <span>Templates</span>
        </button>
      </div>

      {/* TAB 1: RESPONSES & REVIEW */}
      {activeTab === "responses" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-ink-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search company, name, results..."
                  className="w-64 rounded-xl border border-line bg-white pl-9 pr-3 py-1.5 text-xs text-ink-900 outline-none focus:border-brand-500"
                />
              </div>

              {/* Status Filter */}
              <div className="inline-flex items-center rounded-xl border border-line bg-white p-1 shadow-2xs">
                {(
                  [
                    { id: "ALL", label: "All" },
                    { id: "SUBMITTED", label: "Submitted" },
                    { id: "UNDER_REVIEW", label: "Review" },
                    { id: "APPROVED", label: "Approved" },
                    { id: "PUBLISHED", label: "Published" },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                      statusFilter === st.id
                        ? "bg-brand-500 text-white shadow-2xs"
                        : "text-ink-600 hover:text-ink-900"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-ink-500">
              Showing <strong>{filteredResponses.length}</strong> of {responses.length} case studies
            </span>
          </div>

          {/* Responses Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl border border-line bg-white animate-pulse" />
              ))}
            </div>
          ) : filteredResponses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={search ? "No matching case studies" : "No case studies submitted yet"}
              description={
                search
                  ? "Try clearing your search query or status filter."
                  : "Share your case study form link with your happiest customers to start collecting stories."
              }
              action={
                forms.length > 0 ? (
                  <button
                    onClick={() => handleCopyLink(forms[0].slug)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-600"
                  >
                    <Copy size={13} />
                    <span>Copy Form Link</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsBuilderOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-600"
                  >
                    <Plus size={14} />
                    <span>Create Your First Form</span>
                  </button>
                )
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-warm-50/70 text-ink-500 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Company & Story</th>
                      <th className="px-4 py-3">Respondent</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Measurable Metrics</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredResponses.map((r) => {
                      const badgeClass =
                        statusColors[r.status as keyof typeof statusColors] ||
                        "bg-neutral-100 text-neutral-600 border-neutral-300";

                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedResponse(r)}
                          className="hover:bg-warm-50/50 transition-colors cursor-pointer group"
                        >
                          {/* Company & Title */}
                          <td className="px-5 py-4 max-w-xs">
                            <div className="space-y-0.5">
                              <div className="font-bold text-ink-900 group-hover:text-brand-600 transition-colors flex items-center gap-1.5">
                                <Building size={14} className="text-ink-400 shrink-0" />
                                <span>{r.companyName}</span>
                              </div>
                              <p className="text-[11px] text-ink-500 line-clamp-1">
                                {r.editorialTitle || r.resultsAchieved}
                              </p>
                              {r.projectName && (
                                <span className="inline-block rounded-md bg-warm-100 text-ink-600 px-1.5 py-0.2 text-[9px] font-semibold">
                                  {r.projectName}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Respondent */}
                          <td className="px-4 py-4">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-ink-900 block">{r.customerName}</span>
                              <span className="text-[11px] text-ink-500 block">{r.customerRole || r.customerEmail}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider inline-block", badgeClass)}>
                              {r.status.replace(/_/g, " ")}
                            </span>
                          </td>

                          {/* Measurable Metrics */}
                          <td className="px-4 py-4 max-w-xs">
                            {r.measurableOutcomes.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {r.measurableOutcomes.slice(0, 2).map((m, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold"
                                  >
                                    {m.improvement}
                                  </span>
                                ))}
                                {r.measurableOutcomes.length > 2 && (
                                  <span className="text-[10px] text-ink-400 font-medium">
                                    +{r.measurableOutcomes.length - 2} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-ink-400">Qualitative only</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-4 text-ink-500 text-[11px]">
                            {new Date(r.submittedAt).toLocaleDateString()}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {r.status === "SUBMITTED" || r.status === "UNDER_REVIEW" ? (
                                <button
                                  type="button"
                                  onClick={() => handleQuickApprove(r)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                >
                                  <Check size={11} />
                                  <span>Approve</span>
                                </button>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => setSelectedResponse(r)}
                                className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
                              >
                                <Eye size={12} />
                                <span>Review</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeletingResponse(r)}
                                className="rounded-lg p-1 text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
          )}
        </div>
      )}

      {/* TAB 2: PUBLISHED CUSTOMER STORIES */}
      {activeTab === "stories" && workspaceId && (
        <StoryListView
          stories={customerStories}
          projects={projects}
          brands={brands}
          workspaceId={workspaceId}
          onRefresh={fetchData}
          onCreateNew={() => {
            // Pick an approved response if one exists, or prompt user
            const approved = responses.find((r) => r.status === "APPROVED" || r.status === "PUBLISHED");
            if (approved) {
              setSelectedResponse(approved);
              toast.info("Select Response", `Opened approved submission from ${approved.companyName}. Click "Create Customer Story" to generate.`);
            } else {
              toast.info("No Approved Responses", "Approve a case study response first to publish it as a story.");
            }
          }}
        />
      )}

      {/* TAB 3: COLLECTION FORMS */}
      {activeTab === "forms" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink-900">Case Study Collection Forms</h3>
              <p className="text-xs text-ink-500">Shareable public forms customized for different customer segments.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingForm(null);
                setIsBuilderOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
            >
              <Plus size={14} />
              <span>New Form</span>
            </button>
          </div>

          {forms.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No collection forms created"
              description="Create a dedicated case study collection form to gather customer proof."
              action={
                <button
                  onClick={() => setIsBuilderOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-600"
                >
                  <Plus size={14} />
                  <span>Create First Form</span>
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map((f) => (
                <div
                  key={f.id}
                  className="rounded-3xl border border-line bg-white p-5 shadow-2xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-ink-900 line-clamp-1">{f.title}</span>
                        <div className="flex items-center gap-1.5 text-xs text-ink-500">
                          <span>/cs/{f.slug}</span>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          f.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-neutral-100 text-neutral-600 border border-neutral-300"
                        )}
                      >
                        {f.status}
                      </span>
                    </div>

                    {f.description && (
                      <p className="text-xs text-ink-600 line-clamp-2 leading-relaxed">{f.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
                      <span className="rounded-md bg-warm-100 px-2 py-0.5 font-semibold text-ink-700">
                        {f.submissionsCount} {f.submissionsCount === 1 ? "response" : "responses"}
                      </span>
                      {f.projectName && (
                        <span className="rounded-md bg-brand-50 text-brand-700 px-2 py-0.5 font-semibold">
                          {f.projectName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(f.slug)}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
                      >
                        {copiedSlug === f.slug ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copiedSlug === f.slug ? "Copied" : "Copy Link"}</span>
                      </button>

                      <Link
                        href={`/cs/${f.slug}`}
                        target="_blank"
                        className="p-1 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-warm-100"
                        title="Open Public Form"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleFormStatus(f)}
                        className="p-1 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-warm-100"
                        title={f.status === "ACTIVE" ? "Pause Form" : "Resume Form"}
                      >
                        {f.status === "ACTIVE" ? <Pause size={14} /> : <Play size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingForm(f);
                          setIsBuilderOpen(true);
                        }}
                        className="p-1 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-warm-100"
                        title="Edit Form"
                      >
                        <FileText size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingForm(f)}
                        className="p-1 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Form"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink-900">Pre-Configured Case Study Templates</h3>
            <p className="text-xs text-ink-500">Pick a template to instantly start collecting tailored customer stories.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="rounded-3xl border border-line bg-white p-5 shadow-2xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-brand-50 border border-brand-200 px-2 py-0.5 text-[10px] font-bold text-brand-700 uppercase">
                      {tmpl.category}
                    </span>
                    {tmpl.isSystem && (
                      <span className="text-[10px] font-semibold text-ink-400">System Template</span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-ink-900">{tmpl.name}</h4>
                  <p className="text-xs text-ink-600 leading-relaxed">{tmpl.description}</p>
                </div>

                <div className="pt-3 border-t border-line flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingForm({
                        id: "",
                        workspaceId: workspaceId || "",
                        templateId: tmpl.id,
                        templateType: tmpl.category,
                        title: `${tmpl.name}`,
                        slug: "",
                        description: tmpl.description,
                        status: "ACTIVE",
                        accentColor: "#7049D8",
                        theme: "warm",
                        showBranding: true,
                        welcomeHeading: tmpl.welcomeHeading,
                        welcomeText: tmpl.welcomeText,
                        thankYouHeading: "Thank You for Sharing Your Story!",
                        thankYouText: "We appreciate your time and transparency. We will review your submission shortly.",
                        collectCustomerBackground: true,
                        collectCompanyRole: true,
                        collectInitialProblem: true,
                        collectPreviousSolution: true,
                        collectProductImplementation: true,
                        collectExperience: true,
                        collectResultsAchieved: true,
                        collectMeasurableOutcomes: true,
                        collectQuotes: true,
                        allowImages: true,
                        allowVideo: true,
                        collectConsent: true,
                        consentRequired: true,
                        consentText: "I grant permission to publish this case study, business results, and company quotes for marketing purposes.",
                        questionsConfig: tmpl.questionsConfig,
                        submissionsCount: 0,
                        createdAt: "",
                        updatedAt: "",
                      });
                      setIsBuilderOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
                  >
                    <span>Use Template</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Builder Modal */}
      {isBuilderOpen && workspaceId && (
        <CaseStudyBuilder
          workspaceId={workspaceId}
          projects={projects}
          brands={brands}
          existingForm={editingForm}
          onSaved={(newForm) => {
            setIsBuilderOpen(false);
            setEditingForm(null);
            fetchData();
            toast.success("Success", `Case study form "${newForm.title}" saved.`);
          }}
          onCancel={() => {
            setIsBuilderOpen(false);
            setEditingForm(null);
          }}
        />
      )}

      {/* Response Detail / Editorial Modal */}
      {selectedResponse && workspaceId && (
        <ResponseDetailModal
          response={selectedResponse}
          workspaceId={workspaceId}
          projects={projects}
          brands={brands}
          onClose={() => setSelectedResponse(null)}
          onUpdated={(updated) => {
            setSelectedResponse(updated);
            setResponses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            toast.success("Saved", "Case study response updated.");
          }}
          onCreateStory={async (resp) => {
            try {
              const res = await fetch(`/api/workspaces/${workspaceId}/customer-stories`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ responseId: resp.id }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error);
              toast.success("Story Created", `Draft story generated for ${resp.companyName}`);
              setSelectedResponse(null);
              await fetchData();
              setEditingStory(data.story);
              setActiveTab("stories");
            } catch (err: any) {
              toast.error("Story Creation Failed", err.message);
            }
          }}
        />
      )}

      {/* Story Editor Modal */}
      {editingStory && (
        <StoryEditorModal
          story={editingStory}
          projects={projects}
          brands={brands}
          onClose={() => setEditingStory(null)}
          onSaved={() => {
            setEditingStory(null);
            fetchData();
          }}
        />
      )}

      {/* Delete Form Confirmation */}
      {deletingForm && (
        <ConfirmDialog
          isOpen={!!deletingForm}
          title="Delete Case Study Form"
          message={`Are you sure you want to delete "${deletingForm.title}"? All submitted responses linked to this form will also be deleted.`}
          confirmLabel="Delete Form"
          onConfirm={handleDeleteForm}
          onClose={() => setDeletingForm(null)}
          isDestructive
        />
      )}

      {/* Delete Response Confirmation */}
      {deletingResponse && (
        <ConfirmDialog
          isOpen={!!deletingResponse}
          title="Delete Case Study Response"
          message={`Are you sure you want to delete the case study for "${deletingResponse.companyName}"? This action cannot be undone.`}
          confirmLabel="Delete Response"
          onConfirm={handleDeleteResponse}
          onClose={() => setDeletingResponse(null)}
          isDestructive
        />
      )}
    </div>
  );
}
