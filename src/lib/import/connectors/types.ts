import type { NormalizedImportItem } from "../external-types.ts";

export type ConnectorPlatformId =
  | "GOOGLE"
  | "TRUSTPILOT"
  | "PRODUCT_HUNT"
  | "G2"
  | "FACEBOOK"
  | "LINKEDIN"
  | "CAPTERRA"
  | "REDDIT"
  | "X";

export interface ConnectionPermissionValidationResult {
  valid: boolean;
  accountIdentifier: string;
  accountName: string;
  scopes?: string[];
  error?: string;
  metadata?: Record<string, any>;
}

export interface PlatformConnector {
  platformId: ConnectorPlatformId;
  name: string;
  authType: "API_KEY" | "OAUTH" | "TOKEN_PAIR";
  supportsLiveApi: boolean;
  unsupportedReason?: string;
  manualExportInstructions?: string;

  /**
   * Tests and validates connection credentials live against provider API.
   * Throws or returns an error if permissions or token are invalid.
   */
  validatePermissions(
    credentials: Record<string, string>
  ): Promise<ConnectionPermissionValidationResult>;

  /**
   * Retrieves accessible reviews using validated credentials.
   */
  fetchReviews(
    credentials: Record<string, string>,
    options?: { limit?: number; since?: Date }
  ): Promise<NormalizedImportItem[]>;
}
