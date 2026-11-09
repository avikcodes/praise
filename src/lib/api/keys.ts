import crypto from "node:crypto";
import { prisma } from "@/lib/db/client";
import { ApiKeyType, WorkspaceRole } from "@prisma/client";
import { ApiKeyContext } from "./types";

/**
 * Computes a secure SHA-256 hash of an API key token.
 * Only the hash is persisted in the database; raw keys are never stored.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Generates a new cryptographically random API key.
 * 
 * Formats:
 * - Secret Live Key: `praise_live_sk_<32-hex-bytes>`
 * - Publishable Key: `praise_pk_<32-hex-bytes>`
 */
export async function createApiKeyRecord({
  workspaceId,
  name,
  type = ApiKeyType.SECRET,
  role = WorkspaceRole.MEMBER,
  scopes = [],
  expiresAt,
}: {
  workspaceId: string;
  name: string;
  type?: ApiKeyType;
  role?: WorkspaceRole;
  scopes?: string[];
  expiresAt?: Date | null;
}) {
  const entropy = crypto.randomBytes(24).toString("hex");
  const prefix = type === ApiKeyType.PUBLISHABLE ? "praise_pk_" : "praise_live_sk_";
  const rawKey = `${prefix}${entropy}`;
  const keyPrefixDisplay = `${rawKey.slice(0, 16)}...`;
  const keyHash = hashApiKey(rawKey);

  const apiKeyRecord = await prisma.apiKey.create({
    data: {
      workspaceId,
      name,
      keyPrefix: keyPrefixDisplay,
      keyHash,
      type,
      role,
      scopes: scopes.length > 0 ? scopes.join(",") : null,
      expiresAt: expiresAt || null,
    },
  });

  return {
    rawKey,
    apiKey: apiKeyRecord,
  };
}

/**
 * Validates an incoming API key string against the database or active runtime configuration.
 * Returns the authenticated ApiKeyContext or null if invalid/expired.
 */
export async function authenticateApiKey(rawKey: string): Promise<ApiKeyContext | null> {
  if (!rawKey || typeof rawKey !== "string") return null;

  const trimmed = rawKey.trim();
  const keyHash = hashApiKey(trimmed);

  // 1. Check Master / Environment API Key (useful for CI/CD, internal cron, and emergency administration)
  const masterKey = process.env.PRAISE_MASTER_API_KEY || process.env.PRAISE_API_KEY;
  if (masterKey && (trimmed === masterKey || trimmed === `Bearer ${masterKey}`)) {
    // Resolve primary workspace
    let primaryWorkspace = await prisma.workspace.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (!primaryWorkspace) {
      primaryWorkspace = await prisma.workspace.create({
        data: {
          name: "Default Workspace",
          slug: "default",
        },
      });
    }

    return {
      keyId: "master_env_key",
      keyPrefix: "praise_master_...",
      name: "Environment Master Key",
      workspaceId: primaryWorkspace.id,
      role: WorkspaceRole.OWNER,
      type: ApiKeyType.SECRET,
      scopes: ["*"],
    };
  }

  // 2. Query database for hashed API key
  try {
    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyHash },
    });

    if (!keyRecord) {
      return null;
    }

    // Check expiration
    if (keyRecord.expiresAt && keyRecord.expiresAt.getTime() < Date.now()) {
      return null;
    }

    // Touch lastUsedAt asynchronously in the background
    prisma.apiKey
      .update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Silently ignore lastUsedAt update failure
      });

    return {
      keyId: keyRecord.id,
      keyPrefix: keyRecord.keyPrefix,
      name: keyRecord.name,
      workspaceId: keyRecord.workspaceId,
      role: keyRecord.role,
      type: keyRecord.type,
      scopes: keyRecord.scopes ? keyRecord.scopes.split(",") : undefined,
    };
  } catch {
    return null;
  }
}
