export type PraiseFieldKey =
  | "content"
  | "customerName"
  | "customerEmail"
  | "customerCompany"
  | "customerTitle"
  | "customerWebsite"
  | "customerAvatar"
  | "rating"
  | "submittedAt"
  | "projectName"
  | "tags"
  | "source"
  | "__ignore__";

export type FieldDefinition = {
  key: PraiseFieldKey;
  label: string;
  description: string;
  required?: boolean;
  samplePlaceholder: string;
};

export const PRAISE_IMPORT_FIELDS: FieldDefinition[] = [
  {
    key: "content",
    label: "Testimonial Content / Review Text",
    description: "The primary testimonial or review statement (Required).",
    required: true,
    samplePlaceholder: "We loved using Praise for our team...",
  },
  {
    key: "customerName",
    label: "Customer / Author Name",
    description: "Full name of the customer respondent.",
    samplePlaceholder: "Jane Doe",
  },
  {
    key: "customerEmail",
    label: "Customer Email",
    description: "Normalized for workspace customer deduplication.",
    samplePlaceholder: "jane@example.com",
  },
  {
    key: "customerCompany",
    label: "Customer Company",
    description: "Organization or company of the reviewer.",
    samplePlaceholder: "Acme Corp",
  },
  {
    key: "customerTitle",
    label: "Customer Job Title",
    description: "Professional title or role.",
    samplePlaceholder: "VP of Product",
  },
  {
    key: "customerWebsite",
    label: "Customer / Company Website",
    description: "Website URL of the customer or company.",
    samplePlaceholder: "https://acme.com",
  },
  {
    key: "customerAvatar",
    label: "Customer Profile Photo / Avatar URL",
    description: "Direct URL to the respondent's photo or avatar.",
    samplePlaceholder: "https://.../avatar.jpg",
  },
  {
    key: "rating",
    label: "Star Rating (1 - 5)",
    description: "Numerical rating score from 1 to 5.",
    samplePlaceholder: "5",
  },
  {
    key: "submittedAt",
    label: "Submission Date / Timestamp",
    description: "Original creation or submission date.",
    samplePlaceholder: "2026-03-15",
  },
  {
    key: "projectName",
    label: "Project Name or Slug",
    description: "Associated workspace project.",
    samplePlaceholder: "Main Product",
  },
  {
    key: "tags",
    label: "Tags / Categories",
    description: "Comma-separated or array of tags.",
    samplePlaceholder: "Enterprise, High NPS",
  },
  {
    key: "source",
    label: "Original Source Platform",
    description: "e.g., G2, Capterra, Twitter, Trustpilot, CSV Import.",
    samplePlaceholder: "G2",
  },
];

export type ParsedImportRecord = {
  rowNumber: number;
  content: string;
  customerName: string;
  customerEmail?: string | null;
  customerCompany?: string | null;
  customerTitle?: string | null;
  customerWebsite?: string | null;
  customerAvatar?: string | null;
  rating: number;
  submittedAt: string;
  projectName?: string | null;
  tags: string[];
  source?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
  validationErrors: string[];
  isDuplicate: boolean;
  duplicateReason?: string | null;
  isExistingCustomer?: boolean;
};

export type DryRunResult = {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  newCustomersCount: number;
  existingCustomersCount: number;
  newTagsCount: number;
  records: ParsedImportRecord[];
  errors: { rowNumber: number; error: string; snippet?: string }[];
};

export type ImportExecutionPayload = {
  records: {
    rowNumber: number;
    content: string;
    customerName: string;
    customerEmail?: string | null;
    customerCompany?: string | null;
    customerTitle?: string | null;
    customerWebsite?: string | null;
    customerAvatar?: string | null;
    rating: number;
    submittedAt: string;
    projectName?: string | null;
    tags: string[];
    source?: string | null;
  }[];
  skipDuplicates?: boolean;
  skipInvalid?: boolean;
  defaultProjectId?: string | null;
  defaultStatus?: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
  sourceLabel?: string;
};

export type ImportResult = {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  skippedDuplicatesCount: number;
  createdCustomersCount: number;
  createdTagsCount: number;
  importedIds: string[];
  failures: { rowNumber: number; error: string; snippet?: string }[];
};

