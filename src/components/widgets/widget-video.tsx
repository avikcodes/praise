"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Film,
  Loader2,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { PublicTestimonialCard, PublicTestimonialMedia } from "@/types/widgets";
import { WidgetPublicConfig } from "./types";
import { WidgetAvatar } from "./widget-avatar";
import { WidgetRating } from "./widget-rating";
import {
  getCardBorderClasses,
  getCardRadiusClasses,
  getCardSpacingClasses,
} from "@/lib/branding/utils";

type WidgetVideoProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

type VideoPlayerCardProps = {
  testimonial: PublicTestimonialCard;
  brandColor: string;
  radiusClass: string;
  borderClass: string;
  spacingClass: string;
  config: WidgetPublicConfig;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

function VideoPlayerCard({
  testimonial,
  brandColor,
  radiusClass,
  borderClass,
  spacingClass,
  config,
  onTestimonialClick,
}: VideoPlayerCardProps) {
  const {
    showRatings = true,
    showCompany = true,
    showAvatar = true,
    showDate = true,
    showFeaturedBadge = true,
    allowVideoPlayback = true,
  } = config;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Find video media asset
  const videoMedia: PublicTestimonialMedia | undefined = testimonial.media?.find(
    (m) => m.type === "VIDEO"
  );
  const videoUrl = videoMedia?.url;

  const togglePlay = () => {
    if (!videoRef.current || !videoUrl) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      setIsLoading(true);
      videoRef.current.play().catch(() => {
        setIsLoading(false);
      });
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <article
      onClick={() => onTestimonialClick?.(testimonial)}
      className={`flex flex-col ${radiusClass} ${borderClass} bg-white dark:bg-zinc-900 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${
        onTestimonialClick ? "cursor-pointer" : ""
      }`}
    >
      {/* Video Container (Hero 16:9 widescreen) */}
      <div className="relative w-full aspect-video bg-black overflow-hidden group">
        {videoUrl && !hasError ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              preload="metadata"
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration);
                }
              }}
              onWaiting={() => setIsLoading(true)}
              onPlaying={() => {
                setIsLoading(false);
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
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
              onClick={allowVideoPlayback ? togglePlay : undefined}
              className="w-full h-full object-cover cursor-pointer"
            />

            {/* Loading Indicator */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 pointer-events-none">
                <Loader2 size={32} className="animate-spin text-white" />
              </div>
            )}

            {/* Center Big Play Button Overlay */}
            {allowVideoPlayback && !isPlaying && !isLoading && (
              <button
                type="button"
                onClick={togglePlay}
                aria-label={`Play video testimonial from ${testimonial.customer?.name}`}
                className="absolute inset-0 flex items-center justify-center bg-black/35 hover:bg-black/45 transition-colors z-10 group/btn"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-transform group-hover/btn:scale-110"
                  style={{ backgroundColor: brandColor }}
                >
                  <Play size={22} className="ml-1" />
                </div>
              </button>
            )}

            {/* Video Controls Bar Overlay */}
            {allowVideoPlayback && isPlaying && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 text-white"
              >
                {/* Timeline Scrubber */}
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  aria-label="Video scrubber"
                  className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                />

                <div className="flex items-center justify-between text-[11px] font-medium pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? "Pause" : "Play"}
                      className="p-1 rounded hover:bg-white/20 transition-colors"
                    >
                      {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <span>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                      className="p-1 rounded hover:bg-white/20 transition-colors"
                    >
                      {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      aria-label="Fullscreen"
                      className="p-1 rounded hover:bg-white/20 transition-colors"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Fallback when video is missing or errored */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-800 text-zinc-300">
            <Film size={28} className="mb-2 opacity-50" />
            <span className="text-xs font-semibold">Video Preview Unavailable</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Transcript preserved below</span>
          </div>
        )}

        {/* Video Badge Tag Overlay */}
        <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold tracking-wide uppercase">
            <Film size={10} className="text-emerald-400" />
            Video Proof
          </span>
        </div>

        {testimonial.isFeatured && showFeaturedBadge && (
          <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-white text-[10px] font-bold tracking-wide uppercase shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              <Sparkles size={10} />
              Featured
            </span>
          </div>
        )}
      </div>

      {/* Customer Header & Quote Section */}
      <div className={`flex-1 flex flex-col justify-between ${spacingClass}`}>
        <div>
          {/* Customer Profile & Rating */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {showAvatar && (
                <WidgetAvatar
                  avatarUrl={testimonial.customer?.avatarUrl}
                  name={testimonial.customer?.name || "Customer"}
                  size="sm"
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-bold text-xs text-ink-900 dark:text-zinc-100 truncate">
                    {testimonial.customer?.name}
                  </span>
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                </div>
                {showCompany && (testimonial.customer?.title || testimonial.customer?.company) && (
                  <p className="text-[11px] text-ink-500 dark:text-zinc-400 truncate">
                    {testimonial.customer?.title}
                    {testimonial.customer?.title && testimonial.customer?.company && " • "}
                    {testimonial.customer?.company}
                  </p>
                )}
              </div>
            </div>

            {showRatings && testimonial.rating !== null && testimonial.rating > 0 && (
              <WidgetRating rating={testimonial.rating} size="xs" accentColor={brandColor} />
            )}
          </div>

          {/* Transcript / Quote content */}
          <p className="text-xs text-ink-700 dark:text-zinc-300 leading-relaxed line-clamp-3 italic">
            "{testimonial.content}"
          </p>
        </div>

        {/* Footer date */}
        {showDate && testimonial.submittedAt && (
          <div className="pt-2 border-t border-line/50 dark:border-zinc-800 text-[10px] text-ink-400 dark:text-zinc-500 flex justify-end">
            <time dateTime={testimonial.submittedAt}>
              {new Date(testimonial.submittedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
        )}
      </div>
    </article>
  );
}

export function WidgetVideo({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetVideoProps) {
  const {
    cardsPerRow = 3,
    accentColor = "#7049D8",
    primaryColor,
    cardBorder,
    cardRadius,
    cardSpacing,
    theme,
  } = config;

  const brandColor = primaryColor || accentColor || "#7049D8";
  const borderClass = getCardBorderClasses(cardBorder, theme === "dark");
  const radiusClass = getCardRadiusClasses(cardRadius);
  const spacingClass = getCardSpacingClasses(cardSpacing);

  const gridColsClass =
    cardsPerRow === 1
      ? "grid-cols-1 max-w-xl mx-auto"
      : cardsPerRow === 2
      ? "grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div
      role="region"
      aria-label="Customer Video Testimonials"
      className={`grid gap-5 ${gridColsClass} ${className}`}
    >
      {testimonials.map((t) => (
        <VideoPlayerCard
          key={t.id}
          testimonial={t}
          brandColor={brandColor}
          radiusClass={radiusClass}
          borderClass={borderClass}
          spacingClass={spacingClass}
          config={config}
          onTestimonialClick={onTestimonialClick}
        />
      ))}
    </div>
  );
}
