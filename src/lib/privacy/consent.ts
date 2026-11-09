import fs from "fs";
import path from "path";
import {
  ConsentPermittedPurposes,
  StructuredConsentPayload,
  BackupTombstoneRecord,
} from "@/types/privacy";
import {
  DEFAULT_CONSENT_VERSION,
  DEFAULT_CONSENT_STATEMENT,
  DEFAULT_MEDIA_CONSENT_STATEMENT,
  serializeConsentPayload,
  parseConsentPayload,
} from "./format";

export type {
  ConsentPermittedPurposes,
  StructuredConsentPayload,
  BackupTombstoneRecord,
};

export {
  DEFAULT_CONSENT_VERSION,
  DEFAULT_CONSENT_STATEMENT,
  DEFAULT_MEDIA_CONSENT_STATEMENT,
  serializeConsentPayload,
  parseConsentPayload,
};

/**
 * Verifies whether a testimonial meets all criteria for public publishing:
 * 1. Approved status.
 * 2. Unrevoked consent record.
 * 3. Explicit permission for public website display.
 * 4. Not registered in the deletion/withdrawal tombstone registry.
 */
export function canPublishTestimonial(testimonial: {
  id: string;
  status: string;
  consentRecords?: Array<{
    isConsentGranted: boolean;
    revokedAt?: Date | string | null;
    consentText: string;
  }>;
}): {
  canPublish: boolean;
  reason?: string;
  allowMedia: boolean;
  allowName: boolean;
  allowCompany: boolean;
  structuredConsent: StructuredConsentPayload;
} {
  // Check tombstone registry first
  if (isTombstoned("TESTIMONIAL", testimonial.id)) {
    const emptyPayload = parseConsentPayload(null);
    return {
      canPublish: false,
      reason: "Testimonial is marked as withdrawn or permanently deleted.",
      allowMedia: false,
      allowName: false,
      allowCompany: false,
      structuredConsent: emptyPayload,
    };
  }

  if (testimonial.status !== "APPROVED") {
    const emptyPayload = parseConsentPayload(null);
    return {
      canPublish: false,
      reason: `Testimonial status is "${testimonial.status}", not APPROVED.`,
      allowMedia: false,
      allowName: false,
      allowCompany: false,
      structuredConsent: emptyPayload,
    };
  }

  const primaryConsent = testimonial.consentRecords?.[0];
  if (!primaryConsent) {
    // If no consent record exists, allow default if approved, but without advertising assumptions
    const defaultPayload = parseConsentPayload(null);
    return {
      canPublish: true,
      allowMedia: true,
      allowName: true,
      allowCompany: true,
      structuredConsent: defaultPayload,
    };
  }

  if (!primaryConsent.isConsentGranted || primaryConsent.revokedAt) {
    const parsed = parseConsentPayload(primaryConsent.consentText);
    return {
      canPublish: false,
      reason: "Consent was revoked by the customer or administrator.",
      allowMedia: false,
      allowName: false,
      allowCompany: false,
      structuredConsent: parsed,
    };
  }

  const payload = parseConsentPayload(primaryConsent.consentText);

  // Verify explicit permission for public website display
  if (!payload.permittedPurposes.publicWebsite) {
    return {
      canPublish: false,
      reason: "Customer did not grant permission for public website display.",
      allowMedia: false,
      allowName: false,
      allowCompany: false,
      structuredConsent: payload,
    };
  }

  return {
    canPublish: true,
    allowMedia: payload.mediaPermission,
    allowName: payload.allowNameDisplay,
    allowCompany: payload.allowCompanyDisplay,
    structuredConsent: payload,
  };
}

// -----------------------------------------------------------------------------
// Tombstone & Backup Safeguard Registry
// -----------------------------------------------------------------------------
// How backups handle deleted records:
// When restoring historical disaster recovery backups, the tombstone registry
// ensures that any customer or testimonial that was previously deleted or
// whose consent was withdrawn is NEVER republished or restored to live state.
// -----------------------------------------------------------------------------

const TOMBSTONE_DIR = path.join(process.cwd(), "data", "privacy");
const TOMBSTONE_FILE = path.join(TOMBSTONE_DIR, "tombstones.json");

let memoryTombstones: Map<string, BackupTombstoneRecord> | null = null;

function loadTombstones(): Map<string, BackupTombstoneRecord> {
  if (memoryTombstones) {
    return memoryTombstones;
  }

  memoryTombstones = new Map();

  try {
    if (fs.existsSync(TOMBSTONE_FILE)) {
      const raw = fs.readFileSync(TOMBSTONE_FILE, "utf-8");
      const list: BackupTombstoneRecord[] = JSON.parse(raw);
      for (const item of list) {
        memoryTombstones.set(`${item.type}:${item.originalId}`, item);
      }
    }
  } catch (err) {
    console.error("Failed to read tombstones file:", err);
  }

  return memoryTombstones;
}

function persistTombstones(map: Map<string, BackupTombstoneRecord>) {
  try {
    if (!fs.existsSync(TOMBSTONE_DIR)) {
      fs.mkdirSync(TOMBSTONE_DIR, { recursive: true });
    }
    const list = Array.from(map.values());
    fs.writeFileSync(TOMBSTONE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist tombstones file:", err);
  }
}

/**
 * Checks whether an entity has been tombstoned due to deletion or consent withdrawal.
 */
export function isTombstoned(type: "TESTIMONIAL" | "CUSTOMER" | "MEDIA", id: string): boolean {
  const map = loadTombstones();
  return map.has(`${type}:${id}`);
}

/**
 * Registers an entity in the tombstone registry.
 * This guarantees that even if a full database backup is restored, the entity
 * remains permanently withdrawn and cannot be republished.
 */
export function recordTombstone({
  type,
  originalId,
  workspaceId,
  reason = "CUSTOMER_REQUEST",
}: {
  type: "TESTIMONIAL" | "CUSTOMER" | "MEDIA";
  originalId: string;
  workspaceId: string;
  reason?: "CUSTOMER_REQUEST" | "WITHDRAWAL" | "ADMIN_REMOVAL";
}): void {
  const map = loadTombstones();
  const key = `${type}:${originalId}`;

  const record: BackupTombstoneRecord = {
    id: `tmb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    workspaceId,
    originalId,
    deletedAt: new Date().toISOString(),
    reason,
  };

  map.set(key, record);
  persistTombstones(map);
}
