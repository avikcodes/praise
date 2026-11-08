"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  FolderKanban,
  Globe,
  ImageIcon,
  Loader2,
  Mail,
  MessageSquareQuote,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Video,
  XCircle,
} from "lucide-react";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";

type SubmissionMedia = {
  id: string;
  type: string;
  originalFilename: string;
  mimeType: string;
  publicUrl: string;
  thumbnailUrl?: string | null;
  fileSizeBytes: number;
};

type ConsentRecord = {
  id: string;
  consentGiven: boolean;
  consentText: string;
  timestamp: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type Submission = {
  id: string;
  text: string;
  rating: number | null;
  status: "APPROVED" | "PENDING" | "REJECTED" | "ARCHIVED";
  submittedAt: string;
  source: string;
  project?: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
  } | null;
  form?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  mediaCount: number;
  media: SubmissionMedia[];
  consents: ConsentRecord[];
};

type CustomerDetail = {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  rawEmail: string;
  isInternalEmail: boolean;
  company?: string | null;
  title?: string | null;
  avatarUrl?: string | null;
  website?: string | null;
  notes?: string | null;
  socialHandle?: string | null;
  createdAt: string;
  updatedAt: string;
  associatedProjects: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
  }[];
  stats: {
    totalSubmissions: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    archivedCount: number;
    averageRating: number | null;
  };
  submissions: Submission[];
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
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Quick note state in sidebar
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!workspaceId || !customerId) return;
    let isMounted = true;

    async function loadCustomer() {
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/customers/${customerId}`
        );
        if (!isMounted) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to load customer profile.");
        }
        const data = await res.json();
        if (isMounted) {
          setCustomer(data.customer);
          setNoteContent(data.customer.notes || "");
        }
      } catch (err) {
        console.error("Error fetching customer:", err);
        if (isMounted) {
          toast.error("Failed to Load Customer", "Could not retrieve customer details.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCustomer();

    return () => {
      isMounted = false;
    };
  }, [workspaceId, customerId, refreshKey, toast]);

  // Open Edit Modal with prefilled values
  const handleOpenEdit = () => {
    if (!customer) return;
    setEditName(customer.name);
    setEditEmail(customer.email || "");
    setEditCompany(customer.company || "");
    setEditTitle(customer.title || "");
    setEditWebsite(customer.website || "");
    setEditAvatarUrl(customer.avatarUrl || "");
    setIsEditModalOpen(true);
  };

  // Submit Edit Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !customer) return;

    if (!editName.trim()) {
      toast.error("Validation Error", "Customer name is required.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/customers/${customer.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            email: editEmail.trim() || undefined,
            company: editCompany.trim(),
            title: editTitle.trim(),
            website: editWebsite.trim(),
            avatarUrl: editAvatarUrl.trim(),
            notes: noteContent.trim(),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      toast.success("Profile Updated", "Customer information saved successfully.");
      setIsEditModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating customer";
      toast.error("Update Failed", msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Quick save internal note from sidebar
  const handleSaveNote = async () => {
    if (!workspaceId || !customer) return;
    setIsSavingNote(true);

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/customers/${customer.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: noteContent.trim(),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save note.");
      }

      toast.success("Notes Saved", "Internal customer notes updated.");
      setCustomer((prev) => (prev ? { ...prev, notes: noteContent.trim() } : null));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving note";
      toast.error("Failed to Save Note", msg);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Delete customer profile
  const handleDeleteCustomer = async () => {
    if (!workspaceId || !customer) return;
    setIsDeleting(true);

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/customers/${customer.id}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete customer.");
      }

      toast.success(
        "Customer Deleted",
        data.message || "Customer profile was removed. Testimonials were retained."
      );
      router.push("/dashboard/customers");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting customer";
      toast.error("Delete Failed", msg);
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to Clipboard", `${label} copied.`);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-line bg-white p-16 text-center shadow-xs">
        <Loader2 size={28} className="animate-spin text-brand-500 mx-auto" />
        <p className="text-xs text-ink-500 mt-3 font-medium">Loading customer profile...</p>
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-xs">
        <XCircle size={36} className="text-rose-500 mx-auto" />
        <h2 className="text-base font-semibold text-ink-900 mt-3">Customer Not Found</h2>
        <p className="text-xs text-ink-500 mt-1 max-w-sm mx-auto">
          The requested customer profile does not exist or may have been deleted from this workspace.
        </p>
        <div className="mt-5">
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Customers</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-800 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Customers</span>
          </Link>
          <span className="text-ink-300">/</span>
          <span className="text-xs font-semibold text-ink-900 truncate max-w-[200px]">
            {customer.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors"
          >
            <Edit2 size={13} className="text-ink-500" />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          {customer.avatarUrl ? (
            <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-line shrink-0 bg-white shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={customer.avatarUrl}
                alt={customer.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-20 w-20 rounded-full bg-brand-50 text-brand-700 border-2 border-brand-200 flex items-center justify-center font-bold text-2xl uppercase shrink-0">
              {customer.name ? customer.name.slice(0, 2) : "CU"}
            </div>
          )}

          {/* Details */}
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-ink-900">{customer.name}</h1>
              {customer.email ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <Mail size={11} />
                  <span>{customer.email}</span>
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-warm-100 border border-line px-2.5 py-0.5 text-[11px] font-medium text-ink-600">
                  No email provided (Anonymous respondent)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-ink-600">
              {(customer.company || customer.title) && (
                <div className="flex items-center gap-1.5 font-medium text-ink-800">
                  <Building2 size={13} className="text-ink-400" />
                  <span>
                    {[customer.title, customer.company].filter(Boolean).join(" at ")}
                  </span>
                </div>
              )}

              {customer.website && (
                <a
                  href={
                    customer.website.startsWith("http")
                      ? customer.website
                      : `https://${customer.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                >
                  <Globe size={13} />
                  <span>{customer.website.replace(/^https?:\/\//, "")}</span>
                  <ExternalLink size={10} />
                </a>
              )}

              <div className="flex items-center gap-1 text-ink-500">
                <Calendar size={13} className="text-ink-400" />
                <span>
                  First joined{" "}
                  {new Date(customer.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">
            Total Reviews
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink-900">
              {customer.stats.totalSubmissions}
            </span>
            <span className="text-xs text-ink-400">submissions</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium text-ink-500 uppercase tracking-wider">
            Average Rating
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-2xl font-bold text-ink-900">
              {customer.stats.averageRating ? customer.stats.averageRating.toFixed(1) : "—"}
            </span>
            {customer.stats.averageRating && (
              <div className="flex items-center text-amber-400">
                <Star size={16} className="fill-amber-400" />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Approved</span>
          </span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-emerald-700">
              {customer.stats.approvedCount}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <Clock size={12} />
            <span>Pending</span>
          </span>
          <div className="mt-1">
            <span className="text-2xl font-bold text-amber-700">
              {customer.stats.pendingCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Submissions History & GDPR Records */}
        <div className="lg:col-span-2 space-y-6">
          {/* Testimonial Submissions History */}
          <div className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
            <div className="border-b border-line p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                  <MessageSquareQuote size={16} className="text-brand-500" />
                  <span>Submission History</span>
                  <span className="rounded-full bg-warm-100 px-2 py-0.5 text-xs font-semibold text-ink-700">
                    {customer.submissions.length}
                  </span>
                </h2>
                <p className="text-xs text-ink-500 mt-0.5">
                  All testimonials submitted by this customer across forms and projects.
                </p>
              </div>

              <Link
                href={`/dashboard/testimonials?search=${encodeURIComponent(customer.name)}`}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
              >
                <span>View in Inbox</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            {customer.submissions.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-500">
                No testimonials have been submitted by this customer yet.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {customer.submissions.map((sub) => {
                  const statusColors = {
                    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
                    ARCHIVED: "bg-warm-100 text-ink-700 border-line",
                  };

                  return (
                    <div key={sub.id} className="p-4 sm:p-5 hover:bg-warm-50/40 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                              statusColors[sub.status] || statusColors.PENDING
                            }`}
                          >
                            {sub.status}
                          </span>

                          {/* Star Rating */}
                          {sub.rating && (
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={12}
                                  className={
                                    star <= sub.rating!
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-ink-200 fill-transparent"
                                  }
                                />
                              ))}
                              <span className="text-[11px] font-semibold text-ink-600 ml-1">
                                {sub.rating}★
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Submission date & source */}
                        <div className="flex items-center gap-2 text-[11px] text-ink-500">
                          {sub.project && (
                            <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border border-line bg-white shadow-2xs font-medium text-ink-700">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: sub.project.color || "#7049D8" }}
                              />
                              <span>{sub.project.name}</span>
                            </span>
                          )}
                          <span>
                            {new Date(sub.submittedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Testimonial Quote Text */}
                      <div className="mt-2 text-xs text-ink-800 leading-relaxed bg-warm-50/60 p-3 rounded-xl border border-line italic">
                        &ldquo;{sub.text}&rdquo;
                      </div>

                      {/* Form Source & Media Badges */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-500">
                        <div className="flex items-center gap-2">
                          {sub.form && (
                            <span className="text-ink-600">
                              Collected via:{" "}
                              <strong className="font-semibold text-ink-800">
                                {sub.form.title}
                              </strong>
                            </span>
                          )}
                          {sub.mediaCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 font-medium text-brand-700 border border-brand-200">
                              {sub.media.some((m) => m.type === "VIDEO") ? (
                                <Video size={11} />
                              ) : (
                                <ImageIcon size={11} />
                              )}
                              <span>
                                {sub.mediaCount} attached media file
                                {sub.mediaCount === 1 ? "" : "s"}
                              </span>
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/dashboard/testimonials?search=${encodeURIComponent(sub.id)}`}
                          className="font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                        >
                          <Eye size={11} />
                          <span>Inspect in Moderation</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* GDPR & Marketing Consent Audit Records */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand-600" />
              <h2 className="text-sm font-semibold text-ink-900">
                Marketing Consent &amp; Compliance Audit Log
              </h2>
            </div>
            <p className="text-xs text-ink-500 leading-relaxed">
              Every submission records explicit consent checkboxes, timestamps, and network verification tokens to comply with GDPR, CCPA, and FTC marketing guidelines.
            </p>

            {customer.submissions.some((s) => s.consents.length > 0) ? (
              <div className="space-y-2 mt-3">
                {customer.submissions.flatMap((s) =>
                  s.consents.map((consent) => (
                    <div
                      key={consent.id}
                      className="rounded-xl border border-line bg-warm-50/50 p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 size={12} />
                          <span>Explicit Consent Granted</span>
                        </span>
                        <span className="text-[10px] text-ink-400 font-mono">
                          {new Date(consent.timestamp).toISOString()}
                        </span>
                      </div>
                      <p className="text-ink-800 italic">&ldquo;{consent.consentText}&rdquo;</p>
                      {consent.userAgent && (
                        <div className="text-[10px] text-ink-400 font-mono truncate">
                          Agent: {consent.userAgent}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-warm-50/40 p-3 text-xs text-ink-500 italic">
                No formal consent records logged for this profile yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Private Notes, Associated Projects & Customer Metadata */}
        <div className="space-y-6">
          {/* Private Notes Card */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                <FileText size={15} className="text-brand-500" />
                <span>Internal Customer Notes</span>
              </h2>
              <span className="text-[10px] font-semibold uppercase text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                Workspace Only
              </span>
            </div>
            <p className="text-[11px] text-ink-500 leading-relaxed">
              Private notes about this client or account. These notes are strictly visible to workspace team members and are never displayed publicly.
            </p>

            <textarea
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="e.g. Key client contact, agreed to participate in upcoming video case study, renewal date..."
              className="w-full rounded-xl border border-line bg-warm-50/40 p-3 text-xs text-ink-900 placeholder:text-ink-400 focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50 shadow-2xs"
              >
                {isSavingNote ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                <span>Save Notes</span>
              </button>
            </div>
          </div>

          {/* Associated Projects Card */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
              <FolderKanban size={15} className="text-brand-500" />
              <span>Associated Projects</span>
            </h2>
            <p className="text-[11px] text-ink-500">
              Projects where this customer has submitted reviews or feedback.
            </p>

            {customer.associatedProjects.length > 0 ? (
              <div className="space-y-2 mt-2">
                {customer.associatedProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-white p-2.5 hover:bg-warm-50/60 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color || "#7049D8" }}
                      />
                      <span className="text-xs font-semibold text-ink-900">{p.name}</span>
                    </div>
                    <Link
                      href={`/dashboard/testimonials?projectId=${p.id}&search=${encodeURIComponent(
                        customer.name
                      )}`}
                      className="text-[11px] font-semibold text-brand-600 hover:underline"
                    >
                      Filter
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-warm-50/50 p-3 text-center text-xs text-ink-400 italic">
                No associated projects
              </div>
            )}
          </div>

          {/* Customer Metadata Card */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-ink-900">Profile Metadata</h2>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[11px] font-medium text-ink-400 uppercase tracking-wider block">
                  Customer ID
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono text-[11px] text-ink-700 truncate max-w-[190px]">
                    {customer.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(customer.id, "Customer ID")}
                    className="p-1 text-ink-400 hover:text-ink-700 transition-colors"
                    title="Copy ID"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-ink-400 uppercase tracking-wider block">
                  Email Status
                </span>
                <span className="text-ink-700 text-xs">
                  {customer.isInternalEmail
                    ? "Synthetic placeholder (No email collected by form)"
                    : "Verified direct email address"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-medium text-ink-400 uppercase tracking-wider block">
                  Created At
                </span>
                <span className="text-ink-700 text-xs">
                  {new Date(customer.createdAt).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-medium text-ink-400 uppercase tracking-wider block">
                  Last Updated
                </span>
                <span className="text-ink-700 text-xs">
                  {new Date(customer.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <ModalDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit ${customer.name}`}
        description="Update contact information, website, and job title."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Website URL
              </label>
              <input
                type="text"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                placeholder="https://acme.com"
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Avatar / Photo URL
              </label>
              <input
                type="url"
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                placeholder="https://.../photo.jpg"
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {isSavingEdit && <Loader2 size={13} className="animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer Profile"
        message={`Are you sure you want to delete "${customer.name}"? All associated testimonials (${customer.stats.totalSubmissions} submission${customer.stats.totalSubmissions === 1 ? "" : "s"}) will remain safely preserved in your workspace.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete Customer"}
        isDestructive
      />
    </div>
  );
}

