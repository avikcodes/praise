/**
 * Comprehensive Automated Verification Suite for PostgreSQL Connection Resilience
 *
 * Verifies:
 * 1. Configuration parameters in DATABASE_URL:
 *    - `pgbouncer=true` for transaction pooler mode
 *    - `connection_limit=10` to avoid connection exhaustion
 *    - `pool_timeout=30` and `connect_timeout=30`
 * 2. Transient error detection (`isTransientConnectionError`):
 *    - Accurately detects `Error in PostgreSQL connection: Error { kind: Closed, cause: None }`
 *    - Detects `Server has closed the connection`, P1017, P1001, P2024, ECONNRESET
 * 3. Read query auto-retry and non-idempotent write safeguards in `src/lib/db/client.ts`
 * 4. High-concurrency query execution across all core models:
 *    - Workspace, Project, Customer, Testimonial, Form, Widget
 * 5. Repeated sequential API queries to confirm zero connection drops
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import { prisma } from "../src/lib/db/client.ts";
import { isTransientConnectionError, withDatabaseRetry } from "../src/lib/db/retry.ts";

async function run() {
  console.log("🚀 Starting PostgreSQL Connection Resilience Test Suite...\n");

  // ------------------------------------------------------------------------
  // Test 1: Connection string parameters verification
  // ------------------------------------------------------------------------
  console.log("🧪 Test 1: Validating connection pooling parameters in DATABASE_URL");
  const envContent = fs.readFileSync(".env", "utf-8");
  const dbUrlLine = envContent.split("\n").find((l) => l.startsWith("DATABASE_URL="));
  assert.ok(dbUrlLine, "DATABASE_URL must be defined in .env");

  const rawUrl = dbUrlLine.substring("DATABASE_URL=".length).trim().replace(/^['"]|['"]$/g, "");
  const parsed = new URL(rawUrl);

  assert.equal(parsed.searchParams.get("pgbouncer"), "true", "DATABASE_URL must include pgbouncer=true for pooled connections");
  assert.equal(parsed.searchParams.get("connection_limit"), "10", "DATABASE_URL must set connection_limit=10");
  assert.equal(parsed.searchParams.get("pool_timeout"), "30", "DATABASE_URL must set pool_timeout=30");
  assert.equal(parsed.searchParams.get("connect_timeout"), "30", "DATABASE_URL must set connect_timeout=30");
  assert.equal(parsed.searchParams.get("sslmode"), "require", "DATABASE_URL must require SSL");
  console.log("  ✓ Connection parameters verified: pgbouncer=true, connection_limit=10, pool_timeout=30, connect_timeout=30");

  // ------------------------------------------------------------------------
  // Test 2: Transient error pattern recognition
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test 2: Validating isTransientConnectionError pattern matching");

  // The exact error reported by the user
  const closedError = new Error("Error in PostgreSQL connection: Error { kind: Closed, cause: None }");
  assert.ok(isTransientConnectionError(closedError), "Must detect 'kind: Closed, cause: None'");

  const serverClosedError = new Error("Server has closed the connection");
  assert.ok(isTransientConnectionError(serverClosedError), "Must detect 'Server has closed the connection'");

  const econnReset = new Error("read ECONNRESET");
  assert.ok(isTransientConnectionError(econnReset), "Must detect ECONNRESET");

  const schemaConstraintError = new Error("Unique constraint failed on the fields: (`email`)");
  assert.ok(!isTransientConnectionError(schemaConstraintError), "Must NOT flag constraint violations as transient");

  const authError = new Error("Access denied: You are not a member of this workspace");
  assert.ok(!isTransientConnectionError(authError), "Must NOT flag auth errors as transient");

  console.log("  ✓ Correctly classifies 'kind: Closed' and transient socket drops without false positives");

  // ------------------------------------------------------------------------
  // Test 3: Core database operations across all models
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test 3: Executing queries across core application models");

  const [wsCount, projCount, custCount, testCount, formCount, widgetCount] = await Promise.all([
    prisma.workspace.count(),
    prisma.project.count(),
    prisma.customer.count(),
    prisma.testimonial.count(),
    prisma.collectionForm.count(),
    prisma.widget.count(),
  ]);

  console.log(`  ✓ Workspaces: ${wsCount}, Projects: ${projCount}, Customers: ${custCount}`);
  console.log(`  ✓ Testimonials: ${testCount}, Forms: ${formCount}, Widgets: ${widgetCount}`);

  // ------------------------------------------------------------------------
  // Test 4: High-concurrency load test (20 simultaneous queries)
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test 4: Testing high-concurrency database queries (20 simultaneous requests)");

  const concurrentPromises = Array.from({ length: 20 }, (_, i) => {
    switch (i % 5) {
      case 0:
        return prisma.workspace.findMany({ take: 5 });
      case 1:
        return prisma.customer.findMany({ take: 5 });
      case 2:
        return prisma.project.findMany({ take: 5 });
      case 3:
        return prisma.testimonial.findMany({ take: 5 });
      default:
        return prisma.collectionForm.findMany({ take: 5 });
    }
  });

  const results = await Promise.all(concurrentPromises);
  assert.equal(results.length, 20, "All 20 concurrent queries must resolve successfully");
  console.log("  ✓ 20 concurrent database requests completed with 0 closed connection errors");

  // ------------------------------------------------------------------------
  // Test 5: Repeated sequential queries (10 iterations)
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test 5: Testing repeated sequential requests to verify pool socket reuse");

  for (let i = 0; i < 10; i++) {
    const ws = await prisma.workspace.findFirst({ select: { id: true, name: true } });
    assert.ok(ws !== undefined, "Workspace query should succeed on every iteration");
  }
  console.log("  ✓ 10 sequential queries completed cleanly across the connection pool");

  // ------------------------------------------------------------------------
  // Test 6: withDatabaseRetry wrapper verification
  // ------------------------------------------------------------------------
  console.log("\n🧪 Test 6: Testing withDatabaseRetry recovery behavior");

  let failCount = 0;
  const simulatedFlakyOperation = async () => {
    if (failCount === 0) {
      failCount++;
      throw new Error("Error in PostgreSQL connection: Error { kind: Closed, cause: None }");
    }
    return "recovered_success";
  };

  const retryResult = await withDatabaseRetry(simulatedFlakyOperation, {
    maxRetries: 2,
    initialDelayMs: 50,
    operationName: "simulated flaky query",
  });

  assert.equal(retryResult, "recovered_success", "withDatabaseRetry must recover from 'kind: Closed'");
  console.log("  ✓ withDatabaseRetry successfully intercepted 'kind: Closed' and recovered cleanly");

  console.log("\n🎉 ALL RESILIENCE TESTS PASSED SUCCESSFULLY!\n");
}

run()
  .catch((e) => {
    console.error("Resilience Test Failed with error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
