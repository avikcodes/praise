import { parseCsvToRows } from "../csv-parser.ts";

/**
 * Universal payload normalizer for review platform adapters.
 * Extracts an array of review records whether the input is:
 * - A JavaScript array of objects
 * - A raw JSON string
 * - A CSV string (using RFC 4180 CSV parser)
 * - An API wrapper object (e.g. { result: { reviews: [...] } }, { data: [...] })
 */
export function extractRowsFromPayload(
  payload: unknown,
  candidateKeys: string[] = []
): Record<string, any>[] {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload as Record<string, any>[];
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractRowsFromPayload(parsed, candidateKeys);
      } catch {
        // Fall back to CSV parsing below
      }
    }
    const { rows } = parseCsvToRows(trimmed);
    return rows;
  }

  if (typeof payload === "object") {
    const obj = payload as Record<string, any>;
    for (const key of candidateKeys) {
      if (Array.isArray(obj[key])) {
        return obj[key];
      }
    }

    // Common response wrapper properties across platforms
    if (Array.isArray(obj.result?.reviews)) return obj.result.reviews;
    if (Array.isArray(obj.reviews)) return obj.reviews;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.recommendations)) return obj.recommendations;
    if (Array.isArray(obj.elements)) return obj.elements;
  }

  return [];
}
