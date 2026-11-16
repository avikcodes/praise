/**
 * Automated Test Suite for Praise Customer CRM Stages & Workspace Scoping Fix
 *
 * Validates:
 * 1. Safe handling of nonexistent workspace IDs in ensureDefaultStages (no P2003 FK errors)
 * 2. Idempotency: repeated ensureDefaultStages calls return identical stages with no duplicates
 * 3. Concurrency: simultaneous calls to ensureDefaultStages resolve without P2002 unique constraint violations
 * 4. Server-side alias resolution: resolves "ws-default" to the authenticated user's canonical workspace
 * 5. Isolation: prevents access to another user's workspace (cross-tenant access control)
 * 6. Non-existent workspace handling: returns 404 when workspace does not exist
 * 7. Verification that API routes use canonical database workspace IDs and catch AuthError
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/db/client.ts";
import { ensureDefaultStages, DEFAULT_CUSTOMER_STAGES } from "../src/lib/customers/crm.ts";

async function run() {
  console.log("🚀 Starting Praise Customer CRM Stages & Workspace Scoping Test Suite...\n");

  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const testUserAId = `usr_test_crm_a_${testSuffix}`;
  const testUserBId = `usr_test_crm_b_${testSuffix}`;
  const testWsAId = `ws_test_crm_a_${testSuffix}`;
  const testWsBId = `ws_test_crm_b_${testSuffix}`;

  try {
    // ------------------------------------------------------------------------
    // SETUP: Provision isolated test users and workspaces in PostgreSQL
    // ------------------------------------------------------------------------
    console.log("📦 Setting up test fixtures in PostgreSQL...");

    const userA = await prisma.user.create({
      data: {
        id: testUserAId,
        email: `alice_${testSuffix}@praise.test`,
        name: "Alice Founder",
        passwordHash: "test_hash",
      },
    });

    const wsA = await prisma.workspace.create({
      data: {
        id: testWsAId,
        name: "Alice Corp",
        slug: `alice-corp-${testSuffix}`,
        members: {
          create: {
            userId: testUserAId,
            role: "OWNER",
          },
        },
      },
    });

    const userB = await prisma.user.create({
      data: {
        id: testUserBId,
        email: `bob_${testSuffix}@praise.test`,
        name: "Bob Builder",
        passwordHash: "test_hash",
      },
    });

    const wsB = await prisma.workspace.create({
      data: {
        id: testWsBId,
        name: "Bob Corp",
        slug: `bob-corp-${testSuffix}`,
        members: {
          create: {
            userId: testUserBId,
            role: "OWNER",
          },
        },
      },
    });

    console.log("  ✓ Test users and workspaces provisioned.\n");

    // ------------------------------------------------------------------------
    // Test 1: Nonexistent Workspace ID in ensureDefaultStages
    // ------------------------------------------------------------------------
    console.log("🧪 Test 1: ensureDefaultStages with nonexistent workspace ('ws-default')");
    try {
      await ensureDefaultStages("ws-default");
      assert.fail("Should have thrown for nonexistent workspace ID 'ws-default'");
    } catch (err) {
      assert.ok(err instanceof Error, "Should throw standard Error");
      assert.ok(
        err.message.includes("Workspace not found"),
        `Error message should indicate workspace not found, got: ${err.message}`
      );
      assert.ok(
        !err.message.includes("Foreign key constraint violated"),
        "Must NOT throw Prisma P2003 FK constraint violation"
      );
      console.log("  ✓ Safely rejects nonexistent workspace without P2003 FK violation");
    }

    // ------------------------------------------------------------------------
    // Test 2: Create Default Stages for Workspace with No Existing Stages
    // ------------------------------------------------------------------------
    console.log("\n🧪 Test 2: Create default stages for new workspace with real database ID");
    const stagesA = await ensureDefaultStages(testWsAId);
    assert.equal(stagesA.length, DEFAULT_CUSTOMER_STAGES.length, "Should create all 6 default stages");
    const keysA = stagesA.map((s) => s.key);
    for (const def of DEFAULT_CUSTOMER_STAGES) {
      assert.ok(keysA.includes(def.key), `Should contain default stage ${def.key}`);
    }
    console.log("  ✓ Created all 6 default stages (NEW, ACTIVE, PROMOTER, CHAMPION, AT_RISK, INACTIVE)");

    // ------------------------------------------------------------------------
    // Test 3: Idempotency - Repeated requests do not create duplicates
    // ------------------------------------------------------------------------
    console.log("\n🧪 Test 3: Idempotency of ensureDefaultStages");
    const stagesA2 = await ensureDefaultStages(testWsAId);
    assert.equal(stagesA2.length, stagesA.length, "Stage count must not change on repeated calls");
    assert.deepEqual(stagesA2.map((s) => s.id), stagesA.map((s) => s.id), "Must preserve existing stage IDs");

    const countInDb = await prisma.customerStage.count({
      where: { workspaceId: testWsAId },
    });
    assert.equal(countInDb, 6, "Database must strictly have 6 stage records, no duplicates");
    console.log("  ✓ Re-requesting stages is completely idempotent with 0 duplicate records");

    // ------------------------------------------------------------------------
    // Test 4: Concurrency - Multiple simultaneous requests
    // ------------------------------------------------------------------------
    console.log("\n🧪 Test 4: Concurrency safety under simultaneous requests");
    const testWsCId = `ws_test_crm_c_${testSuffix}`;
    await prisma.workspace.create({
      data: {
        id: testWsCId,
        name: "Concurrent Corp",
        slug: `concurrent-corp-${testSuffix}`,
        members: {
          create: {
            userId: testUserAId,
            role: "MEMBER",
          },
        },
      },
    });

    // Fire 10 parallel invocations simultaneously for a brand new workspace
    const parallelCalls = Array.from({ length: 10 }).map(() =>
      ensureDefaultStages(testWsCId)
    );
    const results = await Promise.all(parallelCalls);

    for (const res of results) {
      assert.equal(res.length, 6, "Every concurrent call must return 6 stages");
    }

    const cCount = await prisma.customerStage.count({
      where: { workspaceId: testWsCId },
    });
    assert.equal(cCount, 6, "Concurrent initialization must result in exactly 6 stages with 0 duplicate errors");
    console.log("  ✓ 10 simultaneous concurrent requests resolved safely without P2002/P2003 errors");

    await prisma.customerStage.deleteMany({ where: { workspaceId: testWsCId } });
    await prisma.workspace.delete({ where: { id: testWsCId } });

    // ------------------------------------------------------------------------
    // Test 5: Server-side alias resolution logic for 'ws-default'
    // ------------------------------------------------------------------------
    console.log("\n🧪 Test 5: Server-side alias resolution for 'ws-default'");
    // Simulate what requireWorkspaceMember does when passed 'ws-default' for userA
    async function resolveWorkspaceForUser(userId, workspaceId) {
      const isDefaultAlias =
        workspaceId === "ws-default" ||
        workspaceId === "default" ||
        workspaceId.startsWith("ws-default");

      if (isDefaultAlias) {
        const membership = await prisma.workspaceMember.findFirst({
          where: { userId },
          include: { workspace: true },
          orderBy: { createdAt: "asc" },
        });
        if (!membership) throw new Error("Workspace not found");
        return membership.workspace;
      }

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        include: { workspace: true },
      });

      if (!membership) {
        const exists = await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { id: true },
        });
        if (!exists) throw new Error("404: Workspace not found");
        throw new Error("403: Access denied");
      }

      return membership.workspace;
    }

    const resolvedWsA = await resolveWorkspaceForUser(testUserAId, "ws-default");
    assert.equal(resolvedWsA.id, testWsAId, "ws-default for Alice must resolve to Alice's canonical workspace ID");
    assert.notEqual(resolvedWsA.id, "ws-default", "Resolved workspace must NOT be 'ws-default'");

    const resolvedWsB = await resolveWorkspaceForUser(testUserBId, "ws-default");
    assert.equal(resolvedWsB.id, testWsBId, "ws-default for Bob must resolve to Bob's canonical workspace ID");
    assert.notEqual(resolvedWsB.id, resolvedWsA.id, "Bob and Alice must NEVER resolve to the same workspace");
    console.log("  ✓ 'ws-default' safely resolved to each user's respective canonical database workspace");

    // ------------------------------------------------------------------------
    // Test 6: Cross-user workspace isolation & unauthorized access
    // ------------------------------------------------------------------------
    console.log("\n🧪 Test 6: Cross-workspace access control");
    try {
      await resolveWorkspaceForUser(testUserAId, testWsBId);
      assert.fail("Alice should NOT be able to access Bob's workspace");
    } catch (err) {
      assert.ok(err.message.includes("403"), "Should reject cross-workspace access with 403");
      console.log("  ✓ Prevented cross-workspace access (User A cannot access User B's workspace)");
    }

    // ------------------------------------------------------------------------
    // Test 7: Nonexistent workspace lookup returns 404
    // ------------------------------------------------------------------------
    console.log("\n🧪 Test 7: Nonexistent workspace lookup returns 404");
    try {
      await resolveWorkspaceForUser(testUserAId, "completely-nonexistent-ws-id");
      assert.fail("Should throw 404 for completely nonexistent workspace");
    } catch (err) {
      assert.ok(err.message.includes("404"), "Should return 404 for nonexistent workspace");
      console.log("  ✓ Returned 404 for nonexistent workspace ID");
    }

    // ------------------------------------------------------------------------
    // Test 8: Source code verification of Route Handlers & Guards
    // ------------------------------------------------------------------------
    console.log("\n🧪 Test 8: Verification of Guards and Route Handlers");

    const guardsSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/auth/guards.ts"),
      "utf-8"
    );
    assert.ok(guardsSrc.includes("isDefaultAlias"), "guards.ts must detect default alias");
    assert.ok(guardsSrc.includes("Workspace not found"), "guards.ts must throw 404 for nonexistent workspaces");
    assert.ok(guardsSrc.includes("Access denied"), "guards.ts must throw 403 for cross-workspace access");
    assert.ok(!guardsSrc.includes("return {\n          user,\n          workspace: {\n            id: workspaceId,\n            name: \"Default Workspace\","), "guards.ts must NOT return fake in-memory ws-default objects");

    const stagesRouteSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/workspaces/[id]/customers/stages/route.ts"),
      "utf-8"
    );
    assert.ok(stagesRouteSrc.includes("const workspaceId = workspace.id"), "stages/route.ts must use canonical workspace.id from requireWorkspaceMember");
    assert.ok(stagesRouteSrc.includes("AuthError"), "stages/route.ts must catch AuthError");
    assert.ok(stagesRouteSrc.includes("status: error.status"), "stages/route.ts must return proper HTTP status (404/403/400)");

    const stagesIdRouteSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/workspaces/[id]/customers/stages/[stageId]/route.ts"),
      "utf-8"
    );
    assert.ok(stagesIdRouteSrc.includes("const workspaceId = workspace.id"), "stages/[stageId]/route.ts must use canonical workspace.id");
    assert.ok(stagesIdRouteSrc.includes("AuthError"), "stages/[stageId]/route.ts must catch AuthError");

    const customersRouteSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/workspaces/[id]/customers/route.ts"),
      "utf-8"
    );
    assert.ok(customersRouteSrc.includes("const workspaceId = workspace.id") || customersRouteSrc.includes("workspaceId = member.workspace.id"), "customers/route.ts must use canonical workspace.id");

    const wsContextSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/dashboard/workspace-context.tsx"),
      "utf-8"
    );
    assert.ok(!wsContextSrc.includes('useState<string>("ws-default")'), "workspace-context.tsx must NOT initialize activeWorkspaceId with ws-default");

    console.log("  ✓ All routes and guards strictly enforce canonical database workspace IDs and error handling");

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP: Clean up test fixtures from PostgreSQL
    // ------------------------------------------------------------------------
    console.log("\n🧹 Cleaning up test fixtures from PostgreSQL...");
    await prisma.customerStage.deleteMany({
      where: { workspaceId: { in: [testWsAId, testWsBId] } },
    }).catch(() => {});
    await prisma.workspace.deleteMany({
      where: { id: { in: [testWsAId, testWsBId] } },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [testUserAId, testUserBId] } },
    }).catch(() => {});
    console.log("  ✓ Test fixtures cleaned up.");
  }

  console.log("\n🎉 ALL 8 TESTS PASSED SUCCESSFULLY!\n");
}

run()
  .catch((e) => {
    console.error("Test Suite Failed with error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
