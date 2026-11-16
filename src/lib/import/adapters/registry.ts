import type { ExternalPlatformId, ExternalSourceAdapter } from "../external-types.ts";
import { GoogleReviewsAdapter } from "./google.ts";
import { FacebookReviewsAdapter } from "./facebook.ts";
import { XTwitterAdapter } from "./x.ts";
import { LinkedInAdapter } from "./linkedin.ts";
import { RedditAdapter } from "./reddit.ts";
import { ProductHuntAdapter } from "./product-hunt.ts";
import { G2ReviewsAdapter } from "./g2.ts";
import { CapterraAdapter } from "./capterra.ts";
import { TrustpilotAdapter } from "./trustpilot.ts";

const ADAPTER_INSTANCES: Record<string, ExternalSourceAdapter> = {
  GOOGLE: new GoogleReviewsAdapter(),
  FACEBOOK: new FacebookReviewsAdapter(),
  X: new XTwitterAdapter(),
  LINKEDIN: new LinkedInAdapter(),
  REDDIT: new RedditAdapter(),
  PRODUCT_HUNT: new ProductHuntAdapter(),
  G2: new G2ReviewsAdapter(),
  CAPTERRA: new CapterraAdapter(),
  TRUSTPILOT: new TrustpilotAdapter(),
};

export function getAllExternalAdapters(): ExternalSourceAdapter[] {
  return Object.values(ADAPTER_INSTANCES);
}

export function getExternalAdapter(platformId: string): ExternalSourceAdapter | null {
  const normalized = platformId.toUpperCase().trim();
  return ADAPTER_INSTANCES[normalized] || null;
}

export function getAvailablePlatformCatalog() {
  return getAllExternalAdapters().map((adapter) => ({
    id: adapter.id,
    name: adapter.name,
    category: adapter.category,
    description: adapter.description,
    icon: adapter.icon,
    color: adapter.color,
    supportsAutomatedApi: adapter.supportsAutomatedApi,
    apiRequirementNote: adapter.apiRequirementNote,
    apiConfigFields: adapter.apiConfigFields || [],
    supportedInputTypes: adapter.supportedInputTypes,
    defaultFieldMappings: adapter.defaultFieldMappings,
  }));
}
