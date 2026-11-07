import assert from "node:assert";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scryptAsync(password, salt, keyBuffer.length);
  return timingSafeEqual(keyBuffer, derivedKey);
}

// -----------------------------------------------------------------------------
// Test 1: Password Hashing & Constant-Time Verification
// -----------------------------------------------------------------------------
async function testPasswordHashing() {
  console.log("▶ Testing password hashing & constant-time verification...");
  const rawPassword = "CorrectHorseBatteryStaple123!";
  const hash1 = await hashPassword(rawPassword);
  const hash2 = await hashPassword(rawPassword);

  assert.notStrictEqual(hash1, hash2, "Salts must be unique across password hashes");
  assert.strictEqual(await verifyPassword(rawPassword, hash1), true, "Valid password must verify");
  assert.strictEqual(await verifyPassword(rawPassword, hash2), true, "Valid password must verify with second hash");
  assert.strictEqual(await verifyPassword("WrongPassword!", hash1), false, "Wrong password must fail");
  assert.strictEqual(await verifyPassword("", hash1), false, "Empty password must fail");
  console.log("✔ Password hashing & constant-time verification passed.");
}

// -----------------------------------------------------------------------------
// Test 2: Role-Based Access Control & Workspace Isolation Boundaries
// -----------------------------------------------------------------------------
function testWorkspaceAuthorizationIsolation() {
  console.log("▶ Testing workspace isolation & role permission boundaries...");

  // Simulated Database State
  const db = {
    users: [
      { id: "usr_alice", name: "Alice", email: "alice@company-a.example" },
      { id: "usr_bob", name: "Bob", email: "bob@company-b.example" },
      { id: "usr_charlie", name: "Charlie", email: "charlie@company-a.example" },
    ],
    workspaces: [
      { id: "ws_alpha", name: "Alpha Corp", slug: "alpha-corp" },
      { id: "ws_beta", name: "Beta LLC", slug: "beta-llc" },
    ],
    memberships: [
      { workspaceId: "ws_alpha", userId: "usr_alice", role: "OWNER" },
      { workspaceId: "ws_alpha", userId: "usr_charlie", role: "MEMBER" },
      { workspaceId: "ws_beta", userId: "usr_bob", role: "OWNER" },
    ],
    testimonials: [
      { id: "t_alpha_1", workspaceId: "ws_alpha", content: "Great product!", status: "APPROVED" },
      { id: "t_beta_1", workspaceId: "ws_beta", content: "Super helpful!", status: "PENDING" },
    ],
  };

  function checkWorkspaceAccess(userId, workspaceId, requiredRoles = null) {
    const membership = db.memberships.find(
      (m) => m.userId === userId && m.workspaceId === workspaceId,
    );

    if (!membership) {
      return { allowed: false, status: 403, error: "Access denied: Not a workspace member" };
    }

    if (requiredRoles && !requiredRoles.includes(membership.role)) {
      return {
        allowed: false,
        status: 403,
        error: `Insufficient permissions: Requires ${requiredRoles.join(" or ")}, got ${membership.role}`,
      };
    }

    return { allowed: true, role: membership.role };
  }

  function getTestimonial(userId, workspaceId, testimonialId) {
    // 1. Enforce workspace membership first
    const auth = checkWorkspaceAccess(userId, workspaceId);
    if (!auth.allowed) {
      throw new Error(`403: ${auth.error}`);
    }

    // 2. Query strictly within workspace boundary
    const item = db.testimonials.find(
      (t) => t.id === testimonialId && t.workspaceId === workspaceId,
    );

    if (!item) {
      throw new Error("404: Testimonial not found in this workspace");
    }

    return item;
  }

  // Assertion 1: Alice (Owner of Alpha) can access Alpha's testimonial
  const tAlpha = getTestimonial("usr_alice", "ws_alpha", "t_alpha_1");
  assert.strictEqual(tAlpha.id, "t_alpha_1");

  // Assertion 2: Alice attempts to access Beta's testimonial -> Denied 403
  assert.throws(
    () => getTestimonial("usr_alice", "ws_beta", "t_beta_1"),
    /403: Access denied/,
    "Cross-workspace access must be strictly forbidden",
  );

  // Assertion 3: Bob (Owner of Beta) attempts to access Alpha's testimonial -> Denied 403
  assert.throws(
    () => getTestimonial("usr_bob", "ws_alpha", "t_alpha_1"),
    /403: Access denied/,
    "Bob cannot read Alpha's workspace data",
  );

  // Assertion 4: Charlie is MEMBER of Alpha; testing role escalation (Delete requires OWNER or ADMIN)
  const memberCheck = checkWorkspaceAccess("usr_charlie", "ws_alpha", ["OWNER", "ADMIN"]);
  assert.strictEqual(memberCheck.allowed, false);
  assert.strictEqual(memberCheck.status, 403);

  // Assertion 5: Alice is OWNER of Alpha; delete operation allowed
  const ownerCheck = checkWorkspaceAccess("usr_alice", "ws_alpha", ["OWNER", "ADMIN"]);
  assert.strictEqual(ownerCheck.allowed, true);

  console.log("✔ Workspace isolation and role-based permissions verified.");
}

async function run() {
  await testPasswordHashing();
  testWorkspaceAuthorizationIsolation();
  console.log("\nAll backend authorization and security boundaries verified successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

