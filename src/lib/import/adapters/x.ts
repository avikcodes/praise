import type { ExternalSourceAdapter, NormalizedImportItem } from "../external-types.ts";

export class XTwitterAdapter implements ExternalSourceAdapter {
  id = "X" as const;
  name = "X (Twitter)";
  category = "SOCIAL_NETWORK" as const;
  description = "Import positive customer mentions, praise tweets, and customer quotes via official X API v2 or tweet JSON export.";
  icon = "x";
  color = "#000000";
  supportsAutomatedApi = true;
  apiRequirementNote = "Requires an X Developer Portal Bearer Token with read access.";
  apiConfigFields = [
    {
      key: "bearerToken",
      label: "X API v2 Bearer Token",
      type: "password" as const,
      required: true,
      placeholder: "AAAAAAAAAAAAAAAAAAAAA...",
      description: "Bearer Token from your X Developer App.",
    },
    {
      key: "tweetIdsOrQuery",
      label: "Tweet ID or Search Query",
      type: "text" as const,
      required: true,
      placeholder: "182938491823901923",
      description: "Comma-separated Tweet IDs or search term.",
    },
  ];
  supportedInputTypes = ["OFFICIAL_API" as const, "STRUCTURED_FILE" as const, "PASTE_DATA" as const];

  defaultFieldMappings = {
    content: "text",
    authorName: "author.name",
    authorHandle: "author.username",
    authorAvatarUrl: "author.profile_image_url",
    sourceUrl: "url",
    originalDate: "created_at",
  };

  parse(payload: unknown): NormalizedImportItem[] {
    let tweets: any[] = [];
    const userMap = new Map<string, any>();

    if (payload && typeof payload === "object") {
      const obj = payload as any;
      if (Array.isArray(obj.includes?.users)) {
        for (const u of obj.includes.users) {
          userMap.set(u.id, u);
        }
      }
      if (Array.isArray(obj.data)) {
        tweets = obj.data;
      } else if (obj.data && typeof obj.data === "object") {
        tweets = [obj.data];
      } else if (Array.isArray(payload)) {
        tweets = payload;
      }
    }

    const items: NormalizedImportItem[] = [];

    for (let i = 0; i < tweets.length; i++) {
      const t = tweets[i];
      if (!t || typeof t !== "object") continue;

      const content = t.text || t.content || t.full_text || t.Tweet || "";
      if (!content || !String(content).trim()) continue;

      const user = userMap.get(t.author_id) || t.user || t.author || {};
      const authorName = user.name || t.authorName || t.name || t.Username || "X User";
      const username = user.username || user.screen_name || t.username || t.handle || null;
      const avatarUrl = user.profile_image_url || user.avatar || t.authorAvatarUrl || null;

      let originalDate: string | null = null;
      if (t.created_at || t.date) {
        const d = new Date(t.created_at || t.date);
        if (!isNaN(d.getTime())) originalDate = d.toISOString();
      }

      const tweetId = t.id || t.id_str || `x-${Date.now()}-${i}`;
      const sourceUrl =
        t.url ||
        (username && tweetId ? `https://x.com/${username}/status/${tweetId}` : `https://x.com/i/status/${tweetId}`);

      items.push({
        externalId: String(tweetId),
        content: String(content).trim(),
        authorName: String(authorName).trim(),
        authorHandle: username ? `@${username.replace(/^@/, "")}` : null,
        authorAvatarUrl: avatarUrl ? String(avatarUrl).replace("_normal", "_bigger") : null,
        rating: 5, // Social praise defaults to 5 stars
        originalRating: "Favorite Tweet",
        sourcePlatform: "X",
        sourceUrl,
        originalDate,
        rawRecord: t,
      });
    }

    return items;
  }

  async fetch(credentials: Record<string, string>): Promise<NormalizedImportItem[]> {
    const { bearerToken, tweetIdsOrQuery } = credentials;
    if (!bearerToken || !tweetIdsOrQuery) {
      throw new Error("Both X API Bearer Token and Tweet IDs are required.");
    }

    // Clean comma-separated IDs
    const ids = tweetIdsOrQuery
      .split(",")
      .map((id) => id.trim().replace(/.*\/status\//, "").replace(/\?.*/, ""))
      .filter(Boolean)
      .join(",");

    const endpoint = `https://api.twitter.com/2/tweets?ids=${encodeURIComponent(
      ids
    )}&tweet.fields=created_at,author_id,public_metrics&expansions=author_id&user.fields=name,username,profile_image_url,verified`;

    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${bearerToken.trim()}`,
      },
    });

    if (!res.ok) {
      throw new Error(`X API v2 returned HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.errors && !json.data) {
      throw new Error(`X API Error: ${JSON.stringify(json.errors)}`);
    }

    return this.parse(json);
  }
}
