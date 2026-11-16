export type DomainStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "ACTIVE"
  | "FAILED"
  | "MISCONFIGURED";

export type DomainTargetType = "WALL_OF_LOVE" | "BRAND_PAGE";

export type TlsProvisioningMode = "REVERSE_PROXY" | "CLOUDFLARE_SSL" | "MANUAL_TLS";

export interface CustomDomainSummary {
  id: string;
  workspaceId: string;
  domain: string;
  targetType: DomainTargetType;
  wallOfLoveId: string | null;
  brandId: string | null;
  status: DomainStatus;
  verificationToken: string;
  verificationMethod: string;
  cnameTarget: string | null;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  errorMessage: string | null;
  tlsProvisioning: TlsProvisioningMode;
  canonicalRedirect: boolean;
  viewsCount: number;
  wallOfLove?: {
    id: string;
    name: string;
    slug: string;
    title: string | null;
  } | null;
  brand?: {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
  } | null;
  targetName?: string;
  targetSlug?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomDomainInput {
  workspaceId: string;
  domain: string;
  targetType: DomainTargetType;
  wallOfLoveId?: string | null;
  brandId?: string | null;
  verificationMethod?: "TXT" | "CNAME";
  tlsProvisioning?: TlsProvisioningMode;
  canonicalRedirect?: boolean;
}

export interface UpdateCustomDomainInput {
  id: string;
  workspaceId: string;
  targetType?: DomainTargetType;
  wallOfLoveId?: string | null;
  brandId?: string | null;
  tlsProvisioning?: TlsProvisioningMode;
  canonicalRedirect?: boolean;
}

export interface DnsInstructionItem {
  type: "CNAME" | "TXT" | "A";
  host: string;
  value: string;
  ttl: string;
  purpose: string;
  recommended: boolean;
}

export interface DomainDnsInstructions {
  domain: string;
  status: DomainStatus;
  verificationToken: string;
  cnameTarget: string;
  records: DnsInstructionItem[];
  reverseProxyGuidance: {
    caddySnippet: string;
    nginxSnippet: string;
    traefikSnippet: string;
    cloudflareNote: string;
  };
}
