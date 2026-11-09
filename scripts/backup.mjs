#!/usr/bin/env node
/**
 * Praise Core — Production Self-Hosted Backup CLI Tool.
 * Creates unified, timestamped, cryptographically verified backup archives (.tar.gz)
 * containing PostgreSQL database dumps, customer media files, and audit metadata.
 *
 * Usage:
 *   node scripts/backup.mjs [options]
 *   npm run backup
 *
 * Options:
 *   --output-dir <path>   Directory to save backup archives (default: ./backups)
 *   --docker              Force Docker Compose mode for database dump
 *   --no-media            Skip media files, backup database only
 *   --media-dir <path>    Custom upload storage directory to back up
 *   --help, -h            Show usage instructions
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { dumpDatabase } from "./lib/db-backup.mjs";
import { createTarGz } from "./lib/archive.mjs";
import {
  scanMediaDirectory,
  buildBackupManifest,
  validateArchiveIntegrity,
  computeFileSha256,
} from "./lib/integrity.mjs";

// -----------------------------------------------------------------------------
// CLI Argument Parsing
// -----------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Praise Core — Self-Hosted Backup Utility

USAGE:
  npm run backup [-- [options]]
  node scripts/backup.mjs [options]

OPTIONS:
  --output-dir <path>   Target directory for backup archives (default: ./backups)
  --docker              Force execution via 'docker compose exec'
  --no-media            Skip media storage and only backup PostgreSQL database
  --media-dir <path>    Specify custom local media upload path
  --help, -h            Show this help documentation
  `);
  process.exit(0);
}

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const customOutputDir = getArgValue("--output-dir") || "backups";
const customMediaDir =
  getArgValue("--media-dir") ||
  process.env.PRAISE_UPLOAD_DIR ||
  path.join(process.cwd(), "storage", "uploads");
const preferDocker = args.includes("--docker");
const skipMedia = args.includes("--no-media");

// -----------------------------------------------------------------------------
// Main Backup Execution Routine
// -----------------------------------------------------------------------------
async function runBackup() {
  const startTime = Date.now();
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "Z");
  const randomSuffix = crypto.randomBytes(4).toString("hex");

  const resolvedOutputDir = path.resolve(process.cwd(), customOutputDir);
  await fs.promises.mkdir(resolvedOutputDir, { recursive: true });

  const finalArchiveName = `praise-backup-${timestamp}.tar.gz`;
  const finalArchivePath = path.join(resolvedOutputDir, finalArchiveName);
  const tempArchivePath = path.join(
    resolvedOutputDir,
    `.tmp-praise-backup-${timestamp}-${randomSuffix}.tar.gz`
  );

  console.log("=============================================================================");
  console.log("                   PRAISE CORE SELF-HOSTED BACKUP TOOL                       ");
  console.log("=============================================================================");
  console.log(`Timestamp:        ${new Date().toISOString()}`);
  console.log(`Target Archive:   ${finalArchivePath}`);
  console.log(`Media Directory:  ${skipMedia ? "(Skipped)" : customMediaDir}`);
  console.log("-----------------------------------------------------------------------------");

  // Track created temporary files to handle incomplete backups gracefully
  let isCleanedUp = false;
  const cleanupStaging = async () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    try {
      if (fs.existsSync(tempArchivePath)) {
        await fs.promises.unlink(tempArchivePath);
      }
    } catch {
      // Ignore cleanup error
    }
  };

  // Register termination hooks for process interruption
  process.on("SIGINT", async () => {
    console.error("\n⚠️ Backup aborted by user (SIGINT). Cleaning up partial files...");
    await cleanupStaging();
    process.exit(130);
  });
  process.on("SIGTERM", async () => {
    console.error("\n⚠️ Backup terminated (SIGTERM). Cleaning up partial files...");
    await cleanupStaging();
    process.exit(143);
  });

  try {
    // -------------------------------------------------------------------------
    // Step 1: PostgreSQL Database Dump
    // -------------------------------------------------------------------------
    console.log("▶ [1/4] Dumping PostgreSQL database...");
    const dbDumpResult = await dumpDatabase({ preferDocker });
    console.log(`✔ Database dumped successfully via ${dbDumpResult.method}.`);
    console.log(
      `   Tables: ${dbDumpResult.detectedTables.length} | Size: ${(Buffer.byteLength(dbDumpResult.sql, "utf8") / 1024).toFixed(1)} KB`
    );

    // -------------------------------------------------------------------------
    // Step 2: Media Storage Scan & Collection
    // -------------------------------------------------------------------------
    let mediaFiles = [];
    if (!skipMedia && fs.existsSync(customMediaDir)) {
      console.log("▶ [2/4] Scanning local media storage...");
      mediaFiles = await scanMediaDirectory(customMediaDir);
      const totalMediaBytes = mediaFiles.reduce((acc, f) => acc + f.sizeBytes, 0);
      console.log(
        `✔ Found ${mediaFiles.length} media files (${(totalMediaBytes / (1024 * 1024)).toFixed(2)} MB).`
      );
    } else if (skipMedia) {
      console.log("▶ [2/4] Skipping media storage (--no-media flag active).");
    } else {
      console.log(
        `▶ [2/4] Upload storage directory '${customMediaDir}' does not exist or is empty. Continuing with 0 media files.`
      );
    }

    // -------------------------------------------------------------------------
    // Step 3: Manifest Generation & Tarball Creation
    // -------------------------------------------------------------------------
    console.log("▶ [3/4] Building backup manifest and compressing archive (.tar.gz)...");

    // Read application package version if available
    let appVersion = "0.1.0";
    try {
      const pkgPath = path.resolve(process.cwd(), "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(await fs.promises.readFile(pkgPath, "utf8"));
        appVersion = pkg.version || appVersion;
      }
    } catch {
      // Ignore version read error
    }

    const manifest = buildBackupManifest({
      databaseSql: dbDumpResult.sql,
      databaseInspection: {
        tables: dbDumpResult.detectedTables,
        counts: dbDumpResult.recordCounts,
      },
      mediaFiles,
      appVersion,
    });

    const archiveEntries = [
      {
        path: "manifest.json",
        content: JSON.stringify(manifest, null, 2),
      },
      {
        path: "database.sql",
        content: dbDumpResult.sql,
      },
    ];

    // Read media file buffers
    for (const mediaFile of mediaFiles) {
      const fileBuffer = await fs.promises.readFile(mediaFile.fullPath);
      archiveEntries.push({
        path: `media/${mediaFile.relativePath}`.replace(/\\/g, "/"),
        content: fileBuffer,
      });
    }

    // Write directly to temporary archive
    const archiveInfo = await createTarGz(archiveEntries, tempArchivePath);
    console.log(
      `✔ Compressed ${archiveInfo.fileCount} entries into temporary archive (${(archiveInfo.compressedBytes / (1024 * 1024)).toFixed(2)} MB).`
    );

    // -------------------------------------------------------------------------
    // Step 4: Archive Integrity Verification & Atomic Promotion
    // -------------------------------------------------------------------------
    console.log("▶ [4/4] Validating archive integrity before finalizing...");
    const validation = await validateArchiveIntegrity(tempArchivePath);

    if (!validation.valid) {
      throw new Error(
        `Pre-flight integrity verification failed for newly generated archive:\n${validation.errors.join("\n")}`
      );
    }

    // Atomically promote temporary archive to permanent archive name
    await fs.promises.rename(tempArchivePath, finalArchivePath);
    isCleanedUp = true;

    const finalSha256 = await computeFileSha256(finalArchivePath);
    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("=============================================================================");
    console.log("                         BACKUP COMPLETED SUCCESSFULLY                       ");
    console.log("=============================================================================");
    console.log(`Archive:         ${finalArchivePath}`);
    console.log(`Archive Size:    ${(archiveInfo.compressedBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`SHA-256 Checksum:${finalSha256}`);
    console.log(`Database Tables: ${manifest.database.detectedTables.length}`);
    console.log(`Media Files:     ${manifest.media.totalFiles}`);
    console.log(`Duration:        ${durationSeconds} seconds`);
    console.log("-----------------------------------------------------------------------------");
    console.log("Restore Command:");
    console.log(`  npm run restore -- ${path.relative(process.cwd(), finalArchivePath)} --confirm`);
    console.log("=============================================================================");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ BACKUP FAILED:", error.message);
    await cleanupStaging();
    console.error("Staging artifacts and partial files were safely removed.");
    console.error("Existing backups and running database remain unaffected.");
    process.exit(1);
  }
}

runBackup();

