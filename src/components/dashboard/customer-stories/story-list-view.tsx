"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  Filter,
  Globe,
  Loader2,
  MoreVertical,
  Plus,
  Printer,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users2,
} from "lucide-react";
import { DataCard } from "@/components/dashboard/data-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { StoryEditorModal } from "@/components/dashboard/customer-stories/story-editor-modal";
import { exportStoryToMarkdown, exportStoryToHtml } from "@/lib/customer-stories/export";
import type { CustomerStoryDetail } from "@/lib/customer-stories/types";
import { useToast } from "@/components/dashboard/toast-context";
import { cn } from "@/lib/utils";

interface StoryListViewProps {
  stories: CustomerStoryDetail[];
  projects?: Array<{ id: string; name: string }>;
  brands?: Array<{ id: string; name: string }>;
  workspaceId: string;
  onRefresh: () => void;
  onCreateNew?: () => void;
}

export function StoryListView({
  stories,
  projects = [],
  brands = [],
  workspaceId,
  onRefresh,
  onCreateNew,
}: StoryListViewProps) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [brandFilter, setBrandFilter] = useState<string>("ALL");

  const [editingStory, setEditingStory] = useState<CustomerStoryDetail | null>(null);
  const [deletingStory, setDeletingStory] = useState<CustomerStoryDetail | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered Stories
  const filteredStories = stories.filter((story) => {
    if (statusFilter !== "ALL" && story.status !== statusFilter) return false;
    if (projectFilter !== "ALL" && story.projectId !== projectFilter) return false;
    if (brandFilter !== "ALL" && story.brandId !== brandFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = story.title.toLowerCase().includes(q);
      const matchCompany = story.companyName.toLowerCase().includes(q);
      const matchCustomer = story.customerName.toLowerCase().includes(q);
      const matchSlug = story.slug.toLowerCase().includes(q);
      if (!matchTitle && !matchCompany && !matchCustomer && !matchSlug) return false;
    }

    return true;
  });

  // KPI Calculations
  const totalPublished = stories.filter((s) => s.status === "PUBLISHED").length;
  const totalDrafts = stories.filter((s) => s.status === "DRAFT").length;
  const totalViews = stories.reduce((acc, s) => acc + (s.viewsCount || 0), 0);
  const totalMetrics = stories.reduce((acc, s) => acc + (s.measurableOutcomes?.length || 0), 0);

  const handleCopyLink = (slug: string, id: string) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/stories/${slug}`;
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success("Copied", "Public story link copied to clipboard.");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDelete = async () => {
    if (!deletingStory) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/customer-stories/${deletingStory.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error("Failed to delete story");
      }
      toast.success("Story Deleted", "The customer story was deleted successfully.");
      setDeletingStory(null);
      onRefresh();
    } catch (err: any) {
      toast.error("Delete Error", err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DataCard
          title="Published Stories"
          value={totalPublished.toString()}
          description="Live customer proof"
          icon={Globe}
        />
        <DataCard
          title="Drafts in Progress"
          value={totalDrafts.toString()}
          description="Under editorial review"
          icon={FileText}
        />
        <DataCard
          title="Total Readers"
          value={totalViews.toString()}
          description="Public page views recorded"
          icon={Eye}
        />
        <DataCard
          title="Verified Outcomes"
          value={totalMetrics.toString()}
          description="Quantifiable business metrics"
          icon={TrendingUp}
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface rounded-2xl border border-line">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search by company, title, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-line text-xs bg-warm-50/50 text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-line bg-surface text-ink-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Project Filter */}
          {projects.length > 0 && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-line bg-surface text-ink-700"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Brand Filter */}
          {brands.length > 0 && (
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-line bg-surface text-ink-700"
            >
              <option value="ALL">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} />
            <span>Create Story</span>
          </button>
        )}
      </div>

      {/* Stories List */}
      {filteredStories.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No customer stories found"
          description={
            search || statusFilter !== "ALL"
              ? "No published stories match your active filters. Try clearing your search query."
              : "Convert an approved case-study submission into a published customer story to showcase authentic social proof."
          }
          action={
            onCreateNew ? (
              <button
                onClick={onCreateNew}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Create First Story
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStories.map((story) => (
            <div
              key={story.id}
              className="p-5 rounded-2xl border border-line bg-surface hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Left Column: Story Overview */}
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                      story.status === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-warm-100 text-ink-600 border-line"
                    )}
                  >
                    {story.status === "PUBLISHED" ? "Published" : "Draft"}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                    <Building size={12} />
                    <span>{story.companyName}</span>
                  </span>

                  {story.project && (
                    <span className="text-[11px] text-ink-500 font-medium">
                      Project: {story.project.name}
                    </span>
                  )}

                  {story.permissionVerified && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <ShieldCheck size={13} />
                      <span>Consent Verified</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-ink-900 leading-snug">
                  {story.title}
                </h3>

                {story.subtitle && (
                  <p className="text-xs text-ink-500 line-clamp-1 max-w-2xl">
                    {story.subtitle}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500 pt-1">
                  <span>
                    Champion: <strong className="text-ink-800">{story.customerName}</strong>
                    {story.customerTitle ? ` (${story.customerTitle})` : ""}
                  </span>
                  <span>&bull;</span>
                  <span>{story.readingTimeMinutes} min read</span>
                  <span>&bull;</span>
                  <span>{story.viewsCount} readers</span>
                  {story.measurableOutcomes && story.measurableOutcomes.length > 0 && (
                    <>
                      <span>&bull;</span>
                      <span className="text-brand-600 font-semibold flex items-center gap-1">
                        <TrendingUp size={12} />
                        <span>{story.measurableOutcomes.length} Metrics Recorded</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {/* View / Preview Public Link */}
                <Link
                  href={`/stories/${story.slug}${story.status !== "PUBLISHED" ? "?preview=true" : ""}`}
                  target="_blank"
                  className="p-2 rounded-xl border border-line text-ink-600 hover:text-ink-900 hover:bg-warm-100 transition-colors text-xs font-medium flex items-center gap-1"
                  title="View Public Story"
                >
                  <Eye size={15} />
                  <span className="hidden sm:inline">
                    {story.status === "PUBLISHED" ? "View" : "Preview"}
                  </span>
                </Link>

                {/* Copy Link */}
                <button
                  onClick={() => handleCopyLink(story.slug, story.id)}
                  title="Copy Link"
                  className="p-2 rounded-xl border border-line text-ink-600 hover:text-ink-900 hover:bg-warm-100 transition-colors"
                >
                  {copiedId === story.id ? (
                    <Check size={15} className="text-emerald-500" />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => setEditingStory(story)}
                  className="px-3.5 py-1.5 rounded-xl bg-warm-100 hover:bg-warm-200 text-xs font-semibold text-ink-800 transition-colors"
                >
                  Edit
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setDeletingStory(story)}
                  title="Delete Story"
                  className="p-2 rounded-xl border border-line text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Story Editor Modal */}
      {editingStory && (
        <StoryEditorModal
          story={editingStory}
          projects={projects}
          brands={brands}
          onClose={() => setEditingStory(null)}
          onSaved={(updated) => {
            setEditingStory(null);
            onRefresh();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingStory && (
        <ConfirmDialog
          isOpen={!!deletingStory}
          title="Delete Customer Story"
          message={`Are you sure you want to delete the story "${deletingStory.title}" for ${deletingStory.companyName}? This action cannot be undone.`}
          confirmLabel="Delete Story"
          onConfirm={handleDelete}
          onClose={() => setDeletingStory(null)}
          isDestructive
        />
      )}
    </div>
  );
}
