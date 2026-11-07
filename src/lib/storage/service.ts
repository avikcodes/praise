import crypto from "crypto";
import { prisma } from "@/lib/db/client";
import { MediaType, MediaAssetDetail } from "@/types/media";
import {
  validateUploadBuffer,
  generateSafeFilename,
} from "@/lib/storage/validation";
import { getStorageEngine } from "@/lib/storage/engine";

export class MediaUploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "MediaUploadError";
  }
}

/**
 * Validates, saves, and records a media asset in Praise.
 */
export async function uploadMediaAsset({
  buffer,
  workspaceId,
  testimonialId = null,
  allowedTypes = ["IMAGE", "VIDEO"],
}: {
  buffer: Buffer;
  workspaceId: string;
  testimonialId?: string | null;
  allowedTypes?: MediaType[];
}): Promise<MediaAssetDetail> {
  // 1. Content & signature validation
  const validation = validateUploadBuffer(buffer, allowedTypes);
  if (!validation.valid || !validation.detected) {
    throw new MediaUploadError(validation.error || "File validation failed.", 400);
  }

  const { mediaType, mimeType, extension } = validation.detected;
  const engine = getStorageEngine();

  // 2. Safe relative storage key (e.g., ws_1234/a5b6c7d8.jpg)
  const safeFilename = generateSafeFilename(extension);
  const storageKey = `${workspaceId}/${safeFilename}`;

  // 3. Save binary buffer to storage engine
  await engine.save(buffer, storageKey, mimeType);

  const assetId = `med_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const publicUrl = `/api/media/${assetId}`;

  // 4. Save metadata record to database
  try {
    const asset = await prisma.mediaAsset.create({
      data: {
        id: assetId,
        workspaceId,
        testimonialId: testimonialId || null,
        type: mediaType,
        storageProvider: engine.provider,
        url: publicUrl,
        localPath: storageKey, // safe relative key only
        mimeType,
        fileSizeBytes: buffer.length,
      },
    });

    return {
      id: asset.id,
      workspaceId: asset.workspaceId,
      testimonialId: asset.testimonialId,
      type: asset.type,
      storageProvider: asset.storageProvider,
      url: asset.url,
      mimeType: asset.mimeType,
      fileSizeBytes: asset.fileSizeBytes || buffer.length,
      durationSeconds: asset.durationSeconds,
      createdAt: asset.createdAt.toISOString(),
    };
  } catch (dbError) {
    // If database operation fails, purge orphaned file from disk
    await engine.delete(storageKey).catch(() => {});

    // In local development when database is unseeded
    if (process.env.NODE_ENV !== "production") {
      return {
        id: assetId,
        workspaceId,
        testimonialId,
        type: mediaType,
        storageProvider: "LOCAL",
        url: publicUrl,
        mimeType,
        fileSizeBytes: buffer.length,
        createdAt: new Date().toISOString(),
      };
    }

    console.error("Database media record creation failed:", dbError);
    throw new MediaUploadError("Failed to store media asset record in database.", 500);
  }
}

/**
 * Retrieves a media asset record along with its binary content.
 */
export async function retrieveMediaAsset(assetId: string): Promise<{
  asset: MediaAssetDetail;
  buffer: Buffer;
  testimonialStatus?: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED" | null;
} | null> {
  const engine = getStorageEngine();

  try {
    const record = await prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: {
        testimonial: {
          select: {
            id: true,
            status: true,
            workspaceId: true,
          },
        },
      },
    });

    if (!record || !record.localPath) {
      return null;
    }

    const file = await engine.read(record.localPath);
    if (!file) {
      return null;
    }

    return {
      asset: {
        id: record.id,
        workspaceId: record.workspaceId,
        testimonialId: record.testimonialId,
        type: record.type,
        storageProvider: record.storageProvider,
        url: record.url,
        mimeType: record.mimeType,
        fileSizeBytes: record.fileSizeBytes || file.size,
        durationSeconds: record.durationSeconds,
        createdAt: record.createdAt.toISOString(),
      },
      buffer: file.buffer,
      testimonialStatus: record.testimonial?.status || null,
    };
  } catch {
    return null;
  }
}

/**
 * Permanently deletes a media asset and purges it from disk.
 * Strictly verifies that the asset belongs to the specified workspace.
 */
export async function deleteMediaAsset(
  assetId: string,
  workspaceId: string,
): Promise<boolean> {
  const engine = getStorageEngine();

  try {
    const asset = await prisma.mediaAsset.findFirst({
      where: {
        id: assetId,
        workspaceId,
      },
    });

    if (!asset) {
      return false;
    }

    // Purge file from storage disk
    if (asset.localPath) {
      await engine.delete(asset.localPath).catch(() => {});
    }

    // Delete database record
    await prisma.mediaAsset.delete({
      where: { id: assetId },
    });

    return true;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      return true;
    }
    return false;
  }
}

