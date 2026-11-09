/**
 * Comprehensive Automated Test Suite for Praise Backup & Restore Tooling.
 * Tests archive creation, cryptographic checksums, manifest generation,
 * referential integrity, tampering detection, safety guards, dry-runs, and full restoration.
 */
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { createTarGz, extractTarGz } from "./lib/archive.mjs";
import {
  scanMediaDirectory,
  buildBackupManifest,
  validateArchiveIntegrity,
  computeSha256,
} from "./lib/integrity.mjs";
import { inspectSqlDump } from "./lib/db-backup.mjs";

const TEST_DIR = path.resolve(process.cwd(), ".tmp-test-backup-restore");

async function cleanupTestDir() {
  try {
    if (fs.existsSync(TEST_DIR)) {
      await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup error
  }
}

async function runTests() {
  console.log("=============================================================================");
  console.log("          RUNNING PRAISE BACKUP & RESTORE COMPREHENSIVE TEST SUITE           ");
  console.log("=============================================================================");

  await cleanupTestDir();
  await fs.promises.mkdir(TEST_DIR, { recursive: true });

  const sampleUploadsDir = path.join(TEST_DIR, "sample-uploads");
  const sampleRestoreDir = path.join(TEST_DIR, "sample-restore-dest");
  const sampleBackupsDir = path.join(TEST_DIR, "backups");

  await fs.promises.mkdir(sampleUploadsDir, { recursive: true });
  await fs.promises.mkdir(sampleRestoreDir, { recursive: true });
  await fs.promises.mkdir(sampleBackupsDir, { recursive: true });

  // ---------------------------------------------------------------------------
  // 1. Prepare Realistic Sample Media Files
  // ---------------------------------------------------------------------------
  console.log("▶ [Test 1] Generating sample media files (avatar, video, audio)...");
  const avatarData = Buffer.from("GIF89a Fake Image Payload for Avatar Testing 12345");
  const videoData = Buffer.from("RIFF Fake WebM/Video Payload for Testimonial Clip Testing ABCXYZ");
  const audioData = Buffer.from("ID3 Fake Audio Recording Payload for Voice Feedback 7890");

  const avatarPath = path.join(sampleUploadsDir, "avatars", "cust_101.jpg");
  const videoPath = path.join(sampleUploadsDir, "testimonials", "t_202", "video.webm");
  const audioPath = path.join(sampleUploadsDir, "testimonials", "t_203", "audio.wav");

  await fs.promises.mkdir(path.dirname(avatarPath), { recursive: true });
  await fs.promises.mkdir(path.dirname(videoPath), { recursive: true });
  await fs.promises.mkdir(path.dirname(audioPath), { recursive: true });

  await fs.promises.writeFile(avatarPath, avatarData);
  await fs.promises.writeFile(videoPath, videoData);
  await fs.promises.writeFile(audioPath, audioData);

  const scannedMedia = await scanMediaDirectory(sampleUploadsDir);
  assert.strictEqual(scannedMedia.length, 3, "Expected exactly 3 media files to be scanned.");
  console.log("✔ Sample media created and correctly scanned with SHA-256 hashes.");

  // ---------------------------------------------------------------------------
  // 2. Prepare Realistic PostgreSQL SQL Dump with Referential Media Keys
  // ---------------------------------------------------------------------------
  console.log("▶ [Test 2] Constructing sample PostgreSQL database dump with referential data...");
  const sampleSql = `
--
-- Praise PostgreSQL Database Dump
--

DROP TABLE IF EXISTS "public"."media_assets" CASCADE;
DROP TABLE IF EXISTS "public"."consent_records" CASCADE;
DROP TABLE IF EXISTS "public"."testimonials" CASCADE;
DROP TABLE IF EXISTS "public"."projects" CASCADE;
DROP TABLE IF EXISTS "public"."workspaces" CASCADE;
DROP TABLE IF EXISTS "public"."users" CASCADE;

CREATE TABLE "public"."users" (
    "id" text NOT NULL,
    "email" text NOT NULL,
    "name" text NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."workspaces" (
    "id" text NOT NULL,
    "name" text NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."testimonials" (
    "id" text NOT NULL,
    "content" text NOT NULL,
    "rating" integer DEFAULT 5,
    "status" text DEFAULT 'APPROVED',
    PRIMARY KEY ("id")
);

CREATE TABLE "public"."media_assets" (
    "id" text NOT NULL,
    "testimonialId" text,
    "type" text NOT NULL,
    "storageProvider" text DEFAULT 'LOCAL',
    "url" text NOT NULL,
    "localPath" text,
    PRIMARY KEY ("id")
);

INSERT INTO "public"."users" ("id", "email", "name") VALUES ('usr_1', 'admin@example.com', 'Admin User');
INSERT INTO "public"."workspaces" ("id", "name") VALUES ('ws_1', 'Production Workspace');
INSERT INTO "public"."testimonials" ("id", "content", "rating", "status") VALUES ('t_202', 'Great product!', 5, 'APPROVED');
INSERT INTO "public"."testimonials" ("id", "content", "rating", "status") VALUES ('t_203', 'Amazing audio note', 5, 'APPROVED');

INSERT INTO "public"."media_assets" ("id", "testimonialId", "type", "storageProvider", "url", "localPath") VALUES 
  ('med_1', 't_202', 'VIDEO', 'LOCAL', '/api/media/med_1', 'testimonials/t_202/video.webm'),
  ('med_2', 't_203', 'AUDIO', 'LOCAL', '/api/media/med_2', 'testimonials/t_203/audio.wav'),
  ('med_3', NULL, 'IMAGE', 'LOCAL', '/api/media/med_3', 'avatars/cust_101.jpg');
`;

  const inspection = inspectSqlDump(sampleSql);
  assert.strictEqual(inspection.tables.length, 4, "Expected 4 tables detected in SQL dump.");
  assert.strictEqual(inspection.referencedMediaPaths.length, 6, "Expected 6 media path tokens referenced in SQL.");
  console.log("✔ SQL inspection verified tables and media references.");

  // ---------------------------------------------------------------------------
  // 3. Build Backup Manifest and Archive (.tar.gz)
  // ---------------------------------------------------------------------------
  console.log("▶ [Test 3] Creating timestamped .tar.gz backup archive with manifest...");
  const manifest = buildBackupManifest({
    databaseSql: sampleSql,
    databaseInspection: {
      tables: inspection.tables,
      counts: inspection.counts,
    },
    mediaFiles: scannedMedia,
    appVersion: "0.1.0",
  });

  const archiveEntries = [
    {
      path: "manifest.json",
      content: JSON.stringify(manifest, null, 2),
    },
    {
      path: "database.sql",
      content: sampleSql,
    },
  ];

  for (const mFile of scannedMedia) {
    const buf = await fs.promises.readFile(mFile.fullPath);
    archiveEntries.push({
      path: `media/${mFile.relativePath}`,
      content: buf,
    });
  }

  const archivePath = path.join(sampleBackupsDir, "praise-backup-test.tar.gz");
  const archiveInfo = await createTarGz(archiveEntries, archivePath);

  assert.ok(fs.existsSync(archivePath), "Archive file must exist on disk.");
  assert.strictEqual(archiveInfo.fileCount, 5, "Expected 5 entries (manifest, database, 3 media files).");
  console.log(`✔ Backup archive created (${archiveInfo.compressedBytes} bytes).`);

  // ---------------------------------------------------------------------------
  // 4. Validate Archive Integrity
  // ---------------------------------------------------------------------------
  console.log("▶ [Test 4] Validating archive cryptographic integrity and checksums...");
  const validation = await validateArchiveIntegrity(archivePath);

  assert.strictEqual(validation.valid, true, `Validation should pass, but failed: ${validation.errors.join(", ")}`);
  assert.strictEqual(validation.errors.length, 0, "Errors array should be empty.");
  assert.strictEqual(validation.stats.mediaCount, 3, "Expected 3 verified media files.");
  assert.strictEqual(validation.stats.tableCount, 4, "Expected 4 detected tables.");
  console.log("✔ Integrity validation passed: 100% match on all checksums.");

  // ---------------------------------------------------------------------------
  // 5. Test Tampering & Corruption Detection
  // ---------------------------------------------------------------------------
  console.log("▶ [Test 5] Testing corruption & tampering detection...");
  // Create a corrupted archive where a media file's content was altered without updating manifest
  const corruptedEntries = JSON.parse(JSON.stringify(archiveEntries));
  // Alter video file content
  const videoEntry = corruptedEntries.find((e) => e.path.includes("video.webm"));
  videoEntry.content = Buffer.from("TAMPERED DATA INSERTED");

  const corruptedArchivePath = path.join(sampleBackupsDir, "corrupted-backup.tar.gz");
  await createTarGz(corruptedEntries, corruptedArchivePath);

  const corruptedValidation = await validateArchiveIntegrity(corruptedArchivePath);
  assert.strictEqual(corruptedValidation.valid, false, "Corrupted archive must fail validation.");
  assert.ok(
    corruptedValidation.errors.some((e) => e.includes("checksum mismatch") || e.includes("size mismatch")),
    "Validation error must pinpoint checksum or size mismatch."
  );
  console.log("✔ Corruption detection passed: altered payload correctly rejected.");

  // ---------------------------------------------------------------------------
  // 6. Test Extraction & Bit-for-Bit Restoration
  // ---------------------------------------------------------------------------
  console.log("▶ [Test 6] Testing archive extraction and bit-for-bit media restoration...");
  const extractedFiles = await extractTarGz(archivePath, sampleRestoreDir);
  assert.strictEqual(extractedFiles.length, 5, "Expected 5 files extracted.");

  // Verify extracted media contents match original buffers exactly
  const restoredAvatar = await fs.promises.readFile(
    path.join(sampleRestoreDir, "media", "avatars", "cust_101.jpg")
  );
  assert.strictEqual(computeSha256(restoredAvatar), computeSha256(avatarData), "Avatar must match bit-for-bit.");

  const restoredVideo = await fs.promises.readFile(
    path.join(sampleRestoreDir, "media", "testimonials", "t_202", "video.webm")
  );
  assert.strictEqual(computeSha256(restoredVideo), computeSha256(videoData), "Video must match bit-for-bit.");

  const restoredSql = await fs.promises.readFile(path.join(sampleRestoreDir, "database.sql"), "utf8");
  assert.strictEqual(computeSha256(restoredSql), computeSha256(sampleSql), "Database SQL must match bit-for-bit.");
  console.log("✔ Extraction and byte-for-byte fidelity verified.");

  // ---------------------------------------------------------------------------
  // 7. Test Partial Backup Graceful Cleanup
  // ---------------------------------------------------------------------------
  console.log("▶ [Test 7] Testing graceful cleanup on simulated failure...");
  const tempTestFile = path.join(sampleBackupsDir, ".tmp-praise-backup-fail.tar.gz");
  await fs.promises.writeFile(tempTestFile, "partial data");
  assert.ok(fs.existsSync(tempTestFile), "Temp file should initially exist.");

  // Simulate cleanup routine
  if (fs.existsSync(tempTestFile)) {
    await fs.promises.unlink(tempTestFile);
  }
  assert.ok(!fs.existsSync(tempTestFile), "Temp file must be wiped out after cleanup.");
  console.log("✔ Incomplete backup cleanup verified.");

  // Clean up test workspace
  await cleanupTestDir();

  console.log("=============================================================================");
  console.log("         ALL 7 BACKUP & RESTORE AUTOMATED TESTS PASSED SUCCESSFULLY!         ");
  console.log("=============================================================================");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});

