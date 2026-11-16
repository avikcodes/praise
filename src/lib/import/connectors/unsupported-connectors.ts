import type { PlatformConnector, ConnectionPermissionValidationResult } from "./types.ts";
import type { NormalizedImportItem } from "../external-types.ts";

export class LinkedInManualConnector implements PlatformConnector {
  platformId = "LINKEDIN" as const;
  name = "LinkedIn Recommendations";
  authType = "TOKEN_PAIR" as const;
  supportsLiveApi = false;
  unsupportedReason =
    "LinkedIn Developer API does not provide a public or open endpoint for fetching member recommendations. Third-party scraping is strictly prohibited by LinkedIn Terms of Service §8.2. Use Praise's authorized Account Archive CSV import.";
  manualExportInstructions =
    "To import LinkedIn recommendations: 1) Go to your LinkedIn Profile -> Settings & Privacy -> Data Privacy -> 'Get a copy of your data'. 2) Select 'Recommendations' and request archive. 3) Upload 'Recommendations Received.csv' into Praise.";

  async validatePermissions(): Promise<ConnectionPermissionValidationResult> {
    return {
      valid: false,
      accountIdentifier: "linkedin-manual",
      accountName: "LinkedIn (Manual Export Only)",
      error: this.unsupportedReason,
    };
  }

  async fetchReviews(): Promise<NormalizedImportItem[]> {
    throw new Error(this.unsupportedReason);
  }
}

export class CapterraManualConnector implements PlatformConnector {
  platformId = "CAPTERRA" as const;
  name = "Capterra / Gartner Digital Markets";
  authType = "API_KEY" as const;
  supportsLiveApi = false;
  unsupportedReason =
    "Gartner Digital Markets (Capterra, GetApp, Software Advice) does not offer a public review sync API for SaaS products. Automated scraping of Gartner web pages is prohibited. Praise supports direct CSV review exports from your Capterra Vendor Portal.";
  manualExportInstructions =
    "To import Capterra reviews: 1) Log into your Capterra Vendor Portal. 2) Navigate to Reviews -> Export Reviews. 3) Download the CSV export and upload it into Praise.";

  async validatePermissions(): Promise<ConnectionPermissionValidationResult> {
    return {
      valid: false,
      accountIdentifier: "capterra-manual",
      accountName: "Capterra (Vendor Portal Export Only)",
      error: this.unsupportedReason,
    };
  }

  async fetchReviews(): Promise<NormalizedImportItem[]> {
    throw new Error(this.unsupportedReason);
  }
}
