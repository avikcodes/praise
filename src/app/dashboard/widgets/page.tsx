"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Code,
  Copy,
  ExternalLink,
  Eye,
  Layers,
  Loader2,
  MessageSquareQuote,
  Plus,
  Share2,
  Sliders,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { useToast } from "@/components/dashboard/toast-context";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { WidgetRenderer } from "@/components/widgets";
import { WidgetCustomizer } from "@/components/dashboard/widgets/widget-customizer";
import {
  PublicTestimonialCard,
  WidgetDetail,
  WidgetDisplayType,
} from "@/types/widgets";

export default function WidgetsPage() {
  const { activeWorkspace } = useWorkspace();
  const toast = useToast();
  const workspaceId = activeWorkspace?.id;

  const [widgets, setWidgets] = useState<WidgetDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dedicated Widget Customizer State
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customizingWidget, setCustomizingWidget] = useState<WidgetDetail | null>(null);

  // Modals state
  const [sharingWidget, setSharingWidget] = useState<WidgetDetail | null>(null);
  const [deletingWidget, setDeletingWidget] = useState<WidgetDetail | null>(null);

  // Copy state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [embedMethod, setEmbedMethod] = useState<"script" | "iframe">("script");
  const [iframeVariant, setIframeVariant] = useState<"auto" | "static">("auto");

  // Preview modal state
  const [previewingWidget, setPreviewingWidget] = useState<WidgetDetail | null>(null);
  const [previewType, setPreviewType] = useState<WidgetDisplayType>("grid");
  const [previewTestimonials, setPreviewTestimonials] = useState<PublicTestimonialCard[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [embedWidgetType, setEmbedWidgetType] = useState<WidgetDisplayType>("grid");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function loadWidgets() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/widgets`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setWidgets(data.widgets || []);
        }
      } catch (err) {
        console.error("Failed to load widgets:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadWidgets();

    return () => {
      isMounted = false;
    };
  }, [workspaceId, refreshKey]);

  // Open Preview Modal
  const handleOpenPreview = async (w: WidgetDetail, type?: WidgetDisplayType) => {
    setPreviewingWidget(w);
    const initialType =
      type ||
      (w.config.layout === "carousel"
        ? "carousel"
        : w.config.layout === "single_quote"
        ? "single_quote"
        : w.config.layout === "list"
        ? "list"
        : "grid");
    setPreviewType(initialType);
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`/api/wall/${w.config.slug || w.id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewTestimonials(data.testimonials || []);
      }
    } catch (err) {
      console.error("Failed to load preview testimonials:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Delete submission
  const handleDeleteWidget = async () => {
    if (!workspaceId || !deletingWidget) return;

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/widgets/${deletingWidget.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Widget Deleted", `Removed "${deletingWidget.name}".`);
        setWidgets((prev) => prev.filter((w) => w.id !== deletingWidget.id));
      }
    } catch {
      toast.error("Error", "Could not delete widget.");
    } finally {
      setDeletingWidget(null);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // If in Widget Customizer mode, show full dual-pane builder interface
  if (isCustomizing) {
    return (
      <WidgetCustomizer
        initialWidget={customizingWidget}
        onSaveSuccess={() => {
          setIsCustomizing(false);
          setCustomizingWidget(null);
          setRefreshKey((k) => k + 1);
        }}
        onCancel={() => {
          setIsCustomizing(false);
          setCustomizingWidget(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Public Wall of Love &amp; Widgets"
        description="Design, customize, and publish embeddable testimonial widgets and dedicated public pages."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCustomizingWidget(null);
                setIsCustomizing(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
            >
              <Plus size={14} />
              <span>Create Widget</span>
            </button>
          </div>
        }
      />

      {/* Main Wall of Love Cards Grid */}
      {isLoading ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-xs">
          <Loader2 size={24} className="animate-spin text-brand-500 mx-auto" />
          <p className="text-xs text-ink-500 mt-2">Loading your Walls of Love...</p>
        </div>
      ) : widgets.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
          <EmptyState
            icon={Layers}
            title="No Wall of Love created yet"
            description="Create a dedicated public page showcasing your approved testimonials with customizable layouts, light/dark modes, and call-to-action buttons."
            action={
              <button
                type="button"
                onClick={() => {
                  setCustomizingWidget(null);
                  setIsCustomizing(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-brand-600 transition-colors"
              >
                <Plus size={14} />
                <span>Create Your First Widget</span>
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {widgets.map((w) => {
            const publicPath = `/w/${w.config.slug || w.id}`;

            return (
              <div
                key={w.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-xs hover:border-line-dark transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200 shrink-0">
                        <Layers size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-ink-900 leading-snug">
                          {w.name}
                        </h2>
                        <span className="text-[11px] font-mono text-ink-500 flex items-center gap-1 mt-0.5">
                          <span>/w/{w.config.slug}</span>
                        </span>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Live
                    </span>
                  </div>

                  <p className="text-xs text-ink-600 mt-3 line-clamp-2 leading-relaxed">
                    {w.config.description || "Real customer testimonials and reviews."}
                  </p>

                  {/* Attributes Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-line text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-md bg-warm-100 px-2 py-0.5 font-medium text-ink-700">
                      <MessageSquareQuote size={11} className="text-brand-600" />
                      <span>{w.approvedCount || 0} approved reviews</span>
                    </span>

                    {w.project && (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 border border-line bg-white shadow-2xs font-medium text-ink-700">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: w.project.color || "#7049D8" }}
                        />
                        <span>{w.project.name}</span>
                      </span>
                    )}

                    <span className="inline-flex items-center rounded-md bg-warm-50 px-2 py-0.5 text-ink-600 capitalize">
                      {w.config.layout} &bull; {w.config.theme}
                    </span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
                  <a
                    href={publicPath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    <span>View Public Page</span>
                    <ExternalLink size={11} />
                  </a>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(w)}
                      className="p-1.5 rounded-lg border border-line text-ink-600 hover:bg-warm-100 transition-colors"
                      title="Live Preview Widget Layouts"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSharingWidget(w)}
                      className="p-1.5 rounded-lg border border-line text-ink-600 hover:bg-warm-100 transition-colors"
                      title="Share link &amp; Embed code"
                    >
                      <Share2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomizingWidget(w);
                        setIsCustomizing(true);
                      }}
                      className="p-1.5 rounded-lg border border-line text-ink-600 hover:bg-warm-100 transition-colors"
                      title="Customize Widget"
                    >
                      <Sliders size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingWidget(w)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Wall of Love"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SHARE & EMBED DIALOG */}
      {sharingWidget && (
        <ModalDialog
          isOpen={Boolean(sharingWidget)}
          onClose={() => setSharingWidget(null)}
          title={`Share & Embed "${sharingWidget.name}"`}
          description="Embed this Wall of Love on your landing page or share the standalone public link."
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Public Standalone Link */}
            <div>
              <label className="block font-semibold text-ink-900 mb-1.5">
                Shareable Public Wall Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${origin}/w/${sharingWidget.config.slug || sharingWidget.id}`}
                  className="w-full rounded-lg border border-line bg-warm-50 px-3 py-1.5 font-mono text-xs text-ink-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${origin}/w/${sharingWidget.config.slug || sharingWidget.id}`
                    );
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                    toast.success("Link Copied", "Public link copied to clipboard.");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 font-semibold text-ink-700 hover:bg-warm-100 transition-colors shrink-0"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
                <a
                  href={`/w/${sharingWidget.config.slug || sharingWidget.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg border border-line bg-white text-ink-600 hover:bg-warm-100 transition-colors shrink-0"
                  title="Open in new tab"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>

            {/* Widget Embed Type Selector */}
            <div>
              <label className="block font-semibold text-ink-900 mb-1.5 text-xs">
                Embed Layout Format
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "grid", label: "Grid" },
                  { id: "carousel", label: "Carousel" },
                  { id: "single_quote", label: "Single Quote" },
                  { id: "list", label: "Feed / List" },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setEmbedWidgetType(type.id as WidgetDisplayType)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold text-center transition-all ${
                      embedWidgetType === type.id
                        ? "border-brand-500 bg-brand-50 text-brand-700 shadow-2xs"
                        : "border-line bg-white text-ink-700 hover:bg-warm-50"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Embed Method Selector */}
            <div>
              <label className="block font-semibold text-ink-900 mb-1.5 text-xs">
                Embed Code Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEmbedMethod("script")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    embedMethod === "script"
                      ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500 shadow-2xs"
                      : "border-line bg-white hover:bg-warm-50 text-ink-600"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-ink-900">
                    <Sparkles size={12} className="text-brand-600" />
                    <span>JavaScript Script</span>
                  </div>
                  <p className="text-[10px] text-ink-500 mt-0.5">
                    Recommended &bull; Auto-resizing &bull; Responsive
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEmbedMethod("iframe")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    embedMethod === "iframe"
                      ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500 shadow-2xs"
                      : "border-line bg-white hover:bg-warm-50 text-ink-600"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-ink-900">
                    <Code size={12} className="text-ink-600" />
                    <span>HTML iFrame</span>
                  </div>
                  <p className="text-[10px] text-ink-500 mt-0.5">
                    Sandboxed &bull; Script-restricted sites
                  </p>
                </button>
              </div>
            </div>

            {/* Embed Code Snippet */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-ink-900 text-xs">
                  {embedMethod === "script"
                    ? "JavaScript Embed Snippet"
                    : "HTML iFrame Embed Code"}
                </label>
                <div className="flex items-center gap-2">
                  {embedMethod === "iframe" && (
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
                        Static
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const target = sharingWidget;
                      setSharingWidget(null);
                      handleOpenPreview(target, embedWidgetType);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
                  >
                    <Eye size={11} />
                    <span>Interactive Preview</span>
                  </button>
                </div>
              </div>

              {embedMethod === "script" ? (
                <div className="relative">
                  <pre className="rounded-xl border border-line bg-warm-100 p-3 font-mono text-[11px] text-ink-900 overflow-x-auto whitespace-pre-wrap break-all leading-normal">
                    {`<!-- Praise Testimonial Widget -->\n<div data-praise-widget="${sharingWidget.config.slug || sharingWidget.id}"${
                      embedWidgetType !== sharingWidget.config.widgetType ? ` data-type="${embedWidgetType}"` : ""
                    }></div>\n<script async src="${origin}/embed.js"></script>`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      const snippet = `<!-- Praise Testimonial Widget -->\n<div data-praise-widget="${sharingWidget.config.slug || sharingWidget.id}"${
                        embedWidgetType !== sharingWidget.config.widgetType ? ` data-type="${embedWidgetType}"` : ""
                      }></div>\n<script async src="${origin}/embed.js"></script>`;
                      navigator.clipboard.writeText(snippet);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2000);
                      toast.success("Snippet Copied", "JavaScript embed script copied to clipboard.");
                    }}
                    className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-white border border-line px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-warm-50 shadow-2xs"
                  >
                    {copiedScript ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    <span>{copiedScript ? "Copied" : "Copy Code"}</span>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <pre className="rounded-xl border border-line bg-warm-100 p-3 font-mono text-[11px] text-ink-900 overflow-x-auto whitespace-pre-wrap break-all leading-normal">
                    {(() => {
                      const wSlug = sharingWidget.config.slug || sharingWidget.id;
                      const h =
                        embedWidgetType === "single_quote"
                          ? "420"
                          : embedWidgetType === "carousel"
                          ? "520"
                          : "700";
                      if (iframeVariant === "auto") {
                        return `<!-- Praise Auto-Resizing iFrame Widget -->\n<iframe\n  id="praise-iframe-${wSlug}"\n  src="${origin}/embed/${wSlug}?type=${embedWidgetType}&theme=${sharingWidget.config.theme}"\n  width="100%"\n  height="${h}"\n  frameborder="0"\n  scrolling="no"\n  loading="lazy"\n  title="Customer Testimonials"\n  style="width: 100%; border: none; overflow: hidden; background: transparent; transition: height 0.2s ease;"\n  allow="autoplay; encrypted-media; fullscreen"\n></iframe>\n<script>\n  window.addEventListener("message", function(e) {\n    if (e.data && e.data.type === "praise-resize" && (e.data.widgetId === "${wSlug}" || !e.data.widgetId)) {\n      var el = document.getElementById("praise-iframe-${wSlug}");\n      if (el && typeof e.data.height === "number" && e.data.height > 0) {\n        el.style.height = e.data.height + "px";\n      }\n    }\n  });\n</script>`;
                      }
                      return `<!-- Praise Static HTML iFrame Widget -->\n<iframe\n  src="${origin}/embed/${wSlug}?type=${embedWidgetType}&theme=${sharingWidget.config.theme}"\n  width="100%"\n  height="${h}"\n  frameborder="0"\n  scrolling="no"\n  loading="lazy"\n  title="Customer Testimonials"\n  style="width: 100%; border: none; overflow: hidden; background: transparent;"\n  allow="autoplay; encrypted-media; fullscreen"\n></iframe>`;
                    })()}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      const wSlug = sharingWidget.config.slug || sharingWidget.id;
                      const h =
                        embedWidgetType === "single_quote"
                          ? "420"
                          : embedWidgetType === "carousel"
                          ? "520"
                          : "700";
                      const snippet =
                        iframeVariant === "auto"
                          ? `<!-- Praise Auto-Resizing iFrame Widget -->\n<iframe\n  id="praise-iframe-${wSlug}"\n  src="${origin}/embed/${wSlug}?type=${embedWidgetType}&theme=${sharingWidget.config.theme}"\n  width="100%"\n  height="${h}"\n  frameborder="0"\n  scrolling="no"\n  loading="lazy"\n  title="Customer Testimonials"\n  style="width: 100%; border: none; overflow: hidden; background: transparent; transition: height 0.2s ease;"\n  allow="autoplay; encrypted-media; fullscreen"\n></iframe>\n<script>\n  window.addEventListener("message", function(e) {\n    if (e.data && e.data.type === "praise-resize" && (e.data.widgetId === "${wSlug}" || !e.data.widgetId)) {\n      var el = document.getElementById("praise-iframe-${wSlug}");\n      if (el && typeof e.data.height === "number" && e.data.height > 0) {\n        el.style.height = e.data.height + "px";\n      }\n    }\n  });\n</script>`
                          : `<!-- Praise Static HTML iFrame Widget -->\n<iframe\n  src="${origin}/embed/${wSlug}?type=${embedWidgetType}&theme=${sharingWidget.config.theme}"\n  width="100%"\n  height="${h}"\n  frameborder="0"\n  scrolling="no"\n  loading="lazy"\n  title="Customer Testimonials"\n  style="width: 100%; border: none; overflow: hidden; background: transparent;"\n  allow="autoplay; encrypted-media; fullscreen"\n></iframe>`;
                      navigator.clipboard.writeText(snippet);
                      setCopiedEmbed(true);
                      setTimeout(() => setCopiedEmbed(false), 2000);
                      toast.success(
                        "Snippet Copied",
                        iframeVariant === "auto"
                          ? "Auto-resizing HTML iFrame code copied to clipboard."
                          : "Static HTML iFrame code copied to clipboard."
                      );
                    }}
                    className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-white border border-line px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-warm-50 shadow-2xs"
                  >
                    {copiedEmbed ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    <span>{copiedEmbed ? "Copied" : "Copy Code"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </ModalDialog>
      )}

      {/* LIVE INTERACTIVE WIDGET PREVIEW MODAL */}
      {previewingWidget && (
        <ModalDialog
          isOpen={Boolean(previewingWidget)}
          onClose={() => setPreviewingWidget(null)}
          title={`Live Widget Preview: "${previewingWidget.name}"`}
          description="Test and inspect how your approved testimonials render across distinct widget layouts."
          maxWidth="3xl"
        >
          <div className="space-y-4">
            {/* Layout Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                {[
                  { id: "grid", label: "1. Grid" },
                  { id: "carousel", label: "2. Carousel" },
                  { id: "single_quote", label: "3. Single Quote" },
                  { id: "list", label: "4. List" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPreviewType(tab.id as WidgetDisplayType)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      previewType === tab.id
                        ? "bg-brand-500 text-white shadow-2xs"
                        : "bg-warm-100 dark:bg-zinc-800 text-ink-700 dark:text-zinc-300 hover:bg-warm-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-ink-500">
                <span className="font-semibold text-ink-800 dark:text-zinc-200">
                  {previewTestimonials.length}
                </span>{" "}
                approved reviews
              </div>
            </div>

            {/* Widget Viewport */}
            <div className="rounded-2xl border border-line dark:border-zinc-800 overflow-hidden bg-warm-50/50 dark:bg-zinc-950 p-2 sm:p-4 max-h-[70vh] overflow-y-auto">
              <WidgetRenderer
                type={previewType}
                testimonials={previewTestimonials}
                config={{
                  ...previewingWidget.config,
                  theme: previewingWidget.config.theme,
                  accentColor: previewingWidget.config.accentColor,
                  autoplay: true,
                  autoplayInterval: 5000,
                }}
                isLoading={isLoadingPreview}
                emptyTitle="No approved testimonials yet"
                emptyMessage="Submit and approve testimonials in the Testimonials tab to view them live in this widget."
              />
            </div>
          </div>
        </ModalDialog>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingWidget)}
        onClose={() => setDeletingWidget(null)}
        onConfirm={handleDeleteWidget}
        title="Delete Wall of Love"
        message={
          deletingWidget
            ? `Are you sure you want to delete "${deletingWidget.name}"? The public link /w/${deletingWidget.config.slug} will become unavailable. Your approved testimonials will remain safe.`
            : "Are you sure you want to delete this widget?"
        }
        confirmLabel="Delete Widget"
        isDestructive
      />
    </div>
  );
}
