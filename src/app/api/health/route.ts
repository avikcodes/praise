import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import fs from "fs/promises";
import path from "path";

/**
 * Health check endpoint for Docker Compose, Kubernetes, and reverse proxies.
 * Verifies application uptime, PostgreSQL database connectivity, and local media storage.
 *
 * Returns:
 * - 200 OK: Application, Database, and Storage are fully operational.
 * - 503 Service Unavailable: Database is unreachable or storage is inaccessible.
 */
export async function GET() {
  const startTime = Date.now();
  let dbStatus = "connected";
  let dbLatencyMs = 0;
  let isDbHealthy = true;

  // 1. Check PostgreSQL Database Connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = "disconnected";
    isDbHealthy = false;
  }

  // 2. Check Local Media Storage Write Accessibility
  let storageStatus = "accessible";
  let isStorageHealthy = true;
  try {
    const uploadDir =
      process.env.PRAISE_UPLOAD_DIR ||
      path.join(process.cwd(), "storage", "uploads");

    await fs.mkdir(uploadDir, { recursive: true });
    const probeFile = path.join(uploadDir, `.health-probe-${Date.now()}`);
    await fs.writeFile(probeFile, "ok");
    await fs.unlink(probeFile).catch(() => {});
  } catch {
    storageStatus = "inaccessible";
    isStorageHealthy = false;
  }

  const isHealthy = isDbHealthy && isStorageHealthy;
  const status = isHealthy ? "ok" : "degraded";
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "production",
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        storage: {
          status: storageStatus,
        },
      },
      responseTimeMs: Date.now() - startTime,
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

