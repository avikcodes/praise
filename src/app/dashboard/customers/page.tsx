"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Download,
  Edit2,
  FileText,
  Globe,
  Loader2,
  Mail,
  MessageSquareQuote,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Users2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";

type AssociatedProject = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
};

type CustomerItem = {
  id: string;
  name: string;
  email: string | null;
  rawEmail: string;
  company?: string | null;
  title?: string | null;
  avatarUrl?: string | null;
  website?: string | null;
  notes?: string | null;
  socialHandle?: string | null;
  createdAt: string;
  updatedAt: string;
  testimonialCount: number;
  associatedProjects: AssociatedProject[];
  latestSubmission?: {
    id: string;
    rating: number | null;
    status: string;
    submittedAt: string;
  } | null;
};

type ProjectOption = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
};

export default function CustomersPage() {
  const { activeWorkspace } = useWorkspace();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isLoading, setIsLoading] = useState(true);

  // Modal dialog states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerItem | null>(null);

  // Form input states (used for both Add and Edit modals)
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const workspaceId = activeWorkspace?.id;

  // Fetch customers with debounce
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
        if (projectFilter !== "all") url.searchParams.set("projectId", projectFilter);
        if (activityFilter !== "all") url.searchParams.set("activity", activityFilter);
        if (sortBy) url.searchParams.set("sortBy", sortBy);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.customers || []);
          if (data.projects) {
            setProjects(data.projects);
          }
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
    [workspaceId, search, projectFilter, activityFilter, sortBy, toast]
  );

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
    setFormNotes("");
    setIsAddModalOpen(true);
  };

  // Open Edit modal prefilled
  const handleOpenEditModal = (c: CustomerItem) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormEmail(c.email || "");
    setFormCompany(c.company || "");
    setFormTitle(c.title || "");
    setFormWebsite(c.website || "");
    setFormAvatarUrl(c.avatarUrl || "");
    setFormNotes(c.notes || "");
  };

  // Create new customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    if (!formName.trim()) {
      toast.error("Validation Error", "Customer name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim() || undefined,
          company: formCompany.trim() || undefined,
          title: formTitle.trim() || undefined,
          website: formWebsite.trim() || undefined,
          avatarUrl: formAvatarUrl.trim() || undefined,
          notes: formNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create customer.");
      }

      toast.success("Customer Created", `Profile for ${data.customer.name} has been added.`);
      setIsAddModalOpen(false);
      fetchCustomers(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error creating customer";
      toast.error("Creation Failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing customer
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !editingCustomer) return;
    if (!formName.trim()) {
      toast.error("Validation Error", "Customer name cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/customers/${editingCustomer.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            email: formEmail.trim() || undefined,
            company: formCompany.trim(),
            title: formTitle.trim(),
            website: formWebsite.trim(),
            avatarUrl: formAvatarUrl.trim(),
            notes: formNotes.trim(),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update customer.");
      }

      toast.success("Profile Updated", `${data.customer.name}'s information was saved.`);
      setEditingCustomer(null);
      fetchCustomers(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error updating customer";
      toast.error("Update Failed", message);
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete customer.");
      }

      toast.success(
        "Customer Deleted",
        data.message || "Customer profile removed. Testimonials have been preserved."
      );
      setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error deleting customer";
      toast.error("Delete Failed", message);
    } finally {
      setDeletingCustomer(null);
    }
  };

  // Export CSV
  const handleExport = () => {
    if (customers.length === 0) {
      toast.error("No Data to Export", "There are no customer records in this view.");
      return;
    }

    const headers = [
      "Customer ID",
      "Name",
      "Email",
      "Company",
      "Job Title",
      "Website",
      "Testimonials Count",
      "Associated Projects",
      "Joined Date",
      "Notes",
    ];

    const rows = customers.map((c) => [
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email || "No email"}"`,
      `"${(c.company || "").replace(/"/g, '""')}"`,
      `"${(c.title || "").replace(/"/g, '""')}"`,
      `"${(c.website || "").replace(/"/g, '""')}"`,
      c.testimonialCount,
      `"${c.associatedProjects.map((p) => p.name).join("; ")}"`,
      `"${new Date(c.createdAt).toISOString()}"`,
      `"${(c.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `praise-customers-${activeWorkspace?.slug || "export"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Export Complete", `Exported ${customers.length} customer records to CSV.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Unified directory of customer respondents who have submitted testimonials across your workspace."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={customers.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors disabled:opacity-50"
            >
              <Download size={14} className="text-ink-500" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
            >
              <Plus size={14} />
              <span>Add Customer</span>
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-2.5 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company, notes..."
              className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Project Filter */}
          <div className="relative">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 rounded-lg border border-line bg-white pl-3 pr-8 text-xs font-medium text-ink-700 hover:bg-warm-50 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Activity Filter */}
          <div className="relative">
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="h-8 rounded-lg border border-line bg-white pl-3 pr-8 text-xs font-medium text-ink-700 hover:bg-warm-50 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">All Activity</option>
              <option value="with_reviews">Has Testimonials (≥1)</option>
              <option value="multiple">Multiple Reviews (&gt;1)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 rounded-lg border border-line bg-white pl-3 pr-8 text-xs font-medium text-ink-700 hover:bg-warm-50 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="newest">Newest Joined</option>
              <option value="oldest">Oldest Joined</option>
              <option value="testimonials">Most Reviews</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-ink-500 whitespace-nowrap">
          Showing <strong className="text-ink-800">{customers.length}</strong> customer records
        </span>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <Loader2 size={24} className="animate-spin text-brand-500 mx-auto" />
          <p className="text-xs text-ink-500 mt-2">Loading customer records...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
          <EmptyState
            icon={Users2}
            title={
              search || projectFilter !== "all" || activityFilter !== "all"
                ? "No matching customers found"
                : "No customer profiles yet"
            }
            description={
              search || projectFilter !== "all" || activityFilter !== "all"
                ? "Try adjusting your search query or filter options."
                : "Customer records are automatically created when respondents submit testimonials through public forms, or you can add them manually."
            }
            action={
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
              >
                <Plus size={14} />
                <span>Add Customer</span>
              </button>
            }
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-warm-50/70 text-ink-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Company &amp; Role</th>
                  <th className="py-3 px-4 font-semibold">Associated Projects</th>
                  <th className="py-3 px-4 font-semibold">Testimonials</th>
                  <th className="py-3 px-4 font-semibold">Latest Rating</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                  <th className="py-3 px-4 font-semibold">Joined</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-warm-50/50 transition-colors">
                    {/* Customer Name & Email */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {c.avatarUrl ? (
                          <div className="h-9 w-9 rounded-full overflow-hidden border border-line shrink-0 bg-white shadow-2xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.avatarUrl}
                              alt={c.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {c.name ? c.name.slice(0, 2) : "CU"}
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/dashboard/customers/${c.id}`}
                            className="font-semibold text-ink-900 hover:text-brand-600 transition-colors"
                          >
                            {c.name}
                          </Link>
                          <div className="text-[11px] text-ink-500 flex items-center gap-1.5 mt-0.5">
                            {c.email ? (
                              <span className="flex items-center gap-1 text-ink-600">
                                <Mail size={11} className="text-ink-400" />
                                <span>{c.email}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-sm bg-warm-100 px-1.5 py-0.2 text-[10px] font-medium text-ink-500">
                                No email provided
                              </span>
                            )}
                            {c.website && (
                              <a
                                href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center text-brand-600 hover:underline gap-0.5 ml-1"
                                title={c.website}
                              >
                                <Globe size={10} />
                                <span className="max-w-[90px] truncate">
                                  {c.website.replace(/^https?:\/\//, "")}
                                </span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Company & Role */}
                    <td className="py-3 px-4 text-ink-600">
                      {c.company ? (
                        <div>
                          <div className="font-medium text-ink-800 flex items-center gap-1">
                            <Building2 size={11} className="text-ink-400" />
                            <span>{c.company}</span>
                          </div>
                          {c.title && <div className="text-[11px] text-ink-400">{c.title}</div>}
                        </div>
                      ) : (
                        <span className="text-ink-400 italic">None specified</span>
                      )}
                    </td>

                    {/* Associated Projects */}
                    <td className="py-3 px-4">
                      {c.associatedProjects && c.associatedProjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {c.associatedProjects.map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-line bg-white text-ink-700 shadow-2xs"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: p.color || "#7049D8" }}
                              />
                              <span>{p.name}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-ink-400 text-[11px] italic">No projects</span>
                      )}
                    </td>

                    {/* Testimonials count */}
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/testimonials?search=${encodeURIComponent(c.name)}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-warm-100 hover:bg-warm-200 px-2 py-0.5 text-xs font-semibold text-ink-800 transition-colors"
                        title="Click to view testimonials from this customer"
                      >
                        <MessageSquareQuote size={12} className="text-brand-600" />
                        <span>{c.testimonialCount}</span>
                      </Link>
                    </td>

                    {/* Latest Rating */}
                    <td className="py-3 px-4">
                      {c.latestSubmission?.rating ? (
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={11}
                              className={
                                s <= (c.latestSubmission?.rating || 5)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-ink-200 fill-transparent"
                              }
                            />
                          ))}
                          <span className="text-[11px] font-semibold text-ink-600 ml-1">
                            {c.latestSubmission.rating}★
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Private Notes */}
                    <td className="py-3 px-4 max-w-[150px]">
                      {c.notes ? (
                        <div
                          className="flex items-start gap-1 text-[11px] text-ink-600 truncate"
                          title={c.notes}
                        >
                          <FileText size={11} className="text-ink-400 shrink-0 mt-0.5" />
                          <span className="truncate">{c.notes}</span>
                        </div>
                      ) : (
                        <span className="text-ink-400 text-[11px] italic">No notes</span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3 px-4 text-ink-500 text-[11px] whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/customers/${c.id}`}
                          className="rounded-md border border-line bg-white px-2 py-1 text-xs font-semibold text-ink-700 hover:bg-warm-100 hover:text-ink-900 transition-colors shadow-2xs"
                        >
                          Details
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          className="rounded-md p-1.5 text-ink-500 hover:bg-warm-100 hover:text-ink-900 transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCustomer(c)}
                          className="rounded-md p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete Customer"
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

      {/* Compliance / Privacy Info Notice */}
      <div className="rounded-xl border border-line bg-warm-50/60 p-4 text-xs text-ink-600 flex items-start gap-3">
        <ShieldCheck size={18} className="text-brand-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-semibold text-ink-900">
            Privacy Isolation &amp; Unified Customer Profiles
          </strong>
          <p className="leading-relaxed">
            Customer profiles unify all testimonial submissions under a single workspace record. Private contact information, internal notes, and emails are strictly reserved for workspace administrators and are never published on widgets or public review pages.
          </p>
        </div>
      </div>

      {/* Add Customer Modal */}
      <ModalDialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Customer Profile"
        description="Create a unified customer record in this workspace. Future testimonials from this customer will automatically link to this profile."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Email Address <span className="text-ink-400 font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-[10px] text-ink-400 mt-1">
                Leave empty if customer did not provide an email.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Company Name <span className="text-ink-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Job Title <span className="text-ink-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Chief Technology Officer"
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Website URL <span className="text-ink-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formWebsite}
                onChange={(e) => setFormWebsite(e.target.value)}
                placeholder="https://acme.com"
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Avatar / Photo URL <span className="text-ink-400 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={formAvatarUrl}
                onChange={(e) => setFormAvatarUrl(e.target.value)}
                placeholder="https://.../avatar.jpg"
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">
              Internal Customer Notes <span className="text-ink-400 font-normal">(Private CRM Notes)</span>
            </label>
            <textarea
              rows={3}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g., Enterprise Tier client, willing to participate in video case study..."
              className="w-full rounded-lg border border-line bg-white p-2.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              <span>Save Customer</span>
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Edit Customer Modal */}
      <ModalDialog
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        title={editingCustomer ? `Edit ${editingCustomer.name}` : "Edit Customer"}
        description="Update contact details, job title, and internal workspace CRM notes."
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
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
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Website URL
              </label>
              <input
                type="text"
                value={formWebsite}
                onChange={(e) => setFormWebsite(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">
                Avatar / Photo URL
              </label>
              <input
                type="url"
                value={formAvatarUrl}
                onChange={(e) => setFormAvatarUrl(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">
              Internal Customer Notes
            </label>
            <textarea
              rows={3}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full rounded-lg border border-line bg-white p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setEditingCustomer(null)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Delete Customer Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer Profile"
        message={
          deletingCustomer
            ? `Are you sure you want to delete the profile for "${deletingCustomer.name}"? Their testimonials (${deletingCustomer.testimonialCount} submission${deletingCustomer.testimonialCount === 1 ? "" : "s"}) will remain safely preserved in your workspace.`
            : "Are you sure you want to delete this customer?"
        }
        confirmLabel="Delete Customer"
        isDestructive
      />
    </div>
  );
}
