"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Calendar,
  Check,
  Copy,
  FileText,
  Filter,
  Layers,
  LayoutTemplate,
  Loader2,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { FormTemplateItem } from "@/types/form-builder";
import { TEMPLATE_CATEGORIES } from "@/lib/forms/templates";
import { useToast } from "@/components/dashboard/toast-context";
import { cn } from "@/lib/utils";

type TemplateSelectorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSelectTemplate: (config: any) => void;
};

const CATEGORY_ICONS: Record<string, any> = {
  ALL: LayoutTemplate,
  SAAS: Layers,
  ECOMMERCE: ShoppingBag,
  SERVICES: Briefcase,
  EVENT: Calendar,
  HR: Users,
  GENERAL: FileText,
};

export function TemplateSelectorModal({
  isOpen,
  onClose,
  workspaceId,
  onSelectTemplate,
}: TemplateSelectorModalProps) {
  const toast = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<FormTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplateItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const url =
        activeCategory && activeCategory !== "ALL"
          ? `/api/workspaces/${workspaceId}/form-templates?category=${activeCategory}`
          : `/api/workspaces/${workspaceId}/form-templates`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.templates) {
        setTemplates(data.templates);
        if (data.templates.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data.templates[0]);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, activeCategory, workspaceId]);

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  });

  const handleDuplicate = async (tmpl: FormTemplateItem) => {
    setActionLoadingId(tmpl.id);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/form-templates/${tmpl.id}/duplicate`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error("Error", data.error || "Failed to duplicate template.");
        return;
      }
      toast.success("Template Duplicated", `"${data.template.name}" has been created.`);
      await fetchTemplates();
    } catch {
      toast.error("Error", "Network error duplicating template.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (tmpl: FormTemplateItem) => {
    if (tmpl.isSystem) return;
    if (!confirm(`Are you sure you want to delete template "${tmpl.name}"?`)) return;

    setActionLoadingId(tmpl.id);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/form-templates/${tmpl.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Error", "Failed to delete template.");
        return;
      }
      toast.success("Deleted", "Template removed.");
      if (selectedTemplate?.id === tmpl.id) {
        setSelectedTemplate(null);
      }
      await fetchTemplates();
    } catch {
      toast.error("Error", "Network error.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApply = () => {
    if (!selectedTemplate) return;
    try {
      const config = JSON.parse(selectedTemplate.configJson);
      onSelectTemplate(config);
      toast.success("Template Applied", `Loaded "${selectedTemplate.name}" into form builder.`);
      onClose();
    } catch {
      toast.error("Error", "Invalid template configuration payload.");
    }
  };

  // Parse parsed preview of selected template
  let parsedSelected: any = null;
  if (selectedTemplate) {
    try {
      parsedSelected = JSON.parse(selectedTemplate.configJson);
    } catch {
      parsedSelected = null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex flex-col h-[90vh] max-h-[720px] w-full max-w-5xl rounded-2xl border border-line bg-white shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200">
              <LayoutTemplate size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900">
                Form Template Library
              </h2>
              <p className="text-xs text-ink-500">
                Choose from pre-built battle-tested collection flows or saved workspace templates.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-warm-100 hover:text-ink-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Categories Bar & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line px-6 py-2.5 bg-warm-50/60">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {TEMPLATE_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id] || FileText;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-white text-ink-900 shadow-2xs border border-line"
                      : "text-ink-600 hover:text-ink-900 hover:bg-warm-100"
                  )}
                >
                  <Icon size={12} className={isActive ? "text-brand-600" : "text-ink-400"} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-lg border border-line bg-white py-1.5 pl-8 pr-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Content Pane: Left List, Right Preview */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          {/* Templates Grid List (7 cols) */}
          <div className="md:col-span-6 lg:col-span-7 border-r border-line overflow-y-auto p-5 space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-xs text-ink-500">
                <Loader2 size={24} className="animate-spin text-brand-500 mb-2" />
                <span>Loading templates...</span>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-16 text-xs text-ink-500 space-y-2">
                <LayoutTemplate size={32} className="mx-auto text-ink-300" />
                <p className="font-semibold text-ink-700">No templates found</p>
                <p className="text-[11px] text-ink-400">
                  Try another search query or category filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTemplates.map((tmpl) => {
                  const isSelected = selectedTemplate?.id === tmpl.id;
                  const Icon = CATEGORY_ICONS[tmpl.category] || FileText;

                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl)}
                      className={cn(
                        "group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-brand-500 bg-brand-50/40 shadow-xs ring-1 ring-brand-500/30"
                          : "border-line bg-white hover:border-brand-300 hover:bg-warm-50/50"
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              tmpl.isSystem
                                ? "bg-warm-100 text-ink-600"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            )}
                          >
                            <Icon size={10} />
                            <span>{tmpl.isSystem ? "Built-In" : "Workspace"}</span>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicate(tmpl);
                              }}
                              disabled={actionLoadingId === tmpl.id}
                              className="rounded p-1 text-ink-400 hover:bg-white hover:text-ink-800 transition-colors"
                              title="Duplicate Template"
                            >
                              <Copy size={12} />
                            </button>
                            {!tmpl.isSystem && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(tmpl);
                                }}
                                disabled={actionLoadingId === tmpl.id}
                                className="rounded p-1 text-ink-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                title="Delete Template"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        <h3 className="text-xs font-bold text-ink-900 group-hover:text-brand-700 transition-colors">
                          {tmpl.name}
                        </h3>
                        {tmpl.description && (
                          <p className="text-[11px] text-ink-500 line-clamp-2 leading-relaxed">
                            {tmpl.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 mt-2 border-t border-line/50 flex items-center justify-between text-[10px] text-ink-400 font-medium">
                        <span className="capitalize">{tmpl.category.toLowerCase()} flow</span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-brand-600 font-semibold">
                            <Check size={11} /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Template Detail Preview (5 cols) */}
          <div className="md:col-span-6 lg:col-span-5 bg-warm-50/40 p-5 overflow-y-auto flex flex-col justify-between">
            {selectedTemplate && parsedSelected ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-line bg-white p-4 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-brand-100 text-brand-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {selectedTemplate.category} Template
                    </span>
                    <span className="text-[11px] text-ink-400">
                      {parsedSelected.fields?.length || 0} Custom Questions
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-ink-900">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-xs text-ink-600 leading-relaxed">
                    {selectedTemplate.description}
                  </p>
                </div>

                {/* Flow preview highlight */}
                <div className="rounded-xl border border-line bg-white p-4 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-ink-800 uppercase tracking-wider text-[10px]">
                    Template Structure &amp; Included Fields
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-line/60 text-ink-700">
                      <span>Header Prompt</span>
                      <span className="text-[11px] font-medium text-ink-500 truncate max-w-[200px]">
                        &ldquo;{parsedSelected.headerPrompt}&rdquo;
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-line/60 text-ink-700">
                      <span>Star Rating Question</span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        {parsedSelected.collectRating ? "Included" : "Disabled"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-line/60 text-ink-700">
                      <span>Video Recording</span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        {parsedSelected.allowVideo ? "Enabled (120s)" : "Disabled"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-line/60 text-ink-700">
                      <span>Consent Disclosure</span>
                      <span className="text-[11px] font-semibold text-brand-600">
                        Built-in v1.0
                      </span>
                    </div>
                  </div>

                  {/* Included Custom Questions */}
                  {parsedSelected.fields && parsedSelected.fields.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider block">
                        Custom Questions ({parsedSelected.fields.length})
                      </span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {parsedSelected.fields.map((f: any, idx: number) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-line/80 bg-warm-50/60 p-2 text-xs flex items-center justify-between"
                          >
                            <span className="font-semibold text-ink-800 truncate mr-2">
                              {f.label}
                            </span>
                            <span className="rounded bg-white border border-line px-1.5 py-0.5 text-[9px] font-mono text-ink-500 uppercase shrink-0">
                              {f.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-ink-400">
                Select a template to view details
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-line mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={!selectedTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                <Sparkles size={13} />
                <span>Apply Template</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
