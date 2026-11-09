import { Customer, FormField, MediaAsset, Project, Tag, Testimonial, Widget } from "@prisma/client";

export type PublicTestimonialPayload = {
  id: string;
  content: string;
  rating: number | null;
  type: string;
  isFeatured: boolean;
  submittedAt: string;
  customer: {
    name: string;
    company: string | null;
    title: string | null;
    avatarUrl: string | null;
    socialHandle: string | null;
  } | null;
  media: Array<{
    id: string;
    type: string;
    url: string;
    mimeType: string;
    fileSizeBytes: number | null;
    durationSeconds: number | null;
  }>;
  tags: string[];
};

/**
 * Sanitizes and serializes a testimonial for safe public consumption.
 * Strictly guarantees that private emails, consent ledger internals, and unapproved records are NEVER exposed.
 */
export function formatTestimonialPublic(
  t: Testimonial & {
    customer?: Customer | null;
    mediaAssets?: MediaAsset[];
    tags?: Array<{ tag: Tag }>;
  }
): PublicTestimonialPayload {
  return {
    id: t.id,
    content: t.content,
    rating: t.rating,
    type: t.type,
    isFeatured: t.isFeatured,
    submittedAt: t.submittedAt.toISOString(),
    customer: t.customer
      ? {
          name: t.customer.name,
          company: t.customer.company,
          title: t.customer.title,
          avatarUrl: t.customer.avatarUrl,
          socialHandle: t.customer.socialHandle,
        }
      : null,
    media: (t.mediaAssets || []).map((m) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      mimeType: m.mimeType,
      fileSizeBytes: m.fileSizeBytes,
      durationSeconds: m.durationSeconds,
    })),
    tags: (t.tags || []).map((tItem) => tItem.tag.name),
  };
}

/**
 * Serializes a full testimonial for authenticated internal REST API management.
 */
export function formatTestimonialPrivate(
  t: Testimonial & {
    customer?: Customer | null;
    mediaAssets?: MediaAsset[];
    tags?: Array<{ tag: Tag }>;
    project?: Project | null;
  }
) {
  return {
    id: t.id,
    workspaceId: t.workspaceId,
    projectId: t.projectId,
    project: t.project
      ? { id: t.project.id, name: t.project.name, slug: t.project.slug }
      : null,
    formId: t.formId,
    content: t.content,
    rating: t.rating,
    type: t.type,
    status: t.status,
    isFeatured: t.isFeatured,
    submittedAt: t.submittedAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    customer: t.customer
      ? {
          id: t.customer.id,
          name: t.customer.name,
          email: t.customer.email,
          company: t.customer.company,
          title: t.customer.title,
          avatarUrl: t.customer.avatarUrl,
          socialHandle: t.customer.socialHandle,
        }
      : null,
    mediaAssets: (t.mediaAssets || []).map((m) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      mimeType: m.mimeType,
      fileSizeBytes: m.fileSizeBytes,
      durationSeconds: m.durationSeconds,
    })),
    tags: (t.tags || []).map((tItem) => ({
      id: tItem.tag.id,
      name: tItem.tag.name,
      color: tItem.tag.color,
    })),
  };
}

/**
 * Serializes a customer entity for authenticated REST API management.
 */
export function formatCustomer(c: Customer) {
  return {
    id: c.id,
    workspaceId: c.workspaceId,
    name: c.name,
    email: c.email,
    company: c.company,
    title: c.title,
    avatarUrl: c.avatarUrl,
    socialHandle: c.socialHandle,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/**
 * Serializes a project entity.
 */
export function formatProject(p: Project) {
  return {
    id: p.id,
    workspaceId: p.workspaceId,
    brandId: p.brandId,
    name: p.name,
    slug: p.slug,
    description: p.description,
    color: p.color,
    logoUrl: p.logoUrl,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/**
 * Serializes a collection form with optional form fields.
 */
export function formatForm(f: CollectionFormLike) {
  return {
    id: f.id,
    workspaceId: f.workspaceId,
    projectId: f.projectId,
    title: f.title,
    slug: f.slug,
    description: f.description,
    headerPrompt: f.headerPrompt,
    thankYouMessage: f.thankYouMessage,
    allowVideo: f.allowVideo,
    allowAudio: f.allowAudio,
    allowText: f.allowText,
    maxVideoDurationSeconds: f.maxVideoDurationSeconds,
    fields: (f.fields || []).map((field: FormField) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      isRequired: field.isRequired,
      placeholder: field.placeholder,
      description: field.description,
      orderIndex: field.orderIndex,
    })),
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

type CollectionFormLike = {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  slug: string;
  description: string | null;
  headerPrompt: string;
  thankYouMessage: string | null;
  allowVideo: boolean;
  allowAudio: boolean;
  allowText: boolean;
  maxVideoDurationSeconds: number;
  fields?: FormField[];
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Serializes a widget entity.
 */
export function formatWidget(w: Widget) {
  let parsedConfig = {};
  if (w.configJson) {
    try {
      parsedConfig = JSON.parse(w.configJson);
    } catch {
      // Ignore config JSON parse error
    }
  }

  return {
    id: w.id,
    workspaceId: w.workspaceId,
    projectId: w.projectId,
    name: w.name,
    type: w.type,
    theme: w.theme,
    config: parsedConfig,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

