import dns from "node:dns";
import crypto from "node:crypto";
import { prisma } from "../db/client.ts";
import type {
  CustomDomainSummary,
  CreateCustomDomainInput,
  UpdateCustomDomainInput,
  DomainDnsInstructions,
  DomainStatus,
  DomainTargetType,
} from "../../types/domains.ts";

/**
 * Normalizes a raw domain or hostname input string:
 * - Trims whitespace
 * - Strips protocol (http://, https://)
 * - Strips path segments (/...)
 * - Strips ports (:3000)
 * - Converts to lowercase
 */
export function normalizeDomain(rawDomain: string): string {
  if (!rawDomain) return "";
  let clean = rawDomain.trim().toLowerCase();

  // Strip protocol
  clean = clean.replace(/^[a-z]+:\/\//, "");

  // Strip query/fragment and path
  clean = clean.split("/")[0].split("?")[0].split("#")[0];

  // Strip port
  clean = clean.split(":")[0];

  // Strip trailing dot
  clean = clean.replace(/\.$/, "");

  return clean;
}

/**
 * Validates whether a normalized hostname is a valid FQDN.
 * Rejects localhost, IP addresses, reserved TLDs, and illegal characters.
 */
export function isValidCustomDomain(domain: string): { valid: boolean; error?: string } {
  if (!domain) {
    return { valid: false, error: "Domain name is required." };
  }

  // Reject local/internal hosts
  if (
    domain === "localhost" ||
    domain.endsWith(".localhost") ||
    domain.endsWith(".local") ||
    domain.endsWith(".internal") ||
    domain.endsWith(".test")
  ) {
    return { valid: false, error: "Local and private test domains cannot be registered." };
  }

  // Reject raw IP addresses (IPv4 or IPv6)
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(domain) || domain.includes(":")) {
    return { valid: false, error: "IP addresses are not supported. Please use a valid domain name." };
  }

  // Check valid hostname format (RFC 1123)
  const fqdnRegex = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-_]{1,63}(?<!-)(\.[A-Za-z0-9-_]{1,63})+$/;
  if (!fqdnRegex.test(domain)) {
    return {
      valid: false,
      error: "Invalid domain format. Example valid domains: reviews.acme.com, praise.brand.io",
    };
  }

  // Must have at least one dot (subdomain or root domain)
  const parts = domain.split(".");
  if (parts.length < 2 || parts[parts.length - 1].length < 2) {
    return { valid: false, error: "A valid top-level domain (TLD) is required." };
  }

  return { valid: true };
}

/**
 * Generates a cryptographically random verification token.
 */
export function generateVerificationToken(): string {
  const bytes = crypto.randomBytes(12).toString("hex");
  return `praise-verify-${bytes}`;
}

/**
 * Resolves the target CNAME host for the deployment.
 */
export function getDeploymentCnameTarget(): string {
  return (
    process.env.CUSTOM_DOMAIN_CNAME_TARGET ||
    process.env.NEXT_PUBLIC_APP_DOMAIN ||
    "cname.praise.app"
  );
}

/**
 * Builds clear DNS configuration instructions and reverse-proxy guidance.
 */
export function getDnsInstructions(
  domain: string,
  verificationToken: string,
  cnameTarget = getDeploymentCnameTarget()
): DomainDnsInstructions {
  const parts = domain.split(".");
  const subdomainHost = parts.length > 2 ? parts.slice(0, -2).join(".") : "@";
  const challengeHost = `_praise-challenge.${domain}`;

  return {
    domain,
    status: "PENDING_VERIFICATION",
    verificationToken,
    cnameTarget,
    records: [
      {
        type: "CNAME",
        host: subdomainHost,
        value: cnameTarget,
        ttl: "3600 (or Auto)",
        purpose: "Routes web traffic from your domain to Praise",
        recommended: true,
      },
      {
        type: "TXT",
        host: challengeHost,
        value: verificationToken,
        ttl: "3600 (or Auto)",
        purpose: "Proves domain ownership to prevent unauthorized claims",
        recommended: true,
      },
    ],
    reverseProxyGuidance: {
      caddySnippet: `# Caddyfile
${domain} {
    reverse_proxy localhost:3000
}`,
      nginxSnippet: `# /etc/nginx/sites-available/${domain}
server {
    listen 80;
    listen 443 ssl http2;
    server_name ${domain};

    # Pass headers to Praise
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}`,
      traefikSnippet: `# Docker Traefik labels
- "traefik.http.routers.${domain.replace(/[^a-z0-9]/g, "-")}.rule=Host(\`${domain}\`)"
- "traefik.http.routers.${domain.replace(/[^a-z0-9]/g, "-")}.entrypoints=websecure"
- "traefik.http.routers.${domain.replace(/[^a-z0-9]/g, "-")}.tls.certresolver=letsencrypt"`,
      cloudflareNote: `If using Cloudflare DNS: Add a CNAME record pointing to ${cnameTarget}. You may enable Proxied (Orange Cloud) with SSL/TLS encryption mode set to Full or Full (strict).`,
    },
  };
}

/**
 * Lists all custom domains registered in a workspace with their assigned targets.
 */
export async function listWorkspaceDomains(
  workspaceId: string,
  dbClient: any = prisma
): Promise<CustomDomainSummary[]> {
  if (!dbClient.customDomain) return [];

  const domains = await dbClient.customDomain.findMany({
    where: { workspaceId },
    include: {
      wallOfLove: { select: { id: true, name: true, slug: true, title: true } },
      brand: { select: { id: true, name: true, slug: true, tagline: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return domains.map((d: any) => ({
    id: d.id,
    workspaceId: d.workspaceId,
    domain: d.domain,
    targetType: d.targetType as DomainTargetType,
    wallOfLoveId: d.wallOfLoveId,
    brandId: d.brandId,
    status: d.status as DomainStatus,
    verificationToken: d.verificationToken,
    verificationMethod: d.verificationMethod,
    cnameTarget: d.cnameTarget || getDeploymentCnameTarget(),
    verifiedAt: d.verifiedAt ? new Date(d.verifiedAt).toISOString() : null,
    lastCheckedAt: d.lastCheckedAt ? new Date(d.lastCheckedAt).toISOString() : null,
    errorMessage: d.errorMessage,
    tlsProvisioning: d.tlsProvisioning,
    canonicalRedirect: Boolean(d.canonicalRedirect),
    viewsCount: d.viewsCount || 0,
    wallOfLove: d.wallOfLove || null,
    brand: d.brand || null,
    targetName:
      d.targetType === "WALL_OF_LOVE"
        ? d.wallOfLove?.name || "Wall of Love"
        : d.brand?.name || "Brand Profile",
    targetSlug:
      d.targetType === "WALL_OF_LOVE" ? d.wallOfLove?.slug : d.brand?.slug,
    createdAt: new Date(d.createdAt).toISOString(),
    updatedAt: new Date(d.updatedAt).toISOString(),
  }));
}

/**
 * Registers a new custom domain for a workspace.
 * STRICT ENFORCEMENT:
 * - Validates FQDN format.
 * - Enforces global hostname uniqueness (one workspace CANNOT claim another's domain).
 * - Validates that the chosen target (Wall of Love or Brand) exists and belongs to the workspace.
 */
export async function createCustomDomain(
  input: CreateCustomDomainInput,
  dbClient: any = prisma
) {
  const {
    workspaceId,
    domain: rawDomain,
    targetType,
    wallOfLoveId,
    brandId,
    verificationMethod = "TXT",
    tlsProvisioning = "REVERSE_PROXY",
    canonicalRedirect = true,
  } = input;

  const domain = normalizeDomain(rawDomain);
  const validation = isValidCustomDomain(domain);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Prevent one workspace from claiming another workspace's hostname
  const existing = await dbClient.customDomain.findUnique({
    where: { domain },
  });

  if (existing) {
    if (existing.workspaceId === workspaceId) {
      throw new Error(`The domain "${domain}" is already registered in this workspace.`);
    }
    throw new Error(
      `The domain "${domain}" is already claimed by another workspace. If you own this domain, contact support or remove it from the previous workspace.`
    );
  }

  // Validate target association
  if (targetType === "WALL_OF_LOVE") {
    if (!wallOfLoveId) {
      throw new Error("A Wall of Love must be selected for this domain.");
    }
    const wall = await dbClient.wallOfLove.findFirst({
      where: { id: wallOfLoveId, workspaceId },
    });
    if (!wall) {
      throw new Error("Selected Wall of Love was not found in this workspace.");
    }
  } else if (targetType === "BRAND_PAGE") {
    if (!brandId) {
      throw new Error("A Brand profile must be selected for this domain.");
    }
    const brand = await dbClient.brand.findFirst({
      where: { id: brandId, workspaceId },
    });
    if (!brand) {
      throw new Error("Selected Brand profile was not found in this workspace.");
    }
  } else {
    throw new Error(`Invalid target type "${targetType}". Must be WALL_OF_LOVE or BRAND_PAGE.`);
  }

  const verificationToken = generateVerificationToken();
  const cnameTarget = getDeploymentCnameTarget();

  const record = await dbClient.customDomain.create({
    data: {
      workspaceId,
      domain,
      targetType,
      wallOfLoveId: targetType === "WALL_OF_LOVE" ? wallOfLoveId : null,
      brandId: targetType === "BRAND_PAGE" ? brandId : null,
      status: "PENDING_VERIFICATION",
      verificationToken,
      verificationMethod,
      cnameTarget,
      tlsProvisioning,
      canonicalRedirect: Boolean(canonicalRedirect),
    },
    include: {
      wallOfLove: { select: { id: true, name: true, slug: true, title: true } },
      brand: { select: { id: true, name: true, slug: true, tagline: true } },
    },
  });

  return {
    ...record,
    instructions: getDnsInstructions(domain, verificationToken, cnameTarget),
  };
}

/**
 * Updates an existing custom domain (reassigns target or alters TLS configuration).
 */
export async function updateCustomDomain(
  input: UpdateCustomDomainInput,
  dbClient: any = prisma
) {
  const { id, workspaceId, targetType, wallOfLoveId, brandId, tlsProvisioning, canonicalRedirect } =
    input;

  const existing = await dbClient.customDomain.findFirst({
    where: { id, workspaceId },
  });

  if (!existing) {
    throw new Error("Custom domain record not found in this workspace.");
  }

  const dataToUpdate: any = {};

  if (targetType) {
    dataToUpdate.targetType = targetType;
    if (targetType === "WALL_OF_LOVE") {
      if (!wallOfLoveId) {
        throw new Error("A Wall of Love must be specified when assigning to a wall.");
      }
      const wall = await dbClient.wallOfLove.findFirst({
        where: { id: wallOfLoveId, workspaceId },
      });
      if (!wall) throw new Error("Selected Wall of Love was not found.");
      dataToUpdate.wallOfLoveId = wallOfLoveId;
      dataToUpdate.brandId = null;
    } else if (targetType === "BRAND_PAGE") {
      if (!brandId) {
        throw new Error("A Brand profile must be specified when assigning to a brand.");
      }
      const brand = await dbClient.brand.findFirst({
        where: { id: brandId, workspaceId },
      });
      if (!brand) throw new Error("Selected Brand profile was not found.");
      dataToUpdate.brandId = brandId;
      dataToUpdate.wallOfLoveId = null;
    }
  }

  if (tlsProvisioning) dataToUpdate.tlsProvisioning = tlsProvisioning;
  if (canonicalRedirect !== undefined) {
    dataToUpdate.canonicalRedirect = Boolean(canonicalRedirect);
  }

  const updated = await dbClient.customDomain.update({
    where: { id },
    data: dataToUpdate,
    include: {
      wallOfLove: { select: { id: true, name: true, slug: true, title: true } },
      brand: { select: { id: true, name: true, slug: true, tagline: true } },
    },
  });

  return updated;
}

export type DnsLookupResolver = {
  resolveTxt: (hostname: string) => Promise<string[][]>;
  resolveCname: (hostname: string) => Promise<string[]>;
};

/**
 * Verifies domain ownership via DNS challenge.
 * Checks TXT record `_praise-challenge.<domain>` or CNAME pointer.
 */
export async function verifyCustomDomain(
  domainId: string,
  workspaceId: string,
  dbClient: any = prisma,
  customResolver?: DnsLookupResolver
) {
  const domainRecord = await dbClient.customDomain.findFirst({
    where: { id: domainId, workspaceId },
  });

  if (!domainRecord) {
    throw new Error("Custom domain record not found in this workspace.");
  }

  const resolver: DnsLookupResolver = customResolver || {
    resolveTxt: (host: string) => dns.promises.resolveTxt(host),
    resolveCname: (host: string) => dns.promises.resolveCname(host),
  };

  const challengeHost = `_praise-challenge.${domainRecord.domain}`;
  const targetCname = (domainRecord.cnameTarget || getDeploymentCnameTarget()).toLowerCase();
  let verified = false;
  let reason = "";

  // 1. Check TXT record
  try {
    const txtRecords = await resolver.resolveTxt(challengeHost);
    for (const chunkGroup of txtRecords) {
      const fullTxt = chunkGroup.join("");
      if (fullTxt.trim() === domainRecord.verificationToken.trim()) {
        verified = true;
        break;
      }
    }
  } catch (err: any) {
    // TXT lookup error, proceed to check CNAME
  }

  // 2. Check CNAME record if TXT didn't match
  if (!verified) {
    try {
      const cnames = await resolver.resolveCname(domainRecord.domain);
      for (const cname of cnames) {
        const cleanCname = cname.toLowerCase().replace(/\.$/, "");
        if (
          cleanCname === targetCname ||
          cleanCname.includes("praise.app") ||
          cleanCname === domainRecord.verificationToken
        ) {
          verified = true;
          break;
        }
      }
    } catch (err: any) {
      // CNAME lookup error
    }
  }

  const now = new Date();
  if (verified) {
    const updated = await dbClient.customDomain.update({
      where: { id: domainId },
      data: {
        status: "ACTIVE",
        verifiedAt: now,
        lastCheckedAt: now,
        errorMessage: null,
      },
      include: {
        wallOfLove: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });
    return {
      success: true,
      verified: true,
      status: "ACTIVE",
      message: `Domain ${domainRecord.domain} has been successfully verified and activated!`,
      domain: updated,
    };
  } else {
    reason = `DNS challenge verification failed. Could not find matching TXT record on "${challengeHost}" with value "${domainRecord.verificationToken}" or valid CNAME pointing to "${targetCname}".`;
    const updated = await dbClient.customDomain.update({
      where: { id: domainId },
      data: {
        status: "FAILED",
        lastCheckedAt: now,
        errorMessage: reason,
      },
      include: {
        wallOfLove: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
    });
    return {
      success: false,
      verified: false,
      status: "FAILED",
      message: reason,
      domain: updated,
    };
  }
}

/**
 * Removes and frees up a custom domain.
 */
export async function deleteCustomDomain(
  domainId: string,
  workspaceId: string,
  dbClient: any = prisma
) {
  const domain = await dbClient.customDomain.findFirst({
    where: { id: domainId, workspaceId },
  });

  if (!domain) {
    throw new Error("Custom domain record not found in this workspace.");
  }

  await dbClient.customDomain.delete({
    where: { id: domainId },
  });

  return { success: true, id: domainId, domain: domain.domain };
}

/**
 * Resolves a request's incoming Host / X-Forwarded-Host to its configured Praise target.
 * Used by Hostname Routing middleware and public custom domain page rendering.
 */
export async function resolveCustomDomainTarget(
  hostname: string,
  dbClient: any = prisma
): Promise<{
  domain: any;
  targetType: DomainTargetType;
  wallOfLove?: any | null;
  brand?: any | null;
} | null> {
  const clean = normalizeDomain(hostname);
  if (!clean || !dbClient.customDomain) return null;

  const domainRecord = await dbClient.customDomain.findUnique({
    where: { domain: clean },
    include: {
      wallOfLove: {
        include: {
          project: { select: { id: true, name: true, slug: true, color: true, logoUrl: true } },
          workspace: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
      },
      brand: {
        include: {
          workspace: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
      },
    },
  });

  if (!domainRecord) return null;

  // Domain must be verified or active
  if (domainRecord.status !== "ACTIVE" && domainRecord.status !== "VERIFIED") {
    return null;
  }

  return {
    domain: domainRecord,
    targetType: domainRecord.targetType as DomainTargetType,
    wallOfLove: domainRecord.wallOfLove,
    brand: domainRecord.brand,
  };
}
