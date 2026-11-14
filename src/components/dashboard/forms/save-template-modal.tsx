"use client";

import { useState } from "react";
import { Bookmark, Check, Loader2, X } from "lucide-react";
import { TEMPLATE_CATEGORIES } from "@/lib/forms/templates";
import { useToast } from "@/components/dashboard/toast-context";

type SaveTemplateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  formConfigPayload: any;
  onSavedSuccess?: () => void;
};

export function SaveTemplateModal({
  isOpen,
  onClose,
  workspaceId,
  formConfigPayload,
  onSavedSuccess,
}: SaveTemplateModalProps) {
  const toast = useToast();
  const [name, setName] = useState(formConfigPayload.title ? `${formConfigPayload.title} Template` : "Custom Review Template");
  const [description, setDescription] = useState(formConfigPayload.description || "");
  const [category, setCategory] = useState("GENERAL");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Validation Error", "Template name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/form-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category,
          icon: "file-text",
          configJson: JSON.stringify(formConfigPayload),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error("Error", data.error || "Failed to save template.");
        setIsSaving(false);
        return;
      }

      toast.success("Template Saved", `"${name}" is now available in your template library.`);
      if (onSavedSuccess) onSavedSuccess();
      onClose();
    } catch {
      toast.error("Error", "Network error saving template.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Bookmark size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink-900">
                Save as Reusable Template
              </h3>
              <p className="text-[11px] text-ink-500">
                Store current questions, prompts, and settings as a reusable workspace template.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-400 hover:bg-warm-100 hover:text-ink-700"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="pt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Template Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Client Onboarding Review"
              className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Template Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of when to use this template..."
              className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-line p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white"
            >
              {TEMPLATE_CATEGORIES.filter((c) => c.id !== "ALL").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} &mdash; {c.description}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>{isSaving ? "Saving..." : "Save Template"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
