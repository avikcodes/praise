import type { PlatformConnector, ConnectorPlatformId } from "./types.ts";
import { GooglePlatformConnector } from "./google-connector.ts";
import { TrustpilotPlatformConnector } from "./trustpilot-connector.ts";
import { ProductHuntPlatformConnector } from "./product-hunt-connector.ts";
import { G2PlatformConnector } from "./g2-connector.ts";
import { FacebookPlatformConnector } from "./facebook-connector.ts";
import { LinkedInManualConnector, CapterraManualConnector } from "./unsupported-connectors.ts";
import { encryptCredentials, decryptCredentials, maskCredentials } from "../../crypto/vault.ts";
import { checkConnectionTokenHealth } from "./sync-service.ts";
import { prisma } from "../../db/client.ts";
import { previewExternalImport, executeExternalImport } from "../external-importer.ts";
import type { NormalizedImportItem } from "../external-types.ts";

const CONNECTORS: Record<string, PlatformConnector> = {
  GOOGLE: new GooglePlatformConnector(),
  TRUSTPILOT: new TrustpilotPlatformConnector(),
  PRODUCT_HUNT: new ProductHuntPlatformConnector(),
  G2: new G2PlatformConnector(),
  FACEBOOK: new FacebookPlatformConnector(),
  LINKEDIN: new LinkedInManualConnector(),
  CAPTERRA: new CapterraManualConnector(),
};

export function getPlatformConnector(platformId: string): PlatformConnector | null {
  const norm = platformId.toUpperCase().trim();
  return CONNECTORS[norm] || null;
}

export function getAllPlatformConnectors(): PlatformConnector[] {
  return Object.values(CONNECTORS);
}

/**
 * Returns safe metadata for all connectors including API availability status.
 */
export function getAvailableConnectorCatalog() {
  return getAllPlatformConnectors().map((c) => ({
    platformId: c.platformId,
    name: c.name,
    authType: c.authType,
    supportsLiveApi: c.supportsLiveApi,
    unsupportedReason: c.unsupportedReason || null,
    manualExportInstructions: c.manualExportInstructions || null,
  }));
}

/**
 * Validates credentials live with provider, encrypts at rest, and saves connection.
 */
export async function connectPlatformAccount(
  workspaceId: string,
  platformId: string,
  credentials: Record<string, string>
) {
  const connector = getPlatformConnector(platformId);
  if (!connector) {
    throw new Error(`Unsupported connector platform: "${platformId}"`);
  }

  if (!connector.supportsLiveApi) {
    throw new Error(
      connector.unsupportedReason ||
        `${connector.name} does not allow automated API review retrieval. Please use manual CSV export.`
    );
  }

  // 1. Live Permission & Credential Validation
  const validation = await connector.validatePermissions(credentials);
  if (!validation.valid) {
    throw new Error(validation.error || `Failed to authenticate with ${connector.name}.`);
  }

  // 2. Encrypt Credentials at Rest
  const encrypted = encryptCredentials(credentials);

  // 3. Upsert PlatformConnection in Database
  const connection = await prisma.platformConnection.upsert({
    where: {
      workspaceId_platform_accountIdentifier: {
        workspaceId,
        platform: connector.platformId,
        accountIdentifier: validation.accountIdentifier,
      },
    },
    update: {
      accountName: validation.accountName,
      encryptedCredentials: encrypted,
      status: "CONNECTED",
      scopes: validation.scopes ? validation.scopes.join(" ") : null,
      lastError: null,
      metadataJson: validation.metadata ? JSON.stringify(validation.metadata) : null,
    },
    create: {
      workspaceId,
      platform: connector.platformId,
      accountIdentifier: validation.accountIdentifier,
      accountName: validation.accountName,
      authType: connector.authType,
      encryptedCredentials: encrypted,
      status: "CONNECTED",
      scopes: validation.scopes ? validation.scopes.join(" ") : null,
      metadataJson: validation.metadata ? JSON.stringify(validation.metadata) : null,
    },
  });

  return {
    id: connection.id,
    platform: connection.platform,
    accountIdentifier: connection.accountIdentifier,
    accountName: connection.accountName,
    status: connection.status,
    authType: connection.authType,
    maskedCredentials: maskCredentials(credentials),
    scopes: connection.scopes?.split(" ") || [],
    metadata: validation.metadata || null,
    createdAt: connection.createdAt,
    lastSyncAt: connection.lastSyncAt,
  };
}

/**
 * Re-validates an existing connection live with provider.
 */
export async function validateExistingConnection(workspaceId: string, connectionId: string) {
  const connection = await prisma.platformConnection.findFirst({
    where: { id: connectionId, workspaceId },
  });

  if (!connection) {
    throw new Error("Connection not found.");
  }

  const connector = getPlatformConnector(connection.platform);
  if (!connector || !connector.supportsLiveApi) {
    throw new Error("This platform does not support automated API testing.");
  }

  const credentials = decryptCredentials(connection.encryptedCredentials);
  const validation = await connector.validatePermissions(credentials);

  if (!validation.valid) {
    await prisma.platformConnection.update({
      where: { id: connectionId },
      data: {
        status: "ERROR",
        lastError: validation.error || "Permission validation failed.",
      },
    });
    return { valid: false, error: validation.error };
  }

  await prisma.platformConnection.update({
    where: { id: connectionId },
    data: {
      status: "CONNECTED",
      lastError: null,
      accountName: validation.accountName || connection.accountName,
      metadataJson: validation.metadata ? JSON.stringify(validation.metadata) : connection.metadataJson,
    },
  });

  return { valid: true, accountName: validation.accountName };
}

/**
 * Fetches accessible reviews from provider API and runs duplicate detection.
 */
export async function syncConnectionReviews(
  workspaceId: string,
  connectionId: string,
  options?: { limit?: number; autoImportPending?: boolean; defaultProjectId?: string }
) {
  const connection = await prisma.platformConnection.findFirst({
    where: { id: connectionId, workspaceId },
  });

  if (!connection) {
    throw new Error("Connection not found.");
  }

  const connector = getPlatformConnector(connection.platform);
  if (!connector || !connector.supportsLiveApi) {
    throw new Error("This platform does not support automated review retrieval.");
  }

  try {
    const credentials = decryptCredentials(connection.encryptedCredentials);
    const rawItems = await connector.fetchReviews(credentials, { limit: options?.limit });

    // Use previewExternalImport for unified duplicate checking
    const preview = await previewExternalImport({
      workspaceId,
      platform: connection.platform,
      rawData: rawItems,
    });

    // Update connection status
    await prisma.platformConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: new Date(),
        status: "CONNECTED",
        lastError: null,
      },
    });

    // If autoImportPending is requested, import valid non-duplicates as PENDING
    if (options?.autoImportPending) {
      const itemsToImport = preview.items.filter((i) => !i.isDuplicateCandidate);
      if (itemsToImport.length > 0) {
        const importResult = await executeExternalImport({
          workspaceId,
          platform: connection.platform,
          items: itemsToImport,
          defaultProjectId: options.defaultProjectId,
          skipDuplicates: true,
          actorName: `Auto-Sync (${connector.name})`,
        });

        return {
          preview,
          imported: importResult,
        };
      }
    }

    return { preview, imported: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Sync failed";
    await prisma.platformConnection.update({
      where: { id: connectionId },
      data: {
        status: "ERROR",
        lastError: errorMsg,
      },
    });
    throw err;
  }
}

/**
 * Disconnects and permanently removes stored credentials.
 */
export async function disconnectPlatformAccount(workspaceId: string, connectionId: string) {
  const connection = await prisma.platformConnection.findFirst({
    where: { id: connectionId, workspaceId },
  });

  if (!connection) {
    throw new Error("Connection not found.");
  }

  await prisma.platformConnection.delete({
    where: { id: connectionId },
  });

  return { success: true, platform: connection.platform, accountIdentifier: connection.accountIdentifier };
}

/**
 * Lists all active platform connections for a workspace with masked credentials.
 */
export async function listWorkspaceConnections(workspaceId: string) {
  const connections = await prisma.platformConnection.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return connections.map((c) => {
    let metadata: any = null;
    if (c.metadataJson) {
      try {
        metadata = JSON.parse(c.metadataJson);
      } catch {}
    }

    let masked: Record<string, string> = {};
    try {
      const creds = decryptCredentials(c.encryptedCredentials);
      masked = maskCredentials(creds);
    } catch {
      masked = { key: "••••••••" };
    }

    return {
      id: c.id,
      platform: c.platform,
      accountIdentifier: c.accountIdentifier,
      accountName: c.accountName,
      status: c.status,
      authType: c.authType,
      scopes: c.scopes ? c.scopes.split(" ") : [],
      lastSyncAt: c.lastSyncAt,
      lastSuccessfulSyncAt: c.lastSuccessfulSyncAt,
      lastSyncStatus: c.lastSyncStatus,
      nextSyncAt: c.nextSyncAt,
      syncEnabled: c.syncEnabled,
      syncFrequency: c.syncFrequency,
      retryCount: c.retryCount,
      maxRetries: c.maxRetries,
      targetProjectId: c.targetProjectId,
      lastSeenTimestamp: c.lastSeenTimestamp,
      tokenHealth: checkConnectionTokenHealth(c),
      lastError: c.lastError,
      metadata,
      maskedCredentials: masked,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  });
}
