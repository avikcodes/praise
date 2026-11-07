import fs from "fs/promises";
import path from "path";
import { assertSafePath } from "@/lib/storage/validation";

export type StoredFileResult = {
  key: string;
  size: number;
  mimeType: string;
};

export type FileReadResult = {
  buffer: Buffer;
  mimeType: string;
  size: number;
};

/**
 * StorageEngine interface allowing Praise to support local disk volumes
 * out of the box and seamlessly swap in an S3-compatible provider later
 * without altering application routes or validation logic.
 */
export interface StorageEngine {
  readonly provider: "LOCAL" | "S3";
  save(buffer: Buffer, key: string, mimeType: string): Promise<StoredFileResult>;
  read(key: string): Promise<FileReadResult | null>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
}

/**
 * Local filesystem implementation for self-hosted Docker and bare-metal servers.
 */
export class LocalStorageEngine implements StorageEngine {
  readonly provider = "LOCAL" as const;
  private uploadDir: string;

  constructor(customUploadDir?: string) {
    this.uploadDir = path.resolve(
      /*turbopackIgnore: true*/
      customUploadDir ||
        process.env.PRAISE_UPLOAD_DIR ||
        path.join(process.cwd(), "storage", "uploads"),
    );
  }

  /**
   * Returns the configured root upload directory (for diagnostic/internal setup only).
   */
  getUploadDirectory(): string {
    return this.uploadDir;
  }

  /**
   * Persists a validated binary buffer to disk under a partitioned relative key.
   */
  async save(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<StoredFileResult> {
    const targetPath = assertSafePath(this.uploadDir, key);
    const parentDir = path.dirname(targetPath);

    // Ensure parent directories exist
    await fs.mkdir(parentDir, { recursive: true });

    // Write file atomically to disk
    await fs.writeFile(targetPath, buffer);

    return {
      key,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Reads a binary file from the local storage disk.
   */
  async read(key: string): Promise<FileReadResult | null> {
    try {
      const targetPath = assertSafePath(this.uploadDir, key);
      const stats = await fs.stat(targetPath);

      if (!stats.isFile()) {
        return null;
      }

      const buffer = await fs.readFile(targetPath);
      return {
        buffer,
        size: stats.size,
        mimeType: "application/octet-stream", // Caller augments with database mimeType
      };
    } catch {
      return null;
    }
  }

  /**
   * Deletes a file from the local disk.
   */
  async delete(key: string): Promise<boolean> {
    try {
      const targetPath = assertSafePath(this.uploadDir, key);
      await fs.unlink(targetPath);
      return true;
    } catch {
      // File may have already been removed or does not exist
      return false;
    }
  }

  /**
   * Verifies if a file exists on disk.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const targetPath = assertSafePath(this.uploadDir, key);
      const stats = await fs.stat(targetPath);
      return stats.isFile();
    } catch {
      return false;
    }
  }
}

// Global singleton instance for local filesystem storage
let storageInstance: StorageEngine | null = null;

export function getStorageEngine(): StorageEngine {
  if (!storageInstance) {
    // Default to LocalStorageEngine for Praise self-hosted deployments
    storageInstance = new LocalStorageEngine();
  }
  return storageInstance;
}

