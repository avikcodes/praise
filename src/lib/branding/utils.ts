import {
  WidgetCardBorder,
  WidgetCardRadius,
  WidgetCardSpacing,
  WidgetTypographyFamily,
  WidgetThemeMode,
} from "@/types/widgets";

export const PRESET_ACCENT_COLORS = [
  { label: "Praise Purple", value: "#7049D8" },
  { label: "Royal Blue", value: "#2563EB" },
  { label: "Emerald Green", value: "#059669" },
  { label: "Warm Amber", value: "#D97706" },
  { label: "Rose Pink", value: "#E11D48" },
  { label: "Deep Slate", value: "#475569" },
  { label: "Indigo Mist", value: "#6366F1" },
  { label: "Teal Cyan", value: "#0D9488" },
];

export const PRESET_SECONDARY_COLORS = [
  { label: "Emerald", value: "#10B981" },
  { label: "Amber Gold", value: "#F59E0B" },
  { label: "Sky Blue", value: "#0EA5E9" },
  { label: "Violet Accent", value: "#8B5CF6" },
  { label: "Slate Gray", value: "#64748B" },
  { label: "Coral Red", value: "#F43F5E" },
];

export const SUPPORTED_FONTS = [
  {
    id: "sans" as WidgetTypographyFamily,
    label: "Modern Sans",
    description: "Clean, neutral, and highly readable on all screens",
    fontStack: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: "serif" as WidgetTypographyFamily,
    label: "Editorial Serif",
    description: "Classic, trustworthy, and sophisticated literature aesthetic",
    fontStack: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
  },
  {
    id: "mono" as WidgetTypographyFamily,
    label: "Clean Mono",
    description: "Technical, modern, and developer-friendly",
    fontStack: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  {
    id: "geometric" as WidgetTypographyFamily,
    label: "Geometric Sans",
    description: "Friendly, balanced, and modern product typography",
    fontStack: "'Avenir Next', 'Century Gothic', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  {
    id: "humanist" as WidgetTypographyFamily,
    label: "Humanist Sans",
    description: "Warm, open, and accessible with natural character proportions",
    fontStack: "'Segoe UI', Candara, 'Bitstream Vera Sans', 'DejaVu Sans', 'Trebuchet MS', Verdana, sans-serif",
  },
];

/**
 * Validates and normalizes hex color code
 */
export function validateHexColor(color: unknown, fallback = "#7049D8"): string {
  if (typeof color !== "string") return fallback;
  const clean = color.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(clean)) return clean;
  if (/^#[0-9A-F]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return fallback;
}

/**
 * Converts Hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = validateHexColor(hex);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(clean);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculates WCAG 2.1 relative luminance for a color channel
 */
function getChannelLuminance(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

/**
 * Calculates relative luminance of RGB
 */
function getLuminance(r: number, g: number, b: number): number {
  return (
    0.2126 * getChannelLuminance(r) +
    0.7152 * getChannelLuminance(g) +
    0.0722 * getChannelLuminance(b)
  );
}

/**
 * Calculates WCAG contrast ratio between foreground and background colors
 */
export function calculateContrast(
  foregroundHex: string,
  backgroundHex: string
): {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  formattedRatio: string;
} {
  const fg = hexToRgb(foregroundHex) || { r: 0, g: 0, b: 0 };
  const bg = hexToRgb(backgroundHex) || { r: 255, g: 255, b: 255 };

  const l1 = getLuminance(fg.r, fg.g, fg.b);
  const l2 = getLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  const rounded = Math.round(ratio * 10) / 10;

  return {
    ratio: rounded,
    passesAA: rounded >= 4.5,
    passesAAA: rounded >= 7.0,
    formattedRatio: `${rounded.toFixed(1)}:1`,
  };
}

/**
 * Returns native CSS font-family stack for a font identifier
 */
export function getFontFamilyCss(family?: WidgetTypographyFamily): string {
  const match = SUPPORTED_FONTS.find((f) => f.id === family);
  return match ? match.fontStack : SUPPORTED_FONTS[0].fontStack;
}

/**
 * Returns CSS classes for card border styles
 */
export function getCardBorderClasses(
  border?: WidgetCardBorder,
  isDark = false
): string {
  switch (border) {
    case "none":
      return isDark ? "border-0 shadow-sm" : "border-0 shadow-sm";
    case "prominent":
      return isDark
        ? "border-2 border-zinc-700 shadow-md"
        : "border-2 border-zinc-300 shadow-sm";
    case "dashed":
      return isDark
        ? "border border-dashed border-zinc-700"
        : "border border-dashed border-zinc-300";
    case "subtle":
    default:
      return isDark
        ? "border border-zinc-800 shadow-xs"
        : "border border-line shadow-xs";
  }
}

/**
 * Returns CSS classes for card corner radius
 */
export function getCardRadiusClasses(radius?: WidgetCardRadius): string {
  switch (radius) {
    case "none":
      return "rounded-none";
    case "small":
      return "rounded-lg";
    case "large":
      return "rounded-2xl";
    case "full":
      return "rounded-3xl";
    case "medium":
    default:
      return "rounded-xl";
  }
}

/**
 * Returns CSS classes for card internal padding and spacing
 */
export function getCardSpacingClasses(spacing?: WidgetCardSpacing): string {
  switch (spacing) {
    case "compact":
      return "p-3.5 sm:p-4 gap-2.5";
    case "spacious":
      return "p-6 sm:p-8 gap-5";
    case "normal":
    default:
      return "p-5 sm:p-6 gap-4";
  }
}

/**
 * Sanitizes and validates a full branding configuration
 */
export function sanitizeBrandingConfig(input: Record<string, unknown> = {}) {
  const primaryColor = validateHexColor(input.primaryColor || input.accentColor, "#7049D8");
  const secondaryColor = validateHexColor(input.secondaryColor, "#10B981");

  const validFonts: WidgetTypographyFamily[] = [
    "sans",
    "serif",
    "mono",
    "geometric",
    "humanist",
  ];
  const fontFamily: WidgetTypographyFamily = validFonts.includes(
    input.fontFamily as WidgetTypographyFamily
  )
    ? (input.fontFamily as WidgetTypographyFamily)
    : "sans";

  const validThemes: WidgetThemeMode[] = [
    "warm",
    "light",
    "dark",
    "transparent",
    "auto",
  ];
  const theme: WidgetThemeMode = validThemes.includes(
    input.theme as WidgetThemeMode
  )
    ? (input.theme as WidgetThemeMode)
    : "warm";

  const validBorders: WidgetCardBorder[] = [
    "subtle",
    "prominent",
    "dashed",
    "none",
  ];
  const cardBorder: WidgetCardBorder = validBorders.includes(
    input.cardBorder as WidgetCardBorder
  )
    ? (input.cardBorder as WidgetCardBorder)
    : "subtle";

  const validRadii: WidgetCardRadius[] = [
    "none",
    "small",
    "medium",
    "large",
    "full",
  ];
  const cardRadius: WidgetCardRadius = validRadii.includes(
    input.cardRadius as WidgetCardRadius
  )
    ? (input.cardRadius as WidgetCardRadius)
    : "medium";

  const validSpacings: WidgetCardSpacing[] = ["compact", "normal", "spacious"];
  const cardSpacing: WidgetCardSpacing = validSpacings.includes(
    input.cardSpacing as WidgetCardSpacing
  )
    ? (input.cardSpacing as WidgetCardSpacing)
    : "normal";

  const showPraiseBranding =
    typeof input.showPraiseBranding === "boolean"
      ? input.showPraiseBranding
      : true;

  const logoUrl =
    typeof input.logoUrl === "string" && input.logoUrl.trim()
      ? input.logoUrl.trim()
      : null;

  const backgroundColor =
    typeof input.backgroundColor === "string" && input.backgroundColor.trim()
      ? validateHexColor(input.backgroundColor)
      : null;

  const textColor =
    typeof input.textColor === "string" && input.textColor.trim()
      ? validateHexColor(input.textColor)
      : null;

  return {
    primaryColor,
    secondaryColor,
    fontFamily,
    theme,
    cardBorder,
    cardRadius,
    cardSpacing,
    showPraiseBranding,
    logoUrl,
    backgroundColor,
    textColor,
  };
}

