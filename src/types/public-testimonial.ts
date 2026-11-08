export type PublicIndividualTestimonial = {
  id: string;
  content: string;
  rating: number | null;
  type: "TEXT" | "VIDEO" | "AUDIO";
  isFeatured: boolean;
  submittedAt: string;
  customer: {
    name: string;
    company?: string | null;
    title?: string | null;
    avatarUrl?: string | null;
    website?: string | null;
  };
  project?: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
    logoUrl?: string | null;
  } | null;
  workspace: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
  tags: string[];
  media: {
    id: string;
    type: "IMAGE" | "VIDEO" | "AUDIO";
    url: string;
    mimeType: string;
    fileSizeBytes?: number | null;
    durationSeconds?: number | null;
  }[];
  wallUrl?: string | null;
  collectionFormUrl?: string | null;
  isVerified: boolean;
};

