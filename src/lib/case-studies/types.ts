export type CaseStudyFormStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export type CaseStudyResponseStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type MeasurableOutcome = {
  id: string;
  metric: string;
  before?: string;
  after?: string;
  improvement: string; // e.g. "+154%", "3x", "15 hrs/wk saved"
  timeframe?: string; // e.g. "90 days", "Q3 2026"
};

export type CaseStudySectionConfig = {
  enabled: boolean;
  required: boolean;
  title: string;
  description?: string;
  promptText?: string;
  placeholderText?: string;
};

export type CaseStudyQuestionsConfig = {
  customerBackground: CaseStudySectionConfig;
  companyRole: CaseStudySectionConfig;
  initialProblem: CaseStudySectionConfig;
  previousSolution: CaseStudySectionConfig;
  productImplementation: CaseStudySectionConfig;
  experience: CaseStudySectionConfig;
  resultsAchieved: CaseStudySectionConfig;
  measurableOutcomes: CaseStudySectionConfig;
  quotes: CaseStudySectionConfig;
  mediaProof: CaseStudySectionConfig;
};

export type CaseStudyFormDetail = {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  projectName?: string | null;
  brandId?: string | null;
  brandName?: string | null;
  templateId?: string | null;
  templateName?: string | null;
  templateType: string;
  title: string;
  slug: string;
  description?: string | null;
  status: CaseStudyFormStatus;

  accentColor: string;
  theme: string;
  customLogoUrl?: string | null;
  showBranding: boolean;
  welcomeHeading: string;
  welcomeText: string;
  thankYouHeading: string;
  thankYouText: string;
  redirectUrl?: string | null;

  collectCustomerBackground: boolean;
  collectCompanyRole: boolean;
  collectInitialProblem: boolean;
  collectPreviousSolution: boolean;
  collectProductImplementation: boolean;
  collectExperience: boolean;
  collectResultsAchieved: boolean;
  collectMeasurableOutcomes: boolean;
  collectQuotes: boolean;
  allowImages: boolean;
  allowVideo: boolean;
  collectConsent: boolean;
  consentRequired: boolean;
  consentText: string;

  questionsConfig: CaseStudyQuestionsConfig;
  submissionsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CaseStudyResponseDetail = {
  id: string;
  formId: string;
  formTitle: string;
  formSlug: string;
  workspaceId: string;
  customerId?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  brandId?: string | null;
  brandName?: string | null;

  status: CaseStudyResponseStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  publishedAt?: string | null;

  // Customer statements (Verbatim original submission)
  customerName: string;
  customerEmail: string;
  customerRole?: string | null;
  companyName: string;
  companySize?: string | null;
  companyIndustry?: string | null;
  companyWebsite?: string | null;
  avatarUrl?: string | null;

  initialProblem: string;
  previousSolution?: string | null;
  productImplementation?: string | null;
  experienceSummary?: string | null;
  resultsAchieved: string;
  measurableOutcomes: MeasurableOutcome[];
  primaryQuote?: string | null;
  peerAdvice?: string | null;
  imageAssetIds: string[];
  imageUrls?: string[];
  videoAssetId?: string | null;
  videoUrl?: string | null;

  consentGranted: boolean;
  consentText: string;
  consentTimestamp: string;

  // Owner editorial content (Separated from customer statements)
  editorialTitle?: string | null;
  editorialSubtitle?: string | null;
  editorialSummary?: string | null;
  editorialTakeaways: string[];
  editorialNotes?: string | null;
  featuredQuoteOverride?: string | null;

  createdAt: string;
  updatedAt: string;
};

export type CaseStudyTemplateItem = {
  id: string;
  name: string;
  description: string;
  category: "SAAS" | "ENTERPRISE" | "DEV_TOOLS" | "ECOMMERCE" | "GENERAL";
  icon: string;
  isSystem: boolean;
  welcomeHeading: string;
  welcomeText: string;
  questionsConfig: CaseStudyQuestionsConfig;
  sampleOutcomes?: MeasurableOutcome[];
};
