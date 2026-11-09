/**
 * Backup Manifest Generator and Archive Integrity Validator.
 * Computes cryptographic SHA-256 checksums, validates file payloads,
 * and verifies referential integrity between database records and media files.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { inspectSqlDump } from "./db-backup.mjs";
import { parseTar } from "./archive.mjs";
import zlib from "node:zlib";

/**
 * Computes the SHA-256 hash of a Buffer or string.
 * @param {Buffer | string} data
 * @returns {string} hex-encoded SHA-256 hash
 */
export function computeSha256(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}

/**
 * Computes the SHA-256 hash of a file on disk.
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export async function computeFileSha256(filePath) {
  const buffer = await fs.promises.readFile(filePath);
  return computeSha256(buffer);
}

/**
 * Recursively scans a directory and collects relative file paths, sizes, and SHA-256 hashes.
 * 
 * @param {string} rootDir
 * @param {string} [subDir=""]
 * @returns {Promise<Array<{ relativePath: string, fullPath: string, sizeBytes: number, sha256: string, mtime: string }>>}
 */
export async function scanMediaDirectory(rootDir, subDir = "") {
  const currentDir = path.join(rootDir, subDir);
  if (!fs.existsSync(currentDir)) return [];

  const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const entryRelative = path.join(subDir, entry.name).replace(/\\/g, "/");
    const entryFull = path.join(rootDir, entryRelative);

    if (entry.isDirectory()) {
      const nested = await scanMediaDirectory(rootDir, entryRelative);
      results.push(...nested);
    } else if (entry.isFile()) {
      const stats = await fs.promises.stat(entryFull);
      const sha256 = await computeFileSha256(entryFull);
      results.push({
        relativePath: entryRelative,
        fullPath: entryFull,
        sizeBytes: stats.size,
        sha256,
        mtime: stats.mtime.toISOString(),
      });
    }
  }

  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * Generates the standardized manifest object for a Praise backup archive.
 * 
 * @param {object} params
 * @param {string} params.databaseSql
 * @param {object} params.databaseInspection
 * @param {Array<{ relativePath: string, sizeBytes: number, sha256: string, mtime: string }>} params.mediaFiles
 * @param {string} [params.appVersion="0.1.0"]
 */
export function buildBackupManifest({
  databaseSql,
  databaseInspection,
  mediaFiles = [],
  appVersion = "0.1.0",
}) {
  const dbBytes = Buffer.byteLength(databaseSql, "utf8");
  const dbSha256 = computeSha256(databaseSql);

  const totalMediaBytes = mediaFiles.reduce((acc, f) => acc + f.sizeBytes, 0);

  // Compute a collective media checksum
  const mediaManifestString = mediaFiles
    .map((f) => `${f.relativePath}:${f.sizeBytes}:${f.sha256}`)
    .join("\n");
  const mediaManifestSha256 = computeSha256(mediaManifestString);

  return {
    praiseBackupVersion: "1.0",
    createdAt: new Date().toISOString(),
    appVersion,
    platform: {
      os: process.platform,
      arch: process.arch,
      node: process.version,
    },
    database: {
      filename: "database.sql",
      format: "sql",
      sizeBytes: dbBytes,
      sha256: dbSha256,
      detectedTables: databaseInspection.tables || [],
      recordCounts: databaseInspection.counts || {},
    },
    media: {
      directory: "media",
      totalFiles: mediaFiles.length,
      totalSizeBytes: totalMediaBytes,
      files: mediaFiles.map((f) => ({
        relativePath: f.relativePath,
        sizeBytes: f.sizeBytes,
        sha256: f.sha256,
        mtime: f.mtime,
      })),
    },
    integrity: {
      algorithm: "sha256",
      databaseChecksum: dbSha256,
      mediaManifestChecksum: mediaManifestSha256,
    },
  };
}

/**
 * Validates the full cryptographic integrity and relational consistency of a Praise backup archive.
 * 
 * @param {string} archivePath - Path to the praise-backup-*.tar.gz file
 * @returns {Promise<{
 *   valid: boolean,
 *   errors: string[],
 *   warnings: string[],
 *   manifest: object | null,
 *   stats: { databaseSize: number, totalMediaSize: number, mediaCount: number, tableCount: number }
 * }>}
 */
export async function validateArchiveIntegrity(archivePath) {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(archivePath)) {
    return {
      valid: false,
      errors: [`Backup archive does not exist at '${archivePath}'`],
      warnings: [],
      manifest: null,
      stats: { databaseSize: 0, totalMediaSize: 0, mediaCount: 0, tableCount: 0 },
    };
  }

  let compressedBuf;
  let uncompressedBuf;
  try {
    compressedBuf = await fs.promises.readFile(archivePath);
    if (compressedBuf.length === 0) {
      return {
        valid: false,
        errors: ["Backup archive is completely empty (0 bytes)."],
        warnings: [],
        manifest: null,
        stats: { databaseSize: 0, totalMediaSize: 0, mediaCount: 0, tableCount: 0 },
      };
    }
    uncompressedBuf = zlib.gunzipSync(compressedBuf);
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to decompress archive (corrupted gzip): ${err.message}`],
      warnings: [],
      manifest: null,
      stats: { databaseSize: 0, totalMediaSize: 0, mediaCount: 0, tableCount: 0 },
    };
  }

  let entries;
  try {
    entries = parseTar(uncompressedBuf);
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to parse tar structure: ${err.message}`],
      warnings: [],
      manifest: null,
      stats: { databaseSize: 0, totalMediaSize: 0, mediaCount: 0, tableCount: 0 },
    };
  }

  // 1. Locate and parse manifest.json
  const manifestEntry = entries.find((e) => e.path === "manifest.json");
  if (!manifestEntry || !manifestEntry.data) {
    errors.push("Missing required 'manifest.json' file inside backup archive.");
    return {
      valid: false,
      errors,
      warnings,
      manifest: null,
      stats: { databaseSize: 0, totalMediaSize: 0, mediaCount: 0, tableCount: 0 },
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestEntry.data.toString("utf8"));
  } catch (err) {
    errors.push(`'manifest.json' is not valid JSON: ${err.message}`);
    return {
      valid: false,
      errors,
      warnings,
      manifest: null,
      stats: { databaseSize: 0, totalMediaSize: 0, mediaCount: 0, tableCount: 0 },
    };
  }

  if (!manifest.praiseBackupVersion) {
    errors.push("Archive manifest is missing 'praiseBackupVersion' identifier.");
  }

  // 2. Validate database.sql existence and checksum
  const dbFilename = manifest.database?.filename || "database.sql";
  const dbEntry = entries.find((e) => e.path === dbFilename);

  let databaseSql = "";
  if (!dbEntry || !dbEntry.data) {
    errors.push(`Missing database dump file '${dbFilename}' inside backup archive.`);
  } else {
    databaseSql = dbEntry.data.toString("utf8");
    const computedDbSha256 = computeSha256(dbEntry.data);
    if (computedDbSha256 !== manifest.database?.sha256) {
      errors.push(
        `Database dump checksum mismatch: manifest expected ${manifest.database?.sha256}, calculated ${computedDbSha256}`
      );
    }
    if (dbEntry.data.length !== manifest.database?.sizeBytes) {
      errors.push(
        `Database dump size mismatch: manifest expected ${manifest.database?.sizeBytes} bytes, found ${dbEntry.data.length} bytes.`
      );
    }
  }

  // 3. Validate media files existence and individual SHA-256 checksums
  const manifestMediaFiles = manifest.media?.files || [];
  const entriesByPath = new Map();
  for (const e of entries) {
    if (e.type === "file") {
      entriesByPath.set(e.path.replace(/\\/g, "/"), e);
    }
  }

  for (const expectedFile of manifestMediaFiles) {
    const archivePathKey = `media/${expectedFile.relativePath}`.replace(/\\/g, "/");
    const fileEntry = entriesByPath.get(archivePathKey);

    if (!fileEntry || !fileEntry.data) {
      errors.push(`Missing media file '${archivePathKey}' specified in manifest.`);
      continue;
    }

    if (fileEntry.data.length !== expectedFile.sizeBytes) {
      errors.push(
        `Media file '${expectedFile.relativePath}' size mismatch: expected ${expectedFile.sizeBytes} bytes, got ${fileEntry.data.length} bytes.`
      );
    }

    const computedFileSha256 = computeSha256(fileEntry.data);
    if (computedFileSha256 !== expectedFile.sha256) {
      errors.push(
        `Media file '${expectedFile.relativePath}' checksum mismatch: expected ${expectedFile.sha256}, got ${computedFileSha256}`
      );
    }
  }

  // 4. Validate referential consistency between database records and media files
  if (databaseSql) {
    const inspection = inspectSqlDump(databaseSql);
    const mediaPathsInArchive = new Set(
      manifestMediaFiles.map((f) => f.relativePath.toLowerCase())
    );

    for (const refPath of inspection.referencedMediaPaths) {
      // Clean path to extract basename or relative path
      const normalizedRef = refPath.replace(/^\/api\/media\//, "").toLowerCase();
      // Check if reference exists among media files
      let matched = false;
      for (const mPath of mediaPathsInArchive) {
        if (mPath.endsWith(normalizedRef) || normalizedRef.endsWith(mPath)) {
          matched = true;
          break;
        }
      }

      if (!matched && inspection.referencedMediaPaths.length <= 20) {
        warnings.push(
          `Referential Warning: Database references media '${refPath}', but matching file was not found in media backup.`
        );
      }
    }
  }

  const stats = {
    databaseSize: manifest.database?.sizeBytes || 0,
    totalMediaSize: manifest.media?.totalSizeBytes || 0,
    mediaCount: manifestMediaFiles.length,
    tableCount: (manifest.database?.detectedTables || []).length,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest,
    stats,
  };
}

