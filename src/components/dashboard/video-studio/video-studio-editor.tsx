"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crop,
  Download,
  ExternalLink,
  Film,
  Layers,
  Loader2,
  Maximize2,
  MoveHorizontal,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Scissors,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  VideoAspectRatio,
  VideoResolutionProfile,
  VideoStudioClip,
  VideoStudioConfig,
  VideoCropMode,
} from "@/lib/video/types";
import { useToast } from "@/components/dashboard/toast-context";
import { MarketingAssetsStudio } from "./marketing-assets-studio";

type AvailableTestimonial = {
  id: string;
  content: string;
  rating: number | null;
  customer: {
    name: string;
    company?: string | null;
    avatarUrl?: string | null;
  };
  videoAssets: Array<{
    id: string;
    url: string;
    durationSeconds: number;
    fileSizeBytes?: number | null;
  }>;
};

type ExportJobItem = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  outputUrl?: string | null;
  fileSizeBytes?: number | null;
  durationSeconds?: number | null;
  aspectRatio: VideoAspectRatio;
  resolutionProfile: VideoResolutionProfile;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

type VideoStudioEditorProps = {
  workspaceId: string;
  initialTestimonialId?: string;
  initialMode?: "video" | "marketing";
  onBack?: () => void;
};

export function VideoStudioEditor({
  workspaceId,
  initialTestimonialId,
  initialMode = "video",
  onBack,
}: VideoStudioEditorProps) {
  const toast = useToast();
  const [studioMode, setStudioMode] = useState<"video" | "marketing">(initialMode);

  // Testimonials in workspace with video assets
  const [availableTestimonials, setAvailableTestimonials] = useState<AvailableTestimonial[]>([]);
  const [isLoadingTestimonials, setIsLoadingTestimonials] = useState(true);
  const [activeTestimonialId, setActiveTestimonialId] = useState<string>(initialTestimonialId || "");

  // Studio Configuration State
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>("RATIO_16_9");
  const [resolutionProfile, setResolutionProfile] = useState<VideoResolutionProfile>("RES_1080P");
  const [clips, setClips] = useState<VideoStudioClip[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);

  // Branded Intro Card State
  const [introEnabled, setIntroEnabled] = useState(false);
  const [introDuration, setIntroDuration] = useState(3);
  const [introTitle, setIntroTitle] = useState("Customer Story");
  const [introSubtitle, setIntroSubtitle] = useState("Verified Customer Praise");
  const [introBgColor, setIntroBgColor] = useState("#18181B");
  const [introTextColor, setIntroTextColor] = useState("#FFFFFF");

  // Branded Outro Card State
  const [outroEnabled, setOutroEnabled] = useState(false);
  const [outroDuration, setOutroDuration] = useState(3);
  const [outroTitle, setOutroTitle] = useState("Join 1,000+ Happy Customers");
  const [outroSubtitle, setOutroSubtitle] = useState("Start your free trial today");
  const [outroBgColor, setOutroBgColor] = useState("#7049D8");
  const [outroTextColor, setOutroTextColor] = useState("#FFFFFF");

  // Subtitles
  const [burnSubtitles, setBurnSubtitles] = useState(false);

  // Editor UI State
  const [activeTab, setActiveTab] = useState<"clips" | "trim" | "format" | "branding" | "exports">("clips");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isStartingExport, setIsStartingExport] = useState(false);
  const [exportJobs, setExportJobs] = useState<ExportJobItem[]>([]);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  // Live Video Preview State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [previewCardMode, setPreviewCardMode] = useState<"video" | "intro" | "outro">("video");

  // 1. Fetch available video testimonials on workspace change
  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    async function loadTestimonials() {
      setIsLoadingTestimonials(true);
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/video-studio/testimonials`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const list: AvailableTestimonial[] = data.testimonials || [];
          setAvailableTestimonials(list);

          // If no active testimonial selected yet, pick the first one
          if (!activeTestimonialId && list.length > 0) {
            setActiveTestimonialId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load video testimonials:", err);
      } finally {
        if (isMounted) setIsLoadingTestimonials(false);
      }
    }

    loadTestimonials();
    return () => {
      isMounted = false;
    };
  }, [workspaceId, activeTestimonialId]);

  // 2. Fetch or initialize studio config draft when activeTestimonialId changes
  useEffect(() => {
    if (!workspaceId || !activeTestimonialId) return;
    let isMounted = true;

    async function loadStudioData() {
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/testimonials/${activeTestimonialId}/studio`,
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          const saved: VideoStudioConfig | null = data.studioConfig;

          if (saved && saved.clips && saved.clips.length > 0) {
            // Restore saved draft
            setAspectRatio(saved.aspectRatio || "RATIO_16_9");
            setResolutionProfile(saved.resolutionProfile || "RES_1080P");
            setClips(saved.clips);
            setActiveClipIndex(0);

            if (saved.intro) {
              setIntroEnabled(saved.intro.enabled);
              setIntroDuration(saved.intro.durationSeconds || 3);
              setIntroTitle(saved.intro.title || "Customer Story");
              setIntroSubtitle(saved.intro.subtitle || "Verified Customer Praise");
              setIntroBgColor(saved.intro.backgroundColor || "#18181B");
              setIntroTextColor(saved.intro.textColor || "#FFFFFF");
            }

            if (saved.outro) {
              setOutroEnabled(saved.outro.enabled);
              setOutroDuration(saved.outro.durationSeconds || 3);
              setOutroTitle(saved.outro.title || "Join 1,000+ Happy Customers");
              setOutroSubtitle(saved.outro.subtitle || "Start your free trial today");
              setOutroBgColor(saved.outro.backgroundColor || "#7049D8");
              setOutroTextColor(saved.outro.textColor || "#FFFFFF");
            }

            setBurnSubtitles(Boolean(saved.burnSubtitles));
          } else if (data.testimonial && data.testimonial.videoAssets?.length > 0) {
            // Initialize default single-clip sequence from the testimonial's primary video
            const primaryAsset = data.testimonial.videoAssets[0];
            const defaultClip: VideoStudioClip = {
              id: `clip_${Date.now()}_1`,
              mediaAssetId: primaryAsset.id,
              testimonialId: activeTestimonialId,
              title: `${data.testimonial.customerName}'s Testimonial`,
              authorName: data.testimonial.customerName,
              authorCompany: data.testimonial.customerCompany,
              videoUrl: primaryAsset.url,
              trimStart: 0,
              trimEnd: primaryAsset.durationSeconds || 30,
              duration: primaryAsset.durationSeconds || 30,
              crop: { mode: "fit" },
              order: 0,
            };
            setClips([defaultClip]);
            setActiveClipIndex(0);
          }
        }
      } catch (err) {
        console.error("Failed to load studio draft:", err);
      }
    }

    loadStudioData();
    fetchExportJobs();

    return () => {
      isMounted = false;
    };
  }, [workspaceId, activeTestimonialId]);

  // 3. Poll export jobs history
  const fetchExportJobs = async () => {
    if (!workspaceId || !activeTestimonialId) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${activeTestimonialId}/studio/jobs`,
      );
      if (res.ok) {
        const data = await res.json();
        setExportJobs(data.jobs || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!activeTestimonialId) return;
    const interval = setInterval(fetchExportJobs, 4000);
    return () => clearInterval(interval);
  }, [workspaceId, activeTestimonialId]);

  // Current active clip
  const currentClip = clips[activeClipIndex] || clips[0] || null;

  // Total Sequence Duration calculation
  const totalSequenceDuration = useMemo(() => {
    let dur = 0;
    if (introEnabled) dur += introDuration;
    for (const c of clips) {
      dur += Math.max(0, c.trimEnd - c.trimStart);
    }
    if (outroEnabled) dur += outroDuration;
    return Math.round(dur * 10) / 10;
  }, [clips, introEnabled, introDuration, outroEnabled, outroDuration]);

  // Video element playback listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentClip) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // If playback exceeds clip trimEnd, loop or pause
      if (video.currentTime >= currentClip.trimEnd) {
        video.currentTime = currentClip.trimStart;
      }
    };

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration || currentClip.duration);
      if (video.currentTime < currentClip.trimStart) {
        video.currentTime = currentClip.trimStart;
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [currentClip]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => { });
      setIsPlaying(true);
    }
  };

  // Build current Studio Config object
  const currentStudioConfig: VideoStudioConfig = useMemo(() => {
    return {
      aspectRatio,
      resolutionProfile,
      clips,
      intro: {
        enabled: introEnabled,
        durationSeconds: introDuration,
        title: introTitle.trim(),
        subtitle: introSubtitle.trim(),
        backgroundColor: introBgColor,
        textColor: introTextColor,
      },
      outro: {
        enabled: outroEnabled,
        durationSeconds: outroDuration,
        title: outroTitle.trim(),
        subtitle: outroSubtitle.trim(),
        backgroundColor: outroBgColor,
        textColor: outroTextColor,
      },
      burnSubtitles,
    };
  }, [
    aspectRatio,
    resolutionProfile,
    clips,
    introEnabled,
    introDuration,
    introTitle,
    introSubtitle,
    introBgColor,
    introTextColor,
    outroEnabled,
    outroDuration,
    outroTitle,
    outroSubtitle,
    outroBgColor,
    outroTextColor,
    burnSubtitles,
  ]);

  // Save Draft Action
  const handleSaveDraft = async () => {
    if (!workspaceId || !activeTestimonialId) return;
    setIsSavingDraft(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${activeTestimonialId}/studio`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studioConfig: currentStudioConfig }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save studio configuration.");
      toast.success("Draft Saved", "Video Studio edits preserved successfully.");
    } catch (err: unknown) {
      toast.error("Save Failed", err instanceof Error ? err.message : "Error saving draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Start Export Action
  const handleStartExport = async () => {
    if (!workspaceId || !activeTestimonialId) return;
    if (clips.length === 0) {
      toast.error("No Clips", "Please add at least one video clip to export.");
      return;
    }

    setIsStartingExport(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${activeTestimonialId}/studio/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studioConfig: currentStudioConfig }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to queue export job.");

      toast.success("Export Queued", "FFmpeg background processing initialized.");
      setActiveTab("exports");
      fetchExportJobs();
    } catch (err: unknown) {
      toast.error("Export Failed", err instanceof Error ? err.message : "Error starting export.");
    } finally {
      setIsStartingExport(false);
    }
  };

  // Retry Export Action
  const handleRetryJob = async (jobId: string) => {
    if (!workspaceId || !activeTestimonialId) return;
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/testimonials/${activeTestimonialId}/studio/jobs/${jobId}/retry`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to retry export.");
      toast.success("Job Re-queued", "Export restarted in background.");
      fetchExportJobs();
    } catch (err: unknown) {
      toast.error("Retry Failed", err instanceof Error ? err.message : "Error retrying export.");
    }
  };

  // Clip Management Handlers
  const handleImportClip = (t: AvailableTestimonial) => {
    if (!t.videoAssets || t.videoAssets.length === 0) return;
    const asset = t.videoAssets[0];
    const newClip: VideoStudioClip = {
      id: `clip_${Date.now()}_${clips.length + 1}`,
      mediaAssetId: asset.id,
      testimonialId: t.id,
      title: `${t.customer.name}'s Story`,
      authorName: t.customer.name,
      authorCompany: t.customer.company || undefined,
      videoUrl: asset.url,
      trimStart: 0,
      trimEnd: asset.durationSeconds || 30,
      duration: asset.durationSeconds || 30,
      crop: { mode: "fit" },
      order: clips.length,
    };
    setClips((prev) => [...prev, newClip]);
    setActiveClipIndex(clips.length);
    setIsImportModalOpen(false);
    toast.success("Clip Added", `Imported ${t.customer.name}'s video to sequence.`);
  };

  const handleMoveClip = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === clips.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...clips];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setClips(updated);
    setActiveClipIndex(targetIndex);
  };

  const handleRemoveClip = (index: number) => {
    if (clips.length <= 1) {
      toast.error("Cannot Remove", "A video sequence requires at least one clip.");
      return;
    }
    const updated = clips.filter((_, idx) => idx !== index);
    setClips(updated);
    setActiveClipIndex(Math.max(0, index - 1));
  };

  // Clip Trimming Handlers
  const updateActiveClipTrim = (field: "trimStart" | "trimEnd", value: number) => {
    if (!currentClip) return;
    setClips((prev) =>
      prev.map((c, idx) => {
        if (idx !== activeClipIndex) return c;
        if (field === "trimStart") {
          const clamped = Math.max(0, Math.min(value, c.trimEnd - 0.5));
          return { ...c, trimStart: clamped };
        } else {
          const clamped = Math.max(c.trimStart + 0.5, Math.min(value, c.duration));
          return { ...c, trimEnd: clamped };
        }
      }),
    );
  };

  const setStartToCurrentTimestamp = () => {
    if (!currentClip || !videoRef.current) return;
    const time = Math.round(videoRef.current.currentTime * 10) / 10;
    updateActiveClipTrim("trimStart", time);
    toast.success("Trim In", `Trim start set to ${time.toFixed(1)}s`);
  };

  const setEndToCurrentTimestamp = () => {
    if (!currentClip || !videoRef.current) return;
    const time = Math.round(videoRef.current.currentTime * 10) / 10;
    updateActiveClipTrim("trimEnd", time);
    toast.success("Trim Out", `Trim end set to ${time.toFixed(1)}s`);
  };

  // Preview Aspect Ratio Frame Style
  const aspectContainerClass = useMemo(() => {
    switch (aspectRatio) {
      case "RATIO_9_16":
        return "aspect-[9/16] max-h-[520px]";
      case "RATIO_1_1":
        return "aspect-square max-h-[440px]";
      case "RATIO_4_5":
        return "aspect-[4/5] max-h-[480px]";
      case "ORIGINAL":
      case "RATIO_16_9":
      default:
        return "aspect-video max-h-[440px]";
    }
  }, [aspectRatio]);

  if (studioMode === "marketing") {
    return (
      <MarketingAssetsStudio
        workspaceId={workspaceId}
        initialTestimonialId={activeTestimonialId}
        onBack={() => setStudioMode("video")}
        onSwitchMode={setStudioMode}
      />
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
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0">
              <Film size={17} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-ink-900 truncate flex items-center gap-2">
                <span>Praise Video Studio</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hidden sm:inline">
                  Non-Destructive Editor
                </span>
              </h2>
              <p className="text-[11px] text-ink-500 truncate hidden md:block">
                Edit testimonial clips, format aspect ratio, trim duration, and render branded exports.
              </p>
            </div>
          </div>
        </div>

        {/* Global Studio Actions & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg border border-line bg-warm-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setStudioMode("video")}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors bg-white text-brand-700 shadow-2xs font-bold"
            >
              <Film size={13} />
              <span>Video Sequencer</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioMode("marketing")}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors text-ink-600 hover:text-ink-900"
            >
              <Sparkles size={13} />
              <span>Marketing Assets</span>
            </button>
          </div>
          {/* Switch Testimonial Selector */}
          {availableTestimonials.length > 1 && (
            <div className="hidden lg:flex items-center gap-1.5">
              <label className="text-[11px] font-medium text-ink-500">Editing:</label>
              <select
                value={activeTestimonialId}
                onChange={(e) => setActiveTestimonialId(e.target.value)}
                className="rounded-lg border border-line bg-warm-50 px-2.5 py-1 text-xs text-ink-800 max-w-[180px] truncate focus:outline-none"
              >
                {availableTestimonials.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.customer.name} ({t.videoAssets.length} video)
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors shadow-2xs disabled:opacity-50"
          >
            {isSavingDraft ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span className="hidden sm:inline">Save Draft</span>
          </button>

          <button
            type="button"
            onClick={handleStartExport}
            disabled={isStartingExport || clips.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isStartingExport ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>Export Video</span>
          </button>
        </div>
      </div>

      {/* Main Studio Dual-Pane Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* ================================================================= */}
        {/* LEFT PANE: CONTROLS & TIMELINE */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 xl:col-span-5 border-r border-line flex flex-col h-full bg-white z-10">
          {/* Navigation Tabs */}
          <div className="flex border-b border-line bg-warm-50 px-3 pt-2 shrink-0 gap-1 overflow-x-auto">
            {[
              { id: "clips", label: "Clips & Sequence", icon: Layers },
              { id: "trim", label: "Trim & Crop", icon: Scissors },
              { id: "format", label: "Aspect Ratio", icon: MoveHorizontal },
              { id: "branding", label: "Intro & Outro", icon: Palette },
              { id: "exports", label: `Exports (${exportJobs.length})`, icon: Download },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 ${isActive
                      ? "bg-white text-brand-600 border-t border-x border-line shadow-2xs -mb-px font-bold"
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
            {/* TAB 1: CLIPS & SEQUENCE */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "clips" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                      Sequence Order ({clips.length} {clips.length === 1 ? "Clip" : "Clips"})
                    </h4>
                    <p className="text-[11px] text-ink-500">
                      Arrange testimonial segments. They will be rendered seamlessly into one final video.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors shadow-2xs"
                  >
                    <Plus size={13} />
                    <span>Import Clip</span>
                  </button>
                </div>

                {/* Sequence list */}
                <div className="space-y-2">
                  {clips.map((clip, idx) => {
                    const isSelected = activeClipIndex === idx;
                    const clipDuration = Math.max(0, clip.trimEnd - clip.trimStart);
                    return (
                      <div
                        key={clip.id}
                        onClick={() => {
                          setActiveClipIndex(idx);
                          setPreviewCardMode("video");
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${isSelected
                            ? "border-brand-500 bg-brand-50/40 ring-1 ring-brand-500 shadow-2xs"
                            : "border-line bg-white hover:bg-warm-50/60"
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-warm-200 dark:bg-zinc-800 text-[10px] font-bold flex items-center justify-center text-ink-600 shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-ink-900 truncate">
                              {clip.title}
                            </p>
                            <p className="text-[10px] text-ink-500 truncate">
                              Trim: {clip.trimStart.toFixed(1)}s &ndash; {clip.trimEnd.toFixed(1)}s &bull; Length: {clipDuration.toFixed(1)}s
                            </p>
                          </div>
                        </div>

                        {/* Reorder and remove buttons */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveClip(idx, "up")}
                            title="Move Up"
                            className="p-1 rounded text-ink-500 hover:bg-warm-100 disabled:opacity-30"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === clips.length - 1}
                            onClick={() => handleMoveClip(idx, "down")}
                            title="Move Down"
                            className="p-1 rounded text-ink-500 hover:bg-warm-100 disabled:opacity-30"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={clips.length <= 1}
                            onClick={() => handleRemoveClip(idx)}
                            title="Remove from sequence"
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 disabled:opacity-30 ml-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total Sequence Stats */}
                <div className="rounded-xl border border-line bg-warm-50/60 p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-ink-600">
                    <Clock size={14} />
                    <span>Total Sequence Runtime:</span>
                  </div>
                  <span className="font-bold text-ink-900 font-mono text-sm">
                    {Math.floor(totalSequenceDuration / 60)}:
                    {(totalSequenceDuration % 60).toFixed(0).padStart(2, "0")}
                  </span>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: TRIM & CROP */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "trim" && currentClip && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-1">
                    Trimming Clip: {currentClip.title}
                  </h4>
                  <p className="text-[11px] text-ink-500">
                    Set start and end cut points. Cut out awkward pauses, filler words, or unwanted segments.
                  </p>
                </div>

                {/* Trim Sliders / Controls */}
                <div className="rounded-xl border border-line bg-warm-50/40 p-4 space-y-4">
                  {/* Trim In (Start) */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-ink-700">Trim In (Start)</span>
                      <span className="font-mono font-bold text-brand-600">
                        {currentClip.trimStart.toFixed(1)}s
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={currentClip.duration}
                        step={0.1}
                        value={currentClip.trimStart}
                        onChange={(e) => updateActiveClipTrim("trimStart", Number(e.target.value))}
                        className="flex-1 accent-brand-500"
                      />
                      <button
                        type="button"
                        onClick={setStartToCurrentTimestamp}
                        title="Set start to current playhead"
                        className="px-2 py-1 rounded-md border border-line bg-white text-[10px] font-bold text-ink-700 hover:bg-warm-100 shadow-2xs shrink-0"
                      >
                        Set Current
                      </button>
                    </div>
                  </div>

                  {/* Trim Out (End) */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-ink-700">Trim Out (End)</span>
                      <span className="font-mono font-bold text-brand-600">
                        {currentClip.trimEnd.toFixed(1)}s
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={currentClip.duration}
                        step={0.1}
                        value={currentClip.trimEnd}
                        onChange={(e) => updateActiveClipTrim("trimEnd", Number(e.target.value))}
                        className="flex-1 accent-brand-500"
                      />
                      <button
                        type="button"
                        onClick={setEndToCurrentTimestamp}
                        title="Set end to current playhead"
                        className="px-2 py-1 rounded-md border border-line bg-white text-[10px] font-bold text-ink-700 hover:bg-warm-100 shadow-2xs shrink-0"
                      >
                        Set Current
                      </button>
                    </div>
                  </div>

                  {/* Trim summary */}
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-line text-ink-600">
                    <span>Original Duration: {currentClip.duration.toFixed(1)}s</span>
                    <span className="font-bold text-ink-900">
                      Trimmed Duration: {(currentClip.trimEnd - currentClip.trimStart).toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Crop & Framing Mode */}
                <div className="space-y-2 pt-2 border-t border-line">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Video Framing &amp; Crop
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setClips((prev) =>
                          prev.map((c, idx) =>
                            idx === activeClipIndex
                              ? { ...c, crop: { mode: "fit" } }
                              : c,
                          ),
                        );
                      }}
                      className={`p-3 rounded-xl border text-left transition-colors ${currentClip.crop?.mode === "fit"
                          ? "border-brand-500 bg-brand-50/50 text-brand-700 font-semibold shadow-2xs"
                          : "border-line bg-white text-ink-700 hover:bg-warm-50"
                        }`}
                    >
                      <span className="block text-xs font-bold">Fit (Letterbox)</span>
                      <span className="block text-[10px] text-ink-500 mt-0.5">
                        Shows full video frame with clean border
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setClips((prev) =>
                          prev.map((c, idx) =>
                            idx === activeClipIndex
                              ? { ...c, crop: { mode: "fill" } }
                              : c,
                          ),
                        );
                      }}
                      className={`p-3 rounded-xl border text-left transition-colors ${currentClip.crop?.mode === "fill"
                          ? "border-brand-500 bg-brand-50/50 text-brand-700 font-semibold shadow-2xs"
                          : "border-line bg-white text-ink-700 hover:bg-warm-50"
                        }`}
                    >
                      <span className="block text-xs font-bold">Fill Frame</span>
                      <span className="block text-[10px] text-ink-500 mt-0.5">
                        Fills aspect ratio (no letterbox bars)
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: ASPECT RATIO & RESOLUTION */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "format" && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-1">
                    Output Aspect Ratio
                  </h4>
                  <p className="text-[11px] text-ink-500">
                    Select target destination format for social media, YouTube, or web embeds.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      id: "RATIO_16_9",
                      label: "16:9 Landscape",
                      desc: "YouTube, Website Embeds, Desktop",
                    },
                    {
                      id: "RATIO_9_16",
                      label: "9:16 Vertical",
                      desc: "Reels, TikTok, YouTube Shorts",
                    },
                    {
                      id: "RATIO_1_1",
                      label: "1:1 Square",
                      desc: "Instagram Feed, LinkedIn, Twitter",
                    },
                    {
                      id: "RATIO_4_5",
                      label: "4:5 Portrait",
                      desc: "Social media portrait feeds",
                    },
                    {
                      id: "ORIGINAL",
                      label: "Original Source",
                      desc: "Preserves native source camera ratio",
                    },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAspectRatio(r.id as VideoAspectRatio)}
                      className={`p-3 rounded-xl border text-left transition-colors ${aspectRatio === r.id
                          ? "border-brand-500 bg-brand-50/50 text-brand-700 font-semibold shadow-2xs ring-1 ring-brand-500"
                          : "border-line bg-white text-ink-700 hover:bg-warm-50"
                        }`}
                    >
                      <span className="block text-xs font-bold">{r.label}</span>
                      <span className="block text-[10px] text-ink-500 mt-0.5">{r.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Resolution Profile */}
                <div className="space-y-2 pt-3 border-t border-line">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                    Output Quality &amp; Resolution
                  </h4>
                  <select
                    value={resolutionProfile}
                    onChange={(e) => setResolutionProfile(e.target.value as VideoResolutionProfile)}
                    className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink-900"
                  >
                    <option value="RES_1080P">1080p Full HD (Recommended for Web &amp; Social)</option>
                    <option value="RES_720P">720p HD (Fastest render &amp; compact file size)</option>
                    <option value="RES_4K">4K Ultra HD (High-bitrate studio quality)</option>
                  </select>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 4: BRANDED INTRO & OUTRO */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "branding" && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-1">
                    Branded Cards
                  </h4>
                  <p className="text-[11px] text-ink-500">
                    Attach branded title and call-to-action cards to start and finish your customer video.
                  </p>
                </div>

                {/* Branded Intro Section */}
                <div className="rounded-xl border border-line p-4 space-y-3 bg-warm-50/30">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-ink-900 text-xs">
                      <input
                        type="checkbox"
                        checked={introEnabled}
                        onChange={(e) => {
                          setIntroEnabled(e.target.checked);
                          if (e.target.checked) setPreviewCardMode("intro");
                          else setPreviewCardMode("video");
                        }}
                        className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                      />
                      <span>Add Branded Intro Card</span>
                    </label>

                    {introEnabled && (
                      <button
                        type="button"
                        onClick={() => setPreviewCardMode("intro")}
                        className="text-[11px] font-semibold text-brand-600 hover:underline"
                      >
                        Preview Card
                      </button>
                    )}
                  </div>

                  {introEnabled && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-medium text-ink-600 mb-1">
                          Intro Title Headline
                        </label>
                        <input
                          type="text"
                          value={introTitle}
                          onChange={(e) => setIntroTitle(e.target.value)}
                          placeholder="e.g. Acme Customer Spotlight"
                          className="w-full rounded-lg border border-line bg-white px-2.5 py-1 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-ink-600 mb-1">
                          Intro Subtitle
                        </label>
                        <input
                          type="text"
                          value={introSubtitle}
                          onChange={(e) => setIntroSubtitle(e.target.value)}
                          placeholder="e.g. Verified Praise Testimonial"
                          className="w-full rounded-lg border border-line bg-white px-2.5 py-1 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-ink-600 mb-1">
                            Card Duration
                          </label>
                          <select
                            value={introDuration}
                            onChange={(e) => setIntroDuration(Number(e.target.value))}
                            className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs"
                          >
                            <option value={2}>2 Seconds</option>
                            <option value={3}>3 Seconds (Default)</option>
                            <option value={4}>4 Seconds</option>
                            <option value={5}>5 Seconds</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-ink-600 mb-1">
                            Card Background
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={introBgColor}
                              onChange={(e) => setIntroBgColor(e.target.value)}
                              className="h-7 w-7 rounded cursor-pointer border border-line p-0.5"
                            />
                            <span className="font-mono text-xs">{introBgColor}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Branded Outro Section */}
                <div className="rounded-xl border border-line p-4 space-y-3 bg-warm-50/30">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-ink-900 text-xs">
                      <input
                        type="checkbox"
                        checked={outroEnabled}
                        onChange={(e) => {
                          setOutroEnabled(e.target.checked);
                          if (e.target.checked) setPreviewCardMode("outro");
                          else setPreviewCardMode("video");
                        }}
                        className="rounded border-line text-brand-600 focus:ring-brand-500 h-4 w-4"
                      />
                      <span>Add Branded Outro CTA</span>
                    </label>

                    {outroEnabled && (
                      <button
                        type="button"
                        onClick={() => setPreviewCardMode("outro")}
                        className="text-[11px] font-semibold text-brand-600 hover:underline"
                      >
                        Preview Card
                      </button>
                    )}
                  </div>

                  {outroEnabled && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-medium text-ink-600 mb-1">
                          Call to Action Headline
                        </label>
                        <input
                          type="text"
                          value={outroTitle}
                          onChange={(e) => setOutroTitle(e.target.value)}
                          placeholder="e.g. Join 1,000+ Happy Teams"
                          className="w-full rounded-lg border border-line bg-white px-2.5 py-1 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-ink-600 mb-1">
                          Website URL or Badge
                        </label>
                        <input
                          type="text"
                          value={outroSubtitle}
                          onChange={(e) => setOutroSubtitle(e.target.value)}
                          placeholder="e.g. www.yourcompany.com"
                          className="w-full rounded-lg border border-line bg-white px-2.5 py-1 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-ink-600 mb-1">
                            Card Duration
                          </label>
                          <select
                            value={outroDuration}
                            onChange={(e) => setOutroDuration(Number(e.target.value))}
                            className="w-full rounded-lg border border-line bg-white px-2 py-1 text-xs"
                          >
                            <option value={2}>2 Seconds</option>
                            <option value={3}>3 Seconds (Default)</option>
                            <option value={4}>4 Seconds</option>
                            <option value={5}>5 Seconds</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-ink-600 mb-1">
                            Card Background
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={outroBgColor}
                              onChange={(e) => setOutroBgColor(e.target.value)}
                              className="h-7 w-7 rounded cursor-pointer border border-line p-0.5"
                            />
                            <span className="font-mono text-xs">{outroBgColor}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 5: EXPORTS & HISTORY */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "exports" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-400">
                      Export History &amp; Render Jobs
                    </h4>
                    <p className="text-[11px] text-ink-500">
                      Processed exports are preserved separately. Original media is never modified.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchExportJobs}
                    className="p-1.5 rounded-lg border border-line hover:bg-warm-100 text-ink-600"
                    title="Refresh Jobs"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>

                {exportJobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-500">
                    No video exports generated yet. Click &quot;Export Video&quot; above to render this sequence.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {exportJobs.map((job) => {
                      const isComplete = job.status === "COMPLETED";
                      const isFailed = job.status === "FAILED";
                      const isProcessing = job.status === "PROCESSING" || job.status === "QUEUED";

                      return (
                        <div
                          key={job.id}
                          className="rounded-xl border border-line bg-white p-3.5 space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${isComplete
                                    ? "bg-emerald-500"
                                    : isFailed
                                      ? "bg-rose-500"
                                      : "bg-amber-500 animate-pulse"
                                  }`}
                              />
                              <span className="font-bold text-xs capitalize text-ink-900">
                                {job.status.toLowerCase()}
                              </span>
                              <span className="text-[10px] font-mono text-ink-400">
                                {job.aspectRatio.replace("RATIO_", "")} &bull; {job.resolutionProfile.replace("RES_", "")}
                              </span>
                            </div>

                            <span className="text-[10px] text-ink-400">
                              {new Date(job.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Progress bar */}
                          {isProcessing && (
                            <div className="space-y-1">
                              <div className="w-full h-1.5 bg-warm-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-brand-500 transition-all duration-300"
                                  style={{ width: `${Math.max(5, job.progress)}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-ink-500">
                                <span>Encoding sequence...</span>
                                <span>{job.progress}%</span>
                              </div>
                            </div>
                          )}

                          {/* Error notice if failed */}
                          {isFailed && (
                            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center justify-between">
                              <span className="truncate">{job.errorMessage || "Rendering failed."}</span>
                              <button
                                type="button"
                                onClick={() => handleRetryJob(job.id)}
                                className="inline-flex items-center gap-1 font-bold text-rose-800 underline ml-2 shrink-0"
                              >
                                <RotateCcw size={11} />
                                <span>Retry</span>
                              </button>
                            </div>
                          )}

                          {/* Completed Actions */}
                          {isComplete && job.outputUrl && (
                            <div className="flex items-center justify-between pt-1 text-xs">
                              <div className="text-[11px] text-ink-500">
                                {job.fileSizeBytes ? `${(job.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB` : "Rendered"}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      `${window.location.origin}${job.outputUrl}`,
                                    );
                                    setCopiedJobId(job.id);
                                    setTimeout(() => setCopiedJobId(null), 2000);
                                    toast.success("Copied", "Public video URL copied to clipboard.");
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-700 hover:text-ink-900"
                                >
                                  {copiedJobId === job.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                  <span>{copiedJobId === job.id ? "Copied" : "Copy Link"}</span>
                                </button>
                                <a
                                  href={job.outputUrl}
                                  download={`praise_export_${job.id}.mp4`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 hover:bg-brand-100 text-[11px] font-semibold transition-colors"
                                >
                                  <Download size={12} />
                                  <span>Download MP4</span>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANE: LIVE VIDEO STUDIO CANVAS & PREVIEW */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 xl:col-span-7 h-full bg-zinc-950 p-4 sm:p-6 overflow-hidden flex flex-col items-center justify-center relative">
          {/* Top Preview Canvas Switcher */}
          <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-20 text-xs text-white/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase text-[10px] tracking-wider bg-white/10 px-2 py-0.5 rounded">
                Live Studio Canvas
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {aspectRatio.replace("RATIO_", "")} &bull; {currentClip?.title || "No Clip"}
              </span>
            </div>

            {/* Switch preview card view */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5 text-[11px]">
              {introEnabled && (
                <button
                  type="button"
                  onClick={() => setPreviewCardMode("intro")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${previewCardMode === "intro" ? "bg-white text-zinc-950 font-bold" : "hover:text-white"
                    }`}
                >
                  Intro
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreviewCardMode("video")}
                className={`px-2 py-0.5 rounded-md transition-colors ${previewCardMode === "video" ? "bg-white text-zinc-950 font-bold" : "hover:text-white"
                  }`}
              >
                Video Clip
              </button>
              {outroEnabled && (
                <button
                  type="button"
                  onClick={() => setPreviewCardMode("outro")}
                  className={`px-2 py-0.5 rounded-md transition-colors ${previewCardMode === "outro" ? "bg-white text-zinc-950 font-bold" : "hover:text-white"
                    }`}
                >
                  Outro
                </button>
              )}
            </div>
          </div>

          {/* Aspect-Ratio Video Container */}
          <div
            className={`relative w-full ${aspectContainerClass} rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 flex items-center justify-center transition-all duration-300`}
          >
            {/* View A: Intro Card Preview */}
            {previewCardMode === "intro" && (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200"
                style={{ backgroundColor: introBgColor, color: introTextColor }}
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold max-w-sm leading-tight mb-2">
                  {introTitle || "Customer Story"}
                </h3>
                <p className="text-xs sm:text-sm opacity-80 max-w-xs">
                  {introSubtitle || "Verified Praise Review"}
                </p>
                <span className="mt-4 text-[10px] opacity-50 font-mono">
                  Duration: {introDuration}s
                </span>
              </div>
            )}

            {/* View B: Outro Card Preview */}
            {previewCardMode === "outro" && (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200"
                style={{ backgroundColor: outroBgColor, color: outroTextColor }}
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold max-w-sm leading-tight mb-2">
                  {outroTitle || "Join 1,000+ Happy Customers"}
                </h3>
                <p className="text-xs sm:text-sm opacity-90 max-w-xs font-semibold">
                  {outroSubtitle || "www.yourcompany.com"}
                </p>
                <span className="mt-4 text-[10px] opacity-50 font-mono">
                  Duration: {outroDuration}s
                </span>
              </div>
            )}

            {/* View C: Active Video Clip */}
            {previewCardMode === "video" && currentClip && (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  src={currentClip.videoUrl}
                  playsInline
                  muted={isMuted}
                  className={`w-full h-full ${currentClip.crop?.mode === "fill" ? "object-cover" : "object-contain"
                    }`}
                  onClick={togglePlay}
                />

                {/* Subtitle preview if enabled */}
                {burnSubtitles && (
                  <div className="absolute bottom-12 left-4 right-4 text-center pointer-events-none">
                    <span className="inline-block bg-black/70 text-white px-3 py-1 rounded text-xs sm:text-sm font-semibold backdrop-blur-xs">
                      &ldquo;Praise transformed our customer social proof...&rdquo;
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Player Timeline Controls */}
          {previewCardMode === "video" && currentClip && (
            <div className="w-full max-w-xl mt-4 px-2 space-y-2 z-20">
              {/* Scrubber track */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={currentClip.trimStart}
                  max={currentClip.trimEnd}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCurrentTime(val);
                    if (videoRef.current) videoRef.current.currentTime = val;
                  }}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>

              {/* Play / Mute / Timer Bar */}
              <div className="flex items-center justify-between text-xs text-white/80">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!videoRef.current) return;
                      videoRef.current.currentTime = currentClip.trimStart;
                    }}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Jump to Trim In"
                  >
                    <RotateCcw size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                </div>

                <div className="font-mono text-[11px] text-white/60">
                  {currentTime.toFixed(1)}s / {currentClip.trimEnd.toFixed(1)}s
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Import Testimonial Video Clip */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-line bg-white p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-sm font-bold text-ink-900">Import Video Testimonial</h3>
                <p className="text-xs text-ink-500">
                  Select an approved video review from your workspace to append to this sequence.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg text-ink-400 hover:bg-warm-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {availableTestimonials.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleImportClip(t)}
                  className="p-3 rounded-xl border border-line hover:border-brand-500 hover:bg-brand-50/30 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center font-bold text-xs text-brand-600 shrink-0">
                      {t.customer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-ink-900 truncate">
                        {t.customer.name}
                      </p>
                      <p className="text-[11px] text-ink-500 truncate">
                        {t.customer.company || "Customer"} &bull; {t.videoAssets[0]?.durationSeconds || 30}s
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors shrink-0"
                  >
                    <Plus size={12} />
                    <span>Add to Sequence</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-line text-xs font-semibold hover:bg-warm-50 text-ink-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
