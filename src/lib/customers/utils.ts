export const INTERNAL_EMAIL_SUFFIX = "@customer.praise.internal";
export const LEGACY_EMAIL_SUFFIXES = [
  "@praise.local",
  "@anonymous.praise.local",
];

/**
 * Checks whether the stored email is an auto-generated internal placeholder
 * created when a respondent submitted a testimonial without an email address.
 */
export function isInternalEmail(email?: string | null): boolean {
  if (!email) return true;
  return (
    email.endsWith(INTERNAL_EMAIL_SUFFIX) ||
    LEGACY_EMAIL_SUFFIXES.some((suffix) => email.endsWith(suffix))
  );
}

/**
 * Returns the human-facing display email or null if the customer has no email.
 */
export function displayCustomerEmail(email?: string | null): string | null {
  if (!email || isInternalEmail(email)) return null;
  return email;
}

/**
 * Parses the customer metadata (website URL and internal notes)
 * stored in the customer's socialHandle column.
 */
export function parseCustomerMeta(socialHandle?: string | null): {
  website: string | null;
  notes: string | null;
} {
  if (!socialHandle) return { website: null, notes: null };
  const trimmed = socialHandle.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        website:
          typeof parsed.website === "string"
            ? parsed.website.trim() || null
            : null,
        notes:
          typeof parsed.notes === "string" ? parsed.notes.trim() || null : null,
      };
    } catch {
      // Not JSON formatted; treat as direct website/social handle
    }
  }
  return { website: trimmed, notes: null };
}

/**
 * Serializes website URL and customer notes into a single storage string.
 */
export function formatCustomerMeta(
  website?: string | null,
  notes?: string | null,
): string | null {
  const cleanWeb = website?.trim() || null;
  const cleanNotes = notes?.trim() || null;
  if (!cleanWeb && !cleanNotes) return null;
  if (!cleanNotes) return cleanWeb;
  return JSON.stringify({ website: cleanWeb, notes: cleanNotes });
}

