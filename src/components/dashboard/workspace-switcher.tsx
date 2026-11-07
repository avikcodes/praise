"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Plus, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { useToast } from "@/components/dashboard/toast-context";
import { ModalDialog } from "@/components/dashboard/modal-dialog";

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsSlug, setNewWsSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspaceId,
    createWorkspace,
  } = useWorkspace();

  const currentWorkspace = activeWorkspace || workspaces[0] || {
    id: "ws-default",
    name: "Default Workspace",
    slug: "default",
    role: "OWNER",
  };

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
    setNewWsName(val);
    setNewWsSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    setIsSubmitting(true);
    const result = await createWorkspace(
      newWsName.trim(),
      newWsSlug.trim() || undefined,
    );
    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        "Workspace created",
        `Switched to "${newWsName.trim()}".`,
      );
      setCreateModalOpen(false);
      setNewWsName("");
      setNewWsSlug("");
    } else {
      toast.error("Failed to create workspace", result.error || "An error occurred");
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2.5 rounded-lg border border-line bg-warm-100/70 p-2 text-left text-xs transition-colors hover:bg-warm-200/80 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-500 text-white font-semibold text-xs shadow-xs">
              {currentWorkspace.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 truncate">
              <span className="block truncate font-semibold text-ink-900 leading-tight">
                {currentWorkspace.name}
              </span>
              <span className="block text-[10px] text-ink-400 capitalize">
                {currentWorkspace.role.toLowerCase()}
              </span>
            </div>
          </div>
          <ChevronDown
            size={14}
            className={cn(
              "text-ink-400 shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-line bg-white p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-ink-400">
              Workspaces ({workspaces.length})
            </div>
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    setActiveWorkspaceId(ws.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors text-left",
                    ws.id === currentWorkspace.id
                      ? "bg-warm-100 font-semibold text-ink-900"
                      : "text-ink-700 hover:bg-warm-50",
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 size={14} className="text-ink-400 shrink-0" />
                    <span className="truncate">{ws.name}</span>
                  </div>
                  {ws.id === currentWorkspace.id && (
                    <Check size={14} className="text-brand-600 shrink-0" />
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
              <span>Create workspace</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <ModalDialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Workspace"
        description="Workspaces provide isolated environments for brands, projects, collection forms, and customer media."
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
              disabled={isSubmitting || !newWsName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={12} className="animate-spin" />}
              <span>Create Workspace</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={newWsName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Workspace URL Slug
            </label>
            <input
              type="text"
              value={newWsSlug}
              onChange={(e) => setNewWsSlug(e.target.value)}
              placeholder="e.g. acme-corp"
              className="w-full rounded-lg border border-line p-2 text-xs font-mono text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-[11px] text-ink-500">
              Unique identifier used in URLs and API routes.
            </p>
          </div>
        </form>
      </ModalDialog>
    </>
  );
}
