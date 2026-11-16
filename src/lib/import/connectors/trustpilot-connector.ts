import type { PlatformConnector, ConnectionPermissionValidationResult } from "./types.ts";
import type { NormalizedImportItem } from "../external-types.ts";
import { getExternalAdapter } from "../adapters/registry.ts";

export class TrustpilotPlatformConnector implements PlatformConnector {
  platformId = "TRUSTPILOT" as const;
  name = "Trustpilot Business";
  authType = "API_KEY" as const;
  supportsLiveApi = true;

  async validatePermissions(
    credentials: Record<string, string>
  ): Promise<ConnectionPermissionValidationResult> {
    const apiKey = credentials.apiKey?.trim();
    const businessUnitId = credentials.businessUnitId?.trim();

    if (!apiKey) {
      return {
        valid: false,
        accountIdentifier: businessUnitId || "",
        accountName: "",
        error: "Missing Trustpilot Business API Key.",
      };
    }

    if (!businessUnitId) {
      return {
        valid: false,
        accountIdentifier: "",
        accountName: "",
        error: "Missing Trustpilot Business Unit ID (24-character hexadecimal ID).",
      };
    }

    const endpoint = `https://api.trustpilot.com/v1/business-units/${encodeURIComponent(businessUnitId)}`;

    try {
      const res = await fetch(endpoint, {
        headers: {
          apiKey: apiKey,
          Accept: "application/json",
        },
      });

      if (res.status === 401 || res.status === 403) {
        return {
          valid: false,
          accountIdentifier: businessUnitId,
          accountName: "",
          error: "Unauthorized: Invalid Trustpilot API Key or permissions not granted for this Business Unit.",
        };
      }

      if (res.status === 404) {
        return {
          valid: false,
          accountIdentifier: businessUnitId,
          accountName: "",
          error: `Business Unit Not Found: No Trustpilot account found matching ID "${businessUnitId}".`,
        };
      }

      if (!res.ok) {
        return {
          valid: false,
          accountIdentifier: businessUnitId,
          accountName: "",
          error: `Trustpilot API error: HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const accountName = data.displayName || data.identifyingName || `Trustpilot Business (${businessUnitId})`;

      return {
        valid: true,
        accountIdentifier: businessUnitId,
        accountName,
        scopes: ["business-units.read", "reviews.read"],
        metadata: {
          trustScore: data.trustScore,
          numberOfReviews: data.numberOfReviews?.total,
          websiteUrl: data.websiteUrl,
        },
      };
    } catch (err: unknown) {
      return {
        valid: false,
        accountIdentifier: businessUnitId,
        accountName: "",
        error: err instanceof Error ? err.message : "Failed to connect to Trustpilot API.",
      };
    }
  }

  async fetchReviews(
    credentials: Record<string, string>,
    options?: { limit?: number }
  ): Promise<NormalizedImportItem[]> {
    const apiKey = credentials.apiKey?.trim();
    const businessUnitId = credentials.businessUnitId?.trim();

    if (!apiKey || !businessUnitId) {
      throw new Error("Missing Trustpilot credentials.");
    }

    const perPage = options?.limit ? Math.min(options.limit, 100) : 50;
    const endpoint = `https://api.trustpilot.com/v1/business-units/${encodeURIComponent(
      businessUnitId
    )}/reviews?perPage=${perPage}&orderBy=createdat.desc`;

    const res = await fetch(endpoint, {
      headers: {
        apiKey: apiKey,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Trustpilot API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const adapter = getExternalAdapter("TRUSTPILOT");
    if (!adapter) throw new Error("Trustpilot adapter not found");

    return adapter.parse(data);
  }
}
