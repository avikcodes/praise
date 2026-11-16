import type { PlatformConnector, ConnectionPermissionValidationResult } from "./types.ts";
import type { NormalizedImportItem } from "../external-types.ts";
import { getExternalAdapter } from "../adapters/registry.ts";

export class ProductHuntPlatformConnector implements PlatformConnector {
  platformId = "PRODUCT_HUNT" as const;
  name = "Product Hunt Reviews";
  authType = "OAUTH" as const;
  supportsLiveApi = true;

  async validatePermissions(
    credentials: Record<string, string>
  ): Promise<ConnectionPermissionValidationResult> {
    const apiToken = credentials.apiToken?.trim();
    const postSlug = credentials.postSlug?.trim();

    if (!apiToken) {
      return {
        valid: false,
        accountIdentifier: postSlug || "",
        accountName: "",
        error: "Missing Product Hunt Developer API Token (Bearer Token).",
      };
    }

    if (!postSlug) {
      return {
        valid: false,
        accountIdentifier: "",
        accountName: "",
        error: "Missing Product Hunt Post Slug (e.g. 'praise' or 'my-saas-tool').",
      };
    }

    const query = `
      query ValidatePost($slug: String!) {
        post(slug: $slug) {
          id
          name
          tagline
          reviewsRating
          reviewsCount
          url
        }
      }
    `;

    try {
      const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { slug: postSlug },
        }),
      });

      if (res.status === 401 || res.status === 403) {
        return {
          valid: false,
          accountIdentifier: postSlug,
          accountName: "",
          error: "Unauthorized: Invalid Product Hunt Developer Token or token expired.",
        };
      }

      if (!res.ok) {
        return {
          valid: false,
          accountIdentifier: postSlug,
          accountName: "",
          error: `Product Hunt API returned HTTP ${res.status}`,
        };
      }

      const json = await res.json();
      if (json.errors && json.errors.length > 0) {
        return {
          valid: false,
          accountIdentifier: postSlug,
          accountName: "",
          error: `Product Hunt Error: ${json.errors.map((e: any) => e.message).join("; ")}`,
        };
      }

      const post = json.data?.post;
      if (!post) {
        return {
          valid: false,
          accountIdentifier: postSlug,
          accountName: "",
          error: `Post Not Found: Could not find any Product Hunt post with slug "${postSlug}".`,
        };
      }

      return {
        valid: true,
        accountIdentifier: postSlug,
        accountName: `${post.name} on Product Hunt`,
        scopes: ["public"],
        metadata: {
          tagline: post.tagline,
          reviewsRating: post.reviewsRating,
          reviewsCount: post.reviewsCount,
          url: post.url,
        },
      };
    } catch (err: unknown) {
      return {
        valid: false,
        accountIdentifier: postSlug,
        accountName: "",
        error: err instanceof Error ? err.message : "Failed to connect to Product Hunt API.",
      };
    }
  }

  async fetchReviews(
    credentials: Record<string, string>,
    options?: { limit?: number }
  ): Promise<NormalizedImportItem[]> {
    const apiToken = credentials.apiToken?.trim();
    const postSlug = credentials.postSlug?.trim();

    if (!apiToken || !postSlug) {
      throw new Error("Missing Product Hunt credentials.");
    }

    const first = options?.limit ? Math.min(options.limit, 50) : 30;
    const query = `
      query GetReviews($slug: String!, $first: Int!) {
        post(slug: $slug) {
          id
          name
          reviews(first: $first) {
            edges {
              node {
                id
                body
                rating
                url
                createdAt
                user {
                  name
                  username
                  headline
                  profileImage
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
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { slug: postSlug, first },
      }),
    });

    if (!res.ok) {
      throw new Error(`Product Hunt API returned HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0].message || "Product Hunt API error");
    }

    const adapter = getExternalAdapter("PRODUCT_HUNT");
    if (!adapter) throw new Error("Product Hunt adapter not found");

    return adapter.parse(json);
  }
}
