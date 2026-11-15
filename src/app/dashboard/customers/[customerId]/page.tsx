"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  FolderKanban,
  Globe,
  History,
  Layers,
  Loader2,
  Mail,
  MessageSquareQuote,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
  Star,
  Tag as TagIcon,
  Trash2,
  Users2,
  XCircle,
} from "lucide-react";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";

type CustomerNote = {
  id: string;
  content: string;
  authorName?: string | null;
  authorEmail?: string | null;
  isPinned: boolean;
  createdAt: string;
};

type CustomerActivity = {
  id: string;
  action: string;
  actorName?: string | null;
  details?: string | null;
  metadata?: any;
  createdAt: string;
};

type AssociatedProject = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  brandName?: string | null;
};

type AssociatedBrand = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

type CustomerTag = {
  id: string;
  name: string;
  color?: string | null;
};

type Submission = {
  id: string;
  content: string;
  rating: number | null;
  status: "APPROVED" | "PENDING" | "REJECTED" | "ARCHIVED";
  type: string;
  submittedAt: string;
  form?: { id: string; title: string; slug: string } | null;
  project?: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
    brand?: { id: string; name: string; logoUrl?: string | null } | null;
  } | null;
  mediaAssets?: Array<{
    id: string;
    type: string;
    url: string;
    mimeType: string;
    fileSizeBytes?: number | null;
  }>;
  consentRecord?: {
    id: string;
    consentText: string;
    grantedAt: string;
    ipAddress?: string | null;
  } | null;
};

type CustomerDetail = {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  rawEmail: string;
  hasEmail: boolean;
  company?: string | null;
  title?: string | null;
  avatarUrl?: string | null;
  website?: string | null;
  stage: string;
  customAttributes?: Record<string, any>;
  tags: CustomerTag[];
  tagIds: string[];
  notes: CustomerNote[];
  activities: CustomerActivity[];
  stats: {
    totalSubmissions: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    archivedCount: number;
    averageRating: number | null;
  };
  associatedProjects: AssociatedProject[];
  associatedBrands: AssociatedBrand[];
  testimonials: Submission[];
  createdAt: string;
  updatedAt: string;
};

type PageProps = {
  params: Promise<{ customerId: string }>;
};

export default function CustomerDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.customerId;
  const router = useRouter();
  const toast = useToast();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [attributeDefs, setAttributeDefs] = useState<any[]>([]);
  const [workspaceTags, setWorkspaceTags] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"testimonials" | "attributes" | "notes" | "activity" | "projects">("testimonials");
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // New note state
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editStage, setEditStage] = useState("NEW");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [editCustomAttributes, setEditCustomAttributes] = useState<Record<string, any>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch customer details
  const fetchCustomerDetails = useCallback(async () => {
    if (!workspaceId || !customerId) return;
    try {
      const [custRes, stagesRes, attrsRes, tagsRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/customers/${customerId}`),
        fetch(`/api/workspaces/${workspaceId}/customers/stages`),
        fetch(`/api/workspaces/${workspaceId}/customers/attributes`),
        fetch(`/api/workspaces/${workspaceId}/tags`),
      ]);

      if (custRes.status === 404) {
        setNotFound(true);
        return;
      }
      if (custRes.ok) {
        const data = await custRes.json();
        setCustomer(data.customer);
      }
      if (stagesRes.ok) {
        const sData = await stagesRes.json();
        setStages(sData.stages || []);
      }
      if (attrsRes.ok) {
        const aData = await attrsRes.json();
        setAttributeDefs(aData.attributes || []);
      }
      if (tagsRes.ok) {
        const tData = await tagsRes.json();
        setWorkspaceTags(tData.tags || []);
      }
    } catch {
      toast.error("Error", "Could not load customer data.");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, customerId, toast]);

  useEffect(() => {
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  // Quick stage update from header
  const handleQuickChangeStage = async (newStage: string) => {
    if (!workspaceId || !customer || customer.stage === newStage) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        toast.success("Stage Updated", `Customer moved to ${newStage}.`);
        setCustomer((prev) => (prev ? { ...prev, stage: newStage } : null));
        fetchCustomerDetails();
      } else {
        toast.error("Failed", "Could not update stage.");
      }
    } catch {
      toast.error("Network Error", "Unable to update stage.");
    }
  };

  // Add internal note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !customer || !newNoteContent.trim()) return;
    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/customers/${customer.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Note Added", "Internal team note saved.");
        setCustomer((prev) =>
          prev ? { ...prev, notes: [data.note, ...prev.notes] } : null
        );
        setNewNoteContent("");
        fetchCustomerDetails();
      } else {
        toast.error("Failed", data.error || "Could not save note.");
      }
    } catch {
      toast.error("Network Error", "Unable to save team note.");
    } finally {
      setIsAddingNote(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!workspaceId || !customer) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/customers/${customer.id}/notes/${noteId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Note Removed", "Internal note deleted.");
        setCustomer((prev) =>
          prev ? { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) } : null
        );
      } else {
        toast.error("Failed", "Could not delete note.");
      }
    } catch {
      toast.error("Network Error", "Unable to delete note.");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!customer) return;
    setEditName(customer.name);
    setEditEmail(customer.email || "");
    setEditCompany(customer.company || "");
    setEditTitle(customer.title || "");
    setEditWebsite(customer.website || "");
    setEditAvatarUrl(customer.avatarUrl || "");
    setEditStage(customer.stage || "NEW");
    setEditTagIds(customer.tagIds || []);
    setEditCustomAttributes(customer.customAttributes || {});
    setIsEditModalOpen(true);
  };

  // Save Edit Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !customer) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim() || undefined,
          company: editCompany.trim(),
          title: editTitle.trim(),
          website: editWebsite.trim(),
          avatarUrl: editAvatarUrl.trim(),
          stage: editStage,
          tagIds: editTagIds,
          customAttributes: editCustomAttributes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      toast.success("Profile Updated", "Customer information saved successfully.");
      setIsEditModalOpen(false);
      fetchCustomerDetails();
    } catch (err: unknown) {
      toast.error("Update Failed", err instanceof Error ? err.message : "Error saving profile.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async () => {
    if (!workspaceId || !customer) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/customers/${customer.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Customer Deleted", "Customer profile removed.");
        router.push("/dashboard/customers");
      } else {
        toast.error("Failed", "Could not delete customer.");
      }
    } catch {
      toast.error("Error", "Unable to delete customer.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-line bg-white p-14 text-center">
        <Loader2 size={24} className="animate-spin text-brand-500 mx-auto" />
        <p className="text-xs text-ink-500 mt-2">Loading customer CRM profile...</p>
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="rounded-2xl border border-line bg-white p-14 text-center space-y-3">
        <XCircle size={32} className="text-ink-400 mx-auto" />
        <h2 className="text-base font-semibold text-ink-900">Customer Not Found</h2>
        <p className="text-xs text-ink-500 max-w-sm mx-auto">
          This customer profile may have been removed or does not exist in this workspace.
        </p>
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white"
        >
          <ArrowLeft size={13} />
          <span>Return to Customers</span>
        </Link>
      </div>
    );
  }

  const stageMeta = stages.find((s) => s.key === customer.stage) || {
    key: customer.stage,
    name: customer.stage,
    color: "#10B981",
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header with Breadcrumbs & CRM Actions */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-800 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Customers CRM</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="flex items-center gap-4">
            {customer.avatarUrl ? (
              <div className="h-14 w-14 rounded-full overflow-hidden border border-line shrink-0 bg-white shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={customer.avatarUrl} alt={customer.name} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-lg uppercase shrink-0 shadow-2xs">
                {customer.name ? customer.name.slice(0, 2) : "CU"}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-ink-900">{customer.name}</h1>

                {/* Interactive Stage Picker */}
                <select
                  value={customer.stage}
                  onChange={(e) => handleQuickChangeStage(e.target.value)}
                  className="rounded-full text-[11px] font-semibold px-3 py-0.5 border cursor-pointer shadow-2xs focus:outline-none"
                  style={{
                    backgroundColor: `${stageMeta.color}15`,
                    color: stageMeta.color || "#10B981",
                    borderColor: `${stageMeta.color}40`,
                  }}
                  title="Click to transition customer lifecycle stage"
                >
                  {stages.map((st) => (
                    <option key={st.id} value={st.key} className="text-ink-900 bg-white">
                      Stage: {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500">
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} className="text-ink-400" />
                    <span>{customer.email}</span>
                  </span>
                )}

                {(customer.company || customer.title) && (
                  <span className="flex items-center gap-1">
                    <Building2 size={12} className="text-ink-400" />
                    <span>
                      {customer.title ? `${customer.title} at ` : ""}
                      <strong>{customer.company}</strong>
                    </span>
                  </span>
                )}

                {customer.website && (
                  <span className="flex items-center gap-1">
                    <Globe size={12} className="text-ink-400" />
                    <a
                      href={customer.website.startsWith("http") ? customer.website : `https://${customer.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      {customer.website}
                    </a>
                  </span>
                )}
              </div>

              {/* Tags */}
              {customer.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  {customer.tags.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border"
                      style={{
                        backgroundColor: `${t.color || "#7049D8"}15`,
                        color: t.color || "#7049D8",
                        borderColor: `${t.color || "#7049D8"}35`,
                      }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
            >
              <Edit2 size={13} />
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-colors shadow-2xs"
              title="Delete customer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Key Metrics Banner */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
          <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">
            Total Reviews
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-ink-900">{customer.stats.totalSubmissions}</span>
            <span className="text-xs text-ink-400">submitted</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={11} />
            <span>Approved</span>
          </span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-emerald-700">{customer.stats.approvedCount}</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
          <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">
            Average Rating
          </span>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-2xl font-bold text-ink-900">
              {customer.stats.averageRating ? customer.stats.averageRating.toFixed(1) : "—"}
            </span>
            {customer.stats.averageRating && <Star size={15} className="fill-amber-400 text-amber-400" />}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
          <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">
            Associated Projects
          </span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-ink-900">{customer.associatedProjects.length}</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs">
          <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider">
            Associated Brands
          </span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-ink-900">{customer.associatedBrands.length}</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Navigation Tabs */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-line pb-1 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("testimonials")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors ${
            activeTab === "testimonials"
              ? "border-brand-500 text-brand-600 font-bold"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          <MessageSquareQuote size={14} />
          <span>Testimonials ({customer.testimonials.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("attributes")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors ${
            activeTab === "attributes"
              ? "border-brand-500 text-brand-600 font-bold"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          <Sliders size={14} />
          <span>Custom Attributes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors ${
            activeTab === "notes"
              ? "border-brand-500 text-brand-600 font-bold"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          <FileText size={14} />
          <span>Team Notes ({customer.notes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors ${
            activeTab === "activity"
              ? "border-brand-500 text-brand-600 font-bold"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          <History size={14} />
          <span>Activity Timeline ({customer.activities.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors ${
            activeTab === "projects"
              ? "border-brand-500 text-brand-600 font-bold"
              : "border-transparent text-ink-500 hover:text-ink-800"
          }`}
        >
          <FolderKanban size={14} />
          <span>Projects &amp; Brands ({customer.associatedProjects.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Tab Panels */}
      {/* ------------------------------------------------------------- */}

      {/* TAB 1: TESTIMONIAL SUBMISSIONS */}
      {activeTab === "testimonials" && (
        <div className="space-y-4">
          {customer.testimonials.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-8 text-center text-xs text-ink-500">
              No testimonials submitted by this customer yet.
            </div>
          ) : (
            customer.testimonials.map((sub) => {
              const statusColors: Record<string, string> = {
                APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
                ARCHIVED: "bg-warm-100 text-ink-700 border-line",
              };

              return (
                <div key={sub.id} className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          statusColors[sub.status] || statusColors.PENDING
                        }`}
                      >
                        {sub.status}
                      </span>

                      {sub.rating && (
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={
                                s <= sub.rating!
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-ink-200 fill-transparent"
                              }
                            />
                          ))}
                          <span className="text-[11px] font-semibold text-ink-700 ml-1">
                            {sub.rating}★
                          </span>
                        </div>
                      )}

                      <span className="text-[11px] font-medium text-ink-500 uppercase px-1.5 py-0.2 rounded bg-warm-100">
                        {sub.type}
                      </span>
                    </div>

                    <div className="text-[11px] text-ink-400">
                      Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <p className="text-xs text-ink-800 leading-relaxed italic bg-warm-50/50 p-3 rounded-xl border border-line/60">
                    &ldquo;{sub.content}&rdquo;
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60 text-[11px] text-ink-500">
                    <div className="flex items-center gap-2">
                      {sub.project && (
                        <span className="inline-flex items-center gap-1 text-ink-700 font-medium">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: sub.project.color || "#7049D8" }}
                          />
                          <span>Project: {sub.project.name}</span>
                          {sub.project.brand && (
                            <span className="text-ink-400 font-normal">({sub.project.brand.name})</span>
                          )}
                        </span>
                      )}

                      {sub.form && (
                        <span>• Form: {sub.form.title}</span>
                      )}
                    </div>

                    <Link
                      href={`/dashboard/testimonials?search=${encodeURIComponent(customer.name)}`}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                    >
                      <span>Moderate in Inbox</span>
                      <ExternalLink size={11} />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: CUSTOM CRM ATTRIBUTES */}
      {activeTab === "attributes" && (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-ink-900 text-sm">Customer Attributes &amp; Advocacy Data</h2>
              <p className="text-ink-500 text-[11px]">
                Custom fields configured by your workspace to track advocacy, plan tiers, and account context.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenEdit}
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              Edit Attributes
            </button>
          </div>

          {attributeDefs.length === 0 ? (
            <div className="p-6 text-center text-ink-400 italic bg-warm-50/50 rounded-xl border border-line">
              No custom attributes defined yet. Create attribute fields in CRM Settings.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {attributeDefs.map((attr) => {
                const val = customer.customAttributes?.[attr.key];
                return (
                  <div key={attr.id} className="p-3 rounded-xl border border-line bg-warm-50/40 space-y-1">
                    <span className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider block">
                      {attr.name}
                    </span>
                    <span className="text-xs font-semibold text-ink-900 block truncate">
                      {val !== undefined && val !== null && String(val).trim() !== "" ? (
                        String(val)
                      ) : (
                        <span className="text-ink-400 font-normal italic">Not set</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INTERNAL TEAM NOTES */}
      {activeTab === "notes" && (
        <div className="space-y-4 text-xs">
          {/* Note Composer */}
          <form onSubmit={handleAddNote} className="rounded-2xl border border-line bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 text-ink-500 text-[11px]">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Private Internal Note — Visible only to workspace team members.</span>
            </div>

            <textarea
              rows={3}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Record follow-up thoughts, customer feedback calls, advocacy permissions, or account context..."
              className="w-full rounded-xl border border-line p-3 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isAddingNote || !newNoteContent.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50"
              >
                {isAddingNote ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                <span>Add Note</span>
              </button>
            </div>
          </form>

          {/* Notes List */}
          {customer.notes.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-8 text-center text-ink-400 italic">
              No internal notes added yet. Use the composer above to log customer discussions.
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-white divide-y divide-line shadow-xs overflow-hidden">
              {customer.notes.map((note) => (
                <div key={note.id} className="p-4 space-y-1.5 hover:bg-warm-50/30 transition-colors">
                  <div className="flex items-center justify-between text-[11px] text-ink-500">
                    <span className="font-semibold text-ink-800">
                      {note.authorName || "Team Member"}{" "}
                      <span className="font-normal text-ink-400">
                        ({new Date(note.createdAt).toLocaleString()})
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-ink-400 hover:text-rose-600 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <p className="text-xs text-ink-800 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ACTIVITY HISTORY TIMELINE */}
      {activeTab === "activity" && (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-4 text-xs">
          <h2 className="font-semibold text-ink-900 text-sm">Customer Activity Audit Ledger</h2>

          {customer.activities.length === 0 ? (
            <p className="text-ink-400 italic">No activity recorded for this customer yet.</p>
          ) : (
            <div className="relative pl-6 border-l border-line space-y-4">
              {customer.activities.map((act) => (
                <div key={act.id} className="relative">
                  <span className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500 shadow-xs" />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-ink-900">
                      {act.action === "STAGE_CHANGED" && "Lifecycle Stage Updated"}
                      {act.action === "CREATED" && "Customer Profile Created"}
                      {act.action === "IMPORTED" && "Contact Imported"}
                      {act.action === "NOTE_ADDED" && "Team Note Added"}
                      {act.action === "TAG_ADDED" && "Tag Applied"}
                      {act.action === "TAG_REMOVED" && "Tag Removed"}
                      {act.action === "PROFILE_UPDATED" && "Profile Edited"}
                      {!["STAGE_CHANGED", "CREATED", "IMPORTED", "NOTE_ADDED", "TAG_ADDED", "TAG_REMOVED", "PROFILE_UPDATED"].includes(act.action) && act.action}
                    </span>
                    <span className="text-[10px] text-ink-400">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {act.details && (
                    <p className="text-[11px] text-ink-600 mt-0.5">{act.details}</p>
                  )}
                  <span className="text-[10px] text-ink-400 block mt-0.5">By {act.actorName || "System"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ASSOCIATED PROJECTS & BRANDS */}
      {activeTab === "projects" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Projects */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
            <h3 className="font-semibold text-ink-900 text-sm flex items-center gap-2">
              <FolderKanban size={15} className="text-brand-500" />
              <span>Associated Projects</span>
            </h3>
            {customer.associatedProjects.length === 0 ? (
              <p className="text-ink-400 italic">No project associations found.</p>
            ) : (
              <div className="space-y-2">
                {customer.associatedProjects.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl border border-line bg-warm-50/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color || "#7049D8" }} />
                      <span className="font-semibold text-ink-900">{p.name}</span>
                      {p.brandName && (
                        <span className="text-[10px] text-ink-400">({p.brandName})</span>
                      )}
                    </div>
                    <Link
                      href={`/dashboard/projects/${p.slug}`}
                      className="text-brand-600 hover:underline font-semibold"
                    >
                      View Project
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Brands */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
            <h3 className="font-semibold text-ink-900 text-sm flex items-center gap-2">
              <Building2 size={15} className="text-brand-500" />
              <span>Associated Brands</span>
            </h3>
            {customer.associatedBrands.length === 0 ? (
              <p className="text-ink-400 italic">No brand associations found.</p>
            ) : (
              <div className="space-y-2">
                {customer.associatedBrands.map((b) => (
                  <div key={b.id} className="p-3 rounded-xl border border-line bg-warm-50/40 flex items-center gap-2">
                    <span className="font-semibold text-ink-900">{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. Modal: Edit Profile Dialog */}
      {/* ------------------------------------------------------------- */}
      <ModalDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Customer Profile"
        description="Update contact information, lifecycle advocacy stage, tags, and custom attributes."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-customer-form"
              disabled={isSavingEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 disabled:opacity-50"
            >
              {isSavingEdit && <Loader2 size={13} className="animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        }
      >
        <form id="edit-customer-form" onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-900 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-900 mb-1">Email Address</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-900 mb-1">Company / Organization</label>
              <input
                type="text"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-900 mb-1">Job Title / Role</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink-900 mb-1">Website URL</label>
              <input
                type="url"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-900 mb-1">Lifecycle Stage</label>
              <select
                value={editStage}
                onChange={(e) => setEditStage(e.target.value)}
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
                  const isChecked = editTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setEditTagIds((prev) =>
                          prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        isChecked
                          ? "bg-brand-50 text-brand-900 border-brand-300 font-semibold"
                          : "bg-white text-ink-600 border-line hover:bg-warm-100"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color || "#7049D8" }} />
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
                        value={editCustomAttributes[attr.key] || ""}
                        onChange={(e) =>
                          setEditCustomAttributes((prev) => ({
                            ...prev,
                            [attr.key]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-line p-2 text-xs text-ink-900"
                      >
                        <option value="">Select option...</option>
                        {attr.options.map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={attr.type === "NUMBER" ? "number" : attr.type === "DATE" ? "date" : "text"}
                        value={editCustomAttributes[attr.key] || ""}
                        onChange={(e) =>
                          setEditCustomAttributes((prev) => ({
                            ...prev,
                            [attr.key]: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-line p-2 text-xs text-ink-900"
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
      {/* 6. Modal: Delete Customer Confirm Dialog */}
      {/* ------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer Profile"
        message={`Are you sure you want to delete profile for "${customer.name}"? Historical testimonials will be preserved.`}
        confirmLabel="Delete Profile"
        isDestructive={true}
      />
    </div>
  );
}
