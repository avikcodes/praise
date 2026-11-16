import type { ExternalSourceAdapter, NormalizedImportItem } from "../external-types.ts";

export class RedditAdapter implements ExternalSourceAdapter {
  id = "REDDIT" as const;
  name = "Reddit Mentions & Reviews";
  category = "COMMUNITY" as const;
  description = "Import authentic community discussions, praise comments, and product feedback from Reddit threads.";
  icon = "reddit";
  color = "#FF4500";
  supportsAutomatedApi = true;
  apiRequirementNote = "Supports Reddit public discussion JSON lookup and authorized Reddit OAuth apps.";
  apiConfigFields = [
    {
      key: "threadUrlOrSubreddit",
      label: "Reddit Thread URL or Permalink",
      type: "url" as const,
      required: true,
      placeholder: "https://www.reddit.com/r/SaaS/comments/xyz/...",
      description: "Direct URL to the Reddit thread or comment.",
    },
  ];
  supportedInputTypes = ["OFFICIAL_API" as const, "STRUCTURED_FILE" as const, "PASTE_DATA" as const];

  defaultFieldMappings = {
    content: "body",
    authorName: "author",
    sourceUrl: "permalink",
    originalDate: "created_utc",
  };

  parse(payload: unknown): NormalizedImportItem[] {
    const rawList: any[] = [];

    // Traverse Reddit JSON structure
    const collectComments = (node: any) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(collectComments);
        return;
      }
      if (node.data?.children && Array.isArray(node.data.children)) {
        node.data.children.forEach(collectComments);
        return;
      }
      if (node.data?.body || node.data?.selftext) {
        rawList.push(node.data);
      } else if (node.body || node.selftext) {
        rawList.push(node);
      }
    };

    collectComments(payload);

    const items: NormalizedImportItem[] = [];

    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      const content = item.body || item.selftext || item.text || item.comment || "";
      if (!content || !String(content).trim() || content === "[deleted]" || content === "[removed]") {
        continue;
      }

      const author = item.author || item.authorName || "Reddit User";
      if (author === "[deleted]" || author === "AutoModerator") continue;

      let originalDate: string | null = null;
      if (item.created_utc) {
        const ts = Number(item.created_utc);
        if (!isNaN(ts)) originalDate = new Date(ts * 1000).toISOString();
      } else if (item.date) {
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) originalDate = d.toISOString();
      }

      const score = item.score !== undefined ? `${item.score} upvotes` : "Community Praise";
      const permalink = item.permalink
        ? item.permalink.startsWith("http")
          ? item.permalink
          : `https://www.reddit.com${item.permalink}`
        : item.url || null;

      items.push({
        externalId: item.id || `reddit-${Date.now()}-${i}`,
        content: String(content).trim(),
        authorName: author.startsWith("u/") ? author : `u/${author}`,
        authorHandle: author.startsWith("u/") ? author : `u/${author}`,
        rating: 5,
        originalRating: score,
        sourcePlatform: "REDDIT",
        sourceUrl: permalink,
        originalDate,
        rawRecord: item,
      });
    }

    return items;
  }

  async fetch(credentials: Record<string, string>): Promise<NormalizedImportItem[]> {
    const rawUrl = credentials.threadUrlOrSubreddit?.trim();
    if (!rawUrl) {
      throw new Error("A valid Reddit thread URL or permalink is required.");
    }

    // Normalize URL to official public JSON representation (append .json)
    const cleanUrl = rawUrl.replace(/\.json\/?$/, "").replace(/\/+$/, "") + ".json";

    const res = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "Praise-Testimonial-Platform/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Reddit API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    return this.parse(json);
  }
}
