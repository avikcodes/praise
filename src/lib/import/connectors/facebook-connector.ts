import type { PlatformConnector, ConnectionPermissionValidationResult } from "./types.ts";
import type { NormalizedImportItem } from "../external-types.ts";
import { getExternalAdapter } from "../adapters/registry.ts";

export class FacebookPlatformConnector implements PlatformConnector {
  platformId = "FACEBOOK" as const;
  name = "Facebook Page Reviews & Recommendations";
  authType = "OAUTH" as const;
  supportsLiveApi = true;

  async validatePermissions(
    credentials: Record<string, string>
  ): Promise<ConnectionPermissionValidationResult> {
    const pageAccessToken = credentials.pageAccessToken?.trim();
    const pageId = credentials.pageId?.trim();

    if (!pageAccessToken) {
      return {
        valid: false,
        accountIdentifier: pageId || "",
        accountName: "",
        error: "Missing Meta / Facebook Page Access Token.",
      };
    }

    if (!pageId) {
      return {
        valid: false,
        accountIdentifier: "",
        accountName: "",
        error: "Missing Facebook Page ID.",
      };
    }

    const endpoint = `https://graph.facebook.com/v19.0/${encodeURIComponent(
      pageId
    )}?fields=name,about,fan_count,link&access_token=${encodeURIComponent(pageAccessToken)}`;

    try {
      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.error) {
        return {
          valid: false,
          accountIdentifier: pageId,
          accountName: "",
          error: `Meta Graph API Error: ${data.error.message || "Invalid token or page permissions."}`,
        };
      }

      const pageName = data.name || `Facebook Page (${pageId})`;

      return {
        valid: true,
        accountIdentifier: pageId,
        accountName: pageName,
        scopes: ["pages_read_engagement", "pages_read_user_content"],
        metadata: {
          pageName,
          fanCount: data.fan_count,
          link: data.link,
        },
      };
    } catch (err: unknown) {
      return {
        valid: false,
        accountIdentifier: pageId,
        accountName: "",
        error: err instanceof Error ? err.message : "Failed to connect to Meta Graph API.",
      };
    }
  }

  async fetchReviews(
    credentials: Record<string, string>,
    options?: { limit?: number }
  ): Promise<NormalizedImportItem[]> {
    const pageAccessToken = credentials.pageAccessToken?.trim();
    const pageId = credentials.pageId?.trim();

    if (!pageAccessToken || !pageId) {
      throw new Error("Missing Facebook Page credentials.");
    }

    const limit = options?.limit ? Math.min(options.limit, 100) : 50;
    const endpoint = `https://graph.facebook.com/v19.0/${encodeURIComponent(
      pageId
    )}/ratings?fields=created_time,recommendation_type,review_text,reviewer{id,name,picture}&limit=${limit}&access_token=${encodeURIComponent(
      pageAccessToken
    )}`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    const adapter = getExternalAdapter("FACEBOOK");
    if (!adapter) throw new Error("Facebook adapter not found");

    return adapter.parse(data);
  }
}
