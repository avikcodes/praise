"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Edit2,
  ExternalLink,
  FolderKanban,
  Globe,
  Inbox,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { PRESET_ACCENT_COLORS } from "@/lib/branding/utils";
import {
  BrandItem,
  ProjectItem,
  useWorkspace,
} from "@/components/dashboard/workspace-context";
import { PrivacyConsentTab } from "@/components/dashboard/privacy-consent-tab";

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState<"projects" | "brands" | "privacy">("projects");
  const [search, setSearch] = useState("");
  const toast = useToast();

  const {
    activeWorkspace,
    projects,
    isLoadingProjects,
    createProject,
    updateProject,
    deleteProject,
    brands,
    isLoadingBrands,
    createBrand,
    updateBrand,
    deleteBrand,
  } = useWorkspace();

  // Project Modals State
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectItem | null>(null);

  // Project Form State
  const [projName, setProjName] = useState("");
  const [projSlug, setProjSlug] = useState("");
  const [projDescription, setProjDescription] = useState("");
  const [projColor, setProjColor] = useState("#7049D8");
  const [projLogoUrl, setProjLogoUrl] = useState("");
  const [projBrandId, setProjBrandId] = useState("");
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [isUploadingProjLogo, setIsUploadingProjLogo] = useState(false);

  // Brand Modals State
  const [isCreateBrandOpen, setIsCreateBrandOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<BrandItem | null>(null);

  // Brand Form State
  const [brandName, setBrandName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [brandColor, setBrandColor] = useState("#7049D8");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [isSubmittingBrand, setIsSubmittingBrand] = useState(false);
  const [isUploadingBrandLogo, setIsUploadingBrandLogo] = useState(false);

  // Handle Logo Uploads
  const handleProjLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspace?.id) return;
    setIsUploadingProjLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "IMAGE");
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/media/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload logo image");
      setProjLogoUrl(data.asset?.url || "");
      toast.success("Logo Uploaded", "Project logo uploaded successfully.");
    } catch (err: unknown) {
      toast.error("Upload Failed", err instanceof Error ? err.message : "Error uploading logo");
    } finally {
      setIsUploadingProjLogo(false);
    }
  };

  const handleBrandLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeWorkspace?.id) return;
    setIsUploadingBrandLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "IMAGE");
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/media/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload brand logo");
      setBrandLogoUrl(data.asset?.url || "");
      toast.success("Brand Logo Uploaded", "Brand logo uploaded successfully.");
    } catch (err: unknown) {
      toast.error("Upload Failed", err instanceof Error ? err.message : "Error uploading logo");
    } finally {
      setIsUploadingBrandLogo(false);
    }
  };

  // Filter projects & brands
  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand?.name && p.brand.name.toLowerCase().includes(search.toLowerCase())),
  );

  const filteredBrands = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase()) ||
      (b.website && b.website.toLowerCase().includes(search.toLowerCase())),
  );

  // Open Create Project Modal
  const openCreateProject = () => {
    setProjName("");
    setProjSlug("");
    setProjDescription("");
    setProjColor("#7049D8");
    setProjLogoUrl("");
    setProjBrandId("");
    setIsCreateProjectOpen(true);
  };

  // Open Edit Project Modal
  const openEditProject = (proj: ProjectItem) => {
    setEditingProject(proj);
    setProjName(proj.name);
    setProjSlug(proj.slug);
    setProjDescription(proj.description || "");
    setProjColor(proj.color || "#7049D8");
    setProjLogoUrl(proj.logoUrl || "");
    setProjBrandId(proj.brandId || "");
  };

  // Open Create Brand Modal
  const openCreateBrand = () => {
    setBrandName("");
    setBrandSlug("");
    setBrandColor("#7049D8");
    setBrandWebsite("");
    setBrandLogoUrl("");
    setIsCreateBrandOpen(true);
  };

  // Open Edit Brand Modal
  const openEditBrand = (brand: BrandItem) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setBrandSlug(brand.slug);
    setBrandColor(brand.color || "#7049D8");
    setBrandWebsite(brand.website || "");
    setBrandLogoUrl(brand.logoUrl || "");
  };

  // Handle Project Create / Update
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;

    setIsSubmittingProject(true);
    if (editingProject) {
      const res = await updateProject(editingProject.id, {
        name: projName.trim(),
        slug: projSlug.trim() || undefined,
        description: projDescription.trim() || undefined,
        color: projColor,
        logoUrl: projLogoUrl.trim() || undefined,
        brandId: projBrandId || null,
      });
      setIsSubmittingProject(false);
      if (res.success) {
        toast.success("Project updated", `"${projName.trim()}" has been saved.`);
        setEditingProject(null);
      } else {
        toast.error("Failed to update project", res.error || "An error occurred");
      }
    } else {
      const res = await createProject({
        name: projName.trim(),
        slug: projSlug.trim() || undefined,
        description: projDescription.trim() || undefined,
        color: projColor,
        logoUrl: projLogoUrl.trim() || undefined,
        brandId: projBrandId || null,
      });
      setIsSubmittingProject(false);
      if (res.success) {
        toast.success("Project created", `"${projName.trim()}" is now ready.`);
        setIsCreateProjectOpen(false);
      } else {
        toast.error("Failed to create project", res.error || "An error occurred");
      }
    }
  };

  // Handle Project Delete
  const handleConfirmDeleteProject = async () => {
    if (!deletingProject) return;
    const res = await deleteProject(deletingProject.id);
    if (res.success) {
      toast.success(
        "Project removed",
        `"${deletingProject.name}" has been deleted. Linked forms remain workspace-accessible.`,
      );
      setDeletingProject(null);
    } else {
      toast.error("Failed to delete project", res.error || "An error occurred");
    }
  };

  // Handle Brand Create / Update
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    setIsSubmittingBrand(true);
    if (editingBrand) {
      const res = await updateBrand(editingBrand.id, {
        name: brandName.trim(),
        slug: brandSlug.trim() || undefined,
        website: brandWebsite.trim() || undefined,
        logoUrl: brandLogoUrl.trim() || undefined,
        color: brandColor,
      });
      setIsSubmittingBrand(false);
      if (res.success) {
        toast.success("Brand updated", `"${brandName.trim()}" has been saved.`);
        setEditingBrand(null);
      } else {
        toast.error("Failed to update brand", res.error || "An error occurred");
      }
    } else {
      const res = await createBrand({
        name: brandName.trim(),
        slug: brandSlug.trim() || undefined,
        website: brandWebsite.trim() || undefined,
        logoUrl: brandLogoUrl.trim() || undefined,
        color: brandColor,
      });
      setIsSubmittingBrand(false);
      if (res.success) {
        toast.success("Brand created", `"${brandName.trim()}" has been created.`);
        setIsCreateBrandOpen(false);
      } else {
        toast.error("Failed to create brand", res.error || "An error occurred");
      }
    }
  };

  // Handle Brand Delete
  const handleConfirmDeleteBrand = async () => {
    if (!deletingBrand) return;
    const res = await deleteBrand(deletingBrand.id);
    if (res.success) {
      toast.success(
        "Brand deleted",
        `"${deletingBrand.name}" was deleted. Projects previously linked to this brand are now unassigned.`,
      );
      setDeletingBrand(null);
    } else {
      toast.error("Failed to delete brand", res.error || "An error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects & Brands"
        description={`Manage the projects and brand identities in workspace "${activeWorkspace?.name || "Praise"}".`}
        actions={
          <div className="flex items-center gap-2">
            {activeTab === "projects" ? (
              <button
                type="button"
                onClick={openCreateProject}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
              >
                <Plus size={14} />
                <span>New Project</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreateBrand}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors"
              >
                <Plus size={14} />
                <span>New Brand</span>
              </button>
            )}
          </div>
        }
      />

      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "projects"
                ? "bg-warm-200 text-ink-900 shadow-2xs"
                : "text-ink-600 hover:bg-warm-100 hover:text-ink-900"
            }`}
          >
            <FolderKanban size={14} className={activeTab === "projects" ? "text-brand-600" : "text-ink-400"} />
            <span>Projects</span>
            <span className="rounded-full bg-white px-2 py-0.2 text-[10px] text-ink-600 border border-line">
              {projects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("brands")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "brands"
                ? "bg-warm-200 text-ink-900 shadow-2xs"
                : "text-ink-600 hover:bg-warm-100 hover:text-ink-900"
            }`}
          >
            <Sparkles size={14} className={activeTab === "brands" ? "text-brand-600" : "text-ink-400"} />
            <span>Brands</span>
            <span className="rounded-full bg-white px-2 py-0.2 text-[10px] text-ink-600 border border-line">
              {brands.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "privacy"
                ? "bg-warm-200 text-ink-900 shadow-2xs"
                : "text-ink-600 hover:bg-warm-100 hover:text-ink-900"
            }`}
          >
            <ShieldCheck size={14} className={activeTab === "privacy" ? "text-brand-600" : "text-ink-400"} />
            <span>Privacy &amp; Consent</span>
          </button>
        </div>

        {/* Workspace Quick Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-ink-500">
          <Building2 size={13} className="text-ink-400" />
          <span>Active Workspace:</span>
          <span className="font-semibold text-ink-800">
            {activeWorkspace?.name || "Default Workspace"}
          </span>
        </div>
      </div>

      {/* Search and stats bar */}
      {activeTab !== "privacy" && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-2.5 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === "projects"
                  ? "Search projects by name, slug, or brand..."
                  : "Search brands by name, website, or slug..."
              }
              className="w-full rounded-lg border border-line bg-white pl-9 pr-3 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <span className="text-xs text-ink-500">
            {activeTab === "projects"
              ? `Showing ${filteredProjects.length} of ${projects.length} projects`
              : `Showing ${filteredBrands.length} of ${brands.length} brands`}
          </span>
        </div>
      )}

      {/* -------------------- PROJECTS TAB -------------------- */}
      {activeTab === "projects" && (
        <>
          {isLoadingProjects ? (
            <div className="rounded-2xl border border-line bg-white p-12 text-center">
              <Loader2 size={24} className="mx-auto animate-spin text-brand-600 mb-2" />
              <p className="text-xs text-ink-600">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white/50 p-12 text-center">
              <FolderKanban size={36} className="mx-auto text-ink-300 mb-3" />
              <h3 className="text-sm font-semibold text-ink-900 mb-1">
                {search ? "No matching projects found" : "No projects created yet"}
              </h3>
              <p className="text-xs text-ink-500 max-w-sm mx-auto mb-4">
                {search
                  ? "Try searching for a different keyword or slug identifier."
                  : "Projects organize collection forms, widgets, and testimonials for a specific website or product."}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={openCreateProject}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                >
                  <Plus size={14} />
                  <span>Create First Project</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-line bg-white p-5 shadow-xs transition-shadow hover:shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Color + Name + Action buttons */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: project.color || "#7049D8" }}
                          aria-hidden="true"
                        />
                        <h2 className="text-sm font-semibold text-ink-900 truncate">
                          {project.name}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditProject(project)}
                          className="rounded p-1 text-ink-400 hover:text-ink-700 hover:bg-warm-100 transition-colors"
                          title="Edit project"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProject(project)}
                          className="rounded p-1 text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete project"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Brand Pill if associated */}
                    <div className="mt-2 flex items-center gap-2">
                      {project.brand ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border"
                          style={{
                            borderColor: project.brand.color
                              ? `${project.brand.color}40`
                              : "#e5e7eb",
                            backgroundColor: project.brand.color
                              ? `${project.brand.color}15`
                              : "#f3f4f6",
                            color: project.brand.color || "#374151",
                          }}
                        >
                          <Sparkles size={10} />
                          <span>Brand: {project.brand.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warm-100 px-2 py-0.5 text-[10px] font-medium text-ink-500">
                          <Tag size={10} />
                          <span>Unbranded</span>
                        </span>
                      )}
                    </div>

                    <p className="mt-2.5 text-xs text-ink-500 line-clamp-2 leading-relaxed">
                      {project.description || "No project description provided."}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-ink-400">
                      <span>slug: {project.slug}</span>
                    </div>
                  </div>

                  {/* Bottom counters & link */}
                  <div className="mt-5 border-t border-line/70 pt-4 flex items-center justify-between text-xs text-ink-600">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1" title="Forms count">
                        <Inbox size={13} className="text-ink-400" />
                        <span>{project.formsCount} forms</span>
                      </span>
                      <span className="flex items-center gap-1" title="Widgets count">
                        <LayoutGrid size={13} className="text-ink-400" />
                        <span>{project.widgetsCount} widgets</span>
                      </span>
                    </div>

                    <Link
                      href="/dashboard/forms"
                      className="text-brand-600 hover:text-brand-700 font-semibold"
                    >
                      Forms &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* -------------------- BRANDS TAB -------------------- */}
      {activeTab === "brands" && (
        <>
          {isLoadingBrands ? (
            <div className="rounded-2xl border border-line bg-white p-12 text-center">
              <Loader2 size={24} className="mx-auto animate-spin text-brand-600 mb-2" />
              <p className="text-xs text-ink-600">Loading brands...</p>
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white/50 p-12 text-center">
              <Sparkles size={36} className="mx-auto text-ink-300 mb-3" />
              <h3 className="text-sm font-semibold text-ink-900 mb-1">
                {search ? "No matching brands found" : "No brands created yet"}
              </h3>
              <p className="text-xs text-ink-500 max-w-sm mx-auto mb-4">
                {search
                  ? "Try searching for another brand name or website."
                  : "Brands let you define overarching company styling, accent colors, and logos shared across multiple projects."}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={openCreateBrand}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                >
                  <Plus size={14} />
                  <span>Create First Brand</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="rounded-xl border border-line bg-white p-5 shadow-xs transition-shadow hover:shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Brand Color/Logo + Name + Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-bold text-xs shadow-2xs"
                          style={{ backgroundColor: brand.color || "#7049D8" }}
                        >
                          {brand.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold text-ink-900 truncate">
                            {brand.name}
                          </h2>
                          <span className="block text-[11px] font-mono text-ink-400">
                            /{brand.slug}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditBrand(brand)}
                          className="rounded p-1 text-ink-400 hover:text-ink-700 hover:bg-warm-100 transition-colors"
                          title="Edit brand"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingBrand(brand)}
                          className="rounded p-1 text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete brand"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Website */}
                    <div className="mt-3">
                      {brand.website ? (
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium truncate max-w-full"
                        >
                          <Globe size={12} className="shrink-0" />
                          <span className="truncate">{brand.website}</span>
                          <ExternalLink size={10} className="shrink-0" />
                        </a>
                      ) : (
                        <span className="text-xs text-ink-400 italic">
                          No website registered
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Linked Projects Count */}
                  <div className="mt-5 border-t border-line/70 pt-4 flex items-center justify-between text-xs text-ink-600">
                    <span className="flex items-center gap-1.5">
                      <FolderKanban size={13} className="text-ink-400" />
                      <span>
                        {brand.projectsCount ?? brand.projects?.length ?? 0} linked projects
                      </span>
                    </span>

                    <span
                      className="h-3 w-3 rounded-full border border-black/10"
                      style={{ backgroundColor: brand.color || "#7049D8" }}
                      title={`Accent Color: ${brand.color || "#7049D8"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* -------------------- PRIVACY & CONSENT TAB -------------------- */}
      {activeTab === "privacy" && activeWorkspace && (
        <PrivacyConsentTab
          workspaceId={activeWorkspace.id}
          projects={projects}
        />
      )}

      {/* -------------------- CREATE / EDIT PROJECT MODAL -------------------- */}
      <ModalDialog
        isOpen={isCreateProjectOpen || editingProject !== null}
        onClose={() => {
          setIsCreateProjectOpen(false);
          setEditingProject(null);
        }}
        title={editingProject ? "Edit Project" : "Create New Project"}
        description="Configure project details, public URL slug, brand association, and theme accent color."
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsCreateProjectOpen(false);
                setEditingProject(null);
              }}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100"
              disabled={isSubmittingProject}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProject}
              disabled={isSubmittingProject || !projName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmittingProject && <Loader2 size={12} className="animate-spin" />}
              <span>{editingProject ? "Save Changes" : "Create Project"}</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={projName}
              onChange={(e) => {
                setProjName(e.target.value);
                if (!editingProject) {
                  setProjSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  );
                }
              }}
              placeholder="e.g. Marketing Landing Page"
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Project URL Slug
            </label>
            <input
              type="text"
              value={projSlug}
              onChange={(e) => setProjSlug(e.target.value)}
              placeholder="e.g. marketing-landing"
              className="w-full rounded-lg border border-line p-2 text-xs font-mono text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-[11px] text-ink-500">
              Unique URL slug within this workspace.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={projDescription}
              onChange={(e) => setProjDescription(e.target.value)}
              placeholder="Brief description of this project..."
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                  value={projColor}
                  onChange={(e) => setProjColor(e.target.value)}
                  className="h-8 w-8 rounded cursor-pointer border border-line bg-transparent p-0"
                />
                <input
                  type="text"
                  value={projColor}
                  onChange={(e) => setProjColor(e.target.value)}
                  className="w-full rounded-lg border border-line p-1.5 text-xs font-mono text-ink-900"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {PRESET_ACCENT_COLORS.slice(0, 8).map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    onClick={() => setProjColor(preset.value)}
                    className={`h-4 w-4 rounded-full border transition-transform ${
                      projColor.toLowerCase() === preset.value.toLowerCase()
                        ? "ring-2 ring-brand-500 ring-offset-1 scale-110"
                        : "border-black/10 hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Brand Association
              </label>
              <select
                value={projBrandId}
                onChange={(e) => setProjBrandId(e.target.value)}
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

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Project Logo (Optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={projLogoUrl}
                onChange={(e) => setProjLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png or upload file"
                className="flex-1 rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-warm-50 px-3 py-2 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors shrink-0">
                {isUploadingProjLogo ? (
                  <Loader2 size={13} className="animate-spin text-brand-600" />
                ) : (
                  <Upload size={13} className="text-ink-600" />
                )}
                <span>{isUploadingProjLogo ? "Uploading..." : "Upload"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                  className="hidden"
                  onChange={handleProjLogoUpload}
                  disabled={isUploadingProjLogo}
                />
              </label>
            </div>
            {projLogoUrl && (
              <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-line bg-warm-50/70 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={projLogoUrl}
                  alt="Project Logo preview"
                  className="h-8 w-8 rounded object-contain border border-line bg-white p-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-ink-900 truncate">{projLogoUrl}</p>
                  <p className="text-[10px] text-ink-500">Logo active</p>
                </div>
                <button
                  type="button"
                  onClick={() => setProjLogoUrl("")}
                  className="rounded p-1 text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Remove logo"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Project Privacy & Consent Policy Configuration */}
          <div className="rounded-xl border border-line bg-warm-50/60 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-ink-900">
              <ShieldCheck size={15} className="text-brand-600" />
              <span>Project Privacy &amp; Consent Configuration</span>
            </div>
            <p className="text-[11px] text-ink-600 leading-relaxed">
              Testimonials collected for this project require explicit opt-in consent (Version 1.0). Customer responses will only be published where permission was explicitly granted.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line/60 text-[11px] text-ink-700">
              <div>
                <span className="font-medium block text-ink-900">Active Policy Version:</span>
                <span className="font-mono text-ink-600">v1.0 (Standard)</span>
              </div>
              <div>
                <span className="font-medium block text-ink-900">Separate Media Consent:</span>
                <span className="text-emerald-700 font-medium">Enforced for video &amp; photos</span>
              </div>
            </div>
          </div>
        </form>
      </ModalDialog>

      {/* -------------------- CREATE / EDIT BRAND MODAL -------------------- */}
      <ModalDialog
        isOpen={isCreateBrandOpen || editingBrand !== null}
        onClose={() => {
          setIsCreateBrandOpen(false);
          setEditingBrand(null);
        }}
        title={editingBrand ? "Edit Brand" : "Create New Brand"}
        description="Brands define company identity, accent colors, and website references that multiple projects can adopt."
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsCreateBrandOpen(false);
                setEditingBrand(null);
              }}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-warm-100"
              disabled={isSubmittingBrand}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveBrand}
              disabled={isSubmittingBrand || !brandName.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmittingBrand && <Loader2 size={12} className="animate-spin" />}
              <span>{editingBrand ? "Save Changes" : "Create Brand"}</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveBrand} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Brand Name *
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => {
                setBrandName(e.target.value);
                if (!editingBrand) {
                  setBrandSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  );
                }
              }}
              placeholder="e.g. Acme Studio"
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Brand URL Slug
            </label>
            <input
              type="text"
              value={brandSlug}
              onChange={(e) => setBrandSlug(e.target.value)}
              placeholder="e.g. acme-studio"
              className="w-full rounded-lg border border-line p-2 text-xs font-mono text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Website URL (Optional)
            </label>
            <input
              type="url"
              value={brandWebsite}
              onChange={(e) => setBrandWebsite(e.target.value)}
              placeholder="https://acme.com"
              className="w-full rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-8 w-8 rounded cursor-pointer border border-line bg-transparent p-0"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-full rounded-lg border border-line p-1.5 text-xs font-mono text-ink-900"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {PRESET_ACCENT_COLORS.slice(0, 8).map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    onClick={() => setBrandColor(preset.value)}
                    className={`h-4 w-4 rounded-full border transition-transform ${
                      brandColor.toLowerCase() === preset.value.toLowerCase()
                        ? "ring-2 ring-brand-500 ring-offset-1 scale-110"
                        : "border-black/10 hover:scale-105"
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Brand Logo (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={brandLogoUrl}
                  onChange={(e) => setBrandLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.svg or upload"
                  className="flex-1 rounded-lg border border-line p-2 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-warm-50 px-2.5 py-2 text-xs font-medium text-ink-700 hover:bg-warm-100 transition-colors shrink-0">
                  {isUploadingBrandLogo ? (
                    <Loader2 size={13} className="animate-spin text-brand-600" />
                  ) : (
                    <Upload size={13} className="text-ink-600" />
                  )}
                  <span>{isUploadingBrandLogo ? "..." : "Upload"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                    className="hidden"
                    onChange={handleBrandLogoUpload}
                    disabled={isUploadingBrandLogo}
                  />
                </label>
              </div>
              {brandLogoUrl && (
                <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-line bg-warm-50/70 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brandLogoUrl}
                    alt="Brand Logo preview"
                    className="h-8 w-8 rounded object-contain border border-line bg-white p-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-ink-900 truncate">{brandLogoUrl}</p>
                    <p className="text-[10px] text-ink-500">Logo active</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBrandLogoUrl("")}
                    className="rounded p-1 text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove logo"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </ModalDialog>

      {/* -------------------- DESTRUCTIVE CONFIRMATION: PROJECT -------------------- */}
      <ConfirmDialog
        isOpen={deletingProject !== null}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleConfirmDeleteProject}
        title={`Delete Project "${deletingProject?.name}"?`}
        message="Deleting this project will dissociate all linked forms and widgets (they will become workspace-level items). Testimonials and customer media will remain completely preserved in your workspace."
        confirmLabel="Yes, Delete Project"
        isDestructive
      />

      {/* -------------------- DESTRUCTIVE CONFIRMATION: BRAND -------------------- */}
      <ConfirmDialog
        isOpen={deletingBrand !== null}
        onClose={() => setDeletingBrand(null)}
        onConfirm={handleConfirmDeleteBrand}
        title={`Delete Brand "${deletingBrand?.name}"?`}
        message="Deleting this brand will unassign it from any linked projects. The projects and their associated collection forms will not be deleted."
        confirmLabel="Yes, Delete Brand"
        isDestructive
      />
    </div>
  );
}
