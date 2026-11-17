"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Mic,
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

type WidgetAudioProps = {
  testimonials: PublicTestimonialCard[];
  config?: WidgetPublicConfig;
  className?: string;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

type AudioPlayerCardProps = {
  testimonial: PublicTestimonialCard;
  brandColor: string;
  radiusClass: string;
  borderClass: string;
  spacingClass: string;
  config: WidgetPublicConfig;
  onTestimonialClick?: (testimonial: PublicTestimonialCard) => void;
};

function AudioPlayerCard({
  testimonial,
  brandColor,
  radiusClass,
  borderClass,
  spacingClass,
  config,
  onTestimonialClick,
}: AudioPlayerCardProps) {
  const {
    showRatings = true,
    showCompany = true,
    showAvatar = true,
    showDate = true,
    showFeaturedBadge = true,
  } = config;

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5 | 2>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Locate audio media asset
  const audioMedia: PublicTestimonialMedia | undefined = testimonial.media?.find(
    (m) => m.type === "AUDIO"
  );
  const audioUrl = audioMedia?.url;

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const cycleSpeed = () => {
    if (!audioRef.current) return;
    const speeds: (1 | 1.25 | 1.5 | 2)[] = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audioRef.current.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  // Keyboard accessibility on card focus
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 5);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 5);
    } else if (e.key === "m") {
      e.preventDefault();
      toggleMute();
    } else if (onTestimonialClick && e.key === "Enter") {
      e.preventDefault();
      onTestimonialClick(testimonial);
    }
  };

  // Generate simulated soundwave bars
  const waveHeights = [24, 45, 70, 35, 60, 90, 50, 75, 40, 85, 65, 95, 55, 80, 45, 60, 30, 50];

  return (
    <article
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => onTestimonialClick?.(testimonial)}
      className={`flex flex-col justify-between ${radiusClass} ${borderClass} ${spacingClass} bg-white dark:bg-zinc-900 shadow-sm transition-all duration-200 hover:shadow-md focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 ${
        onTestimonialClick ? "cursor-pointer" : ""
      }`}
    >
      {/* Top Header: Customer details and audio badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {showAvatar && (
              <WidgetAvatar
                avatarUrl={testimonial.customer?.avatarUrl}
                name={testimonial.customer?.name || "Customer"}
                size="md"
              />
            )}
            <span
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-xs"
              style={{ backgroundColor: brandColor }}
            >
              <Mic size={10} />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-ink-900 dark:text-zinc-100 truncate">
                {testimonial.customer?.name}
              </span>
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            </div>
            {showCompany && (testimonial.customer?.title || testimonial.customer?.company) && (
              <p className="text-xs text-ink-500 dark:text-zinc-400 truncate mt-0.5">
                {testimonial.customer?.title}
                {testimonial.customer?.title && testimonial.customer?.company && " • "}
                {testimonial.customer?.company}
              </p>
            )}
          </div>
        </div>

        {showRatings && testimonial.rating !== null && testimonial.rating > 0 && (
          <div className="shrink-0 pt-0.5">
            <WidgetRating rating={testimonial.rating} size="xs" accentColor={brandColor} />
          </div>
        )}
      </div>

      {/* Featured Pill */}
      {testimonial.isFeatured && showFeaturedBadge && (
        <div className="mb-2.5">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase"
            style={{
              backgroundColor: `${brandColor}15`,
              color: brandColor,
            }}
          >
            <Sparkles size={10} />
            Featured Audio
          </span>
        </div>
      )}

      {/* Interactive Audio Player Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="p-3.5 rounded-xl bg-warm-50/80 dark:bg-zinc-800/60 border border-line/60 dark:border-zinc-800 mb-3 space-y-2.5"
      >
        {audioUrl && !hasError && (
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            onLoadedMetadata={() => {
              if (audioRef.current) setDuration(audioRef.current.duration);
            }}
            onTimeUpdate={() => {
              if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            onError={() => setHasError(true)}
          />
        )}

        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={!audioUrl || hasError}
            aria-label={isPlaying ? "Pause audio" : "Play audio testimonial"}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm transition-transform hover:scale-105 active:scale-95 shrink-0 disabled:opacity-50"
            style={{ backgroundColor: brandColor }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>

          {/* Soundwave equalizer bars simulation */}
          <div className="flex-1 flex items-center gap-1 h-8 px-2 overflow-hidden">
            {waveHeights.map((h, i) => {
              const active = isPlaying;
              const barHeight = active
                ? `${Math.max(20, (h * (0.6 + Math.sin(currentTime * 4 + i) * 0.4)))}%`
                : `${h * 0.5}%`;

              return (
                <div
                  key={i}
                  className="w-1 rounded-full transition-all duration-150"
                  style={{
                    height: barHeight,
                    backgroundColor:
                      (currentTime / (duration || 1)) * waveHeights.length > i
                        ? brandColor
                        : `${brandColor}40`,
                  }}
                />
              );
            })}
          </div>

          {/* Controls: Speed & Mute */}
          <div className="flex items-center gap-1.5 shrink-0 text-ink-600 dark:text-zinc-300">
            <button
              type="button"
              onClick={cycleSpeed}
              aria-label="Change playback speed"
              className="px-1.5 py-1 rounded text-[10px] font-bold hover:bg-warm-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {playbackRate}x
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="p-1 rounded hover:bg-warm-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>

        {/* Audio Scrubber Timeline & Timestamp */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            disabled={!audioUrl || hasError}
            aria-label="Audio progress scrubber"
            className="w-full h-1 bg-warm-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />

          <div className="flex items-center justify-between text-[10px] font-mono text-ink-400 dark:text-zinc-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Transcript text snippet */}
      <blockquote className="text-xs leading-relaxed text-ink-700 dark:text-zinc-300 whitespace-pre-line mb-3 italic">
        "{testimonial.content}"
      </blockquote>

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
    </article>
  );
}

export function WidgetAudio({
  testimonials,
  config = {},
  className = "",
  onTestimonialClick,
}: WidgetAudioProps) {
  const {
    cardsPerRow = 2,
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

  const gapClass =
    cardSpacing === "compact"
      ? "gap-3.5"
      : cardSpacing === "spacious"
      ? "gap-7"
      : "gap-5";

  const gridColsClass =
    cardsPerRow === 1
      ? "grid-cols-1 max-w-xl mx-auto"
      : "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto";

  return (
    <div
      role="region"
      aria-label="Customer Audio Testimonials"
      className={`grid ${gapClass} ${gridColsClass} ${className}`}
    >
      {testimonials.map((t) => (
        <AudioPlayerCard
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
