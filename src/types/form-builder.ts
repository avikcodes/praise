export * from "@/lib/forms/flow-engine";

export type FormCustomFieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "EMAIL"
  | "URL"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "CHECKBOX"
  | "STAR_RATING"
  // Version 2 Advanced Field Types
  | "NUMBER"
  | "PHONE"
  | "DATE"
  | "DROPDOWN"
  | "FILE_UPLOAD"
  | "WEBSITE"
  | "LONG_FORM"
  | "CUSTOMER_ROLE"
  | "COMPANY_SIZE"
  | "PRODUCT_PLAN";

export type FieldValidationRules = {
  // Numeric limits (NUMBER)
  minNumber?: number;
  maxNumber?: number;
  minNumeric?: number;
  maxNumeric?: number;

  // Text length limits (SHORT_TEXT, LONG_TEXT, LONG_FORM)
  minLength?: number;
  maxLength?: number;

  // Custom Regex Pattern (PHONE, SHORT_TEXT, etc.)
  pattern?: string;
  patternMessage?: string;

  // Date bounds (DATE)
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD

  // File upload constraints (FILE_UPLOAD)
  maxFileSizeMb?: number;
  maxFileSizeMB?: number;
  allowedExtensions?: string[]; // e.g. ["pdf", "png", "jpg", "doc", "docx"]

  // Custom error message override
  customErrorMessage?: string;
};

export type FormFieldItem = {
  id?: string;
  label: string;
  description?: string | null;
  helpText?: string | null;
  placeholder?: string | null;
  type: FormCustomFieldType;
  isRequired: boolean;
  orderIndex: number;
  optionsJson?: string | null; // JSON string of string[]
  conditionsJson?: string | null; // JSON string of FlowConditionGroup
  validationRulesJson?: string | null; // JSON string of FieldValidationRules
};

export type GuidedRecordingQuestion = {
  id: string;
  text: string;
  orderIndex: number;
};

export type CollectionFormDetail = {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  headerPrompt: string;
  thankYouMessage?: string | null;
  allowVideo: boolean;
  allowAudio: boolean;
  allowText: boolean;
  maxVideoDurationSeconds: number;

  // Standard fields
  collectName: boolean;
  nameRequired: boolean;
  collectEmail: boolean;
  emailRequired: boolean;
  collectCompany: boolean;
  companyRequired: boolean;
  collectJobTitle: boolean;
  jobTitleRequired: boolean;
  collectWebsite: boolean;
  websiteRequired: boolean;
  collectRating: boolean;
  ratingRequired: boolean;
  collectText: boolean;
  textRequired: boolean;
  collectAvatar: boolean;

  // Consent
  collectConsent: boolean;
  consentRequired: boolean;
  consentText: string;

  // Submissions & Appearance
  submissionsEnabled: boolean;
  redirectUrl?: string | null;
  customLogoUrl?: string | null;
  accentColor?: string | null;
  theme?: string | null;

  // Advanced Form Flows (Multi-Step & Condition Routing)
  isMultiStep?: boolean;
  flowConfigJson?: string | null;

  // Form-Level Custom CSS
  customCss?: string | null;

  // Guided Video Recording Controls
  videoInstructions?: string | null;
  recordingQuestionsJson?: string | null;

  isPublished: boolean;
  submissionsCount?: number;
  fields: FormFieldItem[];
  project?: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type FormTemplateCategory =
  | "ALL"
  | "SAAS"
  | "ECOMMERCE"
  | "SERVICES"
  | "HR"
  | "EVENT"
  | "GENERAL";

export type FormTemplateItem = {
  id: string;
  workspaceId?: string | null;
  name: string;
  description?: string | null;
  category: string;
  icon?: string | null;
  isSystem: boolean;
  configJson: string; // JSON string of Partial<CollectionFormDetail> & { fields: FormFieldItem[] }
  createdAt?: string;
  updatedAt?: string;
};
