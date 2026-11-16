"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CopyPlus,
  ExternalLink,
  Eye,
  Globe,
  Heart,
  Layers,
  MessageSquareQuote,
  Palette,
  Plus,
  Search,
  Settings2,
  Share2,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  accentColor: string | null;
  websiteUrl: string | null;
  tagline: string | null;
  description: string | null;
  theme: string;
  isPublished: boolean;
  selectedWallIdList: string[];
  featuredIdList: string[];
  socialLinks: Record<string, string>;
  ctaEnabled: boolean;
  ctaLabel: string | null;
  ctaUrl: string | null;
  ctaSecondaryEnabled: boolean;
  ctaSecondaryLabel: string | null;
  ctaSecondaryUrl: string | null;
  viewsCount: number;
  approvedCount: number;
  projectCount: number;
  activeDomain: string | null;
  publicUrl: string;
  createdAt: string;
  updatedAt: string;
}

const THEMES = [
  { id: "WARM", name: "Warm Editorial", bg: "bg-[#FAF7F2]", border: "border-[#E8E2D7]", desc: "Cream paper & amber" },
  { id: "LIGHT", name: "Modern Light", bg: "bg-white", border: "border-slate-200", desc: "Crisp SaaS clean" },
  { id: "DARK", name: "Dark Slate", bg: "bg-[#0F172A]", border: "border-slate-800", desc: "High contrast dark" },
  { id: "MIDNIGHT", name: "Midnight Indigo", bg: "bg-[#090D16]", border: "border-[#1D2845]", desc: "Deep navy glow" },
  { id: "EMERALD", name: "Emerald Botanical", bg: "bg-[#F2F7F4]", border: "border-[#D1E3D9]", desc: "Organic forest sage" },
  { id: "SUNSET", name: "Sunset Terracotta", bg: "bg-[#FFF7F2]", border: "border-[#FAD9C8]", desc: "Warm coral peach" },
  { id: "MINIMAL", name: "Monochrome Minimal", bg: "bg-white", border: "border-black", desc: "Black & white editorial" },
];

export default function BrandPagesDashboard() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const toast = useToast();

  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "theme" | "walls" | "testimonials">("profile");
  const [saving, setSaving] = useState(false);

  // Available Wall & Testimonial options
  const [availableWalls, setAvailableWalls] = useState<Array<{ id: string; name: string; slug: string; layout: string }>>([]);
  const [availableTestimonials, setAvailableTestimonials] = useState<Array<{ id: string; content: string; rating: number | null; customerName: string; customerCompany: string | null }>>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    accentColor: "#7049D8",
    websiteUrl: "",
    tagline: "",
    description: "",
    theme: "WARM",
    isPublished: true,
    selectedWallIds: [] as string[],
    featuredTestimonialIds: [] as string[],
    ctaEnabled: true,
    ctaLabel: "Visit Website",
    ctaUrl: "",
    ctaSecondaryEnabled: false,
    ctaSecondaryLabel: "Share Praise",
    ctaSecondaryUrl: "",
    socialTwitter: "",
    socialLinkedin: "",
    socialGithub: "",
    socialYoutube: "",
  });

  const fetchBrands = async () => {
    if (!activeWorkspace?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${workspaceId}/brands`);
      if (res.ok) {
        const data = await res.json();
        setBrands(data.brands || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load brands", "Could not fetch brand profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [activeWorkspace?.id]);

  const handleOpenCreate = async () => {
    setEditingBrand(null);
    setFormData({
      name: "",
      slug: "",
      logoUrl: "",
      accentColor: "#7049D8",
      websiteUrl: "",
      tagline: "",
      description: "",
      theme: "WARM",
      isPublished: true,
      selectedWallIds: [],
      featuredTestimonialIds: [],
      ctaEnabled: true,
      ctaLabel: "Visit Website",
      ctaUrl: "",
      ctaSecondaryEnabled: false,
      ctaSecondaryLabel: "Share Praise",
      ctaSecondaryUrl: "",
      socialTwitter: "",
      socialLinkedin: "",
      socialGithub: "",
      socialYoutube: "",
    });
    setActiveTab("profile");
    setIsModalOpen(true);

    // Fetch available walls in workspace
    if (activeWorkspace?.id) {
      try {
        const wallsRes = await fetch(`/api/workspaces/${workspaceId}/walls`);
        if (wallsRes.ok) {
          const wData = await wallsRes.json();
          setAvailableWalls(wData.walls || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleOpenEdit = async (brand: BrandItem) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl || "",
      accentColor: brand.accentColor || "#7049D8",
      websiteUrl: brand.websiteUrl || "",
      tagline: brand.tagline || "",
      description: brand.description || "",
      theme: brand.theme || "WARM",
      isPublished: brand.isPublished,
      selectedWallIds: brand.selectedWallIdList || [],
      featuredTestimonialIds: brand.featuredIdList || [],
      ctaEnabled: brand.ctaEnabled,
      ctaLabel: brand.ctaLabel || "Visit Website",
      ctaUrl: brand.ctaUrl || "",
      ctaSecondaryEnabled: brand.ctaSecondaryEnabled,
      ctaSecondaryLabel: brand.ctaSecondaryLabel || "Share Praise",
      ctaSecondaryUrl: brand.ctaSecondaryUrl || "",
      socialTwitter: brand.socialLinks?.twitter || "",
      socialLinkedin: brand.socialLinks?.linkedin || "",
      socialGithub: brand.socialLinks?.github || "",
      socialYoutube: brand.socialLinks?.youtube || "",
    });
    setActiveTab("profile");
    setIsModalOpen(true);

    if (activeWorkspace?.id) {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/brands/${brand.id}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableWalls(data.availableWalls || []);
          setAvailableTestimonials(data.availableTestimonials || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace?.id) return;

    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        slug: formData.slug,
        logoUrl: formData.logoUrl || null,
        accentColor: formData.accentColor,
        websiteUrl: formData.websiteUrl || null,
        tagline: formData.tagline || null,
        description: formData.description || null,
        theme: formData.theme,
        isPublished: formData.isPublished,
        selectedWallIds: formData.selectedWallIds,
        featuredTestimonialIds: formData.featuredTestimonialIds,
        ctaEnabled: formData.ctaEnabled,
        ctaLabel: formData.ctaLabel,
        ctaUrl: formData.ctaUrl || null,
        ctaSecondaryEnabled: formData.ctaSecondaryEnabled,
        ctaSecondaryLabel: formData.ctaSecondaryLabel,
        ctaSecondaryUrl: formData.ctaSecondaryUrl || null,
        socialLinks: {
          twitter: formData.socialTwitter || undefined,
          linkedin: formData.socialLinkedin || undefined,
          github: formData.socialGithub || undefined,
          youtube: formData.socialYoutube || undefined,
        },
      };

      const url = editingBrand
        ? `/api/workspaces/${workspaceId}/brands/${editingBrand.id}`
        : `/api/workspaces/${workspaceId}/brands`;

      const method = editingBrand ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save brand profile.");
      }

      toast.success(
        editingBrand ? "Brand Updated" : "Brand Created",
        `Successfully saved ${formData.name}.`
      );
      setIsModalOpen(false);
      fetchBrands();
    } catch (err: any) {
      toast.error("Error saving brand", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (brand: BrandItem) => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !brand.isPublished }),
      });
      if (res.ok) {
        toast.success(
          brand.isPublished ? "Brand Unpublished" : "Brand Published",
          `Brand "${brand.name}" is now ${brand.isPublished ? "in draft" : "publicly visible"}.`
        );
        fetchBrands();
      }
    } catch (err) {
      toast.error("Update failed", "Could not toggle publish state.");
    }
  };

  const handleDuplicate = async (brand: BrandItem) => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brands/${brand.id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Brand Duplicated", `Created a copy of ${brand.name}.`);
        fetchBrands();
      }
    } catch (err) {
      toast.error("Duplicate failed", "Could not duplicate brand.");
    }
  };

  const handleDelete = async (brand: BrandItem) => {
    if (!activeWorkspace?.id) return;
    if (!confirm(`Are you sure you want to delete "${brand.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/brands/${brand.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Brand Deleted", `Removed ${brand.name}.`);
        fetchBrands();
      }
    } catch (err) {
      toast.error("Delete failed", "Could not delete brand.");
    }
  };

  const handleCopyLink = (slug: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${origin}/b/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
    toast.success("Link Copied", `Copied public brand URL: ${fullUrl}`);
  };

  const filteredBrands = brands.filter((b) => {
    if (statusFilter === "published" && !b.isPublished) return false;
    if (statusFilter === "draft" && b.isPublished) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.tagline && b.tagline.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalBrands = brands.length;
  const publishedCount = brands.filter((b) => b.isPublished).length;
  const totalViews = brands.reduce((sum, b) => sum + (b.viewsCount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand Pages"
        description="Create dedicated public brand profiles showcasing your logo, verified customer proof, and curated Walls of Love."
        actions={
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-brand-600 transition-colors"
          >
            <Plus size={14} />
            <span>Create Brand Page</span>
          </button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-xs font-semibold text-ink-500">Total Brands</div>
          <div className="text-2xl font-bold text-ink-900 mt-1">{totalBrands}</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-xs font-semibold text-ink-500">Published Live</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{publishedCount}</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-xs font-semibold text-ink-500">Total Views</div>
          <div className="text-2xl font-bold text-brand-600 mt-1">{totalViews}</div>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 shadow-2xs">
          <div className="text-xs font-semibold text-ink-500">Draft Profiles</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{totalBrands - publishedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-line shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search brands by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-line bg-sand-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(["all", "published", "draft"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-colors ${
                statusFilter === tab
                  ? "bg-brand-50 text-brand-700 border border-brand-200"
                  : "text-ink-600 hover:bg-sand-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-ink-400">Loading brand profiles...</div>
      ) : filteredBrands.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white p-12 text-center space-y-3">
          <Globe size={36} className="mx-auto text-ink-300" />
          <h3 className="text-sm font-bold text-ink-800">No brand profiles found</h3>
          <p className="text-xs text-ink-500 max-w-sm mx-auto">
            Create your first brand page to present your product identity and testimonials with custom domain support.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 transition-colors"
          >
            <Plus size={14} />
            <span>Create Brand</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBrands.map((brand) => (
            <div
              key={brand.id}
              className="rounded-3xl border border-line bg-white p-5 shadow-2xs flex flex-col justify-between hover:border-brand-300 transition-all space-y-4"
            >
              <div className="space-y-3">
                {/* Header row: Logo, Name, Status badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {brand.logoUrl ? (
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        className="w-12 h-12 rounded-xl object-cover border border-line bg-sand-50 p-0.5"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-xs"
                        style={{ backgroundColor: brand.accentColor || "#7049D8" }}
                      >
                        {brand.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-bold text-ink-900 line-clamp-1">{brand.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-ink-500">
                        <span className="font-mono text-[11px] text-ink-600">/b/{brand.slug}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTogglePublish(brand)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                      brand.isPublished
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${brand.isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span>{brand.isPublished ? "Live" : "Draft"}</span>
                  </button>
                </div>

                {brand.tagline && (
                  <p className="text-xs font-semibold text-ink-700 line-clamp-1">{brand.tagline}</p>
                )}

                {brand.description && (
                  <p className="text-xs text-ink-500 line-clamp-2 leading-relaxed">{brand.description}</p>
                )}

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="rounded-lg bg-sand-100 px-2 py-0.5 text-[10px] font-bold text-ink-700 uppercase">
                    {brand.theme}
                  </span>
                  <span className="rounded-lg bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
                    {brand.selectedWallIdList.length} Walls
                  </span>
                  {brand.activeDomain ? (
                    <span className="rounded-lg bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                      <Globe size={10} />
                      <span>{brand.activeDomain}</span>
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Action Buttons row */}
              <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(brand.slug)}
                    title="Copy Public URL"
                    className="p-1.5 text-ink-500 hover:text-ink-900 hover:bg-sand-100 rounded-lg transition-colors"
                  >
                    {copiedSlug === brand.slug ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>

                  <Link
                    href={`/b/${brand.slug}?preview=true`}
                    target="_blank"
                    title="Preview Public Page"
                    className="p-1.5 text-ink-500 hover:text-ink-900 hover:bg-sand-100 rounded-lg transition-colors"
                  >
                    <Eye size={14} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDuplicate(brand)}
                    title="Duplicate Brand"
                    className="p-1.5 text-ink-500 hover:text-ink-900 hover:bg-sand-100 rounded-lg transition-colors"
                  >
                    <CopyPlus size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(brand)}
                    title="Delete Brand"
                    className="p-1.5 text-ink-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(brand)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-ink-900 text-white text-xs font-bold hover:bg-black transition-colors"
                >
                  <Settings2 size={12} />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brand Creator / Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-line shadow-xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink-900">
                  {editingBrand ? `Edit Brand: ${editingBrand.name}` : "Create Brand Page"}
                </h2>
                <p className="text-xs text-ink-500">Configure public profile details, theme, and curated walls.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-ink-400 hover:text-ink-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-line flex items-center gap-4 text-xs font-bold bg-sand-50/50">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`py-3 border-b-2 transition-colors ${
                  activeTab === "profile"
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-ink-500 hover:text-ink-800"
                }`}
              >
                1. Profile & Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("theme")}
                className={`py-3 border-b-2 transition-colors ${
                  activeTab === "theme"
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-ink-500 hover:text-ink-800"
                }`}
              >
                2. Theme & Style
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("walls")}
                className={`py-3 border-b-2 transition-colors ${
                  activeTab === "walls"
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-ink-500 hover:text-ink-800"
                }`}
              >
                3. Walls Showcase ({formData.selectedWallIds.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("testimonials")}
                className={`py-3 border-b-2 transition-colors ${
                  activeTab === "testimonials"
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-ink-500 hover:text-ink-800"
                }`}
              >
                4. CTAs & Social
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeTab === "profile" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-900 mb-1">Brand Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acme Cloud"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-line focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink-900 mb-1">URL Slug *</label>
                      <div className="flex items-center">
                        <span className="px-2.5 py-2 text-xs bg-sand-100 border border-r-0 border-line rounded-l-xl text-ink-500">
                          /b/
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="acme-cloud"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-r-xl border border-line focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-900 mb-1">Tagline</label>
                    <input
                      type="text"
                      placeholder="e.g. The world's fastest database platform"
                      value={formData.tagline}
                      onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-line focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-900 mb-1">Brand Description</label>
                    <textarea
                      rows={3}
                      placeholder="Tell customers about your mission, products, and what makes your team unique..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-line focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-900 mb-1">Website URL</label>
                      <input
                        type="url"
                        placeholder="https://acme.com"
                        value={formData.websiteUrl}
                        onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-line focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink-900 mb-1">Brand Logo URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={formData.logoUrl}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-line focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPublished}
                        onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                        className="rounded border-line text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs font-bold text-ink-900">Publish immediately (Live)</span>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === "theme" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-900 mb-2">Theme Preset</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {THEMES.map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, theme: th.id })}
                          className={`p-3 rounded-2xl border text-left transition-all ${th.bg} ${
                            formData.theme === th.id
                              ? "ring-2 ring-brand-500 border-transparent shadow-xs"
                              : "border-line hover:border-ink-300"
                          }`}
                        >
                          <div className="text-xs font-bold text-ink-900">{th.name}</div>
                          <div className="text-[11px] text-ink-500">{th.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-900 mb-1">Primary Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.accentColor}
                        onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                        className="w-10 h-10 rounded-xl cursor-pointer border border-line"
                      />
                      <input
                        type="text"
                        value={formData.accentColor}
                        onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                        className="w-28 px-3 py-2 text-xs rounded-xl border border-line font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "walls" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-900 mb-1">
                      Select Walls of Love to Feature on this Brand Page
                    </label>
                    <p className="text-xs text-ink-500 mb-3">
                      Selected walls will be presented in the showcase section with direct links to full galleries.
                    </p>

                    {availableWalls.length === 0 ? (
                      <div className="p-6 rounded-2xl border border-dashed border-line text-center text-xs text-ink-400">
                        No published walls found in this workspace. Create a Wall of Love first to showcase it here.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {availableWalls.map((wall) => {
                          const isSelected = formData.selectedWallIds.includes(wall.id);
                          return (
                            <label
                              key={wall.id}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                                isSelected ? "bg-brand-50 border-brand-300 text-brand-900" : "bg-white border-line hover:bg-sand-50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setFormData({
                                        ...formData,
                                        selectedWallIds: formData.selectedWallIds.filter((id) => id !== wall.id),
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        selectedWallIds: [...formData.selectedWallIds, wall.id],
                                      });
                                    }
                                  }}
                                  className="rounded border-line text-brand-600 focus:ring-brand-500"
                                />
                                <div>
                                  <div className="text-xs font-bold">{wall.name}</div>
                                  <div className="text-[11px] opacity-70">/w/{wall.slug}</div>
                                </div>
                              </div>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-black/5">
                                {wall.layout}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "testimonials" && (
                <div className="space-y-4">
                  <div className="border-b border-line pb-4 space-y-3">
                    <h3 className="text-xs font-bold text-ink-900">Primary Public CTA Button</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.ctaEnabled}
                        onChange={(e) => setFormData({ ...formData, ctaEnabled: e.target.checked })}
                        className="rounded border-line text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs font-semibold text-ink-800">Enable Primary CTA</span>
                    </div>

                    {formData.ctaEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-ink-700 mb-1">Button Label</label>
                          <input
                            type="text"
                            value={formData.ctaLabel}
                            onChange={(e) => setFormData({ ...formData, ctaLabel: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-line"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-ink-700 mb-1">Target URL</label>
                          <input
                            type="url"
                            placeholder="https://acme.com/get-started"
                            value={formData.ctaUrl}
                            onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-line"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-b border-line pb-4 space-y-3">
                    <h3 className="text-xs font-bold text-ink-900">Secondary CTA Button</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.ctaSecondaryEnabled}
                        onChange={(e) => setFormData({ ...formData, ctaSecondaryEnabled: e.target.checked })}
                        className="rounded border-line text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-xs font-semibold text-ink-800">Enable Secondary CTA (e.g. Leave Review)</span>
                    </div>

                    {formData.ctaSecondaryEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-ink-700 mb-1">Button Label</label>
                          <input
                            type="text"
                            value={formData.ctaSecondaryLabel}
                            onChange={(e) => setFormData({ ...formData, ctaSecondaryLabel: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-line"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-ink-700 mb-1">Target URL</label>
                          <input
                            type="text"
                            placeholder="/p/acme-praise"
                            value={formData.ctaSecondaryUrl}
                            onChange={(e) => setFormData({ ...formData, ctaSecondaryUrl: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-line"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-ink-900">Social Network Handles & Links</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-ink-600 mb-1">Twitter / X</label>
                        <input
                          type="text"
                          placeholder="https://x.com/acme"
                          value={formData.socialTwitter}
                          onChange={(e) => setFormData({ ...formData, socialTwitter: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-line"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-ink-600 mb-1">LinkedIn</label>
                        <input
                          type="text"
                          placeholder="https://linkedin.com/company/acme"
                          value={formData.socialLinkedin}
                          onChange={(e) => setFormData({ ...formData, socialLinkedin: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-line"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-ink-600 mb-1">GitHub</label>
                        <input
                          type="text"
                          placeholder="https://github.com/acme"
                          value={formData.socialGithub}
                          onChange={(e) => setFormData({ ...formData, socialGithub: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-line"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-ink-600 mb-1">YouTube</label>
                        <input
                          type="text"
                          placeholder="https://youtube.com/@acme"
                          value={formData.socialYoutube}
                          onChange={(e) => setFormData({ ...formData, socialYoutube: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-line"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-line flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-ink-600 hover:bg-sand-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2 text-xs font-bold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingBrand ? "Save Changes" : "Create Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
