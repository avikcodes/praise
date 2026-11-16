export type ExternalPlatformId =
  | "GOOGLE"
  | "FACEBOOK"
  | "X"
  | "LINKEDIN"
  | "REDDIT"
  | "PRODUCT_HUNT"
  | "G2"
  | "CAPTERRA"
  | "TRUSTPILOT"
  | "CUSTOM";

export type PlatformCategory =
  | "REVIEW_PLATFORM"
  | "SOCIAL_NETWORK"
  | "COMMUNITY"
  | "B2B_DIRECTORY"
  | "FILE";

export interface NormalizedImportItem {
  id?: string;
  externalId?: string | null;
  content: string;
  authorName: string;
  authorEmail?: string | null;
  authorAvatarUrl?: string | null;
  authorCompany?: string | null;
  authorTitle?: string | null;
  authorHandle?: string | null;
  rating?: number | null; // Normalized 1 to 5
  originalRating?: string | number | null;
  sourcePlatform: ExternalPlatformId | string;
  sourceUrl?: string | null;
  originalDate?: string | Date | null;
  isDuplicateCandidate?: boolean;
  duplicateReason?: string | null;
  existingTestimonialId?: string | null;
  selected?: boolean;
  rawRecord?: Record<string, unknown> | null;
}

export interface ExternalAdapterFieldMapping {
  sourceField: string;
  targetField:
    | "content"
    | "authorName"
    | "authorEmail"
    | "authorAvatarUrl"
    | "authorCompany"
    | "authorTitle"
    | "rating"
    | "sourceUrl"
    | "originalDate"
    | "__ignore__";
}

export interface PlatformConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required?: boolean;
  placeholder?: string;
  description?: string;
}

export interface ExternalSourceAdapter {
  id: ExternalPlatformId;
  name: string;
  category: PlatformCategory;
  description: string;
  icon: string;
  color: string;
  supportsAutomatedApi: boolean;
  apiRequirementNote?: string;
  apiConfigFields?: PlatformConfigField[];
  supportedInputTypes: Array<"OFFICIAL_API" | "STRUCTURED_FILE" | "PASTE_DATA" | "URL_LOOKUP">;
  defaultFieldMappings: Record<string, string>;
  parse(payload: unknown, customMappings?: Record<string, string>): NormalizedImportItem[];
  fetch?(credentials: Record<string, string>, params: Record<string, string>): Promise<NormalizedImportItem[]>;
}

export interface ImportPreviewResult {
  platform: ExternalPlatformId;
  platformName: string;
  totalParsed: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  items: NormalizedImportItem[];
  errors: string[];
}

export interface ExecuteImportParams {
  workspaceId: string;
  platform: ExternalPlatformId | string;
  items: NormalizedImportItem[];
  actorUserId?: string | null;
  actorName?: string | null;
  defaultProjectId?: string | null;
  skipDuplicates?: boolean;
}

export interface ExecuteImportResult {
  batchId: string;
  totalRecords: number;
  importedCount: number;
  duplicatesCount: number;
  failedCount: number;
  importedIds: string[];
  errors: Array<{ index: number; error: string }>;
}
