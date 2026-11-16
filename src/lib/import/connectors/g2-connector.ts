import type { PlatformConnector, ConnectionPermissionValidationResult } from "./types.ts";
import type { NormalizedImportItem } from "../external-types.ts";
import { getExternalAdapter } from "../adapters/registry.ts";

export class G2PlatformConnector implements PlatformConnector {
  platformId = "G2" as const;
  name = "G2 Reviews";
  authType = "API_KEY" as const;
  supportsLiveApi = true;

  async validatePermissions(
    credentials: Record<string, string>
  ): Promise<ConnectionPermissionValidationResult> {
    const apiToken = credentials.apiToken?.trim();
    const productId = credentials.productId?.trim();

    if (!apiToken) {
      return {
        valid: false,
        accountIdentifier: productId || "",
        accountName: "",
        error: "Missing G2 Partner API Token. Find your token in G2 Seller Admin -> Integrations -> API Tokens.",
      };
    }

    if (!productId) {
      return {
        valid: false,
        accountIdentifier: "",
        accountName: "",
        error: "Missing G2 Product ID or Slug (e.g. 'praise' or 'acme-app').",
      };
    }

    const endpoint = `https://data.g2.com/api/v1/products/${encodeURIComponent(productId)}`;

    try {
      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Token token=${apiToken}`,
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
        },
      });

      if (res.status === 401 || res.status === 403) {
        return {
          valid: false,
          accountIdentifier: productId,
          accountName: "",
          error: "Unauthorized: Invalid G2 API Token or Partner API access is not active on your G2 subscription.",
        };
      }

      if (res.status === 404) {
        return {
          valid: false,
          accountIdentifier: productId,
          accountName: "",
          error: `Product Not Found: No G2 product listing found matching "${productId}".`,
        };
      }

      if (!res.ok) {
        return {
          valid: false,
          accountIdentifier: productId,
          accountName: "",
          error: `G2 API returned HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const json = await res.json();
      const productName = json.data?.attributes?.name || `G2 Product (${productId})`;
      const starRating = json.data?.attributes?.star_rating;
      const reviewCount = json.data?.attributes?.review_count;

      return {
        valid: true,
        accountIdentifier: productId,
        accountName: `${productName} on G2`,
        scopes: ["partner.reviews.read"],
        metadata: {
          productName,
          starRating,
          reviewCount,
        },
      };
    } catch (err: unknown) {
      return {
        valid: false,
        accountIdentifier: productId,
        accountName: "",
        error: err instanceof Error ? err.message : "Failed to connect to G2 Partner API.",
      };
    }
  }

  async fetchReviews(
    credentials: Record<string, string>,
    options?: { limit?: number; since?: Date; cursor?: string }
  ): Promise<NormalizedImportItem[]> {
    const apiToken = credentials.apiToken?.trim();
    const productId = credentials.productId?.trim();

    if (!apiToken || !productId) {
      throw new Error("Missing G2 credentials.");
    }

    const pageSize = options?.limit ? Math.min(options.limit, 100) : 50;
    const endpoint = `https://data.g2.com/api/v1/products/${encodeURIComponent(
      productId
    )}/reviews?page[size]=${pageSize}`;

    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Token token=${apiToken}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
    });

    if (!res.ok) {
      throw new Error(`G2 API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const adapter = getExternalAdapter("G2");
    if (!adapter) throw new Error("G2 adapter not found");

    let normalized = adapter.parse(json);

    // Incremental filter: only include reviews created after since timestamp
    if (options?.since) {
      const sinceTime = new Date(options.since).getTime();
      normalized = normalized.filter((item) => {
        if (!item.originalDate) return true;
        return new Date(item.originalDate).getTime() > sinceTime;
      });
    }

    return normalized;
  }
}
