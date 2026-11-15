#!/usr/bin/env node
/**
 * Self-Hosted Background Scheduler Worker for Praise Email Campaigns
 *
 * Usage:
 *   node --experimental-strip-types scripts/email-worker.mjs
 *   node --experimental-strip-types scripts/email-worker.mjs --daemon --interval=60
 *
 * Designed for self-hosted setups to run without Redis, Celery, or external queues.
 * Evaluates scheduled campaigns and follow-up steps directly using the PostgreSQL database.
 */

import { processScheduledEmailCampaigns } from "../src/lib/email/scheduler.ts";

const args = process.argv.slice(2);
const isDaemon = args.includes("--daemon");
const intervalArg = args.find((a) => a.startsWith("--interval="));
const intervalSeconds = intervalArg ? parseInt(intervalArg.split("=")[1], 10) || 60 : 60;

async function runWorkerCycle() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Praise Email Worker] Checking scheduled campaigns...`);
  try {
    const report = await processScheduledEmailCampaigns({
      now: new Date(),
      limit: 50,
    });
    console.log(
      `[${timestamp}] [Praise Email Worker] Processed ${report.processedCount} due campaign(s).`,
    );
  } catch (err) {
    console.error(`[${timestamp}] [Praise Email Worker] Execution error:`, err);
  }
}

async function main() {
  await runWorkerCycle();

  if (isDaemon) {
    console.log(
      `[Praise Email Worker] Running in daemon mode. Polling every ${intervalSeconds} seconds.`,
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
