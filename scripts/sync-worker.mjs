#!/usr/bin/env node
/**
 * Self-Hosted Background Scheduler Worker for Praise External Review Connectors
 *
 * Usage:
 *   node --experimental-strip-types scripts/sync-worker.mjs
 *   node --experimental-strip-types scripts/sync-worker.mjs --daemon --interval=60
 *
 * Evaluates and synchronizes due external review connections incrementally
 * without requiring external task queues or Celery/Redis.
 */

import { processScheduledPlatformSyncs } from "../src/lib/import/connectors/sync-service.ts";

const args = process.argv.slice(2);
const isDaemon = args.includes("--daemon");
const intervalArg = args.find((a) => a.startsWith("--interval="));
const intervalSeconds = intervalArg ? parseInt(intervalArg.split("=")[1], 10) || 60 : 60;

async function runWorkerCycle() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Praise Sync Worker] Checking scheduled platform syncs...`);
  try {
    const report = await processScheduledPlatformSyncs({
      now: new Date(),
      limit: 50,
    });
    console.log(
      `[${timestamp}] [Praise Sync Worker] Processed ${report.processedCount} due connection(s) (Success: ${report.successCount}, Failed: ${report.failedCount}).`,
    );
  } catch (err) {
    console.error(`[${timestamp}] [Praise Sync Worker] Execution error:`, err);
  }
}

async function main() {
  await runWorkerCycle();

  if (isDaemon) {
    console.log(
      `[Praise Sync Worker] Running in daemon mode. Polling every ${intervalSeconds} seconds.`,
    );
    setInterval(runWorkerCycle, intervalSeconds * 1000);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Worker startup failed:", err);
  process.exit(1);
});
