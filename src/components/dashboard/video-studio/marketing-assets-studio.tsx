"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileImage,
  Film,
  FolderDown,
  Layers,
  LayoutGrid,
  Loader2,
  Maximize2,
  Palette,
  Play,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Type,
  Video,
  X,
} from "lucide-react";
import {
  MarketingAssetConfig,
  MarketingAspectRatio,
  MarketingAssetTemplate,
  MarketingBackgroundType,
  MarketingLogoPosition,
  SavedMarketingAsset,
} from "@/types/marketing-assets";
import {
  PRESET_ACCENT_COLORS,
  PRESET_SECONDARY_COLORS,
  SUPPORTED_FONTS,
  getFontFamilyCss,
} from "@/lib/branding/utils";
import { useToast } from "@/components/dashboard/toast-context";

type TestimonialDetail = {
  id: string;
  content: string;
  rating: number | null;
  type: string;
  submittedAt: string;
  customer: {
    name: string;
    company?: string | null;
    title?: string | null;
    avatarUrl?: string | null;
    website?: string | null;
  };
};

type ConsentStatus = {
  hasConsent: boolean;
  isRevoked: boolean;
  consentText?: string | null;
  grantedAt?: string | null;
  revokedAt?: string | null;
};

type MarketingAssetsStudioProps = {
  workspaceId: string;
  initialTestimonialId?: string;
  onBack?: () => void;
  onSwitchMode?: (mode: "video" | "marketing") => void;
};

export function MarketingAssetsStudio({
  workspaceId,
  initialTestimonialId,
  onBack,
  onSwitchMode,
}: MarketingAssetsStudioProps) {
  const toast = useToast();

  // Testimonial selection
  const [testimonials, setTestimonials] = useState<TestimonialDetail[]>([]);
  const [activeTestimonialId, setActiveTestimonialId] = useState<string>(initialTestimonialId || "");
  const [selectedTestimonial, setSelectedTestimonial] = useState<TestimonialDetail | null>(null);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>({ hasConsent: true, isRevoked: false });
  const [isLoadingTestimonial, setIsLoadingTestimonial] = useState(true);

  // Studio Configuration State
  const [template, setTemplate] = useState<MarketingAssetTemplate>("modern_minimal");
  const [aspectRatio, setAspectRatio] = useState<MarketingAspectRatio>("1:1");
  const [backgroundType, setBackgroundType] = useState<MarketingBackgroundType>("gradient");
  const [accentColor, setAccentColor] = useState("#7049D8");
  const [secondaryColor, setSecondaryColor] = useState("#10B981");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [typographyFamily, setTypographyFamily] = useState<"sans" | "serif" | "mono" | "geometric" | "humanist">("sans");
  const [cardRadius, setCardRadius] = useState<"none" | "small" | "medium" | "large" | "full">("large");

  // Content Toggles
  const [showRating, setShowRating] = useState(true);
  const [showVerifiedBadge, setShowVerifiedBadge] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showRole, setShowRole] = useState(true);
  const [showAvatar, setShowAvatar] = useState(true);

  // Logo & Branding
  const [showLogo, setShowLogo] = useState(true);
  const [logoPosition, setLogoPosition] = useState<MarketingLogoPosition>("top-right");
  const [customLogoUrl, setCustomLogoUrl] = useState("");

  // Video Thumbnail / Play Overlay
  const [isVideoThumbnail, setIsVideoThumbnail] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [videoDurationBadge, setVideoDurationBadge] = useState("0:45");

  // Quote Excerpt / Integrity
  const [editedQuote, setEditedQuote] = useState("");
  const [isEditingQuote, setIsEditingQuote] = useState(false);

  // Saved Assets
  const [savedAssets, setSavedAssets] = useState<SavedMarketingAsset[]>([]);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<"templates" | "design" | "content" | "saved">("templates");

  // Preview elements
  const previewCardRef = useRef<HTMLDivElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Fetch available workspace testimonials
  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function loadTestimonials() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/testimonials`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const list: TestimonialDetail[] = (data.testimonials || []).map((t: any) => ({
            id: t.id,
            content: t.content,
            rating: t.rating,
            type: t.type,
            submittedAt: t.submittedAt,
            customer: t.customer || { name: "Customer" },
          }));
          setTestimonials(list);

          if (!activeTestimonialId && list.length > 0) {
            setActiveTestimonialId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load testimonials:", err);
      }
    }

    loadTestimonials();
    return () => {
      isMounted = false;
    };
  }, [workspaceId, activeTestimonialId]);

  // 2. Fetch active testimonial details, consent status, and saved assets
  useEffect(() => {
    if (!workspaceId || !activeTestimonialId) return;
    let isMounted = true;

    async function loadTestimonialData() {
      setIsLoadingTestimonial(true);
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/testimonials/${activeTestimonialId}/marketing-assets`,
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          setSelectedTestimonial(data.testimonial);
          setConsentStatus(data.consent || { hasConsent: true, isRevoked: false });
          setSavedAssets(data.assets || []);

          // Reset quote to original
          if (data.testimonial?.content) {
            setEditedQuote(data.testimonial.content);
            setIsEditingQuote(false);
          }

          if (data.testimonial?.type === "VIDEO") {
            setIsVideoThumbnail(true);
            setShowPlayButton(true);
          } else {
            setIsVideoThumbnail(false);
            setShowPlayButton(false);
          }
        }
      } catch (err) {
        console.error("Failed to load marketing asset data:", err);
      } finally {
        if (isMounted) setIsLoadingTestimonial(false);
      }
    }

    loadTestimonialData();
    return () => {
      isMounted = false;
    };
  }, [workspaceId, activeTestimonialId]);

  // Determine if quote is modified from original
  const isQuoteModified = useMemo(() => {
    if (!selectedTestimonial?.content) return false;
    return editedQuote.trim() !== selectedTestimonial.content.trim();
  }, [editedQuote, selectedTestimonial]);

  // Target dimensions based on Aspect Ratio
  const dimensions = useMemo(() => {
    switch (aspectRatio) {
      case "4:5":
        return { width: 1080, height: 1350, label: "1080 x 1350 (4:5 Portrait)" };
      case "9:16":
        return { width: 1080, height: 1920, label: "1080 x 1920 (9:16 Vertical Story)" };
      case "16:9":
        return { width: 1920, height: 1080, label: "1920 x 1080 (16:9 Landscape)" };
      case "1:1":
      default:
        return { width: 1080, height: 1080, label: "1080 x 1080 (1:1 Square)" };
    }
  }, [aspectRatio]);

  // Aspect ratio preview frame style
  const previewFrameClass = useMemo(() => {
    switch (aspectRatio) {
      case "4:5":
        return "aspect-[4/5] max-h-[520px]";
      case "9:16":
        return "aspect-[9/16] max-h-[580px]";
      case "16:9":
        return "aspect-video max-h-[440px]";
      case "1:1":
      default:
        return "aspect-square max-h-[480px]";
    }
  }, [aspectRatio]);

  // Background styling
  const backgroundStyle = useMemo(() => {
    switch (backgroundType) {
      case "solid":
        return { backgroundColor: "#FFFFFF", color: "#18181B" };
      case "mesh":
        return {
          background: `radial-gradient(circle at 10% 20%, ${accentColor}dd 0%, transparent 40%), radial-gradient(circle at 90% 80%, ${secondaryColor}cc 0%, transparent 40%), #09090B`,
          color: "#FFFFFF",
        };
      case "glass":
        return {
          background: "linear-gradient(135deg, rgba(24, 24, 27, 0.95), rgba(9, 9, 11, 0.98))",
          color: "#FFFFFF",
        };
      case "pattern":
        return {
          backgroundColor: "#FAF7F2",
          backgroundImage: `radial-gradient(${accentColor}25 1.5px, transparent 1.5px)`,
          backgroundSize: "20px 20px",
          color: "#18181B",
        };
      case "gradient":
      default:
        return {
          background: `linear-gradient(135deg, ${accentColor} 0%, #0F172A 100%)`,
          color: "#FFFFFF",
        };
    }
  }, [backgroundType, accentColor, secondaryColor]);

  // Client-Side Canvas Rasterizer to PNG Blob / DataURL
  const generatePngDataUrl = async (): Promise<string | null> => {
    if (!previewCardRef.current) return null;

    try {
      const cardEl = previewCardRef.current;
      const svgXml = new XMLSerializer().serializeToString(cardEl);

      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Draw high resolution background
      ctx.fillStyle = backgroundType === "solid" ? "#FFFFFF" : accentColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Convert cloned DOM to SVG ForeignObject
      const htmlContent = cardEl.outerHTML;
      const foreignObjectSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%;">
              ${htmlContent}
            </div>
          </foreignObject>
        </svg>
      `;

      const img = new Image();
      const svgBlob = new Blob([foreignObjectSvg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      return new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
          URL.revokeObjectURL(url);
          const pngUrl = canvas.toDataURL("image/png", 1.0);
          resolve(pngUrl);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    } catch {
      return null;
    }
  };

  // Instant Download PNG Action
  const handleDownloadPng = async () => {
    if (consentStatus.isRevoked) {
      toast.error("Consent Revoked", "Customer consent has been revoked. Marketing asset download is prohibited.");
      return;
    }

    setIsDownloading(true);
    try {
      const dataUrl = await generatePngDataUrl();
      if (!dataUrl) {
        // Fallback simple download
        toast.error("Render Failed", "Could not rasterize image canvas.");
        return;
      }

      const safeName = (selectedTestimonial?.customer.name || "testimonial")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");
      const filename = `praise-${safeName}-${aspectRatio.replace(":", "x")}.png`;

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Download Complete", `Exported ${dimensions.label} PNG successfully.`);
    } catch (err: unknown) {
      toast.error("Download Error", err instanceof Error ? err.message : "Error exporting PNG.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Save Asset to Praise Backend
  const handleSaveToPraise = async () => {
    if (consentStatus.isRevoked) {
      toast.error("Consent Revoked", "Customer consent has been revoked. Marketing asset generation is prohibited.");
      return;
    }

    setIsSavingAsset(true);
    try {
      const dataUrl = await generatePngDataUrl();
      if (!dataUrl) throw new Error("Could not rasterize graphic canvas.");

      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${activeTestimonialId}/marketing-assets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl,
            type: isVideoThumbnail ? "VIDEO" : "IMAGE",
            isEdited: isQuoteModified,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        if (data.code === "CONSENT_REVOKED") {
          setConsentStatus((prev) => ({ ...prev, isRevoked: true, hasConsent: false }));
        }
        throw new Error(data.error || "Failed to save marketing asset.");
      }

      toast.success("Asset Saved", "Marketing graphic archived and linked to testimonial.");
      if (data.asset) {
        setSavedAssets((prev) => [data.asset, ...prev]);
        setActiveTab("saved");
      }
    } catch (err: unknown) {
      toast.error("Save Failed", err instanceof Error ? err.message : "Error saving asset.");
    } finally {
      setIsSavingAsset(false);
    }
  };

  if (!selectedTestimonial && !isLoadingTestimonial) {
    return (
      <div className="flex h-96 flex-col items-center justify-center p-6 text-center">
        <FileImage size={40} className="text-ink-400 mb-3" />
        <h3 className="text-sm font-bold text-ink-900">No Testimonial Found</h3>
        <p className="text-xs text-ink-500 max-w-sm mt-1">
          Select or approve customer testimonials to generate shareable graphics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-line px-4 sm:px-6 flex items-center justify-between gap-4 bg-white shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="p-1.5 rounded-lg border border-line text-ink-600 hover:bg-warm-100 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <Camera size={17} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-ink-900 truncate flex items-center gap-2">
                <span>Social Proof Marketing Studio</span>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 hidden sm:inline">
                  Exportable Assets
                </span>
              </h2>
              <p className="text-[11px] text-ink-500 truncate hidden md:block">
                Turn verified customer praise into branded quote cards, thumbnails, and social media graphics.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions & Consent Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switcher */}
          {onSwitchMode && (
            <div className="flex items-center rounded-lg border border-line bg-warm-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onSwitchMode("video")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors text-ink-600 hover:text-ink-900"
              >
                <Film size={13} />
                <span className="hidden sm:inline">Video Sequencer</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode("marketing")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors bg-white text-indigo-700 shadow-2xs font-bold"
              >
                <Sparkles size={13} />
                <span className="hidden sm:inline">Marketing Assets</span>
              </button>
            </div>
          )}

          {/* Consent status badge */}
          {consentStatus.isRevoked ? (
            <span
              title="Consent revoked by customer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold"
            >
              <ShieldAlert size={13} />
              <span>Consent Revoked</span>
            </span>
          ) : (
            <span
              title="Verified customer permission granted"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hidden sm:inline-flex"
            >
              <ShieldCheck size={13} />
              <span>Consent Verified</span>
            </span>
          )}

          {/* Testimonial Switcher */}
          {testimonials.length > 1 && (
            <div className="hidden lg:flex items-center gap-1.5">
              <select
                value={activeTestimonialId}
                onChange={(e) => setActiveTestimonialId(e.target.value)}
                className="rounded-lg border border-line bg-warm-50 px-2.5 py-1 text-xs text-ink-800 max-w-[170px] truncate focus:outline-none"
              >
                {testimonials.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.customer.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveToPraise}
            disabled={isSavingAsset || consentStatus.isRevoked}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs disabled:opacity-50"
          >
            {isSavingAsset ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span className="hidden sm:inline">Save to Praise</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isDownloading || consentStatus.isRevoked}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>Download PNG</span>
          </button>
        </div>
      </div>

      {/* Main Studio Dual Pane */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* ================================================================= */}
        {/* LEFT PANE: CONTROLS & TEMPLATES */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 xl:col-span-5 border-r border-line flex flex-col h-full bg-white z-10">
          {/* Navigation Tabs */}
          <div className="flex border-b border-line bg-warm-50 px-3 pt-2 shrink-0 gap-1 overflow-x-auto">
            {[
              { id: "templates", label: "Templates & Ratio", icon: LayoutGrid },
              { id: "design", label: "Brand & Colors", icon: Palette },
              { id: "content", label: "Quote & Excerpt", icon: Quote },
              { id: "saved", label: `Saved (${savedAssets.length})`, icon: FolderDown },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? "bg-white text-indigo-600 border-t border-x border-line shadow-2xs -mb-px font-bold"
                      : "text-ink-600 hover:text-ink-900"
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Controls Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* ------------------------------------------------------------- */}
            {/* TAB 1: TEMPLATES & RATIOS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "templates" && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-1.5">
                    1. Reusable Graphic Template
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        id: "modern_minimal",
                        label: "Modern Minimalist",
                        desc: "Clean card with subtle shadow and clear author badge",
                      },
                      {
                        id: "bold_gradient",
                        label: "Bold Gradient",
                        desc: "Vibrant brand gradient backdrop with oversized quote mark",
                      },
                      {
                        id: "social_proof",
                        label: "Social Proof Card",
                        desc: "Prominent 5-star rating, verified badge, and trust stamp",
                      },
                      {
                        id: "video_poster",
                        label: "Video Poster",
                        desc: "High-contrast thumbnail with play icon overlay and duration",
                      },
                      {
                        id: "editorial_serif",
                        label: "Editorial Serif",
                        desc: "Literary serif typography and sophisticated editorial margins",
                      },
                      {
                        id: "midnight_glass",
                        label: "Midnight Glass",
                        desc: "Dark frosted glassmorphism card with glowing accent ring",
                      },
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          setTemplate(tpl.id as MarketingAssetTemplate);
                          if (tpl.id === "editorial_serif") setTypographyFamily("serif");
                          if (tpl.id === "video_poster") {
                            setIsVideoThumbnail(true);
                            setShowPlayButton(true);
                          }
                          if (tpl.id === "midnight_glass") setBackgroundType("glass");
                          if (tpl.id === "bold_gradient") setBackgroundType("gradient");
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          template === tpl.id
                            ? "border-indigo-500 bg-indigo-50/50 text-indigo-700 font-semibold shadow-2xs ring-1 ring-indigo-500"
                            : "border-line bg-white text-ink-700 hover:bg-warm-50"
                        }`}
                      >
                        <span className="block text-xs font-bold">{tpl.label}</span>
                        <span className="block text-[10px] text-ink-500 mt-0.5 leading-tight">
                          {tpl.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div className="space-y-2 pt-3 border-t border-line">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    2. Social Media Canvas Format
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "1:1", label: "1:1 Square", desc: "Instagram Feed, LinkedIn, Twitter" },
                      { id: "4:5", label: "4:5 Portrait", desc: "Instagram Post, Facebook Feed" },
                      { id: "9:16", label: "9:16 Vertical", desc: "Reels, TikTok, Story, Shorts" },
                      { id: "16:9", label: "16:9 Landscape", desc: "Twitter Card, Blog, Slide Deck" },
                    ].map((ratio) => (
                      <button
                        key={ratio.id}
                        type="button"
                        onClick={() => setAspectRatio(ratio.id as MarketingAspectRatio)}
                        className={`p-2.5 rounded-xl border text-left transition-colors ${
                          aspectRatio === ratio.id
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold shadow-2xs"
                            : "border-line bg-white text-ink-700 hover:bg-warm-50"
                        }`}
                      >
                        <span className="block text-xs font-bold">{ratio.label}</span>
                        <span className="block text-[10px] text-ink-500">{ratio.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: BRAND & COLORS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "design" && (
              <div className="space-y-5">
                {/* Background Selection */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-1.5">
                    Background Style
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "gradient", label: "Gradient" },
                      { id: "mesh", label: "Mesh Glow" },
                      { id: "solid", label: "Clean Solid" },
                      { id: "pattern", label: "Dot Pattern" },
                      { id: "glass", label: "Frosted Glass" },
                    ].map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setBackgroundType(bg.id as MarketingBackgroundType)}
                        className={`py-2 px-2.5 rounded-xl border text-center text-xs font-bold transition-colors ${
                          backgroundType === bg.id
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-2xs"
                            : "border-line bg-white text-ink-700 hover:bg-warm-50"
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand Colors */}
                <div className="space-y-3 pt-3 border-t border-line">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Brand Accent Palette
                  </h4>

                  {/* Accent Presets */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PRESET_ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setAccentColor(color.value)}
                        className="h-6 w-6 rounded-full border border-black/10 transition-transform hover:scale-110 flex items-center justify-center"
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      >
                        {accentColor === color.value && <Check size={11} className="text-white" />}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <label className="text-xs font-medium text-ink-600">Custom Accent:</label>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-7 w-7 rounded cursor-pointer border border-line p-0.5"
                    />
                    <span className="font-mono text-xs text-ink-700">{accentColor}</span>
                  </div>
                </div>

                {/* Typography Selection */}
                <div className="space-y-2 pt-3 border-t border-line">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Typography Family
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {SUPPORTED_FONTS.map((font) => (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => setTypographyFamily(font.id)}
                        className={`p-2.5 rounded-xl border text-left transition-colors flex items-center justify-between ${
                          typographyFamily === font.id
                            ? "border-indigo-500 bg-indigo-50/50 text-indigo-700 font-semibold"
                            : "border-line bg-white text-ink-700 hover:bg-warm-50"
                        }`}
                      >
                        <div>
                          <span className="block text-xs font-bold">{font.label}</span>
                          <span className="block text-[10px] text-ink-500">{font.description}</span>
                        </div>
                        {typographyFamily === font.id && <Check size={14} className="text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo Placement */}
                <div className="space-y-3 pt-3 border-t border-line">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-ink-900 text-xs">
                    <input
                      type="checkbox"
                      checked={showLogo}
                      onChange={(e) => setShowLogo(e.target.checked)}
                      className="rounded border-line text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>Include Brand Watermark / Logo</span>
                  </label>

                  {showLogo && (
                    <div className="space-y-2 pl-6">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { id: "top-left", label: "Top Left" },
                          { id: "top-right", label: "Top Right" },
                          { id: "bottom-left", label: "Bottom Left" },
                          { id: "bottom-right", label: "Bottom Right" },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setLogoPosition(pos.id as MarketingLogoPosition)}
                            className={`py-1 px-2 rounded-lg border text-xs font-medium ${
                              logoPosition === pos.id
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : "border-line bg-white text-ink-600"
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: CONTENT & EXCERPTS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "content" && (
              <div className="space-y-5">
                {/* Quote Text & Integrity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                      Quote Text &amp; Integrity
                    </h4>
                    {isQuoteModified && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Edited for Length
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={editedQuote}
                    onChange={(e) => setEditedQuote(e.target.value)}
                    placeholder="Enter customer quote..."
                    className="w-full rounded-xl border border-line bg-white p-3 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {isQuoteModified && (
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[10px] text-amber-600">
                        * Quote edits are flagged with an explicit &quot;Edited Excerpt&quot; badge for transparency.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedTestimonial?.content) {
                            setEditedQuote(selectedTestimonial.content);
                          }
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Reset to Original
                      </button>
                    </div>
                  )}
                </div>

                {/* Content Elements Toggles */}
                <div className="space-y-2 pt-3 border-t border-line text-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2">
                    Card Elements
                  </h4>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-ink-800">
                    <input
                      type="checkbox"
                      checked={showRating}
                      onChange={(e) => setShowRating(e.target.checked)}
                      className="rounded border-line text-indigo-600 h-4 w-4"
                    />
                    <span>Show 5-Star Rating</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-ink-800">
                    <input
                      type="checkbox"
                      checked={showVerifiedBadge}
                      onChange={(e) => setShowVerifiedBadge(e.target.checked)}
                      className="rounded border-line text-indigo-600 h-4 w-4"
                    />
                    <span>Show Verified Customer Badge</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-ink-800">
                    <input
                      type="checkbox"
                      checked={showRole}
                      onChange={(e) => setShowRole(e.target.checked)}
                      className="rounded border-line text-indigo-600 h-4 w-4"
                    />
                    <span>Show Customer Role &amp; Company</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-ink-800">
                    <input
                      type="checkbox"
                      checked={showAvatar}
                      onChange={(e) => setShowAvatar(e.target.checked)}
                      className="rounded border-line text-indigo-600 h-4 w-4"
                    />
                    <span>Show Reviewer Avatar (or Initials)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-ink-800">
                    <input
                      type="checkbox"
                      checked={showDate}
                      onChange={(e) => setShowDate(e.target.checked)}
                      className="rounded border-line text-indigo-600 h-4 w-4"
                    />
                    <span>Show Submission Date</span>
                  </label>
                </div>

                {/* Video Thumbnail Options */}
                <div className="space-y-3 pt-3 border-t border-line">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-ink-900 text-xs">
                    <input
                      type="checkbox"
                      checked={isVideoThumbnail}
                      onChange={(e) => {
                        setIsVideoThumbnail(e.target.checked);
                        setShowPlayButton(e.target.checked);
                      }}
                      className="rounded border-line text-indigo-600 h-4 w-4"
                    />
                    <span>Format as Video Thumbnail / Poster</span>
                  </label>

                  {isVideoThumbnail && (
                    <div className="space-y-2 pl-6">
                      <div>
                        <label className="block text-[11px] font-medium text-ink-600 mb-1">
                          Duration Badge Label
                        </label>
                        <input
                          type="text"
                          value={videoDurationBadge}
                          onChange={(e) => setVideoDurationBadge(e.target.value)}
                          placeholder="0:45"
                          className="w-full rounded-lg border border-line bg-white px-2.5 py-1 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 4: SAVED ASSETS */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "saved" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                      Saved Assets ({savedAssets.length})
                    </h4>
                    <p className="text-[11px] text-ink-500">
                      All marketing exports linked to this testimonial are securely preserved.
                    </p>
                  </div>
                </div>

                {savedAssets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-500">
                    No marketing graphics saved yet. Click &quot;Save to Praise&quot; to archive your designs.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {savedAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="rounded-xl border border-line bg-white p-3 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-bold text-xs text-ink-900">{asset.type} Graphic</span>
                            <span className="text-[10px] text-ink-400">
                              {(asset.fileSizeBytes / 1024).toFixed(0)} KB
                            </span>
                          </div>
                          <span className="text-[10px] text-ink-400">
                            {new Date(asset.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-line/60">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}${asset.url}`);
                              toast.success("Copied", "Public asset link copied.");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-700 hover:text-ink-900"
                          >
                            <Copy size={12} />
                            <span>Copy Link</span>
                          </button>
                          <a
                            href={asset.url}
                            download={`marketing_asset_${asset.id}.png`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-semibold transition-colors"
                          >
                            <Download size={12} />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANE: LIVE INTERACTIVE MARKETING CANVAS */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 xl:col-span-7 h-full bg-zinc-950 p-4 sm:p-6 overflow-hidden flex flex-col items-center justify-center relative">
          {/* Top Bar Preview Indicator */}
          <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-20 text-xs text-white/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase text-[10px] tracking-wider bg-white/10 px-2 py-0.5 rounded">
                Live Canvas Preview
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {dimensions.label} &bull; {template.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Canvas Rendering Frame Container */}
          <div
            className={`relative w-full ${previewFrameClass} rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center transition-all duration-300 p-6 sm:p-8 select-none`}
            style={backgroundStyle}
          >
            {/* The Actual Renderable Graphic Element */}
            <div
              ref={previewCardRef}
              className={`w-full h-full flex flex-col justify-between p-6 sm:p-8 rounded-2xl border transition-all ${
                backgroundType === "glass"
                  ? "bg-zinc-900/60 border-white/15 backdrop-blur-md text-white"
                  : backgroundType === "solid"
                  ? "bg-white border-line text-zinc-900 shadow-lg"
                  : "bg-black/25 border-white/20 backdrop-blur-xs text-white shadow-xl"
              }`}
              style={{
                fontFamily: getFontFamilyCss(typographyFamily),
              }}
            >
              {/* Header: Logo & Rating */}
              <div className="flex items-start justify-between gap-4">
                {/* Star rating */}
                {showRating && (selectedTestimonial?.rating || 5) > 0 && (
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: selectedTestimonial?.rating || 5 }).map((_, i) => (
                      <Star key={i} size={18} className="fill-current" />
                    ))}
                  </div>
                )}

                {/* Logo watermark */}
                {showLogo && (
                  <div className="flex items-center gap-1.5 opacity-90">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span className="text-xs font-bold tracking-wider uppercase font-mono">
                      Praise
                    </span>
                  </div>
                )}
              </div>

              {/* Center: Quote Text */}
              <div className="my-auto py-4 relative">
                {/* Decorative quote icon */}
                <Quote
                  size={42}
                  className="opacity-20 fill-current mb-2 -ml-1 text-inherit"
                />

                <blockquote
                  className={`font-semibold leading-relaxed ${
                    aspectRatio === "9:16"
                      ? "text-lg sm:text-2xl"
                      : aspectRatio === "16:9"
                      ? "text-base sm:text-xl line-clamp-4"
                      : "text-base sm:text-xl"
                  }`}
                >
                  &ldquo;{editedQuote || selectedTestimonial?.content}&rdquo;
                </blockquote>

                {/* Edited badge if text was modified */}
                {isQuoteModified && (
                  <div className="mt-2">
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
                      Edited Excerpt
                    </span>
                  </div>
                )}
              </div>

              {/* Video Thumbnail Center Play Button Overlay */}
              {isVideoThumbnail && showPlayButton && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-105"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Play size={26} className="fill-current ml-1" />
                  </div>
                </div>
              )}

              {/* Footer: Customer Profile & Verification */}
              <div className="flex items-center justify-between pt-4 border-t border-current/15 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {showAvatar && (
                    <div className="relative">
                      {selectedTestimonial?.customer.avatarUrl ? (
                        <img
                          src={selectedTestimonial.customer.avatarUrl}
                          alt={selectedTestimonial.customer.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-white/30"
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-xs"
                          style={{ backgroundColor: accentColor }}
                        >
                          {selectedTestimonial?.customer.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {showVerifiedBadge && (
                        <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 text-blue-500 shadow-xs">
                          <CheckCircle2 size={13} className="fill-blue-500 text-white" />
                        </span>
                      )}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm truncate">
                        {selectedTestimonial?.customer.name}
                      </p>
                      {showVerifiedBadge && !showAvatar && (
                        <CheckCircle2 size={14} className="text-emerald-400 fill-emerald-400" />
                      )}
                    </div>
                    {showRole && (selectedTestimonial?.customer.company || selectedTestimonial?.customer.title) && (
                      <p className="text-xs opacity-75 truncate">
                        {selectedTestimonial.customer.title && selectedTestimonial.customer.company
                          ? `${selectedTestimonial.customer.title}, ${selectedTestimonial.customer.company}`
                          : selectedTestimonial.customer.company || selectedTestimonial.customer.title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: Date or Video Duration badge */}
                {isVideoThumbnail ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 text-white text-[11px] font-mono font-bold backdrop-blur-xs">
                    <Clock size={11} />
                    <span>{videoDurationBadge}</span>
                  </span>
                ) : showDate && selectedTestimonial?.submittedAt ? (
                  <span className="text-[11px] opacity-65 shrink-0">
                    {new Date(selectedTestimonial.submittedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
