/**
 * Privacy and Consent Management Types for Praise Core.
 * Version 1: Explicit consent recording, granular usage permissions,
 * media permission separation, audit logging, and withdrawal controls.
 */

export interface ConsentPermittedPurposes {
  /** Permission to showcase on public websites, Wall of Love, and embed widgets */
  publicWebsite: boolean;
  /** Permission to quote on public social media accounts (e.g. X/Twitter, LinkedIn) */
  socialMedia: boolean;
  /** Permission to feature in marketing campaigns, case studies, or presentation decks */
  marketingMaterials: boolean;
}

export interface StructuredConsentPayload {
  /** Semantic version of the consent disclosure agreed to (e.g. "v1.0") */
  version: string;
  /** Exact wording of the consent statement displayed to the respondent */
  statement: string;
  /** Explicit permitted usage channels */
  permittedPurposes: ConsentPermittedPurposes;
  /** Separate explicit permission to publish submitted media (photos, videos, audio) */
  mediaPermission: boolean;
  /** Permission to display customer name publicly (if false, render anonymously) */
  allowNameDisplay: boolean;
  /** Permission to display customer company/job title publicly */
  allowCompanyDisplay: boolean;
  /** Optional revocation timestamp if consent was subsequently withdrawn */
  revokedAt?: string | null;
  /** Optional revocation reason logged by workspace owner upon customer request */
  revocationReason?: string | null;
}

export interface ConsentRecordDetail {
  id: string;
  workspaceId: string;
  testimonialId: string;
  customerId?: string | null;
  customerName: string;
  customerEmail: string;
  consentText: string;
  structuredConsent: StructuredConsentPayload;
  isConsentGranted: boolean;
  grantedAt: string;
  revokedAt?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  // Hydrated metadata for display in the dashboard
  testimonialSnippet?: string;
  testimonialStatus?: string;
  testimonialType?: string;
  projectName?: string | null;
  projectId?: string | null;
  hasMedia?: boolean;
}

export interface ProjectPrivacyConfig {
  /** Active consent wording version */
  consentVersion: string;
  /** Whether explicit checkbox consent is required to submit */
  requireExplicitConsent: boolean;
  /** Primary consent agreement statement */
  defaultConsentText: string;
  /** Whether separate checkbox is rendered for photo/video media */
  requireSeparateMediaConsent: boolean;
  /** Default usage options presented to respondents */
  defaultAllowedPurposes: ConsentPermittedPurposes;
  /** Contact email or instructions provided to respondents for withdrawal requests */
  privacyContactEmail?: string | null;
}

export interface BackupTombstoneRecord {
  id: string;
  type: "TESTIMONIAL" | "CUSTOMER" | "MEDIA";
  workspaceId: string;
  originalId: string;
  deletedAt: string;
  reason: "CUSTOMER_REQUEST" | "WITHDRAWAL" | "ADMIN_REMOVAL";
}

