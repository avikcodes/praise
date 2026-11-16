import type { PlatformConnector, ConnectionPermissionValidationResult } from "./types.ts";
import type { NormalizedImportItem } from "../external-types.ts";
import { getExternalAdapter } from "../adapters/registry.ts";

export class GooglePlatformConnector implements PlatformConnector {
  platformId = "GOOGLE" as const;
  name = "Google Business Profile & Places";
  authType = "API_KEY" as const;
  supportsLiveApi = true;

  async validatePermissions(
    credentials: Record<string, string>
  ): Promise<ConnectionPermissionValidationResult> {
    const apiKey = credentials.apiKey?.trim();
    const placeId = credentials.placeId?.trim();

    if (!apiKey) {
      return {
        valid: false,
        accountIdentifier: placeId || "",
        accountName: "",
        error: "Missing Google Places API Key. Please provide an authorized key from Google Cloud Console.",
      };
    }

    if (!placeId) {
      return {
        valid: false,
        accountIdentifier: "",
        accountName: "",
        error: "Missing Google Business Place ID. Find your Place ID via Google's Place ID Finder tool.",
      };
    }

    const endpoint = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=name,rating,user_ratings_total,formatted_address,url&key=${encodeURIComponent(apiKey)}`;

    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        return {
          valid: false,
          accountIdentifier: placeId,
          accountName: "",
          error: `Google Places API returned HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data = await res.json();
      if (data.status === "REQUEST_DENIED") {
        return {
          valid: false,
          accountIdentifier: placeId,
          accountName: "",
          error: `Permission Denied by Google: ${data.error_message || "API key does not have Places API enabled or IP/referrer restrictions block the server."}`,
        };
      }

      if (data.status === "INVALID_REQUEST" || data.status === "NOT_FOUND") {
        return {
          valid: false,
          accountIdentifier: placeId,
          accountName: "",
          error: `Invalid Place ID: Could not find any Google Business Profile matching "${placeId}".`,
        };
      }

      const placeName = data.result?.name || `Google Business (${placeId})`;
      const address = data.result?.formatted_address;
      const rating = data.result?.rating;
      const totalReviews = data.result?.user_ratings_total;

      return {
        valid: true,
        accountIdentifier: placeId,
        accountName: placeName,
        scopes: ["places.details.read"],
        metadata: {
          address,
          rating,
          totalReviews,
          googleMapsUrl: data.result?.url,
        },
      };
    } catch (err: unknown) {
      return {
        valid: false,
        accountIdentifier: placeId,
        accountName: "",
        error: err instanceof Error ? err.message : "Failed to connect to Google Places API.",
      };
    }
  }

  async fetchReviews(
    credentials: Record<string, string>,
    options?: { limit?: number; since?: Date; cursor?: string }
  ): Promise<NormalizedImportItem[]> {
    const apiKey = credentials.apiKey?.trim();
    const placeId = credentials.placeId?.trim();

    if (!apiKey || !placeId) {
      throw new Error("Missing Google Places credentials.");
    }

    const endpoint = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=name,rating,reviews&key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`Google Places API error (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    if (data.status !== "OK") {
      throw new Error(`Google Places API returned status: ${data.status} (${data.error_message || "No reviews available"})`);
    }

    const adapter = getExternalAdapter("GOOGLE");
    if (!adapter) throw new Error("Google adapter not found");

    let normalized = adapter.parse(data);

    // Incremental filter: only include reviews created after since timestamp
    if (options?.since) {
      const sinceTime = new Date(options.since).getTime();
      normalized = normalized.filter((item) => {
        if (!item.originalDate) return true;
        return new Date(item.originalDate).getTime() > sinceTime;
      });
    }

    return options?.limit ? normalized.slice(0, options.limit) : normalized;
  }
}
