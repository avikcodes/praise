import { prisma } from "../db/client.ts";

/**
 * Default Lifecycle stages for Praise Customer CRM.
 * Focused on testimonial collection and customer advocacy.
 */
export const DEFAULT_CUSTOMER_STAGES = [
  {
    key: "NEW",
    name: "New",
    description: "Newly added contact or first-time testimonial submitter",
    color: "#64748B", // Slate
    order: 1,
    isDefault: true,
    isSystem: true,
  },
  {
    key: "ACTIVE",
    name: "Active",
    description: "Engaged customer currently using your product or service",
    color: "#3B82F6", // Blue
    order: 2,
    isDefault: false,
    isSystem: true,
  },
  {
    key: "PROMOTER",
    name: "Promoter",
    description: "Highly satisfied customer giving positive ratings and reviews",
    color: "#10B981", // Emerald
    order: 3,
    isDefault: false,
    isSystem: true,
  },
  {
    key: "CHAMPION",
    name: "Champion",
    description: "Key advocate, power user, video reviewer, or case study candidate",
    color: "#7049D8", // Brand Purple
    order: 4,
    isDefault: false,
    isSystem: true,
  },
  {
    key: "AT_RISK",
    name: "At Risk",
    description: "Customer needing attention, follow-up, or support intervention",
    color: "#F59E0B", // Amber
    order: 5,
    isDefault: false,
    isSystem: true,
  },
  {
    key: "INACTIVE",
    name: "Inactive",
    description: "Past customer or churned account with no recent interactions",
    color: "#94A3B8", // Cool Gray
    order: 6,
    isDefault: false,
    isSystem: true,
  },
] as const;

export type CustomerStageKey =
  | "NEW"
  | "ACTIVE"
  | "PROMOTER"
  | "CHAMPION"
  | "AT_RISK"
  | "INACTIVE"
  | string;

/**
 * Ensures standard default stages exist for a workspace.
 */
export async function ensureDefaultStages(workspaceId: string) {
  const existing = await prisma.customerStage.findMany({
    where: { workspaceId },
    orderBy: { order: "asc" },
  });

  if (existing.length > 0) {
    return existing;
  }

  // Seed default stages
  const createdStages = [];
  for (const s of DEFAULT_CUSTOMER_STAGES) {
    const stage = await prisma.customerStage.create({
      data: {
        workspaceId,
        key: s.key,
        name: s.name,
        description: s.description,
        color: s.color,
        order: s.order,
        isDefault: s.isDefault,
        isSystem: s.isSystem,
      },
    });
    createdStages.push(stage);
  }

  return createdStages;
}

/**
 * Helper to log a customer activity history entry.
 */
export async function logCustomerActivity(params: {
  workspaceId: string;
  customerId: string;
  action:
    | "CREATED"
    | "IMPORTED"
    | "STAGE_CHANGED"
    | "NOTE_ADDED"
    | "NOTE_DELETED"
    | "TESTIMONIAL_SUBMITTED"
    | "TESTIMONIAL_APPROVED"
    | "TAG_ADDED"
    | "TAG_REMOVED"
    | "ATTRIBUTE_UPDATED"
    | "PROFILE_UPDATED"
    | "BULK_UPDATED";
  actorId?: string | null;
  actorName?: string | null;
  details?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    return await prisma.customerActivity.create({
      data: {
        workspaceId: params.workspaceId,
        customerId: params.customerId,
        actorId: params.actorId || null,
        actorName: params.actorName || "System",
        action: params.action,
        details: params.details || null,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (err) {
    console.error("Failed to log customer activity:", err);
    return null;
  }
}

export type ImportContactInput = {
  name: string;
  email: string;
  company?: string | null;
  title?: string | null;
  website?: string | null;
  stage?: string | null;
  tags?: string[];
  customAttributes?: Record<string, unknown>;
};

export type ImportContactsResult = {
  totalProcessed: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: Array<{ email: string; reason: string }>;
};

/**
 * Imports contacts with strict duplicate avoidance.
 * Matches on normalized email (case-insensitive).
 *
 * If duplicate exists and updateExisting is true:
 * - Non-empty fields are merged.
 * - Custom attributes are deep-merged.
 * - New tags are linked without duplicating existing associations.
 * - An activity entry is logged.
 * - ZERO duplicate customer records are ever created.
 */
export async function importContactsSafely(params: {
  workspaceId: string;
  contacts: ImportContactInput[];
  updateExisting?: boolean;
  defaultStage?: string;
  actorId?: string | null;
  actorName?: string | null;
}): Promise<ImportContactsResult> {
  const {
    workspaceId,
    contacts,
    updateExisting = true,
    defaultStage = "NEW",
    actorId,
    actorName = "Importer",
  } = params;

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: Array<{ email: string; reason: string }> = [];

  // Pre-fetch workspace tags to resolve tag names to IDs
  const workspaceTags = await prisma.tag.findMany({
    where: { workspaceId },
  });
  const tagNameToId = new Map(workspaceTags.map((t) => [t.name.toLowerCase().trim(), t.id]));

  for (const contact of contacts) {
    const rawEmail = (contact.email || "").trim().toLowerCase();
    const rawName = (contact.name || "").trim();

    if (!rawEmail || !rawEmail.includes("@")) {
      errors.push({ email: contact.email, reason: "Invalid or missing email address" });
      continue;
    }

    if (!rawName) {
      errors.push({ email: contact.email, reason: "Customer name is required" });
      continue;
    }

    try {
      // Check for existing customer in this workspace
      const existing = await prisma.customer.findUnique({
        where: {
          workspaceId_email: {
            workspaceId,
            email: rawEmail,
          },
        },
        include: {
          customerTags: true,
        },
      });

      // Resolve tag IDs
      const tagIdsToLink: string[] = [];
      if (contact.tags && Array.isArray(contact.tags)) {
        for (const tagName of contact.tags) {
          const cleanTagName = tagName.trim();
          if (!cleanTagName) continue;
          let tagId = tagNameToId.get(cleanTagName.toLowerCase());
          if (!tagId) {
            // Auto-create tag if not existing
            const newTag = await prisma.tag.create({
              data: {
                workspaceId,
                name: cleanTagName,
                color: "#7049D8",
              },
            });
            tagId = newTag.id;
            tagNameToId.set(cleanTagName.toLowerCase(), tagId);
          }
          if (tagId && !tagIdsToLink.includes(tagId)) {
            tagIdsToLink.push(tagId);
          }
        }
      }

      if (existing) {
        if (!updateExisting) {
          skippedCount++;
          continue;
        }

        // Merge custom attributes
        let mergedAttributes = {};
        if (existing.customAttributesJson) {
          try {
            mergedAttributes = JSON.parse(existing.customAttributesJson);
          } catch {
            // ignore
          }
        }
        if (contact.customAttributes) {
          mergedAttributes = { ...mergedAttributes, ...contact.customAttributes };
        }

        // Update existing record
        await prisma.customer.update({
          where: { id: existing.id },
          data: {
            name: rawName || existing.name,
            company: contact.company?.trim() || existing.company,
            title: contact.title?.trim() || existing.title,
            website: contact.website?.trim() || existing.website,
            stage: contact.stage?.trim().toUpperCase() || existing.stage,
            customAttributesJson:
              Object.keys(mergedAttributes).length > 0
                ? JSON.stringify(mergedAttributes)
                : existing.customAttributesJson,
          },
        });

        // Add any missing tags
        const existingTagIds = new Set(existing.customerTags.map((t) => t.tagId));
        for (const tid of tagIdsToLink) {
          if (!existingTagIds.has(tid)) {
            await prisma.customerTag.create({
              data: {
                customerId: existing.id,
                tagId: tid,
                workspaceId,
              },
            });
          }
        }

        await logCustomerActivity({
          workspaceId,
          customerId: existing.id,
          action: "IMPORTED",
          actorId,
          actorName,
          details: "Contact profile updated from CSV/JSON import",
          metadata: { email: rawEmail, updatedFields: Object.keys(contact) },
        });

        updatedCount++;
      } else {
        // Create brand new customer
        const newCustomer = await prisma.customer.create({
          data: {
            workspaceId,
            name: rawName,
            email: rawEmail,
            company: contact.company?.trim() || null,
            title: contact.title?.trim() || null,
            website: contact.website?.trim() || null,
            stage: (contact.stage?.trim().toUpperCase() || defaultStage).toUpperCase(),
            customAttributesJson: contact.customAttributes
              ? JSON.stringify(contact.customAttributes)
              : null,
          },
        });

        // Link tags
        for (const tid of tagIdsToLink) {
          await prisma.customerTag.create({
            data: {
              customerId: newCustomer.id,
              tagId: tid,
              workspaceId,
            },
          });
        }

        await logCustomerActivity({
          workspaceId,
          customerId: newCustomer.id,
          action: "CREATED",
          actorId,
          actorName,
          details: "Contact created from CSV/JSON import",
          metadata: { email: rawEmail },
        });

        createdCount++;
      }
    } catch (err: unknown) {
      errors.push({
        email: contact.email,
        reason: err instanceof Error ? err.message : "Database error during import",
      });
    }
  }

  return {
    totalProcessed: contacts.length,
    createdCount,
    updatedCount,
    skippedCount,
    errors,
  };
}

/**
 * Formats a list of customers for CSV export.
 */
export function exportCustomersToCsv(
  customers: Array<{
    id: string;
    name: string;
    email: string;
    company?: string | null;
    title?: string | null;
    website?: string | null;
    stage: string;
    createdAt: Date | string;
    testimonialCount?: number;
    tags?: string[];
    associatedProjects?: string[];
    associatedBrands?: string[];
    customAttributes?: Record<string, unknown>;
  }>,
): string {
  const headers = [
    "Customer ID",
    "Name",
    "Email",
    "Company",
    "Title",
    "Website",
    "Lifecycle Stage",
    "Testimonial Count",
    "Tags",
    "Associated Projects",
    "Associated Brands",
    "Created At",
    "Custom Attributes",
  ];

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = customers.map((c) => {
    return [
      escapeCsv(c.id),
      escapeCsv(c.name),
      escapeCsv(c.email),
      escapeCsv(c.company || ""),
      escapeCsv(c.title || ""),
      escapeCsv(c.website || ""),
      escapeCsv(c.stage),
      escapeCsv(c.testimonialCount ?? 0),
      escapeCsv((c.tags || []).join("; ")),
      escapeCsv((c.associatedProjects || []).join("; ")),
      escapeCsv((c.associatedBrands || []).join("; ")),
      escapeCsv(new Date(c.createdAt).toISOString()),
      escapeCsv(c.customAttributes ? JSON.stringify(c.customAttributes) : ""),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
