"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
} from "lucide-react";
import { PublicTestimonialMedia } from "@/types/widgets";

type WidgetMediaPlayerProps = {
  media: PublicTestimonialMedia;
  allowPlayback?: boolean;
  aspectRatio?: "video" | "square" | "wide" | "auto";
  className?: string;
};

export function WidgetMediaPlayer({
  media,
  allowPlayback = true,
  aspectRatio = "wide",
  className = "",
}: WidgetMediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.durationSeconds || 0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const isVideo = media.type === "VIDEO";
  const isImage = media.type === "IMAGE";

  // Aspect ratio classes
  const aspectClass = {
    video: "aspect-video",
    square: "aspect-square",
    wide: "aspect-[16/10]",
    auto: "aspect-auto max-h-[360px]",
  }[aspectRatio];

  // Keyboard close for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen]);

  // Video playback toggling
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      videoRef.current.requestFullscreen().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  // If broken or unrenderable media
  if (hasError) {
    return (
      <div
        className={`w-full ${aspectClass} rounded-xl border border-line bg-warm-50 dark:bg-zinc-900 flex flex-col items-center justify-center p-4 text-center text-ink-400 dark:text-zinc-500 ${className}`}
      >
        <AlertTriangle size={24} className="text-amber-500 mb-1.5" />
        <span className="text-xs font-medium">Media Asset Unavailable</span>
      </div>
    );
  }

  return (
    <>
      <div
        className={`relative w-full ${aspectClass} rounded-xl overflow-hidden bg-black/5 dark:bg-zinc-900 border border-line dark:border-zinc-800 group select-none ${className}`}
      >
        {/* ----------------- VIDEO ----------------- */}
        {isVideo && (
          <div className="relative h-full w-full bg-black flex items-center justify-center">
            {/* Loading Spinner */}
            {isLoading && (
              <div
                aria-label="Loading video..."
                className="absolute inset-0 flex items-center justify-center bg-black/40 z-10"
              >
                <Loader2 size={24} className="animate-spin text-white" />
              </div>
            )}

            <video
              ref={videoRef}
              src={media.url}
              playsInline
              preload="metadata"
              onLoadedData={() => setIsLoading(false)}
              onWaiting={() => setIsLoading(true)}
              onPlaying={() => {
                setIsLoading(false);
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  if (!duration && videoRef.current.duration) {
                    setDuration(videoRef.current.duration);
                  }
                }
              }}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              onClick={allowPlayback ? togglePlay : undefined}
              className="h-full w-full object-cover cursor-pointer"
            />

            {/* Play/Pause Large Center Overlay Button */}
            {allowPlayback && !isPlaying && !isLoading && (
              <button
                type="button"
                onClick={togglePlay}
                aria-label="Play video testimonial"
                className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white flex items-center justify-center transition-all hover:scale-105 shadow-lg z-10"
              >
                <Play size={20} className="ml-1 fill-white" />
              </button>
            )}

            {/* Bottom Controls Bar (shown when playing or on hover) */}
            {allowPlayback && (
              <div
                className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 flex items-center justify-between text-white text-xs transition-opacity z-10 ${
                  isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause video" : "Play video"}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} className="fill-white" />}
                  </button>

                  <span className="font-mono text-[10px] text-white/90">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                  >
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label="View fullscreen video"
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- IMAGE ----------------- */}
        {isImage && (
          <div className="relative h-full w-full">
            {isLoading && (
              <div
                aria-label="Loading image..."
                className="absolute inset-0 flex items-center justify-center bg-warm-100 dark:bg-zinc-800"
              >
                <Loader2 size={20} className="animate-spin text-ink-400" />
              </div>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media.url}
              alt="Testimonial visual attachment"
              loading="lazy"
              decoding="async"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />

            {/* Zoom lightbox trigger */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              aria-label="Enlarge image preview"
              className="absolute top-2 right-2 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-xs p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        )}

        {/* ----------------- AUDIO / OTHER ----------------- */}
        {!isVideo && !isImage && (
          <div className="h-full w-full flex items-center justify-center p-4 text-xs text-ink-600 dark:text-zinc-300">
            <span>Attachment ({media.mimeType})</span>
          </div>
        )}
      </div>

      {/* LIGHTBOX MODAL FOR IMAGES */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged media preview"
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close enlarged preview"
            className="absolute top-4 right-4 rounded-full bg-white/20 hover:bg-white/30 text-white p-2 transition-colors z-10"
          >
            <X size={18} />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black border border-white/10 shadow-2xl flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media.url}
              alt="Enlarged testimonial attachment"
              className="max-h-[85vh] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
