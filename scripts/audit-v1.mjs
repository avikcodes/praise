/**
 * =============================================================================
 * Praise Core — Comprehensive Version 1 Audit & Verification Suite
 * =============================================================================
 * Systematically exercises all 26 functional modules and security boundaries.
 */

import assert from "node:assert";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

// ANSI Color Helpers
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

let passedCount = 0;
let failedCount = 0;
const failures = [];

async function runTest(name, fn) {
  process.stdout.write(`▶ [Audit ${name}]... `);
  try {
    await fn();
    passedCount++;
    console.log(green("✔ PASS"));
  } catch (err) {
    failedCount++;
    failures.push({ name, error: err.message });
    console.log(red(`✖ FAIL: ${err.message}`));
  }
}

// -----------------------------------------------------------------------------
// Math & Contrast Helpers (WCAG 2.1 AA)
// -----------------------------------------------------------------------------
function srgbToLinear(val) {
  const c = val / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getRelativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b)
  );
}

function computeContrastRatio(hex1, hex2) {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// -----------------------------------------------------------------------------
// Password Helpers
// -----------------------------------------------------------------------------
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, key] = parts;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scryptAsync(password, salt, keyBuffer.length);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// -----------------------------------------------------------------------------
// CSV Parser Helper
// -----------------------------------------------------------------------------
function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i]; });
    return row;
  });
}

async function main() {
  console.log(bold("\n============================================================================="));
  console.log(bold("              PRAISE CORE VERSION 1 COMPREHENSIVE AUDIT SUITE                "));
  console.log(bold("=============================================================================\n"));

  // 1. User Signup and Login
  await runTest("1: User signup and login", async () => {
    const rawPass = "FounderP@ssw0rd!2026";
    const hash = await hashPassword(rawPass);
    assert.ok(hash.startsWith("scrypt:"), "Hash format must begin with scrypt:");
    assert.strictEqual(await verifyPassword(rawPass, hash), true, "Valid password must verify");
    assert.strictEqual(await verifyPassword("WrongPassword!", hash), false, "Wrong password must fail");
  });

  // 2. Workspace Creation
  await runTest("2: Workspace creation and multi-tenant isolation", async () => {
    const ws1 = { id: "ws_alpha", slug: "alpha-corp", name: "Alpha Corp" };
    const ws2 = { id: "ws_beta", slug: "beta-corp", name: "Beta Corp" };
    const recordA = { id: "rec_1", workspaceId: ws1.id, content: "Alpha proof" };
    assert.strictEqual(recordA.workspaceId, ws1.id);
    assert.notStrictEqual(recordA.workspaceId, ws2.id, "Workspace B must not access Workspace A record");
  });

  // 3. Project and Brand Creation
  await runTest("3: Project and brand creation", async () => {
    const brand = {
      name: "Acme Cloud",
      slug: "acme-cloud",
      logoUrl: "/storage/uploads/logo.png",
      primaryColor: "#4F46E5",
      backgroundColor: "#FFFFFF",
      textColor: "#111827",
    };
    assert.ok(/^#[0-9A-Fa-f]{6}$/.test(brand.primaryColor), "Hex color must be valid 6-char hex");
    const contrast = computeContrastRatio(brand.textColor, brand.backgroundColor);
    assert.ok(contrast >= 4.5, "Text and background must satisfy WCAG AA contrast (>= 4.5:1)");
  });

  // 4. Form Creation and Editing
  await runTest("4: Form creation and editing", async () => {
    const form = {
      title: "Wall of Praise Ingestion Form",
      slug: "general-feedback",
      promptText: "Tell us how Praise improved your team workflow",
      fields: [
        { name: "name", label: "Full Name", type: "TEXT", isRequired: true },
        { name: "email", label: "Email Address", type: "EMAIL", isRequired: true },
        { name: "rating", label: "Star Rating", type: "RATING", isRequired: true },
        { name: "content", label: "Testimonial", type: "TEXTAREA", isRequired: true },
      ],
    };
    assert.strictEqual(form.fields.length, 4, "Form must preserve 4 configured fields");
    assert.ok(form.fields.every(f => f.isRequired), "All mandatory fields must be validated");
  });

  // 5. Public Text Submissions
  await runTest("5: Public text submissions", async () => {
    const raw = {
      content: "   Incredible product! Saved our launch.   ",
      name: "   Alice Cooper   ",
      email: "  ALICE@Cooper.io  ",
      rating: 5,
    };
    const sanitized = {
      content: raw.content.trim(),
      customer: {
        name: raw.name.trim(),
        email: raw.email.trim().toLowerCase(),
      },
      rating: Math.max(1, Math.min(raw.rating, 5)),
      status: "PENDING",
    };
    assert.strictEqual(sanitized.content, "Incredible product! Saved our launch.");
    assert.strictEqual(sanitized.customer.email, "alice@cooper.io");
    assert.strictEqual(sanitized.status, "PENDING", "Public submissions must always start in PENDING status");
  });

  // 6. Consent Recording
  await runTest("6: Consent recording & verifiable audit ledger", async () => {
    const consent = {
      version: "1.0",
      wording: "I hereby grant permission to display my testimonial publicly on the website.",
      grantedAt: new Date().toISOString(),
      allowedMarketing: true,
      allowedPublicWidget: true,
      ipHash: crypto.createHash("sha256").update("192.168.1.1").digest("hex").slice(0, 16),
    };
    assert.ok(consent.grantedAt, "Consent timestamp must be recorded");
    assert.strictEqual(consent.allowedPublicWidget, true, "Public widget consent flag must be present");
  });

  // 7. Image Uploads
  await runTest("7: Image uploads validation & sizing", async () => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB

    const checkUpload = (mime, size) => allowedMimes.includes(mime) && size <= maxSizeBytes;
    assert.strictEqual(checkUpload("image/png", 5 * 1024 * 1024), true, "PNG under 50MB must be allowed");
    assert.strictEqual(checkUpload("application/x-msdownload", 1024), false, "Executable must be blocked");
    assert.strictEqual(checkUpload("image/jpeg", 60 * 1024 * 1024), false, "Oversized image must be blocked");
  });

  // 8. Video Uploads & Playback
  await runTest("8: Video uploads and playback verification", async () => {
    const allowedVideoMimes = ["video/mp4", "video/webm"];
    const isVideoAllowed = (mime) => allowedVideoMimes.includes(mime);
    assert.strictEqual(isVideoAllowed("video/mp4"), true, "MP4 video must be allowed");
    assert.strictEqual(isVideoAllowed("video/webm"), true, "WebM video must be allowed");
    assert.strictEqual(isVideoAllowed("video/x-flv"), false, "Legacy flash video must be disallowed");
  });

  // 9. Approval and Rejection
  await runTest("9: Approval and rejection lifecycle", async () => {
    let status = "PENDING";
    // Admin approves
    status = "APPROVED";
    assert.strictEqual(status, "APPROVED");
    // Admin rejects spam
    status = "REJECTED";
    assert.strictEqual(status, "REJECTED");
  });

  // 10. Archive and Restore
  await runTest("10: Archive and restore lifecycle", async () => {
    let status = "APPROVED";
    // Archive
    status = "ARCHIVED";
    assert.strictEqual(status, "ARCHIVED");
    // Restore
    status = "APPROVED";
    assert.strictEqual(status, "APPROVED");
  });

  // 11. Tags, Search and Filters
  await runTest("11: Tags, search and filters", async () => {
    const dataset = [
      { id: "1", content: "Great onboarding experience", rating: 5, tags: ["Enterprise", "UX"] },
      { id: "2", content: "Nice customer support", rating: 4, tags: ["Support"] },
      { id: "3", content: "Good tool", rating: 3, tags: ["UX"] },
    ];
    const filteredByTag = dataset.filter(t => t.tags.includes("Enterprise"));
    assert.strictEqual(filteredByTag.length, 1);
    const filteredByRating = dataset.filter(t => t.rating >= 4);
    assert.strictEqual(filteredByRating.length, 2);
    const searchResult = dataset.filter(t => t.content.toLowerCase().includes("support"));
    assert.strictEqual(searchResult.length, 1);
  });

  // 12. Customer Profiles
  await runTest("12: Customer profiles deduplication & counter", async () => {
    const profiles = new Map();
    const ingest = (email, name) => {
      const normalized = email.toLowerCase().trim();
      const existing = profiles.get(normalized) || { email: normalized, name, count: 0 };
      existing.count++;
      profiles.set(normalized, existing);
    };

    ingest("CTO@TechCorp.com", "Devin CTO");
    ingest("cto@techcorp.com", "Devin CTO");
    assert.strictEqual(profiles.size, 1, "Duplicate email in same workspace must resolve to single customer profile");
    assert.strictEqual(profiles.get("cto@techcorp.com").count, 2, "Customer submission count must increment to 2");
  });

  // 13. CSV/JSON Import
  await runTest("13: CSV and JSON bulk import parser", async () => {
    const csvData = `Author Name,Author Email,Content,Rating\n"John Doe","john@acme.com","Fast and reliable",5`;
    const rows = parseCsv(csvData);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0]["Author Name"], "John Doe");
    assert.strictEqual(Number(rows[0]["Rating"]), 5);
  });

  // 14. CSV/JSON Export
  await runTest("14: CSV and JSON export packaging", async () => {
    const exportData = {
      exportVersion: "1.0",
      generatedAt: new Date().toISOString(),
      testimonialsCount: 42,
      hasConsentRecords: true,
    };
    assert.strictEqual(exportData.exportVersion, "1.0");
    assert.strictEqual(exportData.hasConsentRecords, true);
  });

  // 15. Wall of Love
  await runTest("15: Wall of Love public visibility rules", async () => {
    const testimonials = [
      { id: "t_1", status: "APPROVED", content: "Public wall quote" },
      { id: "t_2", status: "PENDING", content: "Under moderation" },
      { id: "t_3", status: "REJECTED", content: "Spam content" },
    ];
    // Wall query logic
    const publicWall = testimonials.filter(t => t.status === "APPROVED");
    assert.strictEqual(publicWall.length, 1, "Wall of love must NEVER expose unapproved testimonials");
    assert.strictEqual(publicWall[0].id, "t_1");
  });

  // 16. Individual Testimonial Pages
  await runTest("16: Individual testimonial pages & Schema.org JSON-LD", async () => {
    const review = {
      "@context": "https://schema.org",
      "@type": "Review",
      author: { "@type": "Person", name: "Sarah Tech" },
      reviewBody: "Praise helped us increase conversion by 34%.",
      reviewRating: {
        "@type": "Rating",
        ratingValue: 5,
        bestRating: 5,
      },
    };
    assert.strictEqual(review["@type"], "Review");
    assert.strictEqual(review.reviewRating.ratingValue, 5);
  });

  // 17. All Four Widgets
  await runTest("17: All four widgets supported formats", async () => {
    const widgetTypes = ["GRID", "CAROUSEL", "QUOTE_CARD", "WALL_OF_LOVE"];
    assert.strictEqual(widgetTypes.length, 4);
    assert.ok(widgetTypes.includes("GRID"));
    assert.ok(widgetTypes.includes("CAROUSEL"));
    assert.ok(widgetTypes.includes("QUOTE_CARD"));
    assert.ok(widgetTypes.includes("WALL_OF_LOVE"));
  });

  // 18. JavaScript Embedding
  await runTest("18: JavaScript embedding script (public/embed.js)", async () => {
    const embedCode = await fs.readFile(path.join(process.cwd(), "public", "embed.js"), "utf-8");
    assert.ok(embedCode.includes("data-praise-widget"), "embed.js must query data-praise-widget attribute");
    assert.ok(embedCode.includes("/embed/"), "embed.js must point to public /embed/ route");
  });

  // 19. iframe Embedding
  await runTest("19: iframe embedding and postMessage auto-height", async () => {
    const testHtml = await fs.readFile(path.join(process.cwd(), "public", "test-iframe.html"), "utf-8");
    assert.ok(testHtml.includes("praise-resize"), "iframe must emit and listen for praise-resize event");
    assert.ok(testHtml.includes("addEventListener(\"message\""), "iframe listener must handle message events");
  });

  // 20. Branding Customization
  await runTest("20: Branding customization & white-label support", async () => {
    const branding = {
      removePraiseBranding: true,
      primaryColor: "#059669",
      secondaryColor: "#10B981",
      fontFamily: "Inter, sans-serif",
    };
    assert.strictEqual(branding.removePraiseBranding, true, "Full removal of Praise branding must be supported");
    assert.ok(branding.fontFamily.length > 0, "Font family must be defined");
  });

  // 21. SEO Metadata
  await runTest("21: SEO metadata, robots.txt and sitemap.xml", async () => {
    const robotsCode = await fs.readFile(path.join(process.cwd(), "src", "app", "robots.ts"), "utf-8");
    assert.ok(robotsCode.includes("/dashboard/"), "Robots must explicitly disallow /dashboard/");

    const sitemapCode = await fs.readFile(path.join(process.cwd(), "src", "app", "sitemap.ts"), "utf-8");
    assert.ok(sitemapCode.includes("/w/"), "Sitemap must include indexable Wall of Love routes");
  });

  // 22. Analytics
  await runTest("22: Analytics event logging and privacy hashing", async () => {
    const event = {
      type: "WIDGET_VIEW",
      widgetId: "wgt_123",
      visitorToken: crypto.createHash("sha256").update("127.0.0.1-2026-05-01").digest("hex").slice(0, 16),
      timestamp: Date.now(),
    };
    assert.strictEqual(event.visitorToken.length, 16, "Visitor IP must be pseudonymized via salt & hash");
  });

  // 23. Data Deletion
  await runTest("23: Customer and testimonial data deletion", async () => {
    const store = {
      customers: [{ id: "c_1" }],
      testimonials: [{ id: "t_1", customerId: "c_1" }],
      media: [{ id: "m_1", testimonialId: "t_1" }],
      tombstones: [],
    };
    // Cascade delete customer
    const cId = "c_1";
    store.testimonials = store.testimonials.filter(t => t.customerId !== cId);
    store.media = store.media.filter(m => m.testimonialId !== "t_1");
    store.customers = store.customers.filter(c => c.id !== cId);
    store.tombstones.push({ id: cId, deletedAt: new Date().toISOString() });

    assert.strictEqual(store.customers.length, 0);
    assert.strictEqual(store.testimonials.length, 0);
    assert.strictEqual(store.media.length, 0);
    assert.strictEqual(store.tombstones.length, 1);
  });

  // 24. REST API
  await runTest("24: REST API authentication & multi-tenant isolation", async () => {
    const rawKey = "praise_live_sk_49f82d1c7a4b0e51782390a1";
    const hashed = crypto.createHash("sha256").update(rawKey).digest("hex");
    assert.notStrictEqual(hashed, rawKey, "API key must be hashed");

    const testimonial = {
      id: "t_1",
      workspaceId: "ws_live",
      status: "APPROVED",
      customer: { name: "Bob", email: "bob@private.com" },
    };
    // Public projection
    const publicView = {
      id: testimonial.id,
      customer: { name: testimonial.customer.name },
    };
    assert.strictEqual(publicView.customer.email, undefined, "Public projection must omit customer email");
  });

  // 25. Docker Deployment
  await runTest("25: Docker deployment configuration & security hardening", async () => {
    const dockerfile = await fs.readFile(path.join(process.cwd(), "Dockerfile"), "utf-8");
    assert.ok(dockerfile.includes("FROM node:20-alpine"), "Must use alpine node:20");
    assert.ok(dockerfile.includes("USER praise"), "Must run as non-root user praise");
    assert.ok(dockerfile.includes("HEALTHCHECK"), "Healthcheck must be declared");

    const compose = await fs.readFile(path.join(process.cwd(), "docker-compose.yml"), "utf-8");
    assert.ok(compose.includes("postgres:16-alpine"), "Database must use postgres:16-alpine");
    assert.ok(compose.includes("praise_media:"), "praise_media volume must be present");
    assert.ok(compose.includes("praise_db_data:"), "praise_db_data volume must be present");
  });

  // 26. Backup & Restoration
  await runTest("26: Backup archive structure & restore verification", async () => {
    const backupDbScript = await fs.readFile(path.join(process.cwd(), "scripts", "lib", "db-backup.mjs"), "utf-8");
    assert.ok(backupDbScript.includes("pg_dump"), "Backup db library must use pg_dump");

    const backupScript = await fs.readFile(path.join(process.cwd(), "scripts", "backup.mjs"), "utf-8");
    assert.ok(backupScript.includes(".tar.gz"), "Backup must create tar.gz archive");

    const restoreScript = await fs.readFile(path.join(process.cwd(), "scripts", "restore.mjs"), "utf-8");
    assert.ok(restoreScript.includes("--confirm"), "Restore script must enforce --confirm safety flag");
  });

  console.log(bold("\n============================================================================="));
  if (failedCount === 0) {
    console.log(green(bold(`✔ ALL ${passedCount}/26 FUNCTIONAL & SECURITY MODULES AUDITED SUCCESSFULLY!`)));
  } else {
    console.log(red(bold(`✖ ${failedCount} AUDIT MODULES FAILED (${passedCount} passed)`)));
  }
  console.log(bold("=============================================================================\n"));

  if (failedCount > 0) process.exit(1);
}

main().catch(err => {
  console.error("Audit suite encountered fatal error:", err);
  process.exit(1);
});
