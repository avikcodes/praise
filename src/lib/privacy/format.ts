import {
  StructuredConsentPayload,
} from "@/types/privacy";

export const DEFAULT_CONSENT_VERSION = "v1.0";

export const DEFAULT_CONSENT_STATEMENT =
  "I grant permission to use my feedback, name, and company on public websites and testimonial widgets.";

export const DEFAULT_MEDIA_CONSENT_STATEMENT =
  "I grant permission to publish my submitted photo or video recording alongside my testimonial.";

/**
 * Serializes a structured consent agreement into a JSON string
 * for storage in the ConsentRecord table.
 */
export function serializeConsentPayload(payload: StructuredConsentPayload): string {
  return JSON.stringify(payload);
}

/**
 * Parses a stored consentText string into a StructuredConsentPayload.
 * Gracefully parses JSON or converts legacy plain-text consent statements.
 */
export function parseConsentPayload(rawConsentText?: string | null): StructuredConsentPayload {
  const fallbackStatement = rawConsentText?.trim() || DEFAULT_CONSENT_STATEMENT;

  if (!rawConsentText) {
    return {
      version: DEFAULT_CONSENT_VERSION,
      statement: fallbackStatement,
      permittedPurposes: {
        publicWebsite: true,
        socialMedia: false,
        marketingMaterials: false,
      },
      mediaPermission: true,
      allowNameDisplay: true,
      allowCompanyDisplay: true,
      revokedAt: null,
      revocationReason: null,
    };
  }

  const trimmed = rawConsentText.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        version: typeof parsed.version === "string" ? parsed.version : DEFAULT_CONSENT_VERSION,
        statement: typeof parsed.statement === "string" ? parsed.statement : fallbackStatement,
        permittedPurposes: {
          publicWebsite: parsed.permittedPurposes?.publicWebsite !== false,
          socialMedia: Boolean(parsed.permittedPurposes?.socialMedia),
          marketingMaterials: Boolean(parsed.permittedPurposes?.marketingMaterials),
        },
        mediaPermission: parsed.mediaPermission !== false,
        allowNameDisplay: parsed.allowNameDisplay !== false,
        allowCompanyDisplay: parsed.allowCompanyDisplay !== false,
        revokedAt: parsed.revokedAt || null,
        revocationReason: parsed.revocationReason || null,
      };
    } catch {
      // JSON parse failed; proceed to plain text fallback
    }
  }

  // Legacy plain-text representation
  return {
    version: DEFAULT_CONSENT_VERSION,
    statement: trimmed,
    permittedPurposes: {
      publicWebsite: true,
      socialMedia: false,
      marketingMaterials: false,
    },
    mediaPermission: true,
    allowNameDisplay: true,
    allowCompanyDisplay: true,
    revokedAt: null,
    revocationReason: null,
  };
}

