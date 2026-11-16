import { prisma } from "../../db/client.ts";
import { getPlatformConnector } from "./registry.ts";
import { decryptCredentials } from "../../crypto/vault.ts";
import { previewExternalImport, executeExternalImport } from "../external-importer.ts";
import type { NormalizedImportItem } from "../external-types.ts";
import { TestimonialStatus } from "@prisma/client";

export type SyncFrequency =
  | "HOURLY"
  | "EVERY_6_HOURS"
  | "EVERY_12_HOURS"
  | "DAILY"
  | "WEEKLY";

export interface SyncConfigParams {
  workspaceId: string;
  connectionId: string;
  syncEnabled: boolean;
  syncFrequency?: SyncFrequency | string;
  targetProjectId?: string | null;
  maxRetries?: number;
}

export interface SyncExecutionResult {
  success: boolean;
  connectionId: string;
  platform: string;
  itemsFetched: number;
  itemsImported: number;
  duplicatesSkipped: number;
  durationMs: number;
  lastSyncAt: Date;
  nextSyncAt: Date | null;
  status: string;
  error?: string;
  rateLimitEncountered?: boolean;
}

/**
 * Calculates the next scheduled synchronization execution timestamp.
 */
export function calculateNextSyncTime(
  frequency: string = "DAILY",
  fromDate: Date = new Date()
): Date {
  const next = new Date(fromDate);
  const freq = (frequency || "DAILY").toUpperCase().trim();

  switch (freq) {
    case "HOURLY":
      next.setHours(next.getHours() + 1);
      break;
    case "EVERY_6_HOURS":
      next.setHours(next.getHours() + 6);
      break;
    case "EVERY_12_HOURS":
      next.setHours(next.getHours() + 12);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "DAILY":
    default:
      next.setDate(next.getDate() + 1);
      break;
  }

  return next;
}

/**
 * Safe exponential / stepped retry backoff interval in minutes.
 * Retry 1: 5 mins, Retry 2: 15 mins, Retry 3: 60 mins, Retry 4+: 180 mins.
 */
export function calculateRetryBackoffMinutes(retryCount: number): number {
  if (retryCount <= 1) return 5;
  if (retryCount === 2) return 15;
  if (retryCount === 3) return 60;
  return 180;
}

/**
 * Checks token expiration and permission health.
 */
export function checkConnectionTokenHealth(connection: {
  status: string;
  expiresAt?: Date | string | null;
  lastError?: string | null;
}): {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry?: number;
  alertLevel: "HEALTHY" | "WARNING" | "ERROR";
  alertMessage?: string;
} {
  if (connection.status === "EXPIRED") {
    return {
      isExpired: true,
      isExpiringSoon: false,
      alertLevel: "ERROR",
      alertMessage:
        connection.lastError ||
        "Token has expired or provider authorization was revoked. Please reconnect your account.",
    };
  }

  if (connection.expiresAt) {
    const expiry = new Date(connection.expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs <= 0) {
      return {
        isExpired: true,
        isExpiringSoon: false,
        daysUntilExpiry: 0,
        alertLevel: "ERROR",
        alertMessage: "OAuth access token expired. Re-authentication is required to sync new reviews.",
      };
    }

    if (daysLeft <= 7) {
      return {
        isExpired: false,
        isExpiringSoon: true,
        daysUntilExpiry: daysLeft,
        alertLevel: "WARNING",
        alertMessage: `OAuth token will expire in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Reconnect your account soon to prevent sync interruptions.`,
      };
    }
  }

  return {
    isExpired: false,
    isExpiringSoon: false,
    alertLevel: "HEALTHY",
    alertMessage: "Connection authorized and healthy.",
  };
}

/**
 * Configures scheduled synchronization settings for a connected review account.
 */
export async function configureConnectionSync(
  params: SyncConfigParams,
  dbClient: any = prisma
) {
  const {
    workspaceId,
    connectionId,
    syncEnabled,
    syncFrequency = "DAILY",
    targetProjectId,
    maxRetries = 3,
  } = params;

  const connection = await dbClient.platformConnection.findFirst({
    where: { id: connectionId, workspaceId },
  });

  if (!connection) {
    throw new Error(`Platform connection not found (#${connectionId}).`);
  }

  let nextSyncAt: Date | null = connection.nextSyncAt;
  if (syncEnabled) {
    // If enabled and no future sync is scheduled, schedule the first run
    if (!nextSyncAt || nextSyncAt <= new Date()) {
      nextSyncAt = calculateNextSyncTime(syncFrequency, new Date());
    }
  } else {
    // If disabled, clear next sync schedule
    nextSyncAt = null;
  }

  const updated = await dbClient.platformConnection.update({
    where: { id: connectionId },
    data: {
      syncEnabled,
      syncFrequency,
      targetProjectId: targetProjectId !== undefined ? targetProjectId : connection.targetProjectId,
      maxRetries: maxRetries || 3,
      nextSyncAt,
    },
  });

  return {
    id: updated.id,
    platform: updated.platform,
    syncEnabled: updated.syncEnabled,
    syncFrequency: updated.syncFrequency,
    nextSyncAt: updated.nextSyncAt,
    targetProjectId: updated.targetProjectId,
    maxRetries: updated.maxRetries,
  };
}

/**
 * Executes review synchronization for a single platform connection.
 *
 * Requirements Guarantee:
 * - Incremental sync: Only queries and ingests reviews newer than lastSeenTimestamp.
 * - Duplicate prevention: Skips existing testimonials (URL or text match).
 * - Feedback integrity: NEVER modifies or overwrites manually edited testimonials.
 * - Moderation compliance: Newly imported records strictly default to PENDING.
 * - Audit logging: Records full sync execution history in PlatformSyncLog.
 * - Idempotency: Sets lastSyncStatus to RUNNING during execution to prevent concurrent overlaps.
 */
export async function executeConnectionSync(
  params: {
    workspaceId: string;
    connectionId: string;
    triggerType?: "MANUAL" | "SCHEDULED" | "RETRY";
    defaultProjectId?: string | null;
    limit?: number;
  },
  dbClient: any = prisma
): Promise<SyncExecutionResult> {
  const {
    workspaceId,
    connectionId,
    triggerType = "MANUAL",
    defaultProjectId,
    limit = 50,
  } = params;

  const startedAt = new Date();

  // 1. Load connection
  const connection = await dbClient.platformConnection.findFirst({
    where: { id: connectionId, workspaceId },
  });

  if (!connection) {
    throw new Error(`Connection not found (#${connectionId}).`);
  }

  const connector = getPlatformConnector(connection.platform);
  if (!connector || !connector.supportsLiveApi) {
    throw new Error(`${connection.platform} does not support automated API synchronization.`);
  }

  // 2. Token Health & Expiry Check
  const tokenHealth = checkConnectionTokenHealth(connection);
  if (tokenHealth.isExpired) {
    await dbClient.platformConnection.update({
      where: { id: connectionId },
      data: {
        status: "EXPIRED",
        lastSyncStatus: "FAILED",
        lastError: tokenHealth.alertMessage,
      },
    });

    if (dbClient.platformSyncLog) {
      await dbClient.platformSyncLog.create({
        data: {
          workspaceId,
          connectionId,
          platform: connection.platform,
          status: "FAILED",
          triggerType,
          itemsFetched: 0,
          itemsImported: 0,
          duplicatesSkipped: 0,
          errorMessage: tokenHealth.alertMessage,
          startedAt,
          completedAt: new Date(),
          durationMs: Date.now() - startedAt.getTime(),
        },
      });
    }

    return {
      success: false,
      connectionId,
      platform: connection.platform,
      itemsFetched: 0,
      itemsImported: 0,
      duplicatesSkipped: 0,
      durationMs: Date.now() - startedAt.getTime(),
      lastSyncAt: connection.lastSyncAt || startedAt,
      nextSyncAt: connection.nextSyncAt,
      status: "EXPIRED",
      error: tokenHealth.alertMessage,
    };
  }

  // 3. Mark connection as RUNNING for concurrency safety
  await dbClient.platformConnection.update({
    where: { id: connectionId },
    data: {
      lastSyncStatus: "RUNNING",
    },
  });

  // 4. Create in-progress SyncLog entry
  let syncLogId: string | null = null;
  if (dbClient.platformSyncLog) {
    try {
      const log = await dbClient.platformSyncLog.create({
        data: {
          workspaceId,
          connectionId,
          platform: connection.platform,
          status: "RUNNING",
          triggerType,
          startedAt,
          cursorBefore: connection.lastSeenTimestamp
            ? new Date(connection.lastSeenTimestamp).toISOString()
            : connection.lastSeenCursor || null,
        },
      });
      syncLogId = log.id;
    } catch {
      // Non-blocking log creation
    }
  }

  try {
    // 5. Decrypt credentials & execute incremental fetch
    const credentials = decryptCredentials(connection.encryptedCredentials);
    const sinceTimestamp = connection.lastSeenTimestamp
      ? new Date(connection.lastSeenTimestamp)
      : undefined;

    const rawItems: NormalizedImportItem[] = await connector.fetchReviews(credentials, {
      limit,
      since: sinceTimestamp,
      cursor: connection.lastSeenCursor || undefined,
    });

    // 6. Run duplicate detection
    const preview = await previewExternalImport({
      workspaceId,
      platform: connection.platform,
      rawData: rawItems,
    });

    // Filter to only new non-duplicate items
    // Strict requirement: Preserve all manually edited testimonial content.
    // Existing testimonials are NEVER updated or overwritten.
    const newItemsToImport = preview.items.filter((i) => !i.isDuplicateCandidate);
    const duplicatesCount = preview.items.filter((i) => i.isDuplicateCandidate).length;

    let importedCount = 0;
    const targetProject =
      defaultProjectId || connection.targetProjectId || undefined;

    if (newItemsToImport.length > 0) {
      const importResult = await executeExternalImport({
        workspaceId,
        platform: connection.platform,
        items: newItemsToImport,
        defaultProjectId: targetProject,
        skipDuplicates: true,
        actorName: `Scheduled Sync (${connector.name})`,
      });

      importedCount = importResult.importedCount;
    }

    // 7. Calculate highest review timestamp seen for incremental cursor
    let highestTimestamp = connection.lastSeenTimestamp
      ? new Date(connection.lastSeenTimestamp)
      : null;

    for (const item of rawItems) {
      if (item.originalDate) {
        const itemDate = new Date(item.originalDate);
        if (!isNaN(itemDate.getTime())) {
          if (!highestTimestamp || itemDate > highestTimestamp) {
            highestTimestamp = itemDate;
          }
        }
      }
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    // 8. Calculate Next Sync Schedule
    let nextSyncAt: Date | null = null;
    if (connection.syncEnabled) {
      nextSyncAt = calculateNextSyncTime(connection.syncFrequency, completedAt);
    }

    // 9. Update Connection State (Success)
    await dbClient.platformConnection.update({
      where: { id: connectionId },
      data: {
        status: "CONNECTED",
        lastSyncAt: completedAt,
        lastSuccessfulSyncAt: completedAt,
        lastSyncStatus: "SUCCESS",
        lastError: null,
        retryCount: 0, // Reset retry count upon success
        nextSyncAt,
        lastSeenTimestamp: highestTimestamp,
      },
    });

    // 10. Update Sync Log
    if (dbClient.platformSyncLog && syncLogId) {
      try {
        await dbClient.platformSyncLog.update({
          where: { id: syncLogId },
          data: {
            status: "SUCCESS",
            itemsFetched: rawItems.length,
            itemsImported: importedCount,
            duplicatesSkipped: duplicatesCount,
            durationMs,
            completedAt,
            cursorAfter: highestTimestamp ? highestTimestamp.toISOString() : null,
          },
        });
      } catch {}
    }

    return {
      success: true,
      connectionId,
      platform: connection.platform,
      itemsFetched: rawItems.length,
      itemsImported: importedCount,
      duplicatesSkipped: duplicatesCount,
      durationMs,
      lastSyncAt: completedAt,
      nextSyncAt,
      status: "SUCCESS",
    };
  } catch (err: unknown) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const errorMsg = err instanceof Error ? err.message : "Sync execution failed.";

    // Detect if error is an authentication / permission error
    const isAuthError =
      /unauthorized|invalid.?token|expired|forbidden|permission.?denied|request_denied/i.test(
        errorMsg
      );

    const isRateLimited = /rate.?limit|too.?many.?requests|429/i.test(errorMsg);

    const nextRetryCount = (connection.retryCount || 0) + 1;
    const maxRetries = connection.maxRetries || 3;

    let nextSyncAt: Date | null = null;

    if (isAuthError) {
      // Don't auto-retry invalid credentials; alert the user
      nextSyncAt = null;
    } else if (connection.syncEnabled) {
      if (nextRetryCount <= maxRetries) {
        // Schedule safe exponential backoff retry
        const backoffMinutes = calculateRetryBackoffMinutes(nextRetryCount);
        nextSyncAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
      } else {
        // Exceeded retries, schedule for next regular cycle
        nextSyncAt = calculateNextSyncTime(connection.syncFrequency, completedAt);
      }
    }

    const newConnectionStatus = isAuthError ? "EXPIRED" : "ERROR";

    // Update Connection State (Error)
    await dbClient.platformConnection.update({
      where: { id: connectionId },
      data: {
        status: newConnectionStatus,
        lastSyncAt: completedAt,
        lastSyncStatus: "FAILED",
        lastError: errorMsg,
        retryCount: isAuthError ? 0 : nextRetryCount,
        nextSyncAt,
      },
    });

    // Update Sync Log (Error)
    if (dbClient.platformSyncLog && syncLogId) {
      try {
        await dbClient.platformSyncLog.update({
          where: { id: syncLogId },
          data: {
            status: "FAILED",
            errorMessage: errorMsg,
            durationMs,
            completedAt,
          },
        });
      } catch {}
    }

    return {
      success: false,
      connectionId,
      platform: connection.platform,
      itemsFetched: 0,
      itemsImported: 0,
      duplicatesSkipped: 0,
      durationMs,
      lastSyncAt: completedAt,
      nextSyncAt,
      status: newConnectionStatus,
      error: errorMsg,
      rateLimitEncountered: isRateLimited,
    };
  }
}

/**
 * Background worker task: checks and processes all connections due for scheduled sync.
 */
export async function processScheduledPlatformSyncs(
  params: {
    now?: Date;
    limit?: number;
  } = {},
  dbClient: any = prisma
) {
  const now = params.now || new Date();
  const limit = params.limit || 50;

  // Find enabled connections that are due and not currently running or expired
  const dueConnections = await dbClient.platformConnection.findMany({
    where: {
      syncEnabled: true,
      nextSyncAt: { lte: now },
      status: { notIn: ["EXPIRED", "UNSUPPORTED"] },
      NOT: { lastSyncStatus: "RUNNING" },
    },
    take: limit,
    orderBy: { nextSyncAt: "asc" },
  });

  const results: SyncExecutionResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const conn of dueConnections) {
    const triggerType = (conn.retryCount || 0) > 0 ? "RETRY" : "SCHEDULED";
    try {
      const res = await executeConnectionSync(
        {
          workspaceId: conn.workspaceId,
          connectionId: conn.id,
          triggerType,
          defaultProjectId: conn.targetProjectId,
        },
        dbClient
      );

      results.push(res);
      if (res.success) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (err: unknown) {
      failedCount++;
      results.push({
        success: false,
        connectionId: conn.id,
        platform: conn.platform,
        itemsFetched: 0,
        itemsImported: 0,
        duplicatesSkipped: 0,
        durationMs: 0,
        lastSyncAt: now,
        nextSyncAt: null,
        status: "FAILED",
        error: err instanceof Error ? err.message : "Unexpected worker failure",
      });
    }
  }

  return {
    timestamp: now,
    dueCount: dueConnections.length,
    processedCount: results.length,
    successCount,
    failedCount,
    results,
  };
}

/**
 * Retrieves the sync history logs for a specific connection.
 */
export async function getConnectionSyncLogs(
  workspaceId: string,
  connectionId: string,
  limit: number = 30,
  dbClient: any = prisma
) {
  if (!dbClient.platformSyncLog) return [];

  return dbClient.platformSyncLog.findMany({
    where: { workspaceId, connectionId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}
