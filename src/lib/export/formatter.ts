export type ExportCustomer = {
  id?: string;
  name: string;
  email: string | null;
  company?: string | null;
  title?: string | null;
  website?: string | null;
  avatarUrl?: string | null;
};

export type ExportMediaAsset = {
  id: string;
  type: string;
  url: string;
  mimeType: string;
  fileSizeBytes?: number | null;
  localPath?: string | null;
};

export type ExportTestimonialRecord = {
  id: string;
  content: string;
  rating: number;
  status: string;
  type: string;
  isFeatured: boolean;
  submittedAt: string;
  updatedAt?: string;
  customer: ExportCustomer | null;
  project: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
  } | null;
  form?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  tags: string[];
  source?: string | null;
  mediaAssets: ExportMediaAsset[];
};

export type ExportOptions = {
  includeCustomerInfo?: boolean;
  anonymizeEmails?: boolean;
  baseUrl?: string;
};

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function getExtensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "bin";
  }
}

/**
 * Formats testimonial records to RFC 4180 CSV string.
 * Uses headers matching Praise's import schema so exported files can be re-imported seamlessly.
 */
export function formatTestimonialsToCsv(
  records: ExportTestimonialRecord[],
  options: ExportOptions = {}
): string {
  const { includeCustomerInfo = true, anonymizeEmails = false, baseUrl = "" } = options;

  const headers = [
    "Testimonial ID",
    "Customer Name",
    "Email",
    "Company",
    "Job Title",
    "Customer Website",
    "Customer Avatar",
    "Testimonial Text",
    "Rating",
    "Status",
    "Submission Date",
    "Project",
    "Tags",
    "Source",
    "Media Count",
    "Media URLs",
  ];

  const rows: string[] = [headers.join(",")];

  for (const t of records) {
    let customerName = "";
    let customerEmail = "";
    let customerCompany = "";
    let customerTitle = "";
    let customerWebsite = "";
    let customerAvatar = "";

    if (includeCustomerInfo && t.customer) {
      customerName = t.customer.name || "";
      if (t.customer.email) {
        customerEmail = anonymizeEmails
          ? t.customer.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
          : t.customer.email;
      }
      customerCompany = t.customer.company || "";
      customerTitle = t.customer.title || "";
      customerWebsite = t.customer.website || "";
      customerAvatar = t.customer.avatarUrl || "";
    }

    const mediaUrls = t.mediaAssets
      .map((m) => (m.url.startsWith("http") ? m.url : `${baseUrl}${m.url}`))
      .join("; ");

    const row = [
      escapeCsvField(t.id),
      escapeCsvField(customerName),
      escapeCsvField(customerEmail),
      escapeCsvField(customerCompany),
      escapeCsvField(customerTitle),
      escapeCsvField(customerWebsite),
      escapeCsvField(customerAvatar),
      escapeCsvField(t.content),
      t.rating,
      escapeCsvField(t.status),
      escapeCsvField(new Date(t.submittedAt).toISOString()),
      escapeCsvField(t.project?.name || ""),
      escapeCsvField(t.tags.join(", ")),
      escapeCsvField(t.source || (t.form ? t.form.title : "Direct")),
      t.mediaAssets.length,
      escapeCsvField(mediaUrls),
    ];

    rows.push(row.join(","));
  }

  return rows.join("\r\n");
}

/**
 * Formats testimonial records to a structured JSON document.
 * Can be parsed by third-party systems or re-imported into Praise.
 */
export function formatTestimonialsToJson(
  records: ExportTestimonialRecord[],
  metadata: {
    workspaceId: string;
    workspaceSlug: string;
    workspaceName: string;
    filters?: Record<string, unknown>;
  },
  options: ExportOptions = {}
): string {
  const { includeCustomerInfo = true, anonymizeEmails = false, baseUrl = "" } = options;

  const formattedTestimonials = records.map((t) => {
    let customerData: Record<string, string | null> | null = null;
    if (includeCustomerInfo && t.customer) {
      let email = t.customer.email;
      if (email && anonymizeEmails) {
        email = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
      }
      customerData = {
        id: t.customer.id || null,
        name: t.customer.name,
        email,
        company: t.customer.company || null,
        title: t.customer.title || null,
        website: t.customer.website || null,
        avatarUrl: t.customer.avatarUrl || null,
      };
    }

    return {
      id: t.id,
      content: t.content,
      rating: t.rating,
      status: t.status,
      type: t.type,
      isFeatured: t.isFeatured,
      submittedAt: new Date(t.submittedAt).toISOString(),
      customer: customerData,
      project: t.project
        ? {
            id: t.project.id,
            name: t.project.name,
            slug: t.project.slug,
          }
        : null,
      form: t.form
        ? {
            id: t.form.id,
            title: t.form.title,
            slug: t.form.slug,
          }
        : null,
      tags: t.tags,
      source: t.source || (t.form ? t.form.title : "Direct"),
      media: t.mediaAssets.map((m) => ({
        id: m.id,
        type: m.type,
        mimeType: m.mimeType,
        url: m.url.startsWith("http") ? m.url : `${baseUrl}${m.url}`,
        fileSizeBytes: m.fileSizeBytes || null,
      })),
    };
  });

  const output = {
    workspace: {
      id: metadata.workspaceId,
      name: metadata.workspaceName,
      slug: metadata.workspaceSlug,
    },
    exportDate: new Date().toISOString(),
    totalCount: records.length,
    filters: metadata.filters || {},
    testimonials: formattedTestimonials,
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Generates manifest.json linking media files to their original testimonial IDs.
 */
export function generateManifest(
  records: ExportTestimonialRecord[],
  metadata: {
    workspaceId: string;
    workspaceName: string;
  }
): {
  manifestString: string;
  mediaEntries: {
    assetId: string;
    localKey: string;
    archivePath: string;
    mimeType: string;
  }[];
} {
  const mediaList: {
    assetId: string;
    testimonialId: string;
    customerName: string;
    type: string;
    mimeType: string;
    fileSizeBytes: number;
    archivePath: string;
    publicUrl: string;
  }[] = [];

  const mediaEntries: {
    assetId: string;
    localKey: string;
    archivePath: string;
    mimeType: string;
  }[] = [];

  for (const t of records) {
    let mediaIndex = 1;
    for (const m of t.mediaAssets) {
      if (!m.localPath) continue;

      const ext = getExtensionForMime(m.mimeType);
      const safeFilename = `media_${mediaIndex}.${ext}`;
      const archivePath = `media/${t.id}/${safeFilename}`;

      mediaList.push({
        assetId: m.id,
        testimonialId: t.id,
        customerName: t.customer?.name || "Anonymous",
        type: m.type,
        mimeType: m.mimeType,
        fileSizeBytes: m.fileSizeBytes || 0,
        archivePath,
        publicUrl: m.url,
      });

      mediaEntries.push({
        assetId: m.id,
        localKey: m.localPath,
        archivePath,
        mimeType: m.mimeType,
      });

      mediaIndex++;
    }
  }

  const manifest = {
    manifestVersion: "1.0",
    generator: "Praise Testimonial Export Engine",
    exportedAt: new Date().toISOString(),
    workspace: {
      id: metadata.workspaceId,
      name: metadata.workspaceName,
    },
    totalTestimonials: records.length,
    totalMediaAssets: mediaList.length,
    mediaFiles: mediaList,
  };

  return {
    manifestString: JSON.stringify(manifest, null, 2),
    mediaEntries,
  };
}
