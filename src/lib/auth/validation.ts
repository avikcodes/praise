import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Please provide a valid email address").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().min(2, "Name must be at least 2 characters long").trim(),
  workspaceName: z.string().min(2, "Workspace name must be at least 2 characters long").trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters long").trim(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens")
    .trim(),
});

export const createProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters long").trim(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens")
    .trim(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color code").optional(),
  logoUrl: z.string().max(2000).optional().nullable(),
  brandId: z.string().optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters long").trim().optional(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens")
    .trim()
    .optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color code").optional(),
  logoUrl: z.string().max(2000).optional().nullable(),
  brandId: z.string().optional().nullable(),
});

export const createBrandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters long").trim(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens")
    .trim(),
  logoUrl: z.string().max(2000).optional().nullable(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color code").optional(),
  websiteUrl: z.string().max(2000).optional().nullable(),
});

export const updateBrandSchema = z.object({
  name: z.string().min(2, "Brand name must be at least 2 characters long").trim().optional(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens")
    .trim()
    .optional(),
  logoUrl: z.string().max(2000).optional().nullable(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color code").optional(),
  websiteUrl: z.string().max(2000).optional().nullable(),
});

export const formFieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Field label is required").trim(),
  description: z.string().optional().nullable(),
  placeholder: z.string().optional().nullable(),
  type: z.enum([
    "SHORT_TEXT",
    "LONG_TEXT",
    "EMAIL",
    "URL",
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "CHECKBOX",
    "STAR_RATING",
  ]),
  isRequired: z.boolean().default(false),
  orderIndex: z.number().int().default(0),
  optionsJson: z.string().optional().nullable(),
});

export const createFormSchema = z.object({
  title: z.string().min(2, "Form name must be at least 2 characters").trim(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens")
    .trim(),
  description: z.string().optional().nullable(),
  headerPrompt: z.string().min(3, "Introduction prompt is required").trim(),
  thankYouMessage: z.string().optional().nullable(),
  allowVideo: z.boolean().default(true),
  allowAudio: z.boolean().default(true),
  allowText: z.boolean().default(true),
  maxVideoDurationSeconds: z.number().int().min(15).max(300).default(120),

  // Standard fields
  collectName: z.boolean().default(true),
  nameRequired: z.boolean().default(true),
  collectEmail: z.boolean().default(true),
  emailRequired: z.boolean().default(true),
  collectCompany: z.boolean().default(true),
  companyRequired: z.boolean().default(false),
  collectJobTitle: z.boolean().default(false),
  jobTitleRequired: z.boolean().default(false),
  collectWebsite: z.boolean().default(false),
  websiteRequired: z.boolean().default(false),
  collectRating: z.boolean().default(true),
  ratingRequired: z.boolean().default(false),
  collectText: z.boolean().default(true),
  textRequired: z.boolean().default(true),
  collectAvatar: z.boolean().default(true),

  // Consent
  collectConsent: z.boolean().default(true),
  consentRequired: z.boolean().default(true),
  consentText: z
    .string()
    .min(5, "Consent text is required")
    .default(
      "I grant permission to use my feedback, name, and submitted media for public marketing purposes.",
    ),

  // Submissions & Appearance Settings
  submissionsEnabled: z.boolean().default(true),
  redirectUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  customLogoUrl: z.string().optional().nullable().or(z.literal("")),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be valid hex color").default("#7049D8"),
  theme: z.enum(["warm", "light", "dark"]).default("warm"),

  isPublished: z.boolean().default(true),
  projectId: z.string().optional().nullable(),
  fields: z.array(formFieldSchema).optional().default([]),
});

export const createCollectionFormSchema = createFormSchema;
export const updateFormSchema = createFormSchema.partial();

export const submitTestimonialSchema = z.object({
  formSlug: z.string().min(1),
  customerName: z.string().min(2, "Name is required").trim(),
  customerEmail: z.string().email("Valid email is required").toLowerCase().trim(),
  customerCompany: z.string().max(100).optional(),
  customerTitle: z.string().max(100).optional(),
  content: z.string().min(5, "Testimonial content is required").trim(),
  rating: z.number().int().min(1).max(5).default(5),
  type: z.enum(["TEXT", "VIDEO", "AUDIO"]).default("TEXT"),
  isConsentGranted: z.literal(true, {
    message: "You must explicitly grant publishing consent to submit.",
  }),
});

export const moderateTestimonialSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "ARCHIVED"]),
  isFeatured: z.boolean().optional(),
});

export const createWidgetSchema = z.object({
  name: z.string().min(2, "Widget name must be at least 2 characters").trim(),
  type: z.enum(["WALL_OF_LOVE", "GRID", "CAROUSEL", "QUOTE_CARD"]),
  theme: z.enum(["LIGHT", "DARK", "WARM", "AUTO"]).default("WARM"),
  projectId: z.string().optional(),
  configJson: z.string().optional(),
});
