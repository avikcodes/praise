import type { ExternalSourceAdapter, NormalizedImportItem } from "../external-types.ts";
import { extractRowsFromPayload } from "./adapter-utils.ts";

export class TrustpilotAdapter implements ExternalSourceAdapter {
  id = "TRUSTPILOT" as const;
  name = "Trustpilot Reviews";
  category = "REVIEW_PLATFORM" as const;
  description = "Import customer reviews from Trustpilot via official Trustpilot Business API or Trustpilot Business Portal CSV exports.";
  icon = "trustpilot";
  color = "#00B67A";
  supportsAutomatedApi = true;
  apiRequirementNote = "Requires a Trustpilot Business API Key and your Business Unit ID from businessapp.trustpilot.com.";
  apiConfigFields = [
    {
      key: "apiKey",
      label: "Trustpilot API Key",
      type: "password" as const,
      required: true,
      placeholder: "tp_live_...",
      description: "API Key from Trustpilot Business > Integrations > APIs.",
    },
    {
      key: "businessUnitId",
      label: "Business Unit ID",
      type: "text" as const,
      required: true,
      placeholder: "4bf43...",
      description: "Your Trustpilot Business Unit ID.",
    },
  ];
  supportedInputTypes = ["OFFICIAL_API" as const, "STRUCTURED_FILE" as const, "PASTE_DATA" as const];

  defaultFieldMappings = {
    content: "text",
    authorName: "consumer.displayName",
    rating: "stars",
    sourceUrl: "reviewUrl",
    originalDate: "createdAt",
  };

  parse(payload: unknown): NormalizedImportItem[] {
    const list = extractRowsFromPayload(payload);
    const items: NormalizedImportItem[] = [];

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (!r || typeof r !== "object") continue;

      const title = r.title || r["Review Title"] || "";
      const text = r.text || r["Review Text"] || r.content || r.body || "";

      let content = text;
      if (title && !content.startsWith(title)) {
        content = `${title}\n\n${content}`;
      }

      if (!content || !String(content).trim()) continue;

      const authorName =
        r.consumer?.displayName ||
        r["Customer Name"] ||
        r.authorName ||
        r.name ||
        "Trustpilot Reviewer";

      const rawRating = r.stars || r["Star Rating"] || r.rating;
      let rating = 5;
      if (rawRating !== undefined && rawRating !== null) {
        const parsed = Number(rawRating);
        if (!isNaN(parsed)) rating = Math.max(1, Math.min(5, Math.round(parsed)));
      }

      let originalDate: string | null = null;
      const rawDate = r.createdAt || r.Date || r.date || r.created_at;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) originalDate = d.toISOString();
      }

      const email =
        r.referralEmail ||
        r.consumer?.email ||
        r.email ||
        r["Customer Email"] ||
        null;

      items.push({
        externalId: r.id || `tp-${Date.now()}-${i}`,
        content: String(content).trim(),
        authorName: String(authorName).trim(),
        authorEmail: email ? String(email).trim() : null,
        rating,
        originalRating: rawRating ? `${rawRating}/5 Stars` : "5/5 Stars",
        sourcePlatform: "TRUSTPILOT",
        sourceUrl: r.reviewUrl || r["Review Link"] || r.url || null,
        originalDate,
        rawRecord: r,
      });
    }

    return items;
  }

  async fetch(credentials: Record<string, string>): Promise<NormalizedImportItem[]> {
    const { apiKey, businessUnitId } = credentials;
    if (!apiKey || !businessUnitId) {
      throw new Error("Both Trustpilot API Key and Business Unit ID are required.");
    }

    const endpoint = `https://api.trustpilot.com/v1/business-units/${encodeURIComponent(
      businessUnitId
    )}/reviews?perPage=50`;

    const res = await fetch(endpoint, {
      headers: {
        apikey: apiKey.trim(),
      },
    });

    if (!res.ok) {
      throw new Error(`Trustpilot API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    return this.parse(json);
  }
}
