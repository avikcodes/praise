export type FormCustomFieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "EMAIL"
  | "URL"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "CHECKBOX"
  | "STAR_RATING";

export type FormFieldItem = {
  id?: string;
  label: string;
  description?: string | null;
  placeholder?: string | null;
  type: FormCustomFieldType;
  isRequired: boolean;
  orderIndex: number;
  optionsJson?: string | null; // JSON string of string[]
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

