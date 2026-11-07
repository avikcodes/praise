"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquareQuote,
  Search,
  ShieldCheck,
  Star,
  Users2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";

type CustomerItem = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  title?: string | null;
  avatarUrl?: string | null;
  socialHandle?: string | null;
  createdAt: string;
  testimonialCount: number;
  latestSubmission?: {
    id: string;
    rating: number | null;
    status: string;
    submittedAt: string;
  } | null;
};

export default function CustomersPage() {
  const { activeWorkspace } = useWorkspace();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const workspaceId = activeWorkspace?.id;

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const url = new URL(
          `/api/workspaces/${workspaceId}/customers`,
          window.location.origin,
        );
        if (search.trim()) {
          url.searchParams.set("search", search.trim());
        }
        const res = await fetch(url.toString());
        if (res.ok && isMounted) {
          const data = await res.json();
          setCustomers(data.customers || []);
        }
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [workspaceId, search]);

  const handleExport = () => {
    if (customers.length === 0) {
      toast.error("No Data to Export", "There are no customer records in this workspace yet.");
      return;
    }

    const headers = ["Name", "Email", "Company", "Title", "Testimonials Count", "Created At"];
    const rows = customers.map((c) => [
      `"${c.name}"`,
      `"${c.email}"`,
      `"${c.company || ""}"`,
      `"${c.title || ""}"`,
      c.testimonialCount,
      `"${new Date(c.createdAt).toISOString()}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `praise-customers-${activeWorkspace?.slug || "export"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Export Complete", `Exported ${customers.length} customer records to CSV.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Directory of customer respondents who have submitted testimonials and granted marketing consent."
        actions={
          <button
            type="button"
            onClick={handleExport}
            disabled={customers.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-2xs hover:bg-warm-100 transition-colors disabled:opacity-50"
          >
            <Download size={14} className="text-ink-500" />
            <span>Export CSV</span>
          </button>
        }
      />

      {/* Search and Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, email, or company..."
            className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <span className="text-xs text-ink-500">
          Showing <strong className="text-ink-800">{customers.length}</strong> customer records
        </span>
      </div>

      {/* Customer Directory Table */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <Loader2 size={24} className="animate-spin text-brand-500 mx-auto" />
          <p className="text-xs text-ink-500 mt-2">Loading customer records...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
          <EmptyState
            icon={Users2}
            title={search ? "No matching customers found" : "No customer respondents yet"}
            description={
              search
                ? `No customer matched "${search}". Try clearing your search query.`
                : "Customer profiles, verified emails, and marketing consent records will automatically populate here as reviews are submitted."
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
                  <th className="py-3 px-4 font-semibold">Company &amp; Title</th>
                  <th className="py-3 px-4 font-semibold">Testimonials</th>
                  <th className="py-3 px-4 font-semibold">Latest Rating</th>
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
                        <div>
                          <div className="font-semibold text-ink-900">{c.name}</div>
                          <div className="text-[11px] text-ink-400 flex items-center gap-1">
                            <Mail size={10} />
                            <span>{c.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Company & Title */}
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
                        <span className="text-ink-400 italic">Not specified</span>
                      )}
                    </td>

                    {/* Testimonials count */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-warm-100 px-2 py-0.5 text-xs font-semibold text-ink-700">
                        <MessageSquareQuote size={11} className="text-brand-600" />
                        <span>{c.testimonialCount}</span>
                      </span>
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

                    {/* Date */}
                    <td className="py-3 px-4 text-ink-500 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/testimonials?search=${encodeURIComponent(c.email)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        <span>View Reviews</span>
                        <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compliance Notice Card */}
      <div className="rounded-xl border border-line bg-warm-50/60 p-4 text-xs text-ink-600 flex items-start gap-3">
        <ShieldCheck size={18} className="text-brand-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-semibold text-ink-900">
            GDPR &amp; Consent Audit Trail
          </strong>
          <p className="leading-relaxed">
            Every customer record preserves cryptographic submission timestamps and explicit consent checkboxes.
            If a customer requests data deletion under GDPR or CCPA, you can purge their profile and media in one click.
          </p>
        </div>
      </div>
    </div>
  );
}
