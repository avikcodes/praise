"use client";

import { useState } from "react";

type WidgetAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const COLOR_PALETTES = [
  { bg: "bg-purple-100 dark:bg-purple-950/60", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
  { bg: "bg-indigo-100 dark:bg-indigo-950/60", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800" },
  { bg: "bg-blue-100 dark:bg-blue-950/60", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  { bg: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  { bg: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  { bg: "bg-rose-100 dark:bg-rose-950/60", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800" },
];

function getInitials(name: string): string {
  if (!name || !name.trim()) return "CU";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPaletteIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % COLOR_PALETTES.length;
}

export function WidgetAvatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
}: WidgetAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
    xl: "h-14 w-14 text-base",
  }[size];

  const palette = COLOR_PALETTES[getPaletteIndex(name || "User")];
  const initials = getInitials(name);

  if (avatarUrl && !hasError) {
    return (
      <div
        className={`relative inline-block shrink-0 rounded-full overflow-hidden border border-black/10 dark:border-white/10 bg-warm-100 ${sizeClasses} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={name ? `${name}'s avatar` : "Customer avatar"}
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-label={name ? `${name}'s profile avatar` : "Customer avatar"}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full font-bold uppercase select-none border ${palette.bg} ${palette.text} ${palette.border} ${sizeClasses} ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
}

