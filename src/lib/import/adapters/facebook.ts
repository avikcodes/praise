import type { ExternalSourceAdapter, NormalizedImportItem } from "../external-types.ts";
import { extractRowsFromPayload } from "./adapter-utils.ts";

export class FacebookReviewsAdapter implements ExternalSourceAdapter {
  id = "FACEBOOK" as const;
  name = "Facebook Page Reviews";
  category = "SOCIAL_NETWORK" as const;
  description = "Import customer recommendations and ratings from your verified Facebook Business Page.";
  icon = "facebook";
  color = "#1877F2";
  supportsAutomatedApi = true;
  apiRequirementNote = "Requires a Meta Graph API Page Access Token with `pages_read_engagement` and `pages_read_user_content` permissions.";
  apiConfigFields = [
    {
      key: "pageAccessToken",
      label: "Facebook Page Access Token",
      type: "password" as const,
      required: true,
      placeholder: "EAAB...",
      description: "Page Access Token from Meta Developer Portal.",
    },
    {
      key: "pageId",
      label: "Facebook Page ID",
      type: "text" as const,
      required: true,
      placeholder: "109823...",
      description: "Numeric Page ID of your business page.",
    },
  ];
  supportedInputTypes = ["OFFICIAL_API" as const, "STRUCTURED_FILE" as const, "PASTE_DATA" as const];

  defaultFieldMappings = {
    content: "review_text",
    authorName: "reviewer.name",
    rating: "rating",
    sourceUrl: "url",
    originalDate: "created_time",
  };

  parse(payload: unknown): NormalizedImportItem[] {
    const rawList = extractRowsFromPayload(payload, ["ratings"]);
    const items: NormalizedImportItem[] = [];

    for (let i = 0; i < rawList.length; i++) {
      const row = rawList[i];
      if (!row || typeof row !== "object") continue;

      const content =
        row["Review Text"] ||
        row.review_text ||
        row.text ||
        row.content ||
        row.message ||
        row.Review ||
        "";

      if (!content || !String(content).trim()) continue;

      const authorName =
        row.reviewer?.name ||
        row.authorName ||
        row.name ||
        row["Reviewer Name"] ||
        "Facebook User";

      // Meta recommendations are recommendation_type = 'positive' | 'negative' or 1-5 rating
      let rating = 5;
      const recType = String(
        row.recommendation_type || row.Recommendation || row.recommendation || ""
      ).toLowerCase();

      if (recType.includes("neg") || recType === "no") {
        rating = 1;
      } else if (row.rating || row.stars || row.Rating) {
        const parsed = Number(row.rating || row.stars || row.Rating);
        if (!isNaN(parsed)) rating = Math.max(1, Math.min(5, Math.round(parsed)));
      }

      let originalDate: string | null = null;
      if (row.created_time || row.date) {
        const d = new Date(row.created_time || row.date);
        if (!isNaN(d.getTime())) originalDate = d.toISOString();
      }

      items.push({
        externalId: row.id || row.open_graph_story?.id || `fb-${Date.now()}-${i}`,
        content: String(content).trim(),
        authorName: String(authorName).trim(),
        authorAvatarUrl: row.reviewer?.picture?.data?.url || row.avatar || null,
        rating,
        originalRating: row.recommendation_type || `${rating}/5`,
        sourcePlatform: "FACEBOOK",
        sourceUrl: row.url || (row.id ? `https://facebook.com/${row.id}` : null),
        originalDate,
        rawRecord: row,
      });
    }

    return items;
  }

  async fetch(credentials: Record<string, string>): Promise<NormalizedImportItem[]> {
    const { pageAccessToken, pageId } = credentials;
    if (!pageAccessToken || !pageId) {
      throw new Error("Both Page Access Token and Page ID are required.");
    }

    const endpoint = `https://graph.facebook.com/v19.0/${encodeURIComponent(
      pageId
    )}/ratings?fields=reviewer,review_text,recommendation_type,rating,created_time,open_graph_story&access_token=${encodeURIComponent(
      pageAccessToken
    )}`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`Meta Graph API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.error) {
      throw new Error(`Meta Graph API Error: ${json.error.message}`);
    }

    return this.parse(json);
  }
}
