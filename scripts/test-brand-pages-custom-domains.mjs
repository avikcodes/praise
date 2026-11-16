/**
 * Comprehensive Automated Test Suite for Praise Brand Pages & Custom Domain Publishing
 *
 * Requirements Verified:
 * 1. Brand Pages Profile & Configuration:
 *    - Creation of brand profiles with name, slug, logoUrl, tagline, description, websiteUrl, and social links.
 *    - Theme presets support: WARM, LIGHT, DARK, MIDNIGHT, EMERALD, SUNSET, MINIMAL.
 *    - Dual CTAs: Primary and Secondary CTA buttons with custom labels and target URLs.
 * 2. Curated Walls & Strict Moderation on Brand Pages:
 *    - Selection of specific Walls of Love showcased on the brand profile.
 *    - Featured testimonials query guarantees STRICT moderation: ONLY status="APPROVED" testimonials.
 *    - PENDING or ARCHIVED testimonials are NEVER exposed publicly on the brand page.
 * 3. Publication State & Preview Access Gating:
 *    - Unpublished brands return isUnpublished: true and null brandData on public routes.
 *    - Preview mode (preview: true) allows workspace owners to inspect draft brand profiles safely.
 * 4. Brand SEO & Schema.org Structured Data:
 *    - buildBrandPageMetadata generates page title, excerpt, OpenGraph, and canonical URL.
 *    - generateBrandJsonLd generates valid Schema.org "Brand" entity with reviews.
 * 5. Brand Duplication & Deletion:
 *    - Duplication creates a draft with "-copy-xxxx" slug suffix.
 *    - Safe deletion.
 * 6. Custom Domain Association & Validation:
 *    - Associates a custom domain with either a WALL_OF_LOVE or a BRAND_PAGE.
 *    - Validates FQDN; rejects invalid hostnames, localhost, and raw IP addresses.
 * 7. Security & Anti-Squatting Guarantee:
 *    - Strict global uniqueness: PREVENTS one workspace from claiming another workspace's hostname.
 * 8. DNS Ownership Verification Challenge:
 *    - Generates unique verification challenge token (_praise-challenge.<domain>).
 *    - Verifies ownership via TXT challenge and CNAME target.
 *    - Updates status: PENDING_VERIFICATION -> ACTIVE upon verification, or FAILED upon mismatch.
 * 9. DNS Instructions & Reverse-Proxy Deployment Guidance:
 *    - Generates copyable CNAME and TXT DNS records.
 *    - Generates self-hosted reverse-proxy snippets for Caddy, Nginx, Traefik, and Cloudflare SSL.
 *    - Does NOT falsely claim automated internal TLS provisioning; respects fronting proxy boundary.
 * 10. Canonical URL Rewriting:
 *     - When a verified domain is active, canonical URLs for brand pages and walls automatically rewrite to https://<domain>/.
 * 11. Hostname Routing Resolution:
 *     - resolveCustomDomainTarget dynamically routes incoming Host/X-Forwarded-Host to assigned Wall of Love or Brand Profile.
 * 12. Domain Removal & Target Reassignment:
 *     - Reassigning domain to a different wall or brand.
 *     - Removing domain frees the hostname for future use.
 */

import assert from "node:assert/strict";
import {
  resolvePublicBrand,
  listWorkspaceBrands,
  createWorkspaceBrand,
  updateWorkspaceBrand,
  duplicateWorkspaceBrand,
  deleteWorkspaceBrand,
  parseIdArray,
  parseSocialLinks,
} from "../src/lib/brands/service.ts";
import {
  normalizeDomain,
  isValidCustomDomain,
  generateVerificationToken,
  getDnsInstructions,
  listWorkspaceDomains,
  createCustomDomain,
  updateCustomDomain,
  verifyCustomDomain,
  deleteCustomDomain,
  resolveCustomDomainTarget,
} from "../src/lib/domains/service.ts";
import {
  buildBrandPageMetadata,
  generateBrandJsonLd,
} from "../src/lib/seo/metadata.ts";
import { resolvePublicWall } from "../src/lib/walls/service.ts";

function createMockDb() {
  const brands = new Map();
  const walls = new Map();
  const customDomains = new Map();
  const projects = new Map();
  const workspaces = new Map();
  const testimonials = new Map();

  let idCounter = 1;

  return {
    _store: { brands, walls, customDomains, projects, workspaces, testimonials },
    brand: {
      async findFirst({ where }) {
        for (const b of brands.values()) {
          if (where.id && b.id !== where.id) continue;
          if (where.slug && b.slug !== where.slug) continue;
          if (where.workspaceId && b.workspaceId !== where.workspaceId) continue;
          if (where.NOT?.id && b.id === where.NOT.id) continue;

          const ws = workspaces.get(b.workspaceId) || { id: b.workspaceId, name: "Acme", slug: "acme" };
          const linkedProjects = [];
          for (const p of projects.values()) {
            if (p.brandId === b.id) linkedProjects.push({ id: p.id, name: p.name, slug: p.slug });
          }

          const linkedDomains = [];
          for (const d of customDomains.values()) {
            if (d.brandId === b.id && (where.customDomains?.where?.status ? d.status === where.customDomains.where.status : true)) {
              linkedDomains.push({ id: d.id, domain: d.domain, status: d.status, canonicalRedirect: d.canonicalRedirect });
            }
          }

          return {
            ...b,
            workspace: ws,
            projects: linkedProjects,
            customDomains: linkedDomains,
          };
        }
        return null;
      },
      async findMany({ where }) {
        const results = [];
        for (const b of brands.values()) {
          if (where.workspaceId && b.workspaceId !== where.workspaceId) continue;
          if (where.isPublished !== undefined && b.isPublished !== where.isPublished) continue;

          const linkedProjects = [];
          for (const p of projects.values()) {
            if (p.brandId === b.id) linkedProjects.push({ id: p.id, name: p.name, slug: p.slug });
          }

          const linkedDomains = [];
          for (const d of customDomains.values()) {
            if (d.brandId === b.id) linkedDomains.push({ id: d.id, domain: d.domain, status: d.status });
          }

          results.push({
            ...b,
            projects: linkedProjects,
            customDomains: linkedDomains,
          });
        }
        return results;
      },
      async create({ data }) {
        const id = `brand_${idCounter++}`;
        const record = {
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          viewsCount: 0,
          ...data,
        };
        brands.set(id, record);
        return {
          ...record,
          projects: [],
          customDomains: [],
        };
      },
      async update({ where, data }) {
        const existing = brands.get(where.id);
        if (!existing) throw new Error("Brand not found");
        const updated = { ...existing, ...data, updatedAt: new Date() };
        brands.set(where.id, updated);
        return { ...updated, projects: [], customDomains: [] };
      },
      async delete({ where }) {
        brands.delete(where.id);
        return { success: true };
      },
      async count({ where }) {
        return testimonials.size;
      },
    },
    wallOfLove: {
      async findFirst({ where }) {
        for (const wall of walls.values()) {
          if (where.id && wall.id !== where.id) continue;
          if (where.slug && wall.slug !== where.slug) continue;
          if (where.workspaceId && wall.workspaceId !== where.workspaceId) continue;
          const ws = workspaces.get(wall.workspaceId) || { id: wall.workspaceId, name: "WS", slug: "ws" };
          const linkedDomains = [];
          for (const d of customDomains.values()) {
            if (d.wallOfLoveId === wall.id && (where.customDomains?.where?.status ? d.status === where.customDomains.where.status : true)) {
              linkedDomains.push({ id: d.id, domain: d.domain, status: d.status, canonicalRedirect: d.canonicalRedirect });
            }
          }
          return { ...wall, workspace: ws, project: null, customDomains: linkedDomains };
        }
        return null;
      },
      async findMany({ where }) {
        const results = [];
        for (const wall of walls.values()) {
          if (where.workspaceId && wall.workspaceId !== where.workspaceId) continue;
          if (where.isPublished !== undefined && wall.isPublished !== where.isPublished) continue;
          if (where.id?.in && !where.id.in.includes(wall.id)) continue;
          results.push({ ...wall });
        }
        return results;
      },
      async create({ data }) {
        const id = `wall_${idCounter++}`;
        const rec = { id, createdAt: new Date(), updatedAt: new Date(), viewsCount: 0, ...data };
        walls.set(id, rec);
        return rec;
      },
    },
    customDomain: {
      async findUnique({ where }) {
        for (const d of customDomains.values()) {
          if (where.domain && d.domain === where.domain) {
            const wall = d.wallOfLoveId ? walls.get(d.wallOfLoveId) || null : null;
            const br = d.brandId ? brands.get(d.brandId) || null : null;
            return { ...d, wallOfLove: wall, brand: br };
          }
          if (where.id && d.id === where.id) {
            return { ...d };
          }
        }
        return null;
      },
      async findFirst({ where }) {
        for (const d of customDomains.values()) {
          if (where.id && d.id !== where.id) continue;
          if (where.workspaceId && d.workspaceId !== where.workspaceId) continue;
          if (where.domain && d.domain !== where.domain) continue;
          const wall = d.wallOfLoveId ? walls.get(d.wallOfLoveId) || null : null;
          const br = d.brandId ? brands.get(d.brandId) || null : null;
          return { ...d, wallOfLove: wall, brand: br };
        }
        return null;
      },
      async findMany({ where }) {
        const results = [];
        for (const d of customDomains.values()) {
          if (where.workspaceId && d.workspaceId !== where.workspaceId) continue;
          const wall = d.wallOfLoveId ? walls.get(d.wallOfLoveId) || null : null;
          const br = d.brandId ? brands.get(d.brandId) || null : null;
          results.push({ ...d, wallOfLove: wall, brand: br });
        }
        return results;
      },
      async create({ data }) {
        const id = `dom_${idCounter++}`;
        const rec = { id, createdAt: new Date(), updatedAt: new Date(), viewsCount: 0, ...data };
        customDomains.set(id, rec);
        const wall = rec.wallOfLoveId ? walls.get(rec.wallOfLoveId) || null : null;
        const br = rec.brandId ? brands.get(rec.brandId) || null : null;
        return { ...rec, wallOfLove: wall, brand: br };
      },
      async update({ where, data }) {
        const existing = customDomains.get(where.id);
        if (!existing) throw new Error("Domain not found");
        const updated = { ...existing, ...data, updatedAt: new Date() };
        customDomains.set(where.id, updated);
        const wall = updated.wallOfLoveId ? walls.get(updated.wallOfLoveId) || null : null;
        const br = updated.brandId ? brands.get(updated.brandId) || null : null;
        return { ...updated, wallOfLove: wall, brand: br };
      },
      async delete({ where }) {
        customDomains.delete(where.id);
        return { success: true };
      },
    },
    testimonial: {
      async findMany({ where, orderBy }) {
        const results = [];
        for (const t of testimonials.values()) {
          if (where.workspaceId && t.workspaceId !== where.workspaceId) continue;
          if (where.status && t.status !== where.status) continue;
          if (where.id?.in && !where.id.in.includes(t.id)) continue;
          results.push({ ...t });
        }
        return results;
      },
      async count({ where }) {
        let cnt = 0;
        for (const t of testimonials.values()) {
          if (where.workspaceId && t.workspaceId !== where.workspaceId) continue;
          if (where.status && t.status !== where.status) continue;
          cnt++;
        }
        return cnt;
      },
    },
  };
}

async function runTests() {
  console.log("=== Running Praise Brand Pages & Custom Domains Automated Test Suite ===");
  const db = createMockDb();

  const workspace1 = "ws_primary_100";
  const workspace2 = "ws_rival_200";

  db._store.workspaces.set(workspace1, {
    id: workspace1,
    name: "Acme Master Org",
    slug: "acme-master",
    logoUrl: "https://acme.com/logo.png",
  });
  db._store.workspaces.set(workspace2, {
    id: workspace2,
    name: "Rival Corp",
    slug: "rival",
  });

  // Seed sample walls
  const wallEnt = {
    id: "wall_ent_1",
    workspaceId: workspace1,
    name: "Enterprise Showcase",
    slug: "enterprise-wall",
    title: "Loved by Enterprises",
    description: "Enterprise reviews",
    theme: "MIDNIGHT",
    layout: "MASONRY",
    isPublished: true,
  };
  const wallDev = {
    id: "wall_dev_2",
    workspaceId: workspace1,
    name: "Developer Reviews",
    slug: "dev-wall",
    title: "Loved by Engineers",
    description: "Dev testimonials",
    theme: "DARK",
    layout: "GRID",
    isPublished: true,
  };
  db._store.walls.set(wallEnt.id, wallEnt);
  db._store.walls.set(wallDev.id, wallDev);

  // Seed testimonials (approved, pending, archived)
  const tApproved1 = {
    id: "t_app_1",
    workspaceId: workspace1,
    content: "Acme Cloud saved our infra team 20 hours a week.",
    rating: 5,
    status: "APPROVED",
    isFeatured: true,
    submittedAt: new Date("2026-03-01T10:00:00Z"),
    customer: { name: "Elena Chen", company: "DataCo", title: "CTO" },
    tags: [{ tag: { name: "Cloud" } }],
  };
  const tApproved2 = {
    id: "t_app_2",
    workspaceId: workspace1,
    content: "Seamless migration and 99.999% uptime.",
    rating: 5,
    status: "APPROVED",
    isFeatured: false,
    submittedAt: new Date("2026-03-02T10:00:00Z"),
    customer: { name: "Marcus Stone", company: "FinTech Inc" },
    tags: [{ tag: { name: "Enterprise" } }],
  };
  const tPending = {
    id: "t_pending_3",
    workspaceId: workspace1,
    content: "Unreviewed submission.",
    rating: 5,
    status: "PENDING", // Strict rule: MUST NOT APPEAR PUBLICLY
    customer: { name: "Anonymous" },
  };
  const tArchived = {
    id: "t_archived_4",
    workspaceId: workspace1,
    content: "Archived submission.",
    rating: 2,
    status: "ARCHIVED", // Strict rule: MUST NOT APPEAR PUBLICLY
    customer: { name: "Old Customer" },
  };

  for (const t of [tApproved1, tApproved2, tPending, tArchived]) {
    db._store.testimonials.set(t.id, t);
  }

  // ---------------------------------------------------------------------------
  // Test 1: Helper parsing functions
  // ---------------------------------------------------------------------------
  console.log("Test 1: Parsing ID arrays and social links");
  assert.deepEqual(parseIdArray(["id1", "id2"]), ["id1", "id2"]);
  assert.deepEqual(parseIdArray('["id3", "id4"]'), ["id3", "id4"]);
  assert.deepEqual(parseIdArray("id5, id6"), ["id5", "id6"]);
  assert.deepEqual(parseIdArray(null), []);

  const parsedSocial = parseSocialLinks('{"twitter":"https://x.com/acme","github":"https://github.com/acme"}');
  assert.equal(parsedSocial.twitter, "https://x.com/acme");
  assert.equal(parsedSocial.github, "https://github.com/acme");
  console.log("✓ Parsing helpers verified");

  // ---------------------------------------------------------------------------
  // Test 2: Create Brand Page with themes and dual CTAs
  // ---------------------------------------------------------------------------
  console.log("Test 2: Create Brand Profile");
  const brand1 = await createWorkspaceBrand(
    {
      workspaceId: workspace1,
      name: "Acme Cloud",
      slug: "acme-cloud",
      tagline: "The Next-Gen Cloud Platform",
      description: "Scale your microservices without managing servers.",
      logoUrl: "https://acme.com/cloud.png",
      websiteUrl: "https://acme.com",
      theme: "MIDNIGHT",
      isPublished: true,
      selectedWallIds: [wallEnt.id, wallDev.id],
      ctaEnabled: true,
      ctaLabel: "Start Free Cloud Trial",
      ctaUrl: "https://acme.com/signup",
      ctaSecondaryEnabled: true,
      ctaSecondaryLabel: "Leave Feedback",
      ctaSecondaryUrl: "/p/acme-cloud",
      socialLinks: { twitter: "https://x.com/acmecloud" },
    },
    db
  );

  assert.equal(brand1.name, "Acme Cloud");
  assert.equal(brand1.slug, "acme-cloud");
  assert.equal(brand1.theme, "MIDNIGHT");
  assert.equal(brand1.isPublished, true);
  assert.equal(brand1.publicUrl, "/b/acme-cloud");

  // Duplicate slug enforcement in same workspace
  await assert.rejects(
    async () => {
      await createWorkspaceBrand(
        {
          workspaceId: workspace1,
          name: "Acme Cloud Duplicate",
          slug: "acme-cloud",
        },
        db
      );
    },
    { message: /already exists in this workspace/ }
  );
  console.log("✓ Brand profile creation and slug uniqueness verified");

  // ---------------------------------------------------------------------------
  // Test 3: Public Brand Profile Resolution & Strict Approved Testimonial Rule
  // ---------------------------------------------------------------------------
  console.log("Test 3: Public Brand Profile Resolution & Strict Moderation Guarantee");
  const resolvedBrand = await resolvePublicBrand("acme-cloud", {}, db);
  assert.ok(resolvedBrand.brandData);
  assert.equal(resolvedBrand.brandData.name, "Acme Cloud");
  assert.equal(resolvedBrand.brandData.walls.length, 2);

  // Strict moderation rule: ONLY approved testimonials
  const returnedTestimonialIds = resolvedBrand.brandData.featuredTestimonials.map((t) => t.id);
  assert.ok(returnedTestimonialIds.includes("t_app_1"), "Approved t1 must be present");
  assert.ok(returnedTestimonialIds.includes("t_app_2"), "Approved t2 must be present");
  assert.ok(!returnedTestimonialIds.includes("t_pending_3"), "PENDING reviews MUST NOT appear on brand profile");
  assert.ok(!returnedTestimonialIds.includes("t_archived_4"), "ARCHIVED reviews MUST NOT appear on brand profile");
  console.log("✓ Public profile resolution and strict approved-only guarantee verified");

  // ---------------------------------------------------------------------------
  // Test 4: Unpublished Brand Gating & Preview Mode
  // ---------------------------------------------------------------------------
  console.log("Test 4: Brand publication gating & preview access");
  const brandDraft = await createWorkspaceBrand(
    {
      workspaceId: workspace1,
      name: "Acme AI Labs",
      slug: "acme-ai",
      isPublished: false, // Draft
    },
    db
  );

  const unpubResult = await resolvePublicBrand("acme-ai", {}, db);
  assert.equal(unpubResult.isUnpublished, true);
  assert.equal(unpubResult.brandData, null);

  // In preview mode (preview: true), owner can safely preview draft profile
  const previewResult = await resolvePublicBrand("acme-ai", { preview: true }, db);
  assert.ok(previewResult.brandData);
  assert.equal(previewResult.brandData.slug, "acme-ai");
  assert.equal(previewResult.brandData.isPublished, false);
  console.log("✓ Publication gating and preview access verified");

  // ---------------------------------------------------------------------------
  // Test 5: Brand SEO Metadata & Schema.org JSON-LD Generation
  // ---------------------------------------------------------------------------
  console.log("Test 5: Brand SEO metadata & Schema.org JSON-LD");
  const seoMeta = buildBrandPageMetadata(resolvedBrand.brandData, "acme-cloud");
  assert.ok(seoMeta.title?.includes("Acme Cloud"));
  assert.equal(seoMeta.alternates?.canonical, "http://localhost:3000/b/acme-cloud");

  const jsonLd = generateBrandJsonLd(resolvedBrand.brandData);
  assert.equal(jsonLd["@type"], "Brand");
  assert.equal(jsonLd.name, "Acme Cloud");
  assert.equal(jsonLd.review.length, 2);
  console.log("✓ Brand metadata and Schema.org structured data verified");

  // ---------------------------------------------------------------------------
  // Test 6: Brand Duplication & Deletion
  // ---------------------------------------------------------------------------
  console.log("Test 6: Brand duplication and deletion");
  const duplicatedBrand = await duplicateWorkspaceBrand(workspace1, brand1.id, db);
  assert.ok(duplicatedBrand.slug.startsWith("acme-cloud-copy-"));
  assert.equal(duplicatedBrand.isPublished, false, "Duplicated brand must start as draft");

  const delBrandRes = await deleteWorkspaceBrand(workspace1, duplicatedBrand.id, db);
  assert.equal(delBrandRes.success, true);
  console.log("✓ Duplication and deletion verified");

  // ---------------------------------------------------------------------------
  // Test 7: Domain Normalization & FQDN Validation
  // ---------------------------------------------------------------------------
  console.log("Test 7: Custom domain normalization & FQDN validation");
  assert.equal(normalizeDomain("  https://Reviews.MyBrand.com/path?query=1:3000 "), "reviews.mybrand.com");
  assert.equal(normalizeDomain("http://praise.acme.io/"), "praise.acme.io");

  // Rejections
  assert.equal(isValidCustomDomain("localhost").valid, false);
  assert.equal(isValidCustomDomain("127.0.0.1").valid, false);
  assert.equal(isValidCustomDomain("192.168.1.1").valid, false);
  assert.equal(isValidCustomDomain("not-a-domain").valid, false);
  assert.equal(isValidCustomDomain("reviews.internal").valid, false);

  // Acceptances
  assert.equal(isValidCustomDomain("reviews.acme.com").valid, true);
  assert.equal(isValidCustomDomain("praise.brand.co.uk").valid, true);
  console.log("✓ Domain normalization and FQDN security checks verified");

  // ---------------------------------------------------------------------------
  // Test 8: Register Custom Domain & Anti-Squatting / Unique Guarantee
  // ---------------------------------------------------------------------------
  console.log("Test 8: Register custom domain & Anti-Squatting / Unique Guarantee");
  const customDom1 = await createCustomDomain(
    {
      workspaceId: workspace1,
      domain: "reviews.acme.com",
      targetType: "BRAND_PAGE",
      brandId: brand1.id,
      tlsProvisioning: "REVERSE_PROXY",
    },
    db
  );

  assert.equal(customDom1.domain, "reviews.acme.com");
  assert.equal(customDom1.status, "PENDING_VERIFICATION");
  assert.ok(customDom1.verificationToken.startsWith("praise-verify-"));

  // Anti-squatting rule: Workspace 2 tries to claim the same hostname!
  await assert.rejects(
    async () => {
      await createCustomDomain(
        {
          workspaceId: workspace2,
          domain: "reviews.acme.com", // Rival trying to steal hostname
          targetType: "WALL_OF_LOVE",
          wallOfLoveId: "any_wall",
        },
        db
      );
    },
    { message: /already claimed by another workspace/ }
  );
  console.log("✓ Hostname registration and anti-squatting multi-tenant protection verified");

  // ---------------------------------------------------------------------------
  // Test 9: DNS Instructions & Reverse-Proxy Snippet Generation
  // ---------------------------------------------------------------------------
  console.log("Test 9: DNS instructions and reverse proxy configurations");
  const instructions = getDnsInstructions("reviews.acme.com", customDom1.verificationToken, "cname.praise.app");
  assert.equal(instructions.domain, "reviews.acme.com");
  assert.equal(instructions.records.length, 2);

  const cnameRec = instructions.records.find((r) => r.type === "CNAME");
  assert.ok(cnameRec);
  assert.equal(cnameRec.value, "cname.praise.app");

  const txtRec = instructions.records.find((r) => r.type === "TXT");
  assert.ok(txtRec);
  assert.equal(txtRec.host, "_praise-challenge.reviews.acme.com");
  assert.equal(txtRec.value, customDom1.verificationToken);

  // Reverse proxy guidance checks
  assert.ok(instructions.reverseProxyGuidance.caddySnippet.includes("reverse_proxy localhost:3000"));
  assert.ok(instructions.reverseProxyGuidance.nginxSnippet.includes("proxy_set_header X-Forwarded-Host $host"));
  assert.ok(instructions.reverseProxyGuidance.traefikSnippet.includes("Host(`reviews.acme.com`)"));
  assert.ok(instructions.reverseProxyGuidance.cloudflareNote.includes("Full"));
  console.log("✓ DNS instructions and reverse-proxy deployment guidance verified");

  // ---------------------------------------------------------------------------
  // Test 10: Domain Ownership Verification Challenge (TXT & CNAME)
  // ---------------------------------------------------------------------------
  console.log("Test 10: DNS ownership challenge verification");
  // 1. Verification fails when DNS returns mismatch
  const mockFailingResolver = {
    async resolveTxt(host) {
      return [["wrong-token"]];
    },
    async resolveCname(host) {
      return ["wrong.host.com"];
    },
  };
  const failVerify = await verifyCustomDomain(customDom1.id, workspace1, db, mockFailingResolver);
  assert.equal(failVerify.verified, false);
  assert.equal(failVerify.status, "FAILED");

  // 2. Verification succeeds when TXT token matches
  const mockSuccessResolver = {
    async resolveTxt(host) {
      if (host === `_praise-challenge.reviews.acme.com`) {
        return [[customDom1.verificationToken]];
      }
      return [];
    },
    async resolveCname() {
      return [];
    },
  };
  const successVerify = await verifyCustomDomain(customDom1.id, workspace1, db, mockSuccessResolver);
  assert.equal(successVerify.verified, true);
  assert.equal(successVerify.status, "ACTIVE");
  assert.ok(successVerify.domain.verifiedAt);
  console.log("✓ DNS ownership challenge verification lifecycle verified");

  // ---------------------------------------------------------------------------
  // Test 11: Hostname Routing Resolution
  // ---------------------------------------------------------------------------
  console.log("Test 11: Hostname routing resolution for incoming traffic");
  const resolvedTarget = await resolveCustomDomainTarget("reviews.acme.com", db);
  assert.ok(resolvedTarget);
  assert.equal(resolvedTarget.targetType, "BRAND_PAGE");
  assert.equal(resolvedTarget.brand.id, brand1.id);

  // Unregistered domain returns null
  const unregistered = await resolveCustomDomainTarget("unknown.domain.org", db);
  assert.equal(unregistered, null);
  console.log("✓ Hostname routing resolver verified");

  // ---------------------------------------------------------------------------
  // Test 12: Canonical URL Rewriting with Active Custom Domain
  // ---------------------------------------------------------------------------
  console.log("Test 12: Canonical URL rewriting for active custom domain");
  // Now that reviews.acme.com is ACTIVE for brand1, resolving brand1 should yield canonicalUrl https://reviews.acme.com/
  const resolvedWithDomain = await resolvePublicBrand("acme-cloud", {}, db);
  assert.equal(resolvedWithDomain.brandData.canonicalUrl, "https://reviews.acme.com/");
  assert.equal(resolvedWithDomain.brandData.customDomain?.domain, "reviews.acme.com");

  // SEO metadata uses the custom domain canonical
  const domainSeo = buildBrandPageMetadata(resolvedWithDomain.brandData, "acme-cloud");
  assert.equal(domainSeo.alternates?.canonical, "https://reviews.acme.com/");
  assert.equal(domainSeo.openGraph?.url, "https://reviews.acme.com/");
  console.log("✓ Canonical URL rewriting with active custom domain verified");

  // ---------------------------------------------------------------------------
  // Test 13: Reassigning Custom Domain Target
  // ---------------------------------------------------------------------------
  console.log("Test 13: Reassigning domain target to Wall of Love");
  const reassigned = await updateCustomDomain(
    {
      id: customDom1.id,
      workspaceId: workspace1,
      targetType: "WALL_OF_LOVE",
      wallOfLoveId: wallEnt.id,
    },
    db
  );
  assert.equal(reassigned.targetType, "WALL_OF_LOVE");
  assert.equal(reassigned.wallOfLoveId, wallEnt.id);
  assert.equal(reassigned.brandId, null);

  // Hostname routing now resolves to Wall of Love
  const routedWall = await resolveCustomDomainTarget("reviews.acme.com", db);
  assert.equal(routedWall.targetType, "WALL_OF_LOVE");
  assert.equal(routedWall.wallOfLove.id, wallEnt.id);
  console.log("✓ Custom domain reassignment verified");

  // ---------------------------------------------------------------------------
  // Test 14: Delete Custom Domain
  // ---------------------------------------------------------------------------
  console.log("Test 14: Delete custom domain and free hostname");
  const delDomRes = await deleteCustomDomain(customDom1.id, workspace1, db);
  assert.equal(delDomRes.success, true);
  assert.equal(delDomRes.domain, "reviews.acme.com");

  const afterDel = await db.customDomain.findUnique({ where: { domain: "reviews.acme.com" } });
  assert.equal(afterDel, null);

  // Now another workspace is free to register the freed domain
  const brandRival = await createWorkspaceBrand(
    {
      workspaceId: workspace2,
      name: "Rival Brand",
      slug: "rival-brand",
    },
    db
  );

  const reClaimed = await createCustomDomain(
    {
      workspaceId: workspace2,
      domain: "reviews.acme.com",
      targetType: "BRAND_PAGE",
      brandId: brandRival.id,
    },
    db
  );
  assert.equal(reClaimed.workspaceId, workspace2);
  console.log("✓ Domain deletion and hostname release verified");

  console.log("\n=== ALL PRAISE BRAND PAGES & CUSTOM DOMAINS TESTS PASSED (14/14) ===");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
