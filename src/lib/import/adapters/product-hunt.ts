import type { ExternalSourceAdapter, NormalizedImportItem } from "../external-types.ts";
import { extractRowsFromPayload } from "./adapter-utils.ts";

export class ProductHuntAdapter implements ExternalSourceAdapter {
  id = "PRODUCT_HUNT" as const;
  name = "Product Hunt Reviews";
  category = "COMMUNITY" as const;
  description = "Import launch reviews, maker endorsements, and community feedback from your Product Hunt product page.";
  icon = "producthunt";
  color = "#DA552F";
  supportsAutomatedApi = true;
  apiRequirementNote = "Requires a Product Hunt Developer API Token from producthunt.com/v2/oauth/applications.";
  apiConfigFields = [
    {
      key: "apiToken",
      label: "Product Hunt API Token",
      type: "password" as const,
      required: true,
      placeholder: "ph_dev_...",
      description: "Developer API token with public read scope.",
    },
    {
      key: "postSlug",
      label: "Product Hunt Post Slug",
      type: "text" as const,
      required: true,
      placeholder: "praise-app",
      description: "The URL slug of your product launch.",
    },
  ];
  supportedInputTypes = ["OFFICIAL_API" as const, "STRUCTURED_FILE" as const, "PASTE_DATA" as const];

  defaultFieldMappings = {
    content: "body",
    authorName: "user.name",
    authorAvatarUrl: "user.profileImage",
    rating: "rating",
    sourceUrl: "url",
    originalDate: "createdAt",
  };

  parse(payload: unknown): NormalizedImportItem[] {
    let list: any[] = [];

    if (
      payload &&
      typeof payload === "object" &&
      Array.isArray((payload as any).data?.post?.reviews?.edges)
    ) {
      list = (payload as any).data.post.reviews.edges.map((e: any) => e.node || e);
    } else {
      list = extractRowsFromPayload(payload);
    }

    const items: NormalizedImportItem[] = [];

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (!r || typeof r !== "object") continue;

      const content = r.body || r.text || r.content || r.comment || r.Review || "";
      if (!content || !String(content).trim()) continue;

      const user = r.user || r.author || {};
      const authorName = user.name || r.authorName || r.reviewer || "Product Hunt Supporter";
      const username = user.username || r.username || null;
      const avatarUrl = user.profileImage || user.avatarUrl || user.avatar || r.avatar || null;

      let rating = 5;
      if (r.rating !== undefined && r.rating !== null) {
        const parsed = Number(r.rating);
        if (!isNaN(parsed)) rating = Math.max(1, Math.min(5, Math.round(parsed)));
      }

      let originalDate: string | null = null;
      if (r.createdAt || r.date) {
        const d = new Date(r.createdAt || r.date);
        if (!isNaN(d.getTime())) originalDate = d.toISOString();
      }

      items.push({
        externalId: r.id || `ph-${Date.now()}-${i}`,
        content: String(content).trim(),
        authorName: String(authorName).trim(),
        authorHandle: username ? `@${username.replace(/^@/, "")}` : null,
        authorAvatarUrl: avatarUrl,
        authorTitle: user.headline || r.title || r.role || null,
        authorCompany:
          r.company ||
          (user.headline && user.headline.includes("@")
            ? user.headline.split("@")[1].trim()
            : null),
        rating,
        originalRating: `${rating} / 5 Stars`,
        sourcePlatform: "PRODUCT_HUNT",
        sourceUrl: r.url || (username ? `https://www.producthunt.com/@${username}` : null),
        originalDate,
        rawRecord: r,
      });
    }

    return items;
  }

  async fetch(credentials: Record<string, string>): Promise<NormalizedImportItem[]> {
    const { apiToken, postSlug } = credentials;
    if (!apiToken || !postSlug) {
      throw new Error("Both Product Hunt API Token and Post Slug are required.");
    }

    const query = `
      query GetPostReviews($slug: String!) {
        post(slug: $slug) {
          id
          name
          reviews(first: 50) {
            edges {
              node {
                id
                body
                rating
                createdAt
                url
                user {
                  name
                  username
                  profileImage
                  headline
                }
              }
            }
          }
        }
      }
    `;

    const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken.trim()}`,
      },
      body: JSON.stringify({ query, variables: { slug: postSlug.trim() } }),
    });

    if (!res.ok) {
      throw new Error(`Product Hunt GraphQL API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.errors) {
      throw new Error(`Product Hunt API Error: ${json.errors[0]?.message || "GraphQL query failure"}`);
    }

    return this.parse(json);
  }
}
