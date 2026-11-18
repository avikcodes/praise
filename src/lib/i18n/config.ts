export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  dateLocale: string;
  numberLocale: string;
  flag: string;
}

export const DEFAULT_LANGUAGE = "en";

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    dir: "ltr",
    dateLocale: "en-US",
    numberLocale: "en-US",
    flag: "🇺🇸",
  },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    dir: "ltr",
    dateLocale: "es-ES",
    numberLocale: "es-ES",
    flag: "🇪🇸",
  },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    dir: "ltr",
    dateLocale: "fr-FR",
    numberLocale: "fr-FR",
    flag: "🇫🇷",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    dir: "ltr",
    dateLocale: "de-DE",
    numberLocale: "de-DE",
    flag: "🇩🇪",
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    dir: "ltr",
    dateLocale: "pt-BR",
    numberLocale: "pt-BR",
    flag: "🇧🇷",
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    dir: "ltr",
    dateLocale: "it-IT",
    numberLocale: "it-IT",
    flag: "🇮🇹",
  },
  {
    code: "nl",
    name: "Dutch",
    nativeName: "Nederlands",
    dir: "ltr",
    dateLocale: "nl-NL",
    numberLocale: "nl-NL",
    flag: "🇳🇱",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    dir: "ltr",
    dateLocale: "ja-JP",
    numberLocale: "ja-JP",
    flag: "🇯🇵",
  },
  {
    code: "zh",
    name: "Chinese (Simplified)",
    nativeName: "简体中文",
    dir: "ltr",
    dateLocale: "zh-CN",
    numberLocale: "zh-CN",
    flag: "🇨🇳",
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    dir: "ltr",
    dateLocale: "ko-KR",
    numberLocale: "ko-KR",
    flag: "🇰🇷",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    dir: "rtl",
    dateLocale: "ar-SA",
    numberLocale: "ar-SA",
    flag: "🇸🇦",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    dir: "ltr",
    dateLocale: "hi-IN",
    numberLocale: "hi-IN",
    flag: "🇮🇳",
  },
];

export const LANGUAGE_MAP = new Map<string, LanguageConfig>(
  SUPPORTED_LANGUAGES.map((lang) => [lang.code, lang])
);

export function getLanguageConfig(code?: string | null): LanguageConfig {
  if (!code) return LANGUAGE_MAP.get(DEFAULT_LANGUAGE)!;
  const normalized = code.toLowerCase().split("-")[0].trim();
  return LANGUAGE_MAP.get(normalized) || LANGUAGE_MAP.get(DEFAULT_LANGUAGE)!;
}

export function isValidLanguageCode(code: string): boolean {
  const normalized = code.toLowerCase().split("-")[0].trim();
  return LANGUAGE_MAP.has(normalized);
}

/**
 * Format a date in a locale-aware manner
 */
export function formatDate(
  date: Date | string | number,
  localeCode: string = DEFAULT_LANGUAGE,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = typeof date === "object" ? date : new Date(date);
    const lang = getLanguageConfig(localeCode);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...options,
    };
    return new Intl.DateTimeFormat(lang.dateLocale, defaultOptions).format(d);
  } catch {
    return String(date);
  }
}

/**
 * Format a number in a locale-aware manner
 */
export function formatNumber(
  num: number,
  localeCode: string = DEFAULT_LANGUAGE,
  options?: Intl.NumberFormatOptions
): string {
  try {
    const lang = getLanguageConfig(localeCode);
    return new Intl.NumberFormat(lang.numberLocale, options).format(num);
  } catch {
    return String(num);
  }
}

/**
 * Format a relative time (e.g. "2 days ago") in a locale-aware manner
 */
export function formatRelativeTime(
  date: Date | string | number,
  localeCode: string = DEFAULT_LANGUAGE
): string {
  try {
    const d = typeof date === "object" ? date : new Date(date);
    const lang = getLanguageConfig(localeCode);
    const now = new Date();
    const diffSeconds = Math.round((d.getTime() - now.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(lang.dateLocale, { numeric: "auto" });

    const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];
    const units: Intl.RelativeTimeFormatUnit[] = ["second", "minute", "hour", "day", "week", "month", "year"];
    const unitIndex = cutoffs.findIndex((cutoff) => Math.abs(diffSeconds) < cutoff);
    const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;

    return rtf.format(Math.round(diffSeconds / divisor), units[unitIndex]);
  } catch {
    return formatDate(date, localeCode);
  }
}
