"use client";

import React, { useState, useRef, useEffect } from "react";
import { Loader2, Sparkles, ShieldCheck, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WheelClientOption {
  id: string;
  index: number;
  label: string;
  description?: string | null;
  rewardType: string;
  probabilityPercent: number;
  color: string;
}

interface RewardWheelProps {
  options: WheelClientOption[];
  claimToken: string;
  title?: string;
  description?: string;
  disclosureText?: string;
  accentColor?: string;
  onRewardWon: (reward: any) => void;
}

export function RewardWheel({
  options,
  claimToken,
  title = "Spin for Your Appreciation Reward",
  description = "Every review qualifies for an appreciation gift. Spin to reveal your reward, or view it directly.",
  disclosureText,
  accentColor = "#7049D8",
  onRewardWon,
}: RewardWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasSpun, setHasSpun] = useState(false);
  const wheelRef = useRef<SVGSVGElement | null>(null);

  const numOptions = Math.max(options.length, 2);
  const sliceAngle = 360 / numOptions;

  // Generate SVG path for a sector from center (140, 140) with radius 130
  const getSectorPath = (index: number) => {
    const cx = 140;
    const cy = 140;
    const r = 130;
    const startAngle = (index * sliceAngle * Math.PI) / 180;
    const endAngle = ((index + 1) * sliceAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const handleSpin = async (forceReveal = false) => {
    if (isSpinning || hasSpun) return;
    setError(null);
    setIsSpinning(true);

    try {
      const res = await fetch("/api/rewards/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimToken, forceReveal }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reveal your reward. Please try again.");
      }

      if (forceReveal) {
        setHasSpun(true);
        setIsSpinning(false);
        onRewardWon(data.reward);
        return;
      }

      // Animate the wheel
      const targetRotation = data.rotationDegrees || 1800;
      setRotation(targetRotation);

      // Wait for spin animation to complete (4.2 seconds)
      setTimeout(() => {
        setIsSpinning(false);
        setHasSpun(true);
        onRewardWon(data.reward);
      }, 4300);
    } catch (err: unknown) {
      setIsSpinning(false);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
  };

  return (
    <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-b from-white to-warm-50/80 p-5 sm:p-6 text-center max-w-sm sm:max-w-md mx-auto shadow-sm space-y-4">
      {/* Restrained, friendly header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-bold uppercase tracking-wider">
          <Sparkles size={11} className="text-brand-500" />
          <span>Appreciation Gift</span>
        </div>
        <h3 className="text-base sm:text-lg font-bold text-ink-900 leading-snug">
          {title}
        </h3>
        <p className="text-xs text-ink-500 leading-relaxed max-w-xs mx-auto">
          {description}
        </p>
      </div>

      {/* Wheel Container with Pointer */}
      <div className="relative mx-auto w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] flex items-center justify-center">
        {/* Top Center Pointer Arrow */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-md">
          <div className="w-5 h-6 bg-ink-900 rounded-b-sm flex items-center justify-center text-white border-2 border-white shadow-xs">
            <ArrowDown size={14} className="stroke-[3]" />
          </div>
        </div>

        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-ink-100 shadow-inner" />

        {/* SVG Wheel */}
        <svg
          ref={wheelRef}
          viewBox="0 0 280 280"
          className="w-full h-full transition-transform"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: isSpinning ? "4200ms" : "0ms",
            transitionTimingFunction: "cubic-bezier(0.15, 0.9, 0.2, 1)",
          }}
        >
          {options.map((opt, i) => {
            const midAngle = (i + 0.5) * sliceAngle;
            // Radius for text placement
            const textRadius = 78;
            const textX = 140 + textRadius * Math.cos((midAngle * Math.PI) / 180);
            const textY = 140 + textRadius * Math.sin((midAngle * Math.PI) / 180);

            return (
              <g key={opt.id || i}>
                <path
                  d={getSectorPath(i)}
                  fill={opt.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-colors hover:brightness-105"
                />
                <text
                  x={textX}
                  y={textY}
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                  className="select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                >
                  {opt.label.length > 15 ? `${opt.label.slice(0, 13)}…` : opt.label}
                </text>
              </g>
            );
          })}

          {/* Center Hub */}
          <circle cx="140" cy="140" r="24" fill="#ffffff" stroke="#E2E8F0" strokeWidth="3" />
          <circle cx="140" cy="140" r="16" fill={accentColor} />
          <circle cx="140" cy="140" r="6" fill="#ffffff" />
        </svg>
      </div>

      {error && (
        <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5 font-medium">
          {error}
        </div>
      )}

      {/* Action Controls */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          disabled={isSpinning || hasSpun}
          onClick={() => handleSpin(false)}
          style={{ backgroundColor: accentColor }}
          className={cn(
            "w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2",
            isSpinning || hasSpun
              ? "opacity-75 cursor-not-allowed"
              : "hover:opacity-95 hover:scale-[1.01] active:scale-[0.99]"
          )}
        >
          {isSpinning ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Selecting your reward...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Spin the Wheel</span>
            </>
          )}
        </button>

        {/* Accessible Direct Reveal for customers who prefer no animation */}
        {!isSpinning && !hasSpun && (
          <button
            type="button"
            onClick={() => handleSpin(true)}
            className="text-[11px] text-ink-500 hover:text-ink-800 underline transition-colors"
          >
            Skip animation & reveal reward directly
          </button>
        )}
      </div>

      {/* Legal & FTC Disclosure */}
      <div className="pt-2 border-t border-brand-200/60 flex items-start gap-1.5 text-[10px] text-ink-400 text-left leading-normal">
        <ShieldCheck size={12} className="text-brand-600 shrink-0 mt-0.5" />
        <span>
          {disclosureText ||
            "This reward is offered for submitting your honest review. Praise never conditions rewards on positive ratings or alters customer feedback."}
        </span>
      </div>
    </div>
  );
}
