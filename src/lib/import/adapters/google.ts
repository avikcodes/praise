import type { ExternalSourceAdapter, NormalizedImportItem } from "../external-types.ts";
import { extractRowsFromPayload } from "./adapter-utils.ts";

export class GoogleReviewsAdapter implements ExternalSourceAdapter {
  id = "GOOGLE" as const;
  name = "Google Reviews";
  category = "REVIEW_PLATFORM" as const;
  description = "Import verified reviews from your Google Business Profile via official Places API or Google Takeout / CSV exports.";
  icon = "google";
  color = "#4285F4";
  supportsAutomatedApi = true;
  apiRequirementNote = "Requires an authorized Google Cloud Places API key and your business Place ID.";
  apiConfigFields = [
    {
      key: "apiKey",
      label: "Google Places API Key",
      type: "password" as const,
      required: true,
      placeholder: "AIzaSy...",
      description: "API key from Google Cloud Console with Places API enabled.",
    },
    {
      key: "placeId",
      label: "Google Business Place ID",
      type: "text" as const,
      required: true,
      placeholder: "ChIJ...",
      description: "Find your Place ID in Google Place ID Finder.",
    },
  ];
  supportedInputTypes = ["OFFICIAL_API" as const, "STRUCTURED_FILE" as const, "PASTE_DATA" as const];

  defaultFieldMappings = {
    content: "text",
    authorName: "author_name",
    authorAvatarUrl: "profile_photo_url",
    rating: "rating",
    sourceUrl: "author_url",
    originalDate: "time",
  };

  parse(payload: unknown, customMappings?: Record<string, string>): NormalizedImportItem[] {
    const rawList = extractRowsFromPayload(payload);
    const items: NormalizedImportItem[] = [];

    for (let i = 0; i < rawList.length; i++) {
      const row = rawList[i];
      if (!row || typeof row !== "object") continue;

      const content =
        row.text ||
        row.content ||
        row.Review ||
        row.review ||
        row.comment ||
        row["Review Text"] ||
        "";

      if (!content || !String(content).trim()) continue;

      const authorName =
        row.author_name ||
        row.authorName ||
        row.name ||
        row.Reviewer ||
        row["Reviewer Name"] ||
        row.reviewer ||
        "Google Reviewer";

      const rawRating =
        row.rating ||
        row.Rating ||
        row["Star Rating"] ||
        row.stars ||
        row.score;
      let rating: number | null = null;
      if (rawRating !== undefined && rawRating !== null) {
        const parsed = Number(rawRating);
        if (!isNaN(parsed)) {
          rating = Math.max(1, Math.min(5, Math.round(parsed)));
        }
      }

      let originalDate: string | null = null;
      if (row.time) {
        // Unix timestamp in seconds or ms
        const ts = Number(row.time);
        if (!isNaN(ts)) {
          originalDate = new Date(ts > 1e11 ? ts : ts * 1000).toISOString();
        }
      } else if (row.date || row.Date || row.created_time) {
        const d = new Date(row.date || row.Date || row.created_time);
        if (!isNaN(d.getTime())) {
          originalDate = d.toISOString();
        }
      }

      items.push({
        externalId: row.id || row.review_id || `google-${Date.now()}-${i}`,
        content: String(content).trim(),
        authorName: String(authorName).trim(),
        authorAvatarUrl: row.profile_photo_url || row.authorAvatarUrl || row.avatar || null,
        authorCompany: row.company || null,
        rating: rating ?? 5,
        originalRating: rawRating ?? "5/5",
        sourcePlatform: "GOOGLE",
        sourceUrl: row.author_url || row.sourceUrl || row["Review URL"] || row.url || null,
        originalDate,
        rawRecord: row,
      });
    }

    return items;
  }

  async fetch(credentials: Record<string, string>, params: Record<string, string>): Promise<NormalizedImportItem[]> {
    const { apiKey, placeId } = credentials;
    if (!apiKey || !placeId) {
      throw new Error("Both Google Places API Key and Place ID are required.");
    }

    const endpoint = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=name,rating,reviews&key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`Google Places API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.status !== "OK") {
      throw new Error(`Google Places API Error: ${json.error_message || json.status}`);
    }

    return this.parse(json);
  }
}
