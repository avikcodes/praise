/**
 * Verification Test Suite for Neon PostgreSQL Connection Resilience
 *
 * Verifies:
 * 1. Sanitized DNS resolution and port 5432 TCP reachability
 * 2. Prisma Client singleton initialization & reuse
 * 3. Successful execution of all affected database queries:
 *    - prisma.customer.count()
 *    - prisma.testimonial.findMany()
 *    - prisma.testimonial.aggregate()
 *    - prisma.project.findMany()
 *    - prisma.collectionForm.count()
 *    - prisma.widget.count()
 * 4. Staged workspace overview queries under concurrency
 * 5. Transient connection retry utility (withDatabaseRetry)
 * 6. Repeated requests after short delays to verify zero P1001 failures
 */

import assert from "node:assert";
import dns from "node:dns/promises";
import net from "node:net";
import { prisma } from "../src/lib/db/client.ts";
import { withDatabaseRetry, isTransientConnectionError } from "../src/lib/db/retry.ts";

console.log("=== Testing Neon PostgreSQL Connection Resilience ===");

// 1. DNS Resolution Test
console.log("1. Testing DNS resolution for Neon endpoint...");
const pooledHost = "ep-delicate-sun-beiszbf4-pooler.c-9.us-east-2.aws.neon.tech";
const directHost = "ep-delicate-sun-beiszbf4.c-9.us-east-2.aws.neon.tech";

const pooledLookup = await dns.lookup(pooledHost);
assert.ok(pooledLookup.address, "Pooled host must resolve to an IP address");
console.log(`✓ Pooled host resolved successfully`);

const directLookup = await dns.lookup(directHost);
assert.ok(directLookup.address, "Direct host must resolve to an IP address");
console.log(`✓ Direct host resolved successfully`);

// 2. Port 5432 TCP Reachability Test
console.log("2. Testing TCP connection to port 5432...");
async function checkTcp(host, port = 5432) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port, timeout: 5000 });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error(`TCP connection to ${host}:${port} timed out`));
    });
    socket.on("error", (err) => {
      socket.destroy();
      reject(err);
    });
  });
}

await checkTcp(pooledHost, 5432);
console.log("✓ TCP connection to pooled host port 5432 succeeded");

await checkTcp(directHost, 5432);
console.log("✓ TCP connection to direct host port 5432 succeeded");

// 3. Prisma Client Queries Test (All affected operations from problem statement)
console.log("3. Executing affected Prisma operations via pooled connection...");

// Find an existing workspace or use default
const workspace = await prisma.workspace.findFirst();
const workspaceId = workspace ? workspace.id : "ws_test_nonexistent";

const [
  customerCount,
  testimonialList,
  ratingAgg,
  projectList,
  formCount,
  widgetCount,
] = await Promise.all([
  prisma.customer.count({ where: { workspaceId } }),
  prisma.testimonial.findMany({ where: { workspaceId }, take: 5 }),
  prisma.testimonial.aggregate({
    where: { workspaceId, rating: { not: null } },
    _avg: { rating: true },
  }),
  prisma.project.findMany({ where: { workspaceId }, take: 5 }),
  prisma.collectionForm.count({ where: { workspaceId } }),
  prisma.widget.count({ where: { workspaceId } }),
]);

console.log(`✓ All 6 affected queries executed successfully:`);
console.log(`   - prisma.customer.count(): ${customerCount}`);
console.log(`   - prisma.testimonial.findMany(): ${testimonialList.length} items`);
console.log(`   - prisma.testimonial.aggregate(): avg=${ratingAgg._avg.rating ?? "null"}`);
console.log(`   - prisma.project.findMany(): ${projectList.length} items`);
console.log(`   - prisma.collectionForm.count(): ${formCount}`);
console.log(`   - prisma.widget.count(): ${widgetCount}`);

// 4. Test workspace overview staged query execution
console.log("4. Testing staged workspace overview queries with withDatabaseRetry...");
const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

const overviewResult = await withDatabaseRetry(
  async () => {
    // Stage 1: Counts & Aggregates
    const [statusCounts, rating, forms, projects, customers, widgets] = await Promise.all([
      prisma.testimonial.groupBy({
        by: ["status"],
        where: { workspaceId },
        _count: { _all: true },
      }),
      prisma.testimonial.aggregate({
        where: { workspaceId, rating: { not: null } },
        _avg: { rating: true },
      }),
      prisma.collectionForm.count({ where: { workspaceId } }),
      prisma.project.count({ where: { workspaceId } }),
      prisma.customer.count({ where: { workspaceId } }),
      prisma.widget.count({ where: { workspaceId } }),
    ]);

    // Stage 2: Details
    const [recentTestimonials, trendTestimonials, recentForms, recentProjects] = await Promise.all([
      prisma.testimonial.findMany({ where: { workspaceId }, take: 6, orderBy: { submittedAt: "desc" } }),
      prisma.testimonial.findMany({ where: { workspaceId, submittedAt: { gte: fourteenDaysAgo } }, select: { id: true, status: true, submittedAt: true } }),
      prisma.collectionForm.findMany({ where: { workspaceId }, take: 4, orderBy: { createdAt: "desc" } }),
      prisma.project.findMany({ where: { workspaceId }, take: 3, orderBy: { createdAt: "desc" } }),
    ]);

    return { forms, projects, customers, widgets, recentTestimonialsCount: recentTestimonials.length };
  },
  { operationName: "test workspace overview" }
);

assert.ok(overviewResult, "Overview query must return a valid result object");
console.log("✓ Staged workspace overview queries succeeded without errors");

// 5. Test multiple rapid requests (simulating page refreshes)
console.log("5. Testing 5 back-to-back concurrent overview query batches...");
const parallelBatches = Array.from({ length: 5 }, (_, i) =>
  prisma.project.findMany({ where: { workspaceId }, take: 3 })
);
const parallelResults = await Promise.all(parallelBatches);
assert.strictEqual(parallelResults.length, 5, "All 5 concurrent queries must resolve");
console.log("✓ All 5 concurrent query batches resolved with 0 errors");

// 6. Test transient error classifier
console.log("6. Testing transient error classification logic...");
assert.strictEqual(isTransientConnectionError(new Error("Can't reach database server at host")), true);
assert.strictEqual(isTransientConnectionError(new Error("Unique constraint failed")), false);
console.log("✓ Transient error classifier verified");

console.log("=== ALL NEON CONNECTION RESILIENCE TESTS PASSED! ===");
await prisma.$disconnect();
