#!/usr/bin/env node
/**
 * Praise Core — Backup Archive Integrity Verification Utility.
 * Validates the cryptographic signatures, manifest declarations, file payloads,
 * and relational integrity of a Praise backup archive without altering live data.
 *
 * Usage:
 *   node scripts/verify-backup.mjs <archive-path>
 *   npm run backup:verify -- <archive-path>
 */
import path from "node:path";
import { validateArchiveIntegrity } from "./lib/integrity.mjs";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  console.log(`
Praise Core — Backup Archive Integrity Verifier

USAGE:
  npm run backup:verify -- <archive-path>
  node scripts/verify-backup.mjs <archive-path>

OPTIONS:
  --verbose             List detailed status for each media file and table
  --help, -h            Show this documentation
  `);
  process.exit(0);
}

const archiveArg = args.find((a) => !a.startsWith("-"));
const isVerbose = args.includes("--verbose");

if (!archiveArg) {
  console.error("❌ Error: No backup archive file path specified.");
  console.error("Usage: npm run backup:verify -- <path-to-archive.tar.gz>");
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), archiveArg);

async function runVerification() {
  console.log("=============================================================================");
  console.log("                 PRAISE BACKUP ARCHIVE INTEGRITY VERIFIER                    ");
  console.log("=============================================================================");
  console.log(`Checking: ${resolvedPath}`);
  console.log("-----------------------------------------------------------------------------");

  const result = await validateArchiveIntegrity(resolvedPath);

  if (!result.valid) {
    console.error("❌ ARCHIVE INTEGRITY CHECK FAILED:");
    for (const err of result.errors) {
      console.error(`   • ${err}`);
    }
    if (result.warnings.length > 0) {
      console.log("\nWarnings:");
      for (const warn of result.warnings) {
        console.log(`   • ${warn}`);
      }
    }
    console.error("=============================================================================");
    process.exit(1);
  }

  const m = result.manifest;
  console.log("✔ ARCHIVE STATUS: 100% VALID & INTACT");
  console.log(`   Backup Version:   ${m.praiseBackupVersion}`);
  console.log(`   Created At:       ${m.createdAt}`);
  console.log(`   Praise Version:   ${m.appVersion}`);
  console.log(`   Platform:         ${m.platform?.os} (${m.platform?.arch})`);
  console.log(`   Database Size:    ${(m.database.sizeBytes / 1024).toFixed(1)} KB`);
  console.log(`   Database SHA-256: ${m.database.sha256}`);
  console.log(`   Tables Detected:  ${m.database.detectedTables.join(", ")}`);
  console.log(
    `   Media Files:      ${m.media.totalFiles} (${(m.media.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB)`
  );

  if (isVerbose && m.media.files.length > 0) {
    console.log("\nMedia Files in Archive:");
    for (const f of m.media.files) {
      console.log(`   • ${f.relativePath} (${f.sizeBytes} B, SHA: ${f.sha256.slice(0, 12)}...)`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("\n⚠️ Referential Warnings:");
    for (const warn of result.warnings) {
      console.log(`   • ${warn}`);
    }
  }

  console.log("=============================================================================");
  process.exit(0);
}

runVerification();

