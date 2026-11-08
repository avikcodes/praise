"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Code,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Monitor,
  Palette,
  Quote,
  Save,
  Search,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  PublicTestimonialCard,
  WallOfLoveConfig,
  WidgetCardBorder,
  WidgetCardRadius,
  WidgetCardSpacing,
  WidgetDetail,
  WidgetDisplayType,
  WidgetOrdering,
  WidgetSelectionMode,
  WidgetThemeMode,
  WidgetTypographyFamily,
  WidgetTypographySize,
} from "@/types/widgets";
import { WidgetRenderer } from "@/components/widgets";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { sanitizePublicSlug } from "@/lib/widgets/utils";
import {
  PRESET_ACCENT_COLORS,
  PRESET_SECONDARY_COLORS,
  SUPPORTED_FONTS,
  calculateContrast,
} from "@/lib/branding/utils";

type WidgetCustomizerProps = {
  initialWidget?: WidgetDetail | null;
  onSaveSuccess: (savedWidget: WidgetDetail) => void;
  onCancel: () => void;
};



type ApiTestimonialItem = {
  id: string;
  content: string;
  rating: number | null;
  type: "TEXT" | "VIDEO" | "AUDIO";
  isFeatured: boolean;
  submittedAt: string;
  customer?: {
    name?: string | null;
    company?: string | null;
    title?: string | null;
    avatarUrl?: string | null;
    website?: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  tags?: {
    name?: string;
    tag?: { name: string };
  }[];
  mediaAssets?: {
    id: string;
    type: "IMAGE" | "VIDEO" | "AUDIO";
    url: string;
    mimeType: string;
    fileSizeBytes?: number | null;
    durationSeconds?: number | null;
  }[];
};

export function WidgetCustomizer({
  initialWidget,
  onSaveSuccess,
  onCancel,
}: WidgetCustomizerProps) {
  const { activeWorkspace, projects } = useWorkspace();
  const toast = useToast();
  const workspaceId = activeWorkspace?.id;

  // Active Configuration Tab
  const [activeTab, setActiveTab] = useState<"content" | "layout" | "appearance" | "embed">("content");
  const [deviceViewport, setDeviceViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isSaving, setIsSaving] = useState(false);

  // Available Workspace Data
  const [approvedTestimonials, setApprovedTestimonials] = useState<PublicTestimonialCard[]>([]);
  const [workspaceTags, setWorkspaceTags] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 1. General & Content Configuration
  const [name, setName] = useState(initialWidget?.name || "Customer Testimonials");
  const [slug, setSlug] = useState(initialWidget?.config.slug || "customer-testimonials");
  const [projectId, setProjectId] = useState<string>(initialWidget?.projectId || "all");
  const [title, setTitle] = useState(initialWidget?.config.title || "What our customers are saying");
  const [description, setDescription] = useState(
    initialWidget?.config.description || "Real stories, feedback and reviews from teams around the world."
  );

  // Selection & Filtering
  const [selectionMode, setSelectionMode] = useState<WidgetSelectionMode>(
    initialWidget?.config.selectionMode || "all"
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialWidget?.config.selectedTestimonialIds || []
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialWidget?.config.filterTags || []
  );
  const [minRating, setMinRating] = useState<number>(initialWidget?.config.minRating || 0);
  const [testimonialSearch, setTestimonialSearch] = useState("");

  // 2. Layout & Type Configuration
  const [widgetType, setWidgetType] = useState<WidgetDisplayType>(
    initialWidget?.config.widgetType ||
      (initialWidget?.config.layout === "carousel"
        ? "carousel"
        : initialWidget?.config.layout === "single_quote"
        ? "single_quote"
        : initialWidget?.config.layout === "list"
        ? "list"
        : "grid")
  );
  const [cardsPerRow, setCardsPerRow] = useState<number>(initialWidget?.config.cardsPerRow || 3);
  const [ordering, setOrdering] = useState<WidgetOrdering>(
    initialWidget?.config.ordering || "featured_first"
  );
  const [autoplay, setAutoplay] = useState<boolean>(initialWidget?.config.autoplay ?? true);
  const [autoplayInterval, setAutoplayInterval] = useState<number>(
    initialWidget?.config.autoplayInterval || 5000
  );

  // 3. Branding, Appearance & Typography Configuration
  const [theme, setTheme] = useState<WidgetThemeMode>(initialWidget?.config.theme || "warm");
  const [primaryColor, setPrimaryColor] = useState<string>(
    initialWidget?.config.primaryColor || initialWidget?.config.accentColor || "#7049D8"
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    initialWidget?.config.secondaryColor || "#10B981"
  );
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(
    initialWidget?.config.customLogoUrl || ""
  );
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>(
    initialWidget?.config.backgroundColor || ""
  );
  const [textColor, setTextColor] = useState<string>(
    initialWidget?.config.textColor || ""
  );
  const [cardBorder, setCardBorder] = useState<WidgetCardBorder>(
    initialWidget?.config.cardBorder || "subtle"
  );
  const [cardRadius, setCardRadius] = useState<WidgetCardRadius>(
    initialWidget?.config.cardRadius || "medium"
  );
  const [cardSpacing, setCardSpacing] = useState<WidgetCardSpacing>(
    initialWidget?.config.cardSpacing || "normal"
  );
  const [showPraiseBranding, setShowPraiseBranding] = useState<boolean>(
    initialWidget?.config.showPraiseBranding ?? true
  );
  const [typographyFamily, setTypographyFamily] = useState<WidgetTypographyFamily>(
    initialWidget?.config.typographyFamily || "sans"
  );
  const [typographySize, setTypographySize] = useState<WidgetTypographySize>(
    initialWidget?.config.typographySize || "normal"
  );

  // Real-time accessibility contrast ratio computation
  const contrastInfo = useMemo(() => {
    let effectiveBg = "#FAF7F2";
    let effectiveText = "#18181B";

    if (theme === "dark") {
      effectiveBg = "#09090B";
      effectiveText = "#F8FAFC";
    } else if (theme === "light" || theme === "transparent") {
      effectiveBg = "#FFFFFF";
      effectiveText = "#0F172A";
    }

    if (backgroundColor.trim()) {
      effectiveBg = backgroundColor.trim();
    }
    if (textColor.trim()) {
      effectiveText = textColor.trim();
    }

    return calculateContrast(effectiveText, effectiveBg);
  }, [theme, backgroundColor, textColor]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "IMAGE");
      const res = await fetch(`/api/workspaces/${workspaceId}/media/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload logo image");
      setCustomLogoUrl(data.asset?.url || "");
      toast.success("Logo Uploaded", "Brand logo uploaded successfully.");
    } catch (err: unknown) {
      toast.error("Upload Failed", err instanceof Error ? err.message : "Error uploading logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Field Toggles
  const [showAvatar, setShowAvatar] = useState<boolean>(initialWidget?.config.showAvatar ?? true);
  const [showRatings, setShowRatings] = useState<boolean>(initialWidget?.config.showRatings ?? true);
  const [showCompany, setShowCompany] = useState<boolean>(initialWidget?.config.showCompany ?? true);
  const [showDate, setShowDate] = useState<boolean>(initialWidget?.config.showDate ?? true);
  const [showTags, setShowTags] = useState<boolean>(initialWidget?.config.showTags ?? true);
  const [showSource, setShowSource] = useState<boolean>(initialWidget?.config.showSource ?? true);
  const [showFeaturedBadge, setShowFeaturedBadge] = useState<boolean>(
    initialWidget?.config.showFeaturedBadge ?? true
  );
  const [allowVideoPlayback, setAllowVideoPlayback] = useState<boolean>(
    initialWidget?.config.allowVideoPlayback ?? true
  );

  // CTA
  const [ctaEnabled, setCtaEnabled] = useState<boolean>(initialWidget?.config.ctaEnabled ?? false);
  const [ctaLabel, setCtaLabel] = useState<string>(initialWidget?.config.ctaLabel || "Share Your Praise");
  const [ctaUrl, setCtaUrl] = useState<string>(initialWidget?.config.ctaUrl || "");

  // Copy states
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [embedMethod, setEmbedMethod] = useState<"script" | "iframe">("script");
  const [iframeVariant, setIframeVariant] = useState<"auto" | "static">("auto");

  // Fetch approved testimonials and workspace tags
  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function fetchData() {
      try {
        setIsLoadingData(true);
        // 1. Fetch approved testimonials
        const resTestimonials = await fetch(
          `/api/workspaces/${workspaceId}/testimonials?status=APPROVED&limit=100`
        );
        if (resTestimonials.ok && isMounted) {
          const tData = await resTestimonials.json();
          const items = (tData.testimonials || []).map((item: ApiTestimonialItem) => ({
            id: item.id,
            content: item.content,
            rating: item.rating,
            type: item.type,
            isFeatured: item.isFeatured,
            submittedAt: item.submittedAt,
            customer: {
              name: item.customer?.name || "Anonymous",
              company: item.customer?.company,
              title: item.customer?.title,
              avatarUrl: item.customer?.avatarUrl,
              website: item.customer?.website,
            },
            project: item.project,
            tags: item.tags
              ? item.tags.map((t) => t.tag?.name || t.name || "").filter(Boolean)
              : [],
            source: "Verified Review",
            media: item.mediaAssets || [],
          }));
          setApprovedTestimonials(items);
        }

        // 2. Fetch tags
        const resTags = await fetch(`/api/workspaces/${workspaceId}/tags`);
        if (resTags.ok && isMounted) {
          const tagData = await resTags.json();
          setWorkspaceTags(tagData.tags || []);
        }
      } catch (err) {
        console.error("Failed to load widget data:", err);
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  // Reactive filtered testimonials for immediate preview updates
  const previewTestimonials = useMemo(() => {
    let list = [...approvedTestimonials];

    // Filter by project
    if (projectId && projectId !== "all") {
      list = list.filter((t) => t.project?.id === projectId);
    }

    // Filter by min rating
    if (minRating > 0) {
      list = list.filter((t) => (t.rating || 0) >= minRating);
    }

    // Filter by specific selected IDs
    if (selectionMode === "manual" && selectedIds.length > 0) {
      list = list.filter((t) => selectedIds.includes(t.id));
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      list = list.filter((t) => t.tags.some((tag) => selectedTags.includes(tag)));
    }

    // Order
    if (ordering === "featured_first") {
      list.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
    } else if (ordering === "highest_rated") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (ordering === "oldest") {
      list.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    } else {
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }

    return list;
  }, [
    approvedTestimonials,
    projectId,
    minRating,
    selectionMode,
    selectedIds,
    selectedTags,
    ordering,
  ]);

  // Filtered list of testimonials for the selection checklist
  const selectableTestimonials = useMemo(() => {
    return approvedTestimonials.filter((t) => {
      if (projectId && projectId !== "all" && t.project?.id !== projectId) {
        return false;
      }
      if (testimonialSearch.trim()) {
        const q = testimonialSearch.toLowerCase().trim();
        const matchesContent = t.content.toLowerCase().includes(q);
        const matchesCustomer = t.customer.name.toLowerCase().includes(q);
        const matchesCompany = t.customer.company?.toLowerCase().includes(q) ?? false;
        return matchesContent || matchesCustomer || matchesCompany;
      }
      return true;
    });
  }, [approvedTestimonials, projectId, testimonialSearch]);

  const toggleTestimonialSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllTestimonials = () => {
    setSelectedIds(selectableTestimonials.map((t) => t.id));
  };

  const clearAllTestimonials = () => {
    setSelectedIds([]);
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  // Save handler
  const handleSave = async () => {
    if (!workspaceId) return;
    if (!name.trim()) {
      toast.error("Validation Error", "Widget name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const cleanSlug = sanitizePublicSlug(slug || name);
      const configPayload: WallOfLoveConfig = {
        slug: cleanSlug,
        title: title.trim() || name.trim(),
        description: description.trim(),
        layout: widgetType,
        widgetType,
        theme,
        accentColor: primaryColor,
        primaryColor,
        secondaryColor,
        backgroundColor: backgroundColor.trim() ? backgroundColor.trim() : null,
        textColor: textColor.trim() ? textColor.trim() : null,
        cardBorder,
        cardRadius,
        cardSpacing,
        showPraiseBranding,
        customLogoUrl: customLogoUrl.trim() ? customLogoUrl.trim() : null,
        ordering,
        showRatings,
        showCompany,
        showAvatar,
        showDate,
        showTags,
        showSource,
        showFeaturedBadge,
        minRating,
        selectionMode,
        selectedTestimonialIds: selectionMode === "manual" ? selectedIds : [],
        filterTags: selectedTags,
        typographyFamily,
        typographySize,
        cardsPerRow,
        autoplay,
        autoplayInterval,
        allowVideoPlayback,
        ctaEnabled,
        ctaLabel: ctaLabel.trim(),
        ctaUrl: ctaUrl.trim(),
        ctaSecondaryEnabled: false,
        ctaSecondaryLabel: "",
        ctaSecondaryUrl: "",
      };

      const isEditing = Boolean(initialWidget);
      const endpoint = isEditing
        ? `/api/workspaces/${workspaceId}/widgets/${initialWidget!.id}`
        : `/api/workspaces/${workspaceId}/widgets`;

      const method = isEditing ? "PATCH" : "POST";
      const dbType =
        widgetType === "carousel"
          ? "CAROUSEL"
          : widgetType === "single_quote"
          ? "QUOTE_CARD"
          : widgetType === "list"
          ? "GRID"
          : "GRID";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: dbType,
          theme: theme.toUpperCase(),
          projectId: projectId === "all" ? null : projectId,
          config: configPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save widget configuration.");
      }

      toast.success(
        isEditing ? "Widget Updated" : "Widget Created",
        `Configuration for "${data.widget.name}" saved successfully.`
      );
      onSaveSuccess(data.widget);
    } catch (err: unknown) {
      toast.error("Save Failed", err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // Embed Snippet Code
  const origin = typeof window !== "undefined" ? window.location.origin : "https://praise.app";
  const embedSlug = sanitizePublicSlug(slug || name || "widget");
  const scriptSnippet = `<!-- Praise Testimonial Widget -->\n<div data-praise-widget="${embedSlug}"></div>\n<script async src="${origin}/embed.js"></script>`;
  
  const defaultIframeHeight =
    widgetType === "single_quote" ? "420" : widgetType === "carousel" ? "520" : "700";

  const iframeStaticSnippet = `<!-- Praise Static HTML iFrame Widget -->\n<iframe\n  src="${origin}/embed/${embedSlug}?type=${widgetType}&theme=${theme}"\n  width="100%"\n  height="${defaultIframeHeight}"\n  frameborder="0"\n  scrolling="no"\n  loading="lazy"\n  title="Customer Testimonials"\n  style="width: 100%; border: none; overflow: hidden; background: transparent;"\n  allow="autoplay; encrypted-media; fullscreen"\n></iframe>`;

  const iframeAutoSnippet = `<!-- Praise Auto-Resizing iFrame Widget -->\n<iframe\n  id="praise-iframe-${embedSlug}"\n  src="${origin}/embed/${embedSlug}?type=${widgetType}&theme=${theme}"\n  width="100%"\n  height="${defaultIframeHeight}"\n  frameborder="0"\n  scrolling="no"\n  loading="lazy"\n  title="Customer Testimonials"\n  style="width: 100%; border: none; overflow: hidden; background: transparent; transition: height 0.2s ease;"\n  allow="autoplay; encrypted-media; fullscreen"\n></iframe>\n<script>\n  window.addEventListener("message", function(e) {\n    if (e.data && e.data.type === "praise-resize" && (e.data.widgetId === "${embedSlug}" || !e.data.widgetId)) {\n      var el = document.getElementById("praise-iframe-${embedSlug}");\n      if (el && typeof e.data.height === "number" && e.data.height > 0) {\n        el.style.height = e.data.height + "px";\n      }\n    }\n  });\n</script>`;

  const activeIframeSnippet = iframeVariant === "auto" ? iframeAutoSnippet : iframeStaticSnippet;

  const copyScriptCode = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(scriptSnippet);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
      toast.success("Copied", "JavaScript embed snippet copied to clipboard.");
    }
  };

  const copyEmbedCode = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(activeIframeSnippet);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
      toast.success(
        "Copied",
        iframeVariant === "auto"
          ? "Auto-resizing HTML iFrame snippet copied to clipboard."
          : "Static HTML iFrame snippet copied to clipboard."
      );
    }
  };

  const copyPublicLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${origin}/w/${embedSlug}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success("Copied", "Public link copied to clipboard.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-line px-4 sm:px-6 flex items-center justify-between gap-4 bg-white shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Back to widgets"
            className="p-1.5 rounded-lg border border-line text-ink-600 hover:bg-warm-100 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-ink-900 truncate flex items-center gap-2">
              <span>{name || "Untitled Widget"}</span>
              <span className="text-[11px] font-mono font-normal text-ink-400 bg-warm-100 px-2 py-0.5 rounded-md hidden sm:inline">
                {widgetType}
              </span>
            </h2>
            <p className="text-[11px] text-ink-500 truncate hidden md:block">
              {initialWidget ? "Editing Existing Widget" : "New Custom Testimonial Widget"} &bull;{" "}
              {previewTestimonials.length} approved reviews matching
            </p>
          </div>
        </div>

        {/* Viewport Switcher & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Responsive Preview Viewport Switcher */}
          <div className="hidden lg:flex items-center rounded-lg border border-line bg-warm-50 p-0.5 text-ink-600">
            <button
              type="button"
              onClick={() => setDeviceViewport("desktop")}
              aria-label="Desktop preview"
              className={`p-1.5 rounded-md transition-colors ${
                deviceViewport === "desktop"
                  ? "bg-white text-brand-600 shadow-2xs font-semibold"
                  : "hover:text-ink-900"
              }`}
              title="Full Desktop View (100%)"
            >
              <Monitor size={15} />
            </button>
            <button
              type="button"
              onClick={() => setDeviceViewport("tablet")}
              aria-label="Tablet preview"
              className={`p-1.5 rounded-md transition-colors ${
                deviceViewport === "tablet"
                  ? "bg-white text-brand-600 shadow-2xs font-semibold"
                  : "hover:text-ink-900"
              }`}
              title="Tablet View (768px)"
            >
              <Tablet size={15} />
            </button>
            <button
              type="button"
              onClick={() => setDeviceViewport("mobile")}
              aria-label="Mobile preview"
              className={`p-1.5 rounded-md transition-colors ${
                deviceViewport === "mobile"
                  ? "bg-white text-brand-600 shadow-2xs font-semibold"
                  : "hover:text-ink-900"
              }`}
              title="Mobile Device View (380px)"
            >
              <Smartphone size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={copyEmbedCode}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs"
          >
            {copiedEmbed ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span className="hidden sm:inline">{copiedEmbed ? "Copied" : "Copy Embed"}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{initialWidget ? "Save Changes" : "Create Widget"}</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* ================================================================= */}
        {/* LEFT PANE: CONFIGURATION CONTROLS */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 border-r border-line flex flex-col h-full bg-white z-10">
          {/* Section Navigation Tabs */}
          <div className="flex border-b border-line bg-warm-50 px-3 pt-2 shrink-0 gap-1 overflow-x-auto">
            {[
              { id: "content", label: "Content & Source", icon: Sliders },
              { id: "layout", label: "Layout & Type", icon: LayoutGrid },
              { id: "appearance", label: "Appearance", icon: Palette },
              { id: "embed", label: "Embed Code", icon: Copy },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as typeof activeTab)}
                  className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? "bg-white text-brand-600 border-t border-x border-line shadow-2xs -mb-px font-bold"
                      : "text-ink-600 hover:text-ink-900"
                  }`}
                >
                  <Icon size={13} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Config Controls Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* ------------------------------------------------------------- */}
            {/* TAB 1: CONTENT & SOURCE */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "content" && (
              <div className="space-y-5">
                {/* General Information */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Widget Identity
                  </h4>

                  <div>
                    <label className="block text-xs font-medium text-ink-700 mb-1">
                      Widget Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!initialWidget) {
                          setSlug(sanitizePublicSlug(e.target.value));
                        }
                      }}
                      placeholder="e.g. Landing Page Testimonials"
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-700 mb-1">
                      Public Slug Identifier
                    </label>
                    <div className="flex items-center rounded-lg border border-line bg-warm-50 px-2.5 py-1 text-xs">
                      <span className="font-mono text-ink-400 text-[11px]">/embed/</span>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(sanitizePublicSlug(e.target.value))}
                        className="bg-transparent font-mono text-ink-900 focus:outline-none flex-1 text-xs pl-1"
                      />
                    </div>
                  </div>

                  {/* Project Selector */}
                  <div>
                    <label className="block text-xs font-medium text-ink-700 mb-1">
                      Target Project Association
                    </label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                    >
                      <option value="all">All Projects (Workspace Wide)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-700 mb-1">
                      Header Display Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Loved by 1,000+ teams"
                      className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-700 mb-1">
                      Header Subtitle Description
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="See real feedback from our community."
                      className="w-full rounded-lg border border-line bg-white p-2.5 text-xs text-ink-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Testimonial Selection Mode */}
                <div className="space-y-3 pt-3 border-t border-line">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                      Approved Testimonials Source
                    </h4>
                    <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                      {previewTestimonials.length} matching
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectionMode("all")}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        selectionMode === "all"
                          ? "border-brand-500 bg-brand-50/50 text-brand-700 shadow-2xs font-semibold"
                          : "border-line bg-white text-ink-700 hover:bg-warm-50"
                      }`}
                    >
                      <span className="block text-xs font-bold">All Approved</span>
                      <span className="block text-[10px] text-ink-500 font-normal mt-0.5">
                        Include all verified reviews
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectionMode("manual")}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        selectionMode === "manual"
                          ? "border-brand-500 bg-brand-50/50 text-brand-700 shadow-2xs font-semibold"
                          : "border-line bg-white text-ink-700 hover:bg-warm-50"
                      }`}
                    >
                      <span className="block text-xs font-bold">Specific Selection</span>
                      <span className="block text-[10px] text-ink-500 font-normal mt-0.5">
                        Pick exact testimonials ({selectedIds.length})
                      </span>
                    </button>
                  </div>

                  {/* Manual Testimonials Checklist */}
                  {selectionMode === "manual" && (
                    <div className="rounded-xl border border-line bg-warm-50/40 p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="relative flex-1">
                          <Search size={12} className="absolute left-2.5 top-2 text-ink-400" />
                          <input
                            type="text"
                            value={testimonialSearch}
                            onChange={(e) => setTestimonialSearch(e.target.value)}
                            placeholder="Search by quote or reviewer..."
                            className="w-full rounded-md border border-line bg-white pl-7 pr-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                          <button
                            type="button"
                            onClick={selectAllTestimonials}
                            className="text-brand-600 hover:underline font-semibold"
                          >
                            Select All
                          </button>
                          <span>&bull;</span>
                          <button
                            type="button"
                            onClick={clearAllTestimonials}
                            className="text-ink-500 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Checklist Scroll View */}
                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                        {selectableTestimonials.map((t) => {
                          const isChecked = selectedIds.includes(t.id);
                          return (
                            <label
                              key={t.id}
                              className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                                isChecked
                                  ? "border-brand-300 bg-white shadow-2xs"
                                  : "border-transparent bg-white/70 hover:bg-white"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleTestimonialSelection(t.id)}
                                className="mt-0.5 rounded border-line text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[11px] font-semibold text-ink-900 truncate">
                                    {t.customer.name}
                                  </span>
                                  {t.rating && (
                                    <span className="text-[10px] font-bold text-amber-500">
                                      ★ {t.rating}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-ink-500 line-clamp-1">
                                  &ldquo;{t.content}&rdquo;
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filter by Tags */}
                {workspaceTags.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-line">
                    <label className="block text-xs font-semibold text-ink-900">
                      Filter by Categories / Tags
                    </label>
                    <p className="text-[11px] text-ink-500">
                      Only show testimonials tagged with any of the selected categories:
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {workspaceTags.map((tag) => {
                        const isSelected = selectedTags.includes(tag.name);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.name)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-all flex items-center gap-1 ${
                              isSelected
                                ? "bg-brand-50 border-brand-300 text-brand-700 shadow-2xs"
                                : "bg-white border-line text-ink-600 hover:bg-warm-50"
                            }`}
                          >
                            <span>#{tag.name}</span>
                            {isSelected && <Check size={11} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Minimum Star Rating */}
                <div className="space-y-1.5 pt-3 border-t border-line">
                  <label className="block text-xs font-semibold text-ink-900">
                    Minimum Rating Filter
                  </label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900"
                  >
                    <option value={0}>All ratings (0 to 5 stars)</option>
                    <option value={4}>4 stars and higher only</option>
                    <option value={5}>5-star testimonials only</option>
                  </select>
                </div>

                {/* Call to Action Button */}
                <div className="space-y-3 pt-3 border-t border-line">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink-900 text-xs">
                    <input
                      type="checkbox"
                      checked={ctaEnabled}
                      onChange={(e) => setCtaEnabled(e.target.checked)}
                      className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                    <span>Include Call to Action Button</span>
                  </label>

                  {ctaEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-ink-600 mb-1">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={ctaLabel}
                          onChange={(e) => setCtaLabel(e.target.value)}
                          placeholder="Share Your Praise"
                          className="w-full rounded-lg border border-line bg-white px-2.5 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-ink-600 mb-1">
                          Destination URL
                        </label>
                        <input
                          type="text"
                          value={ctaUrl}
                          onChange={(e) => setCtaUrl(e.target.value)}
                          placeholder="/p/feedback"
                          className="w-full rounded-lg border border-line bg-white px-2.5 py-1 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: LAYOUT & TYPE */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "layout" && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2">
                    Widget Type
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        id: "grid",
                        label: "1. Grid",
                        icon: LayoutGrid,
                        desc: "Responsive multi-column card layout",
                      },
                      {
                        id: "carousel",
                        label: "2. Carousel",
                        icon: Layers,
                        desc: "Horizontal slide track with controls",
                      },
                      {
                        id: "single_quote",
                        label: "3. Single Quote",
                        icon: Quote,
                        desc: "Hero spotlight with bold quote text",
                      },
                      {
                        id: "list",
                        label: "4. List",
                        icon: List,
                        desc: "Linear vertical feed or changelog flow",
                      },
                    ].map((t) => {
                      const Icon = t.icon;
                      const isSelected = widgetType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setWidgetType(t.id as WidgetDisplayType)}
                          className={`p-3.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-brand-500 bg-brand-50/50 text-brand-700 shadow-2xs ring-1 ring-brand-500"
                              : "border-line bg-white text-ink-700 hover:bg-warm-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs">{t.label}</span>
                            <Icon size={15} className={isSelected ? "text-brand-600" : "text-ink-400"} />
                          </div>
                          <span className="text-[10px] text-ink-500 block leading-tight">
                            {t.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Specific Layout Settings */}
                {widgetType === "grid" && (
                  <div className="space-y-3 pt-3 border-t border-line">
                    <label className="block text-xs font-semibold text-ink-900">
                      Grid Columns
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((cols) => (
                        <button
                          key={cols}
                          type="button"
                          onClick={() => setCardsPerRow(cols)}
                          className={`py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                            cardsPerRow === cols
                              ? "border-brand-500 bg-brand-50 text-brand-700"
                              : "border-line bg-white text-ink-700 hover:bg-warm-50"
                          }`}
                        >
                          {cols} Col{cols > 1 ? "s" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {widgetType === "carousel" && (
                  <div className="space-y-3 pt-3 border-t border-line">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-ink-900 text-xs">
                      <input
                        type="checkbox"
                        checked={autoplay}
                        onChange={(e) => setAutoplay(e.target.checked)}
                        className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                      />
                      <span>Enable Auto-rotating Slides</span>
                    </label>

                    {autoplay && (
                      <div>
                        <label className="block text-[11px] font-medium text-ink-600 mb-1">
                          Slide Interval Speed
                        </label>
                        <select
                          value={autoplayInterval}
                          onChange={(e) => setAutoplayInterval(Number(e.target.value))}
                          className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900"
                        >
                          <option value={3000}>3 seconds (Fast)</option>
                          <option value={5000}>5 seconds (Default)</option>
                          <option value={8000}>8 seconds (Relaxed)</option>
                          <option value={10000}>10 seconds (Slow)</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Testimonial Ordering */}
                <div className="space-y-2 pt-3 border-t border-line">
                  <label className="block text-xs font-semibold text-ink-900">
                    Sort &amp; Ordering Sequence
                  </label>
                  <select
                    value={ordering}
                    onChange={(e) => setOrdering(e.target.value as WidgetOrdering)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900"
                  >
                    <option value="featured_first">Featured First, then Newest</option>
                    <option value="highest_rated">Highest Rated Testimonials First</option>
                    <option value="newest">Newest Submissions First</option>
                    <option value="oldest">Oldest Submissions First</option>
                  </select>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: BRANDING, APPEARANCE & TYPOGRAPHY */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                {/* 1. Brand Logo */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Project / Brand Logo
                  </h4>
                  <p className="text-[11px] text-ink-500">
                    Upload your company logo or provide an image URL to display on the Wall of Love and widget headers.
                  </p>

                  <div className="flex items-center gap-3">
                    {customLogoUrl ? (
                      <div className="relative h-12 w-12 rounded-xl border border-line bg-warm-50 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={customLogoUrl}
                          alt="Brand Logo"
                          className="h-full w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomLogoUrl("")}
                          className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors shadow-xs"
                          title="Remove logo"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-xl border border-dashed border-line bg-warm-50 flex items-center justify-center text-ink-400 shrink-0">
                        <ImageIcon size={20} />
                      </div>
                    )}

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-warm-50 transition-colors shadow-2xs">
                          {isUploadingLogo ? (
                            <Loader2 size={12} className="animate-spin text-brand-600" />
                          ) : (
                            <UploadCloud size={12} className="text-brand-600" />
                          )}
                          <span>{isUploadingLogo ? "Uploading..." : "Upload Logo"}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            onChange={handleLogoUpload}
                            disabled={isUploadingLogo}
                            className="hidden"
                          />
                        </label>
                        {customLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setCustomLogoUrl("")}
                            className="text-[11px] text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        value={customLogoUrl}
                        onChange={(e) => setCustomLogoUrl(e.target.value)}
                        placeholder="Or enter logo URL (https://...)"
                        className="w-full rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Brand Colors & Contrast */}
                <div className="space-y-3 pt-3 border-t border-line">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                      Brand Colors
                    </h4>
                    {/* Real-time WCAG Contrast Indicator */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          contrastInfo.passesAA
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                        title={`Contrast Ratio: ${contrastInfo.formattedRatio}`}
                      >
                        {contrastInfo.passesAA ? (
                          <CheckCircle2 size={10} className="text-emerald-600" />
                        ) : (
                          <AlertTriangle size={10} className="text-amber-600" />
                        )}
                        <span>
                          {contrastInfo.passesAA ? "WCAG AA" : "Low Contrast"}{" "}
                          ({contrastInfo.formattedRatio})
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Primary Color */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-800 mb-1">
                      Primary Accent Color
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-8 w-10 rounded cursor-pointer border border-line p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-24 rounded-lg border border-line bg-white px-2 py-1 text-xs font-mono text-ink-900 uppercase"
                      />
                      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                        {PRESET_ACCENT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setPrimaryColor(c.value)}
                            className="h-5 w-5 rounded-full border border-black/10 hover:scale-110 transition-transform shrink-0"
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Secondary Color */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-800 mb-1">
                      Secondary Accent Color
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-8 w-10 rounded cursor-pointer border border-line p-0.5 bg-white shrink-0"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-24 rounded-lg border border-line bg-white px-2 py-1 text-xs font-mono text-ink-900 uppercase"
                      />
                      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                        {PRESET_SECONDARY_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setSecondaryColor(c.value)}
                            className="h-5 w-5 rounded-full border border-black/10 hover:scale-110 transition-transform shrink-0"
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Supported Native Typography */}
                <div className="space-y-3 pt-3 border-t border-line">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Typography Stack
                  </h4>
                  <div className="space-y-1.5">
                    {SUPPORTED_FONTS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTypographyFamily(f.id)}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                          typographyFamily === f.id
                            ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 shadow-2xs font-semibold"
                            : "border-line bg-white hover:bg-warm-50 text-ink-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-xs font-bold text-ink-900"
                            style={{ fontFamily: f.fontStack }}
                          >
                            {f.label}
                          </span>
                          <span className="text-[10px] text-ink-400 uppercase font-mono">
                            {f.id}
                          </span>
                        </div>
                        <p className="text-[10px] text-ink-500 mt-0.5 leading-snug">
                          {f.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Font Scale */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { id: "compact", label: "Compact" },
                      { id: "normal", label: "Standard" },
                      { id: "large", label: "Large" },
                    ].map((sz) => (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() => setTypographySize(sz.id as WidgetTypographySize)}
                        className={`py-1.5 rounded-lg border text-center text-xs font-medium transition-colors ${
                          typographySize === sz.id
                            ? "border-brand-500 bg-brand-50 text-brand-700 font-bold"
                            : "border-line bg-white text-ink-700 hover:bg-warm-50"
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Theme Mode & Background Colors */}
                <div className="space-y-3 pt-3 border-t border-line">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Theme &amp; Surfaces
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "warm", label: "Praise Warm", desc: "Warm stone surface (#FAF7F2)" },
                      { id: "light", label: "Crisp Light", desc: "Clean pure white surface" },
                      { id: "dark", label: "Midnight Dark", desc: "High-contrast dark (#09090B)" },
                      { id: "transparent", label: "Transparent", desc: "Seamless embed background" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id as WidgetThemeMode)}
                        className={`p-2.5 rounded-xl border text-left transition-colors ${
                          theme === t.id
                            ? "border-brand-500 bg-brand-50/50 text-brand-700 shadow-2xs font-semibold"
                            : "border-line bg-white text-ink-700 hover:bg-warm-50"
                        }`}
                      >
                        <span className="block text-xs font-bold">{t.label}</span>
                        <span className="block text-[10px] text-ink-500 mt-0.5">{t.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Optional Custom Background & Text Overrides */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                        Custom Surface BG
                      </label>
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        placeholder="Auto (or #HEX)"
                        className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs font-mono text-ink-900 placeholder:text-ink-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                        Custom Text Color
                      </label>
                      <input
                        type="text"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        placeholder="Auto (or #HEX)"
                        className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs font-mono text-ink-900 placeholder:text-ink-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Card Borders & Spacing */}
                <div className="space-y-3 pt-3 border-t border-line">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Card Styling &amp; Geometry
                  </h4>

                  {/* Card Border Style */}
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                      Card Border Style
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: "subtle", label: "Subtle" },
                        { id: "prominent", label: "Bold" },
                        { id: "dashed", label: "Dashed" },
                        { id: "none", label: "Flat" },
                      ].map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setCardBorder(b.id as WidgetCardBorder)}
                          className={`py-1.5 rounded-lg border text-center text-xs font-medium transition-colors ${
                            cardBorder === b.id
                              ? "border-brand-500 bg-brand-50 text-brand-700 font-bold"
                              : "border-line bg-white text-ink-700 hover:bg-warm-50"
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Corner Radius */}
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                      Corner Radius
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { id: "none", label: "0px" },
                        { id: "small", label: "8px" },
                        { id: "medium", label: "12px" },
                        { id: "large", label: "16px" },
                        { id: "full", label: "24px" },
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setCardRadius(r.id as WidgetCardRadius)}
                          className={`py-1 rounded-md border text-center text-[11px] font-medium transition-colors ${
                            cardRadius === r.id
                              ? "border-brand-500 bg-brand-50 text-brand-700 font-bold"
                              : "border-line bg-white text-ink-700 hover:bg-warm-50"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Spacing */}
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-700 mb-1">
                      Card Internal Spacing
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "compact", label: "Compact" },
                        { id: "normal", label: "Standard" },
                        { id: "spacious", label: "Spacious" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setCardSpacing(s.id as WidgetCardSpacing)}
                          className={`py-1.5 rounded-lg border text-center text-xs font-medium transition-colors ${
                            cardSpacing === s.id
                              ? "border-brand-500 bg-brand-50 text-brand-700 font-bold"
                              : "border-line bg-white text-ink-700 hover:bg-warm-50"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 6. Full Removal of Praise Branding */}
                <div className="pt-3 border-t border-line">
                  <label className="flex items-start justify-between p-3 rounded-xl border border-line bg-warm-50/70 hover:bg-warm-100/60 cursor-pointer transition-colors">
                    <div className="pr-3">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-ink-900">
                        <ShieldCheck size={13} className="text-brand-600" />
                        <span>Display &quot;Powered by Praise&quot; Attribution</span>
                      </div>
                      <p className="text-[11px] text-ink-500 mt-0.5 leading-relaxed">
                        Uncheck to completely remove the Praise badge, logo, and attribution link for clean white-label presentation.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={showPraiseBranding}
                      onChange={(e) => setShowPraiseBranding(e.target.checked)}
                      className="mt-0.5 rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4 shrink-0"
                    />
                  </label>
                </div>

                {/* 7. Customer Badges & Visibility Toggles */}
                <div className="space-y-2.5 pt-3 border-t border-line">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Customer Information &amp; Badges
                  </h4>

                  {[
                    { label: "Customer Avatars & Photos", state: showAvatar, setter: setShowAvatar },
                    { label: "Star Ratings (1-5)", state: showRatings, setter: setShowRatings },
                    { label: "Company Name & Title", state: showCompany, setter: setShowCompany },
                    { label: "Submission Date", state: showDate, setter: setShowDate },
                    { label: "Category Tags", state: showTags, setter: setShowTags },
                    { label: "Verified Review Badge", state: showSource, setter: setShowSource },
                    { label: "Featured Review Indicator", state: showFeaturedBadge, setter: setShowFeaturedBadge },
                    { label: "Allow Video Playback", state: allowVideoPlayback, setter: setAllowVideoPlayback },
                  ].map((field, idx) => (
                    <label
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-warm-50 cursor-pointer text-xs"
                    >
                      <span className="text-ink-700 font-medium">{field.label}</span>
                      <input
                        type="checkbox"
                        checked={field.state}
                        onChange={(e) => field.setter(e.target.checked)}
                        className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 4: EMBED CODE & INSTRUCTIONS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "embed" && (
              <div className="space-y-6">
                {/* Embed Mode Switcher */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-400 block mb-2">
                    Choose Embed Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEmbedMethod("script")}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        embedMethod === "script"
                          ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 shadow-2xs"
                          : "border-line bg-white hover:bg-warm-50 text-ink-600"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-ink-900">
                        <Sparkles size={13} className="text-brand-600" />
                        <span>JavaScript Script</span>
                      </div>
                      <p className="text-[10px] text-ink-500 mt-0.5">
                        Recommended &bull; Auto-resizing &bull; Seamless
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEmbedMethod("iframe")}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        embedMethod === "iframe"
                          ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 shadow-2xs"
                          : "border-line bg-white hover:bg-warm-50 text-ink-600"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-ink-900">
                        <Code size={13} className="text-ink-600" />
                        <span>HTML iFrame</span>
                      </div>
                      <p className="text-[10px] text-ink-500 mt-0.5">
                        Fixed / Sandboxed &bull; Script-restricted sites
                      </p>
                    </button>
                  </div>
                </div>

                {/* Primary Embed Code Snippet */}
                {embedMethod === "script" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink-700 flex items-center gap-1.5">
                        <span>JavaScript Embed Snippet</span>
                        <span className="rounded-full bg-brand-100 text-brand-700 px-2 py-0.5 text-[9px] font-bold">
                          Recommended
                        </span>
                      </h4>
                    </div>
                    <p className="text-[11px] text-ink-500 leading-relaxed">
                      Copy and paste this snippet anywhere on your website. The widget automatically resizes to its content height and works across any website builder.
                    </p>
                    <div className="relative">
                      <pre className="rounded-xl border border-line bg-warm-100 p-3 font-mono text-[11px] text-ink-900 overflow-x-auto whitespace-pre-wrap break-all leading-normal">
                        {scriptSnippet}
                      </pre>
                      <button
                        type="button"
                        onClick={copyScriptCode}
                        className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-white border border-line px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-warm-50 shadow-2xs"
                      >
                        {copiedScript ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        <span>{copiedScript ? "Copied" : "Copy Code"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink-700">
                        HTML iFrame Embed Code
                      </h4>
                      <div className="flex items-center rounded-lg border border-line bg-warm-50 p-0.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setIframeVariant("auto")}
                          className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                            iframeVariant === "auto"
                              ? "bg-white text-ink-900 shadow-2xs"
                              : "text-ink-500 hover:text-ink-900"
                          }`}
                        >
                          Auto-Resizing
                        </button>
                        <button
                          type="button"
                          onClick={() => setIframeVariant("static")}
                          className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                            iframeVariant === "static"
                              ? "bg-white text-ink-900 shadow-2xs"
                              : "text-ink-500 hover:text-ink-900"
                          }`}
                        >
                          Static (Zero-JS)
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-ink-500 leading-relaxed">
                      {iframeVariant === "auto"
                        ? "Includes an origin-validated postMessage listener to automatically synchronize widget height without scrollbars."
                        : "Pure static HTML iframe. Ideal for environments where custom JavaScript is completely disallowed."}
                    </p>
                    <div className="relative">
                      <pre className="rounded-xl border border-line bg-warm-100 p-3 font-mono text-[11px] text-ink-900 overflow-x-auto whitespace-pre-wrap break-all leading-normal">
                        {activeIframeSnippet}
                      </pre>
                      <button
                        type="button"
                        onClick={copyEmbedCode}
                        className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-white border border-line px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-warm-50 shadow-2xs"
                      >
                        {copiedEmbed ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        <span>{copiedEmbed ? "Copied" : "Copy Code"}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-ink-500">
                      <div className="flex items-center gap-1">
                        <Check size={11} className="text-emerald-600 shrink-0" />
                        <span>Isolated sandbox (Zero CSS bleed)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check size={11} className="text-emerald-600 shrink-0" />
                        <span>Full mobile &amp; touch support</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check size={11} className="text-emerald-600 shrink-0" />
                        <span>CSP &amp; Clickjacking protected</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check size={11} className="text-emerald-600 shrink-0" />
                        <span>Clean transparent background</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Standalone Link */}
                <div className="space-y-2 pt-3 border-t border-line">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Standalone Public Link
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${origin}/w/${embedSlug}`}
                      className="w-full rounded-lg border border-line bg-warm-50 px-2.5 py-1.5 font-mono text-xs text-ink-800"
                    />
                    <button
                      type="button"
                      onClick={copyPublicLink}
                      className="p-2 rounded-lg border border-line bg-white text-ink-700 hover:bg-warm-100 transition-colors shrink-0 shadow-2xs"
                      title="Copy Link"
                    >
                      {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                    <a
                      href={`/w/${embedSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg border border-line bg-white text-ink-700 hover:bg-warm-100 transition-colors shrink-0 shadow-2xs"
                      title="Open in new tab"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                {/* Platform Guides */}
                <div className="space-y-2.5 pt-3 border-t border-line">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Quick Platform Guides
                  </h4>
                  <div className="space-y-2 text-[11px] text-ink-600">
                    <div className="p-2.5 rounded-lg border border-line bg-warm-50/70">
                      <span className="font-semibold text-ink-900 block mb-0.5">Webflow:</span>
                      Add an <strong>Embed</strong> component into any section and paste the JavaScript snippet.
                    </div>
                    <div className="p-2.5 rounded-lg border border-line bg-warm-50/70">
                      <span className="font-semibold text-ink-900 block mb-0.5">WordPress:</span>
                      Add a <strong>Custom HTML</strong> block anywhere in the Gutenberg editor or Elementor.
                    </div>
                    <div className="p-2.5 rounded-lg border border-line bg-warm-50/70">
                      <span className="font-semibold text-ink-900 block mb-0.5">Shopify:</span>
                      Add a <strong>Custom Liquid</strong> or HTML section to any theme template.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANE: LIVE WIDGET PREVIEW */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 h-full bg-warm-100/60 p-4 sm:p-6 overflow-hidden flex flex-col items-center justify-start">
          {/* Viewport Canvas Frame */}
          <div
            className={`w-full transition-all duration-300 flex flex-col h-full rounded-2xl border border-line bg-white shadow-sm overflow-hidden ${
              deviceViewport === "mobile"
                ? "max-w-[380px]"
                : deviceViewport === "tablet"
                ? "max-w-[768px]"
                : "max-w-full"
            }`}
          >
            {/* Mock Device Window Bar */}
            <div className="h-8 border-b border-line bg-warm-50 px-3 flex items-center justify-between text-xs text-ink-400 select-none shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              </div>
              <div className="font-mono text-[10px] text-ink-500 truncate max-w-xs">
                https://yourdomain.com/praise-widget
              </div>
              <div className="text-[10px] font-medium text-ink-400 capitalize">
                {deviceViewport} &bull; {widgetType}
              </div>
            </div>

            {/* Live Interactive Widget Canvas */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4">
              <WidgetRenderer
                type={widgetType}
                testimonials={previewTestimonials}
                config={{
                  theme,
                  accentColor: primaryColor,
        primaryColor,
        secondaryColor,
        backgroundColor: backgroundColor.trim() ? backgroundColor.trim() : null,
        textColor: textColor.trim() ? textColor.trim() : null,
        cardBorder,
        cardRadius,
        cardSpacing,
        showPraiseBranding,
        customLogoUrl: customLogoUrl.trim() ? customLogoUrl.trim() : null,
                  showRatings,
                  showCompany,
                  showAvatar,
                  showDate,
                  showTags,
                  showSource,
                  showFeaturedBadge,
                  allowVideoPlayback,
                  cardsPerRow,
                  autoplay,
                  autoplayInterval,
                  typographyFamily,
                  typographySize,
                }}
                isLoading={isLoadingData}
                emptyTitle="No Approved Testimonials Match"
                emptyMessage="Adjust your project, tag, or rating filters on the left to include approved reviews in this preview."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
