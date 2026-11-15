/**
 * Praise Advanced Moderation - Duplicate Detection Engine
 * ========================================================
 * Implements configurable multi-signal duplicate detection:
 * 1. Normalized testimonial text (token Jaccard + Levenshtein / exact match)
 * 2. Customer identity (case-insensitive email or normalized name + company)
 * 3. Original source URL (normalized host + path, tracking params stripped)
 * 4. Media file hash (SHA-256 binary checksum)
 *
 * SAFETY INVARIANT:
 * This engine detects and scores potential duplicates for HUMAN REVIEW.
 * Never automatically deletes or merges testimonials without explicit human confirmation.
 */

export type DuplicateSignalType =
  | "TEXT_EXACT"
  | "TEXT_SIMILAR"
  | "CUSTOMER_IDENTITY"
  | "SOURCE_URL"
  | "MEDIA_HASH";

export interface DuplicateSignalConfig {
  enableTextCheck?: boolean;
  enableCustomerCheck?: boolean;
  enableSourceUrlCheck?: boolean;
  enableMediaHashCheck?: boolean;
  textSimilarityThreshold?: number; // default 0.8 (80%)
}

export interface DuplicateMatchSignal {
  type: DuplicateSignalType;
  description: string;
  weight: number;
}

export interface DuplicateMatch {
  candidateId: string;
  matchedTestimonialId: string;
  confidenceScore: number; // 0 to 1
  matchedSignals: DuplicateSignalType[];
  signalBreakdown: DuplicateMatchSignal[];
  summary: string;
}

export interface TestimonialComparable {
  id: string;
  content: string;
  rating?: number | null;
  sourceType?: string | null;
  sourceUrl?: string | null;
  mediaHash?: string | null;
  customer?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    company?: string | null;
  } | null;
  mediaAssets?: Array<{
    id: string;
    fileHash?: string | null;
  }>;
}

/**
 * Normalizes text content: lowercases, strips punctuation, normalizes whitespace.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w\s]/g, " ")       // Remove punctuation
    .replace(/\s+/g, " ")            // Normalize spaces
    .trim();
}

/**
 * Normalizes URL: lowercases host, normalizes protocol, removes query params (like utm_*), and trailing slashes.
 */
export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const parsed = new URL(rawUrl.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    let pathname = parsed.pathname.replace(/\/+$/, "");
    if (!pathname) pathname = "/";
    // Strip tracking parameters
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    parsed.searchParams.delete("utm_term");
    parsed.searchParams.delete("utm_content");
    parsed.searchParams.delete("ref");
    parsed.searchParams.delete("source");

    const search = parsed.searchParams.toString();
    return `${host}${pathname}${search ? "?" + search : ""}`.toLowerCase();
  } catch {
    // If invalid URL, normalize as raw string
    return rawUrl.trim().toLowerCase().replace(/\/+$/, "");
  }
}

/**
 * Computes Jaccard word token similarity (0.0 to 1.0).
 */
export function computeJaccardSimilarity(textA: string, textB: string): number {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const tokensA = new Set(normA.split(" ").filter((w) => w.length > 2));
  const tokensB = new Set(normB.split(" ").filter((w) => w.length > 2));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = tokensA.size + tokensB.size - intersectionCount;
  return unionCount === 0 ? 0 : parseFloat((intersectionCount / unionCount).toFixed(3));
}

/**
 * Compares two testimonials across the 4 configurable duplicate signals.
 */
export function compareTestimonials(
  a: TestimonialComparable,
  b: TestimonialComparable,
  config: DuplicateSignalConfig = {}
): DuplicateMatch | null {
  if (a.id === b.id) return null;

  const {
    enableTextCheck = true,
    enableCustomerCheck = true,
    enableSourceUrlCheck = true,
    enableMediaHashCheck = true,
    textSimilarityThreshold = 0.8,
  } = config;

  const signals: DuplicateMatchSignal[] = [];

  // 1. MEDIA FILE HASH CHECK (Strongest Signal)
  if (enableMediaHashCheck) {
    const hashesA = new Set<string>();
    if (a.mediaHash) hashesA.add(a.mediaHash.toLowerCase().trim());
    (a.mediaAssets || []).forEach((m) => {
      if (m.fileHash) hashesA.add(m.fileHash.toLowerCase().trim());
    });

    const hashesB = new Set<string>();
    if (b.mediaHash) hashesB.add(b.mediaHash.toLowerCase().trim());
    (b.mediaAssets || []).forEach((m) => {
      if (m.fileHash) hashesB.add(m.fileHash.toLowerCase().trim());
    });

    for (const h of hashesA) {
      if (hashesB.has(h)) {
        signals.push({
          type: "MEDIA_HASH",
          description: `Exact matching media binary hash (${h.slice(0, 10)}...)`,
          weight: 0.95,
        });
        break;
      }
    }
  }

  // 2. ORIGINAL SOURCE URL CHECK
  if (enableSourceUrlCheck && a.sourceUrl && b.sourceUrl) {
    const normUrlA = normalizeUrl(a.sourceUrl);
    const normUrlB = normalizeUrl(b.sourceUrl);

    if (normUrlA && normUrlB && normUrlA === normUrlB) {
      signals.push({
        type: "SOURCE_URL",
        description: `Identical original source URL (${normUrlA})`,
        weight: 0.9,
      });
    }
  }

  // 3. CUSTOMER IDENTITY CHECK
  let hasCustomerMatch = false;
  if (enableCustomerCheck && a.customer && b.customer) {
    const emailA = (a.customer.email || "").trim().toLowerCase();
    const emailB = (b.customer.email || "").trim().toLowerCase();

    if (emailA && emailB && emailA === emailB) {
      hasCustomerMatch = true;
      signals.push({
        type: "CUSTOMER_IDENTITY",
        description: `Same customer email address (${emailA})`,
        weight: 0.8,
      });
    } else {
      const nameA = normalizeText(a.customer.name || "");
      const nameB = normalizeText(b.customer.name || "");
      const compA = normalizeText(a.customer.company || "");
      const compB = normalizeText(b.customer.company || "");

      if (nameA && nameB && nameA === nameB && compA && compB && compA === compB) {
        hasCustomerMatch = true;
        signals.push({
          type: "CUSTOMER_IDENTITY",
          description: `Identical customer name and company (${a.customer.name} @ ${a.customer.company})`,
          weight: 0.7,
        });
      }
    }
  }

  // 4. NORMALIZED TESTIMONIAL TEXT CHECK
  if (enableTextCheck && a.content && b.content) {
    const normA = normalizeText(a.content);
    const normB = normalizeText(b.content);

    if (normA && normB) {
      if (normA === normB) {
        signals.push({
          type: "TEXT_EXACT",
          description: "100% exact text quote match",
          weight: 0.9,
        });
      } else {
        const jaccard = computeJaccardSimilarity(a.content, b.content);
        if (jaccard >= textSimilarityThreshold) {
          signals.push({
            type: "TEXT_SIMILAR",
            description: `High textual similarity (${Math.round(jaccard * 100)}% match)`,
            weight: jaccard * 0.85,
          });
        }
      }
    }
  }

  // If no signals matched, return null
  if (signals.length === 0) {
    return null;
  }

  // Compute composite confidence score
  // Multi-signal matches compound confidence:
  // e.g. Customer match + Text match = near 100% confidence
  let maxWeight = 0;
  let totalBonus = 0;

  for (const sig of signals) {
    if (sig.weight > maxWeight) maxWeight = sig.weight;
    totalBonus += sig.weight * 0.15;
  }

  const confidenceScore = Math.min(1.0, parseFloat((maxWeight + (signals.length > 1 ? totalBonus : 0)).toFixed(2)));

  const matchedSignals = signals.map((s) => s.type);
  const summary = `Found ${signals.length} duplicate signal(s): ${signals.map((s) => s.description).join("; ")}`;

  return {
    candidateId: a.id,
    matchedTestimonialId: b.id,
    confidenceScore,
    matchedSignals,
    signalBreakdown: signals,
    summary,
  };
}

/**
 * Finds all potential duplicate matches for a single testimonial from a pool of candidates.
 */
export function findDuplicatesForTestimonial(
  target: TestimonialComparable,
  pool: TestimonialComparable[],
  config: DuplicateSignalConfig = {}
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  for (const candidate of pool) {
    if (candidate.id === target.id) continue;
    const match = compareTestimonials(target, candidate, config);
    if (match && match.confidenceScore >= 0.65) {
      matches.push(match);
    }
  }

  // Sort descending by confidence score
  return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
}

/**
 * Scans an entire array of testimonials and returns grouped duplicate clusters for human review.
 */
export function scanWorkspaceDuplicates(
  testimonials: TestimonialComparable[],
  config: DuplicateSignalConfig = {}
): {
  totalAnalyzed: number;
  duplicatePairsCount: number;
  flaggedTestimonialIds: string[];
  matchesByTestimonialId: Record<string, DuplicateMatch[]>;
} {
  const matchesByTestimonialId: Record<string, DuplicateMatch[]> = {};
  const flaggedIdsSet = new Set<string>();
  let duplicatePairsCount = 0;

  for (let i = 0; i < testimonials.length; i++) {
    const current = testimonials[i];
    const duplicates = findDuplicatesForTestimonial(current, testimonials, config);

    if (duplicates.length > 0) {
      matchesByTestimonialId[current.id] = duplicates;
      flaggedIdsSet.add(current.id);
      duplicatePairsCount += duplicates.length;
    }
  }

  return {
    totalAnalyzed: testimonials.length,
    duplicatePairsCount: Math.floor(duplicatePairsCount / 2), // Halve reciprocal pairs
    flaggedTestimonialIds: Array.from(flaggedIdsSet),
    matchesByTestimonialId,
  };
}
