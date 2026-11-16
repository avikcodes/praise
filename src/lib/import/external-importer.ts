import { prisma } from "../db/client.ts";
import { getExternalAdapter } from "./adapters/registry.ts";
import type {
  ExternalPlatformId,
  ExecuteImportParams,
  ExecuteImportResult,
  ImportPreviewResult,
  NormalizedImportItem,
} from "./external-types.ts";
import { logModerationActivity } from "../moderation/activity.ts";
import { formatCustomerMeta, INTERNAL_EMAIL_SUFFIX } from "../customers/utils.ts";
import { TestimonialStatus } from "@prisma/client";

function normalizeText(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Parses and validates external platform payloads, running duplicate detection
 * before the user commits the import.
 */
export async function previewExternalImport(params: {
  workspaceId: string;
  platform: string;
  rawData: unknown;
  customMappings?: Record<string, string>;
}): Promise<ImportPreviewResult> {
  const { workspaceId, platform, rawData, customMappings } = params;

  const adapter = getExternalAdapter(platform);
  if (!adapter) {
    throw new Error(`Unsupported external platform adapter: "${platform}".`);
  }

  // 1. Parse raw payload using platform adapter
  const parsedItems = adapter.parse(rawData, customMappings);
  if (parsedItems.length === 0) {
    return {
      platform: adapter.id,
      platformName: adapter.name,
      totalParsed: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      items: [],
      errors: ["No valid reviews or records found in the provided payload."],
    };
  }

  // 2. Fetch existing workspace testimonials to detect duplicate text or URLs
  const existing = await prisma.testimonial.findMany({
    where: { workspaceId },
    select: {
      id: true,
      content: true,
      sourceUrl: true,
    },
  });

  const existingTextMap = new Map<string, string>(); // normalized text -> testimonial id
  const existingUrlMap = new Map<string, string>(); // url -> testimonial id

  for (const t of existing) {
    if (t.content) existingTextMap.set(normalizeText(t.content), t.id);
    if (t.sourceUrl) existingUrlMap.set(t.sourceUrl.trim().toLowerCase(), t.id);
  }

  let duplicateCount = 0;
  let validCount = 0;
  let invalidCount = 0;
  const processedItems: NormalizedImportItem[] = [];

  for (let i = 0; i < parsedItems.length; i++) {
    const item = parsedItems[i];
    const norm = normalizeText(item.content);

    if (!norm) {
      invalidCount++;
      continue;
    }

    let isDuplicate = false;
    let duplicateReason: string | null = null;
    let existingId: string | null = null;

    if (existingTextMap.has(norm)) {
      isDuplicate = true;
      existingId = existingTextMap.get(norm)!;
      duplicateReason = `Duplicate text matches existing testimonial (#${existingId.slice(-6)})`;
    } else if (item.sourceUrl && existingUrlMap.has(item.sourceUrl.trim().toLowerCase())) {
      isDuplicate = true;
      existingId = existingUrlMap.get(item.sourceUrl.trim().toLowerCase())!;
      duplicateReason = `Source URL matches existing testimonial (#${existingId.slice(-6)})`;
    }

    if (isDuplicate) {
      duplicateCount++;
    } else {
      validCount++;
    }

    processedItems.push({
      ...item,
      id: `preview-${i + 1}`,
      isDuplicateCandidate: isDuplicate,
      duplicateReason,
      existingTestimonialId: existingId,
      selected: !isDuplicate, // Automatically deselect duplicate candidates
    });
  }

  return {
    platform: adapter.id,
    platformName: adapter.name,
    totalParsed: parsedItems.length,
    validCount,
    duplicateCount,
    invalidCount,
    items: processedItems,
    errors: [],
  };
}

/**
 * Commits approved items from an external review/social platform import into Praise.
 *
 * CRITICAL REQUIREMENTS:
 * - All imported testimonials are stored as `status: PENDING` (unpublished until approved).
 * - Avoids duplicate customer records.
 * - Records full ImportBatch history with statistics and audit trail.
 */
export async function executeExternalImport(params: ExecuteImportParams): Promise<ExecuteImportResult> {
  const {
    workspaceId,
    platform,
    items,
    actorUserId,
    actorName = "Workspace Administrator",
    defaultProjectId,
    skipDuplicates = true,
  } = params;

  if (!items || items.length === 0) {
    throw new Error("No items provided for import.");
  }

  // Filter items
  const candidates = items.filter((item) => {
    if (skipDuplicates && item.isDuplicateCandidate) return false;
    return Boolean(item.content && item.content.trim());
  });

  if (candidates.length === 0) {
    throw new Error("All items were skipped due to duplicate detection or empty content.");
  }

  // Pre-fetch existing customers in workspace to prevent duplicate customer profiles
  const existingCustomers = await prisma.customer.findMany({
    where: { workspaceId },
    select: { id: true, email: true, name: true, company: true, title: true },
  });

  const customerEmailMap = new Map<string, (typeof existingCustomers)[0]>();
  for (const c of existingCustomers) {
    if (c.email) customerEmailMap.set(c.email.toLowerCase().trim(), c);
  }

  const batchId = `ext_batch_${Date.now()}`;
  let importedCount = 0;
  let duplicatesCount = items.filter((i) => i.isDuplicateCandidate).length;
  let failedCount = 0;
  const importedIds: string[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];

    try {
      // 1. Resolve or create customer
      let customerId: string | null = null;
      const rawEmail = item.authorEmail?.trim().toLowerCase();
      const isValidEmail = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);

      if (isValidEmail) {
        const existing = customerEmailMap.get(rawEmail);
        if (existing) {
          customerId = existing.id;
        } else {
          const meta = formatCustomerMeta(
            item.sourceUrl || null,
            `Imported from ${platform}`
          );

          const created = await prisma.customer.create({
            data: {
              workspaceId,
              name: item.authorName?.trim() || "Customer",
              email: rawEmail,
              company: item.authorCompany?.trim() || null,
              title: item.authorTitle?.trim() || null,
              avatarUrl: item.authorAvatarUrl?.trim() || null,
              socialHandle: item.authorHandle || meta,
            },
          });
          customerId = created.id;
          customerEmailMap.set(rawEmail, created);
        }
      } else {
        // Customer without email: generate unique internal identity
        const rand = Math.random().toString(36).substring(2, 9);
        const internalEmail = `no-email-${platform.toLowerCase()}-${Date.now()}-${rand}${INTERNAL_EMAIL_SUFFIX}`;
        const meta = formatCustomerMeta(
          item.sourceUrl || null,
          `Imported from ${platform}`
        );

        const created = await prisma.customer.create({
          data: {
            workspaceId,
            name: item.authorName?.trim() || `${platform} User`,
            email: internalEmail,
            company: item.authorCompany?.trim() || null,
            title: item.authorTitle?.trim() || null,
            avatarUrl: item.authorAvatarUrl?.trim() || null,
            socialHandle: item.authorHandle || meta,
          },
        });
        customerId = created.id;
      }

      // 2. Parse Date
      let submittedAt = new Date();
      if (item.originalDate) {
        const d = new Date(item.originalDate);
        if (!isNaN(d.getTime())) submittedAt = d;
      }

      // 3. Create Testimonial record (STRICT COMPLIANCE: ALWAYS PENDING / UNPUBLISHED UNTIL APPROVED)
      const testimonial = await prisma.testimonial.create({
        data: {
          workspaceId,
          projectId: defaultProjectId || null,
          customerId,
          content: item.content.trim(),
          rating: item.rating ? Math.max(1, Math.min(5, Math.round(item.rating))) : 5,
          type: "TEXT",
          status: TestimonialStatus.PENDING, // Unpublished until approved
          isFeatured: false,
          sourceType: platform.toUpperCase(),
          sourceUrl: item.sourceUrl || null,
          importBatchId: batchId,
          importSourceDetailsJson: JSON.stringify({
            platform: platform.toUpperCase(),
            externalId: item.externalId || null,
            originalRating: item.originalRating || null,
            authorHandle: item.authorHandle || null,
            authorAvatarUrl: item.authorAvatarUrl || null,
            importedAt: new Date().toISOString(),
          }),
          submittedAt,
        },
      });

      importedIds.push(testimonial.id);
      importedCount++;

      // Log moderation activity
      logModerationActivity({
        workspaceId,
        testimonialId: testimonial.id,
        actorId: actorUserId || undefined,
        actorName,
        action: "SUBMITTED",
        newStatus: "PENDING",
        details: `Imported from ${platform}. Review is queued for human moderation.`,
      }).catch(() => {});
    } catch (err: unknown) {
      failedCount++;
      errors.push({
        index: i,
        error: err instanceof Error ? err.message : "Failed to import testimonial",
      });
    }
  }

  // 4. Record ImportBatch in database
  await prisma.importBatch.create({
    data: {
      id: batchId,
      workspaceId,
      sourcePlatform: platform.toUpperCase(),
      sourceLabel: `${platform} Import (${importedCount} items)`,
      status: failedCount > 0 ? (importedCount > 0 ? "PARTIAL" : "FAILED") : "COMPLETED",
      totalRecords: items.length,
      importedCount,
      duplicatesCount,
      failedCount,
      errorsJson: errors.length > 0 ? JSON.stringify(errors) : null,
      importedByUserId: actorUserId || null,
      importedByName: actorName,
    },
  });

  return {
    batchId,
    totalRecords: items.length,
    importedCount,
    duplicatesCount,
    failedCount,
    importedIds,
    errors,
  };
}

/**
 * Retrieves historical import batches for a workspace.
 */
export async function getWorkspaceImportBatches(workspaceId: string, limit = 50) {
  return prisma.importBatch.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
