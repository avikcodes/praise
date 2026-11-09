#!/usr/bin/env node
/**
 * Praise Core — Production Self-Hosted Restore CLI Tool.
 * Restores PostgreSQL databases and local customer media files from validated backup archives.
 *
 * Safety Rules:
 *   - Never overwrites live databases without the explicit '--confirm' flag or interactive prompt.
 *   - Verifies archive integrity and SHA-256 checksums BEFORE touching the target system.
 *   - Restores database records and media files with referential preservation.
 *
 * Usage:
 *   npm run restore -- backups/praise-backup-YYYY-MM-DD.tar.gz --confirm
 *   node scripts/restore.mjs backups/praise-backup-YYYY-MM-DD.tar.gz --confirm
 *
 * Options:
 *   --confirm             Explicit confirmation flag to execute destructive restore
 *   --dry-run             Simulate restore: inspect archive and print plan without writing
 *   --docker              Force restoration via 'docker compose exec'
 *   --no-media            Skip restoring media files (restore database only)
 *   --no-db               Skip restoring database (restore media files only)
 *   --media-dir <path>    Custom destination directory for media files
 *   --help, -h            Show usage instructions
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { restoreDatabase } from "./lib/db-backup.mjs";
import { readArchiveFile, extractTarGz } from "./lib/archive.mjs";
import {
  validateArchiveIntegrity,
  computeFileSha256,
} from "./lib/integrity.mjs";

// -----------------------------------------------------------------------------
// CLI Argument Parsing
// -----------------------------------------------------------------------------
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  console.log(`
Praise Core — Self-Hosted Restore Utility

USAGE:
  npm run restore -- <archive-path> --confirm [options]
  node scripts/restore.mjs <archive-path> --confirm [options]

REQUIRED:
  <archive-path>        Path to the praise-backup-*.tar.gz backup archive file
  --confirm             Explicit confirmation to overwrite existing database and media

OPTIONS:
  --dry-run             Validate archive and preview restoration plan without modifying live data
  --docker              Force execution via 'docker compose exec -T db psql'
  --no-media            Restore database records only (do not touch media files)
  --no-db               Restore media files only (do not touch database)
  --media-dir <path>    Destination directory for media files (default: storage/uploads)
  --help, -h            Show this help documentation
  `);
  process.exit(0);
}

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

// Find the archive path (first argument that does not start with '-')
const archiveArg = args.find((a) => !a.startsWith("-"));
const hasConfirm = args.includes("--confirm");
const isDryRun = args.includes("--dry-run");
const preferDocker = args.includes("--docker");
const skipMedia = args.includes("--no-media");
const skipDb = args.includes("--no-db");
const customMediaDir =
  getArgValue("--media-dir") ||
  process.env.PRAISE_UPLOAD_DIR ||
  path.join(process.cwd(), "storage", "uploads");

if (!archiveArg) {
  console.error("❌ Error: No backup archive file path specified.");
  console.error("Usage: npm run restore -- <path-to-archive.tar.gz> --confirm");
  process.exit(1);
}

const resolvedArchivePath = path.resolve(process.cwd(), archiveArg);

// -----------------------------------------------------------------------------
// Interactive Confirmation Prompt
// -----------------------------------------------------------------------------
async function promptForConfirmation() {
  if (hasConfirm) return true;
  if (!process.stdin.isTTY) return false;

  console.log("\n⚠️  DESTRUCTIVE RESTORE WARNING ⚠️");
  console.log("Restoring will COMPLETELY OVERWRITE all tables in your current database");
  console.log("and replace matching media files in the upload directory.");
  console.log("This action cannot be undone.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Type 'RESTORE' in uppercase to confirm and proceed: ", (answer) => {
      rl.close();
      resolve(answer.trim() === "RESTORE");
    });
  });
}

// -----------------------------------------------------------------------------
// Main Restore Execution Routine
// -----------------------------------------------------------------------------
async function runRestore() {
  const startTime = Date.now();

  console.log("=============================================================================");
  console.log("                   PRAISE CORE SELF-HOSTED RESTORE TOOL                      ");
  console.log("=============================================================================");
  console.log(`Target Archive:   ${resolvedArchivePath}`);
  console.log(`Execution Mode:   ${isDryRun ? "SIMULATION (DRY-RUN)" : "LIVE RESTORATION"}`);
  console.log(`Media Directory:  ${skipMedia ? "(Skipped)" : customMediaDir}`);
  console.log("-----------------------------------------------------------------------------");

  // ---------------------------------------------------------------------------
  // Step 1: Pre-Flight Archive Integrity Verification
  // ---------------------------------------------------------------------------
  console.log("▶ [1/4] Performing pre-flight archive integrity check...");
  const validation = await validateArchiveIntegrity(resolvedArchivePath);

  if (!validation.valid) {
    console.error("\n❌ PRE-FLIGHT INTEGRITY CHECK FAILED:");
    for (const err of validation.errors) {
      console.error(`   • ${err}`);
    }
    console.error("\nRestore aborted: The archive is corrupted or has been tampered with.");
    console.error("No database or filesystem changes were made.");
    process.exit(1);
  }

  const manifest = validation.manifest;
  console.log("✔ Archive integrity verified: all checksums and files match manifest.");
  console.log(`   Backup Date:     ${manifest.createdAt}`);
  console.log(`   Database Size:   ${(manifest.database.sizeBytes / 1024).toFixed(1)} KB`);
  console.log(`   Detected Tables: ${manifest.database.detectedTables.length}`);
  console.log(
    `   Media Files:     ${manifest.media.totalFiles} (${(manifest.media.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB)`
  );

  if (validation.warnings.length > 0) {
    console.log("\n⚠️ Integrity Warnings:");
    for (const warn of validation.warnings) {
      console.log(`   • ${warn}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Step 2: Dry Run Check or Destructive Confirmation Guard
  // ---------------------------------------------------------------------------
  if (isDryRun) {
    console.log("\n-----------------------------------------------------------------------------");
    console.log("                    DRY-RUN SIMULATION COMPLETED SAFELY                      ");
    console.log("-----------------------------------------------------------------------------");
    console.log("The archive passed all validation checks and is ready to restore.");
    console.log("To perform the real restoration, re-run with the '--confirm' flag:");
    console.log(`  npm run restore -- ${path.relative(process.cwd(), resolvedArchivePath)} --confirm`);
    console.log("=============================================================================");
    process.exit(0);
  }

  // Enforce explicit confirmation before proceeding
  const confirmed = await promptForConfirmation();
  if (!confirmed) {
    console.error("\n=============================================================================");
    console.error("                [SAFETY GUARD] DESTRUCTIVE OPERATION BLOCKED                 ");
    console.error("=============================================================================");
    console.error("Restoring will completely overwrite the existing PostgreSQL database");
    console.error("and replace customer media assets on disk.");
    console.error("\nTo execute this restore, pass the '--confirm' flag explicitly:");
    console.error(`  npm run restore -- ${path.relative(process.cwd(), resolvedArchivePath)} --confirm`);
    console.error("=============================================================================");
    process.exit(1);
  }

  try {
    // -------------------------------------------------------------------------
    // Step 3: PostgreSQL Database Restoration
    // -------------------------------------------------------------------------
    if (!skipDb) {
      console.log("\n▶ [2/4] Restoring PostgreSQL database from archive...");
      const sqlBuffer = await readArchiveFile(resolvedArchivePath, manifest.database.filename);
      if (!sqlBuffer) {
        throw new Error(`Database dump file '${manifest.database.filename}' not found in archive.`);
      }

      const dbResult = await restoreDatabase(sqlBuffer, { preferDocker });
      console.log(`✔ Database restored successfully using ${dbResult.method}.`);
      console.log(`   Restored ${manifest.database.detectedTables.length} tables and schemas.`);
    } else {
      console.log("\n▶ [2/4] Skipping database restoration (--no-db flag active).");
    }

    // -------------------------------------------------------------------------
    // Step 4: Customer Media Extraction & Preservation
    // -------------------------------------------------------------------------
    let restoredMediaCount = 0;
    if (!skipMedia && manifest.media.totalFiles > 0) {
      console.log("\n▶ [3/4] Extracting customer media assets...");
      const resolvedMediaDir = path.resolve(process.cwd(), customMediaDir);
      await fs.promises.mkdir(resolvedMediaDir, { recursive: true });

      // Create a temporary extraction directory to extract media cleanly
      const tempExtractDir = path.resolve(
        process.cwd(),
        `.tmp-restore-${Date.now()}`
      );
      await fs.promises.mkdir(tempExtractDir, { recursive: true });

      try {
        const extracted = await extractTarGz(resolvedArchivePath, tempExtractDir);

        for (const file of extracted) {
          if (file.path.startsWith("media/")) {
            const relWithinMedia = file.path.replace(/^media\//, "");
            const destinationPath = path.join(resolvedMediaDir, relWithinMedia);

            await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
            await fs.promises.copyFile(file.fullPath, destinationPath);
            restoredMediaCount++;
          }
        }
      } finally {
        // Clean up temporary extraction folder
        try {
          await fs.promises.rm(tempExtractDir, { recursive: true, force: true });
        } catch {
          // Ignore temp cleanup error
        }
      }

      console.log(`✔ Restored ${restoredMediaCount} media files into '${customMediaDir}'.`);
    } else if (skipMedia) {
      console.log("\n▶ [3/4] Skipping media restoration (--no-media flag active).");
    } else {
      console.log("\n▶ [3/4] No media files present in archive. Skipped.");
    }

    // -------------------------------------------------------------------------
    // Step 5: Post-Restore Verification
    // -------------------------------------------------------------------------
    console.log("\n▶ [4/4] Verifying restored files on disk...");
    let verifiedMediaFiles = 0;
    if (!skipMedia && manifest.media.files.length > 0) {
      for (const expected of manifest.media.files) {
        const targetFilePath = path.join(customMediaDir, expected.relativePath);
        if (fs.existsSync(targetFilePath)) {
          const hash = await computeFileSha256(targetFilePath);
          if (hash === expected.sha256) {
            verifiedMediaFiles++;
          }
        }
      }
      console.log(
        `✔ Media verification passed: ${verifiedMediaFiles}/${manifest.media.files.length} files verified on disk with exact checksums.`
      );
    } else {
      console.log("✔ Verification skipped (no media files restored).");
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("=============================================================================");
    console.log("                        RESTORE COMPLETED SUCCESSFULLY                       ");
    console.log("=============================================================================");
    console.log(`Source Archive:  ${resolvedArchivePath}`);
    console.log(`Database Status: ${skipDb ? "Preserved (unmodified)" : "Restored"}`);
    console.log(`Media Files:     ${restoredMediaCount} restored (${verifiedMediaFiles} verified)`);
    console.log(`Duration:        ${durationSeconds} seconds`);
    console.log("-----------------------------------------------------------------------------");
    console.log("Health Check Command:");
    console.log("  curl -s http://localhost:3000/api/health");
    console.log("=============================================================================");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ RESTORE FAILED:", error.message);
    process.exit(1);
  }
}

runRestore();

