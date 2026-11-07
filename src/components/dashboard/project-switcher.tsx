"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { useToast } from "@/components/dashboard/toast-context";
import { ModalDialog } from "@/components/dashboard/modal-dialog";

export function ProjectSwitcher() {
  const [open, setOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectSlug, setProjectSlug] = useState("");
  const [projectColor, setProjectColor] = useState("#7049D8");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const {
    projects,
    activeProject,
    setActiveProjectId,
    createProject,
    brands,
  } = useWorkspace();

  const currentProject = activeProject || projects[0] || null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNameChange = (val: string) => {
    setProjectName(val);
    setProjectSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsSubmitting(true);
    const result = await createProject({
      name: projectName.trim(),
      slug: projectSlug.trim() || undefined,
      color: projectColor,
      brandId: selectedBrandId || null,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Project created", `Switched to "${projectName.trim()}".`);
      setCreateModalOpen(false);
      setProjectName("");
      setProjectSlug("");
      setSelectedBrandId("");
    } else {
      toast.error("Failed to create project", result.error || "An error occurred");
    }
  };

  return (
    <>
      <div className="relative mt-2" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-line/70 bg-white/60 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-white hover:border-line focus:outline-none"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: currentProject?.color || "#7049D8" }}
              aria-hidden="true"
            />
            <span className="truncate font-medium text-ink-800">
              {currentProject ? currentProject.name : "All Projects"}
            </span>
          </div>
          <ChevronDown
            size={13}
            className={cn(
              "text-ink-400 shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-line bg-white p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-400">
              Projects ({projects.length})
            </div>
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => {
                    setActiveProjectId(proj.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors text-left",
                    proj.id === currentProject?.id
                      ? "bg-warm-100 font-semibold text-ink-900"
                      : "text-ink-700 hover:bg-warm-50",
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: proj.color || "#7049D8" }}
                    />
                    <span className="truncate">{proj.name}</span>
                  </div>
                  {proj.id === currentProject?.id && (
                    <Check size={13} className="text-brand-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="my-1 border-t border-line" />

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreateModalOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-600 hover:bg-warm-50 hover:text-ink-900 transition-colors"
            >
              <Plus size={13} className="text-brand-600" />
              <span>New Project</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Project Modal Dialog */}
      <ModalDialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Project"
        description="A project groups together forms, moderated testimonials, and embed widgets for a specific website or product."
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting || !projectName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={12} className="animate-spin" />}
              <span>Create Project</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Project Name
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Marketing Landing Page"
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Project Slug
            </label>
            <input
              type="text"
              value={projectSlug}
              onChange={(e) => setProjectSlug(e.target.value)}
              placeholder="e.g. marketing-landing"
              className="w-full rounded-lg border border-line p-2 text-xs font-mono text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={projectColor}
                  onChange={(e) => setProjectColor(e.target.value)}
                  className="h-8 w-8 rounded cursor-pointer border border-line bg-transparent p-0"
                />
                <input
                  type="text"
                  value={projectColor}
                  onChange={(e) => setProjectColor(e.target.value)}
                  className="w-full rounded-lg border border-line p-1.5 text-xs font-mono text-ink-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Associated Brand
              </label>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">None (Independent)</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </ModalDialog>
    </>
  );
}
