"use client";

import { useState, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  ZoomIn,
  RefreshCw,
  Clock,
  HardDrive,
  FileVideo,
  FileImage,
} from "lucide-react";
import { ModalDialog } from "@/components/dashboard/modal-dialog";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { cn } from "@/lib/utils";

export type TestimonialMediaItem = {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "AUDIO";
  mimeType: string;
  fileSizeBytes?: number | null;
  durationSeconds?: number | null;
  posterUrl?: string | null;
};

type TestimonialMediaProps = {
  media: TestimonialMediaItem;
  canDelete?: boolean;
  canDownload?: boolean;
  onDelete?: (assetId: string) => Promise<void> | void;
  className?: string;
  compact?: boolean;
};

export function TestimonialMedia({
  media,
  canDelete = false,
  canDownload = true,
  onDelete,
  className,
  compact = false,
}: TestimonialMediaProps) {
  // Video playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Modal dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isVideo = media.type === "VIDEO";
  const isImage = media.type === "IMAGE";

  const formattedSize = media.fileSizeBytes
    ? `${(media.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : null;

  const formattedType = media.mimeType ? media.mimeType.split("/")[1]?.toUpperCase() : media.type;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  // Video playback controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const cyclePlaybackRate = () => {
    if (!videoRef.current) return;
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    videoRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoRef.current.requestFullscreen().catch(() => {});
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setRetryKey((k) => k + 1);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(media.id);
      setIsModalOpen(false);
    } finally {
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
    }
  };

  const downloadUrl = `${media.url}?download=1`;

  return (
    <div className={cn("space-y-2 select-none", className)}>
      {/* ----------------------------------------------------------- */}
      {/* 1. VIDEO PLAYER CONTAINER */}
      {/* ----------------------------------------------------------- */}
      {isVideo && (
        <div className="relative group rounded-xl overflow-hidden bg-warm-950 border border-warm-800 shadow-xs">
          {hasError ? (
            /* Missing-file / playback error state */
            <div className="flex flex-col items-center justify-center p-8 text-center bg-warm-900 text-warm-200 min-h-[180px] space-y-2">
              <AlertTriangle size={24} className="text-amber-400" />
              <p className="text-xs font-semibold text-warm-100">Video playback unavailable</p>
              <p className="text-[11px] text-warm-400 max-w-xs leading-relaxed">
                The video file could not be loaded or is in an unsupported codec.
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-warm-800 px-3 py-1.5 text-[11px] font-medium text-warm-100 hover:bg-warm-700 transition-colors"
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "relative aspect-video bg-black flex items-center justify-center",
                compact ? "max-h-[220px]" : "max-h-[360px]",
              )}
            >
              <video
                key={retryKey}
                ref={videoRef}
                src={media.url}
                poster={media.posterUrl || undefined}
                preload="metadata"
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration || 0);
                    setIsLoading(false);
                  }
                }}
                onWaiting={() => setIsLoading(true)}
                onPlaying={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                className="h-full w-full object-contain cursor-pointer"
                onClick={togglePlay}
              />

              {/* Loading buffer spinner */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                  <Loader2 size={32} className="animate-spin text-brand-400" />
                </div>
              )}

              {/* Big Center Play Button Overlay (when paused) */}
              {!isPlaying && !isLoading && (
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label="Play video"
                  className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-brand-500/90 text-white flex items-center justify-center shadow-lg hover:scale-105 hover:bg-brand-500 transition-all focus:outline-none"
                >
                  <Play size={24} className="ml-1 fill-white" />
                </button>
              )}

              {/* Top controls / Enlarge button */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  aria-label="Open larger preview"
                  title="Enlarge preview"
                  className="rounded-lg bg-black/60 backdrop-blur-xs p-1.5 text-warm-200 hover:text-white hover:bg-black/80 transition-colors"
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              {/* Bottom Custom Playback Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 pt-6 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {/* Timeline scrubber */}
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    aria-label="Seek video"
                    className="h-1 w-full rounded-lg bg-warm-700 accent-brand-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-warm-200 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? "Pause" : "Play"}
                      className="p-1 hover:text-white transition-colors"
                    >
                      {isPlaying ? <Pause size={15} /> : <Play size={15} className="fill-current" />}
                    </button>

                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                      className="p-1 hover:text-white transition-colors"
                    >
                      {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>

                    <span className="text-[11px] font-mono text-warm-300">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Playback speed selector */}
                    <button
                      type="button"
                      onClick={cyclePlaybackRate}
                      aria-label="Playback speed"
                      className="rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-warm-800 hover:bg-warm-700 text-warm-200 transition-colors"
                    >
                      {playbackRate}x
                    </button>

                    {/* Fullscreen */}
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      aria-label="Toggle fullscreen"
                      className="p-1 hover:text-white transition-colors"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 2. IMAGE PREVIEW CONTAINER */}
      {/* ----------------------------------------------------------- */}
      {isImage && (
        <div className="relative group rounded-xl overflow-hidden border border-line bg-warm-50/50 shadow-2xs">
          {hasError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-ink-500 min-h-[140px] space-y-1.5">
              <AlertTriangle size={20} className="text-amber-500" />
              <p className="text-xs font-semibold text-ink-800">Image unavailable</p>
              <p className="text-[11px] text-ink-400">Failed to render the image file.</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-1 text-[11px] font-semibold text-brand-600 hover:underline"
              >
                Retry loading
              </button>
            </div>
          ) : (
            <div
              className={cn(
                "relative flex items-center justify-center overflow-hidden",
                compact ? "max-h-[180px]" : "max-h-[300px]",
              )}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-warm-100">
                  <Loader2 size={24} className="animate-spin text-ink-400" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={retryKey}
                src={media.url}
                alt="Testimonial media attachment"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                onClick={() => setIsModalOpen(true)}
                className="w-full max-h-[300px] object-cover sm:object-contain rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
              />

              {/* Hover Enlarge pill */}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                aria-label="Enlarge image"
                className="absolute top-2 right-2 rounded-lg bg-black/60 backdrop-blur-xs p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 3. METADATA ROW & ACTIONS BAR */}
      {/* ----------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-ink-500">
        <div className="flex items-center gap-2 truncate">
          <span className="inline-flex items-center gap-1 font-medium text-ink-700">
            {isVideo ? <FileVideo size={12} className="text-brand-600" /> : <FileImage size={12} className="text-brand-600" />}
            <span>{formattedType}</span>
          </span>

          {formattedSize && (
            <>
              <span className="text-ink-300">&bull;</span>
              <span className="inline-flex items-center gap-1 text-ink-500">
                <HardDrive size={11} className="text-ink-400" />
                <span>{formattedSize}</span>
              </span>
            </>
          )}

          {isVideo && duration > 0 && (
            <>
              <span className="text-ink-300">&bull;</span>
              <span className="inline-flex items-center gap-1 text-ink-500 font-mono">
                <Clock size={11} className="text-ink-400" />
                <span>{formatTime(duration)}</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Download Original File */}
          {canDownload && (
            <a
              href={downloadUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download original media file"
              title="Download original file"
              className="rounded-md p-1.5 text-ink-500 hover:text-ink-900 hover:bg-warm-100 transition-colors"
            >
              <Download size={13} />
            </a>
          )}

          {/* Delete Media Asset */}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => setIsConfirmDeleteOpen(true)}
              aria-label="Delete media asset"
              title="Delete media"
              className="rounded-md p-1.5 text-ink-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* 4. LARGER PREVIEW MODAL (LIGHTBOX) */}
      {/* ----------------------------------------------------------- */}
      <ModalDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isVideo ? "Video Testimonial Preview" : "Media Preview"}
        maxWidth="3xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-ink-500">
              {formattedType} {formattedSize && `• ${formattedSize}`}
            </div>
            <div className="flex items-center gap-2">
              {canDownload && (
                <a
                  href={downloadUrl}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-warm-100 transition-colors"
                >
                  <Download size={13} />
                  <span>Download Original</span>
                </a>
              )}
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsConfirmDeleteOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Delete Media</span>
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="py-2 flex items-center justify-center bg-black/95 rounded-xl overflow-hidden min-h-[300px] max-h-[70vh]">
          {isVideo ? (
            <video
              src={media.url}
              controls
              autoPlay
              playsInline
              className="w-full h-full max-h-[65vh] object-contain rounded-lg"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={media.url}
              alt="Full preview"
              className="max-h-[65vh] w-auto object-contain mx-auto rounded-lg"
            />
          )}
        </div>
      </ModalDialog>

      {/* ----------------------------------------------------------- */}
      {/* 5. DELETE CONFIRMATION DIALOG */}
      {/* ----------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Media File"
        message="Are you sure you want to permanently delete this media attachment? The file will be removed from your server storage volume. This action cannot be undone."
        confirmLabel={isDeleting ? "Deleting..." : "Delete Permanently"}
        isDestructive
      />
    </div>
  );
}
