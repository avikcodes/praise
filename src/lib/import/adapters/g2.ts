import type { ExternalSourceAdapter, NormalizedImportItem } from "../external-types.ts";
import { extractRowsFromPayload } from "./adapter-utils.ts";

export class G2ReviewsAdapter implements ExternalSourceAdapter {
  id = "G2" as const;
  name = "G2 Reviews";
  category = "B2B_DIRECTORY" as const;
  description = "Import authenticated B2B customer reviews from G2 via official G2 Partner API or G2 Admin Review CSV export.";
  icon = "g2";
  color = "#FF492C";
  supportsAutomatedApi = true;
  apiRequirementNote = "Requires G2 Partner API Token from your G2 my.g2.com Admin Portal.";
  apiConfigFields = [
    {
      key: "apiToken",
      label: "G2 Partner API Token",
      type: "password" as const,
      required: true,
      placeholder: "g2_live_...",
      description: "API Token generated in G2 Admin > Integrations.",
    },
    {
      key: "productId",
      label: "G2 Product ID or Slug",
      type: "text" as const,
      required: true,
      placeholder: "praise-software",
      description: "Product identifier in your G2 admin account.",
    },
  ];
  supportedInputTypes = ["OFFICIAL_API" as const, "STRUCTURED_FILE" as const, "PASTE_DATA" as const];

  defaultFieldMappings = {
    content: "comment",
    authorName: "reviewer_name",
    authorCompany: "company_name",
    authorTitle: "title",
    rating: "star_rating",
    sourceUrl: "url",
    originalDate: "submitted_at",
  };

  parse(payload: unknown): NormalizedImportItem[] {
    const rawRows = extractRowsFromPayload(payload);
    const list = rawRows.map((d: any) => (d.attributes ? { ...d.attributes, id: d.id } : d));

    const items: NormalizedImportItem[] = [];

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (!r || typeof r !== "object") continue;

      const title = r.Title || r.headline || r.title || "";
      const likeBest = r["What do you like best?"] || r.love_best || r.like_best || "";
      const dislike = r["What do you dislike?"] || r.dislike || "";
      const problems = r["What problems is Praise solving?"] || r["What problems are you solving?"] || "";
      const generalComment = r.comment || r.Review || r.text || r.body || "";

      const parts: string[] = [];
      if (title) parts.push(title);
      if (generalComment && generalComment !== title) parts.push(generalComment);
      if (likeBest) parts.push(`What do you like best?\n${likeBest}`);
      if (dislike) parts.push(`What do you dislike?\n${dislike}`);
      if (problems) parts.push(`Problems solved:\n${problems}`);

      const content = parts.length > 0 ? parts.join("\n\n") : (generalComment || likeBest || title || "");

      if (!content || !String(content).trim()) continue;

      const authorName =
        r.reviewer_name ||
        r["Reviewer Name"] ||
        r.name ||
        r.user_name ||
        "G2 Verified User";

      const company =
        r["Reviewer Company"] ||
        r.company_name ||
        r.Organization ||
        r["Company Name"] ||
        r.company ||
        null;

      const jobTitle =
        r["Reviewer Title"] ||
        r.user_title ||
        r["User Title"] ||
        r.jobTitle ||
        r.role ||
        (r.title && r.title !== title ? r.title : null) ||
        null;

      const rawRating =
        r["Star Rating"] ||
        r.star_rating ||
        r.Score ||
        r.rating ||
        r.stars;
      let rating = 5;
      if (rawRating !== undefined && rawRating !== null) {
        const parsed = Number(rawRating);
        if (!isNaN(parsed)) rating = Math.max(1, Math.min(5, Math.round(parsed)));
      }

      let originalDate: string | null = null;
      const rawDate = r.submitted_at || r.Date || r.date || r.created_at;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) originalDate = d.toISOString();
      }

      items.push({
        externalId: r.id || `g2-${Date.now()}-${i}`,
        content: String(content).trim(),
        authorName: String(authorName).trim(),
        authorCompany: company ? String(company).trim() : null,
        authorTitle: jobTitle ? String(jobTitle).trim() : null,
        rating,
        originalRating: rawRating ? `${rawRating}/5 Stars` : "5/5 Stars",
        sourcePlatform: "G2",
        sourceUrl: r["Review URL"] || r.url || null,
        originalDate,
        rawRecord: r,
      });
    }

    return items;
  }

  async fetch(credentials: Record<string, string>): Promise<NormalizedImportItem[]> {
    const { apiToken, productId } = credentials;
    if (!apiToken || !productId) {
      throw new Error("Both G2 Partner API Token and Product ID are required.");
    }

    const endpoint = `https://data.g2.com/api/v1/products/${encodeURIComponent(productId)}/reviews`;

    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Token token=${apiToken.trim()}`,
        "Content-Type": "application/vnd.api+json",
      },
    });

    if (!res.ok) {
      throw new Error(`G2 API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    return this.parse(json);
  }
}
