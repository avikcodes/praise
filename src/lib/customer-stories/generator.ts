import type { StorySection, StoryMeasurableOutcome, StoryMediaItem } from "./types.ts";

export interface CaseStudyResponseForStory {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  brandId?: string | null;
  customerId?: string | null;
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
  measurableOutcomesJson?: string | null;
  primaryQuote?: string | null;
  peerAdvice?: string | null;
  imageAssetIdsJson?: string | null;
  videoAssetId?: string | null;
  consentGranted: boolean;
  consentText: string;
  consentTimestamp: Date | string;
  editorialTitle?: string | null;
  editorialSubtitle?: string | null;
  editorialSummary?: string | null;
  editorialTakeawaysJson?: string | null;
  featuredQuoteOverride?: string | null;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateStoryFromResponse(
  response: CaseStudyResponseForStory,
  options?: {
    customSlug?: string;
    theme?: "light" | "warm" | "dark" | "editorial";
    accentColor?: string;
  }
) {
  // Parse Measurable Outcomes (ONLY if supplied by customer)
  let measurableOutcomes: StoryMeasurableOutcome[] = [];
  if (response.measurableOutcomesJson) {
    try {
      const parsed = JSON.parse(response.measurableOutcomesJson);
      if (Array.isArray(parsed)) {
        measurableOutcomes = parsed.filter((item) => item && typeof item.metric === "string");
      }
    } catch {
      measurableOutcomes = [];
    }
  }

  // Parse Key Takeaways
  let keyTakeaways: string[] = [];
  if (response.editorialTakeawaysJson) {
    try {
      const parsed = JSON.parse(response.editorialTakeawaysJson);
      if (Array.isArray(parsed)) {
        keyTakeaways = parsed.filter((item) => typeof item === "string");
      }
    } catch {
      keyTakeaways = [];
    }
  }

  // Parse Media
  const approvedMedia: StoryMediaItem[] = [];
  if (response.imageAssetIdsJson) {
    try {
      const parsed = JSON.parse(response.imageAssetIdsJson);
      if (Array.isArray(parsed)) {
        parsed.forEach((url, idx) => {
          if (typeof url === "string") {
            approvedMedia.push({
              id: `img-${idx + 1}`,
              url,
              type: "IMAGE",
              caption: `${response.companyName} Architecture & Dashboard`,
              isCover: idx === 0,
            });
          }
        });
      }
    } catch {
      // ignore parse error
    }
  }

  if (response.videoAssetId) {
    approvedMedia.push({
      id: "video-1",
      url: response.videoAssetId,
      type: "VIDEO",
      caption: `Video interview with ${response.customerName}`,
    });
  }

  // Build Structured Narrative Sections preserving verbatim statements
  const sections: StorySection[] = [];

  // Section 1: Challenge
  let challengeContent = response.initialProblem;
  if (response.previousSolution) {
    challengeContent += `\n\n**Previous Solutions & Limitations:**\n${response.previousSolution}`;
  }
  sections.push({
    id: "section-challenge",
    type: "challenge",
    title: "The Problem & Previous Bottlenecks",
    content: challengeContent,
  });

  // Section 2: Implementation & Rollout
  if (response.productImplementation || response.experienceSummary) {
    let solutionContent = response.productImplementation || "";
    if (response.experienceSummary) {
      if (solutionContent) solutionContent += "\n\n";
      solutionContent += response.experienceSummary;
    }
    sections.push({
      id: "section-solution",
      type: "solution",
      title: "Adoption & Daily Experience",
      content: solutionContent,
    });
  }

  // Section 3: Results & Business Impact
  sections.push({
    id: "section-results",
    type: "results",
    title: "Business Results & Long-Term Impact",
    content: response.resultsAchieved,
  });

  // Fallback title / subtitle
  const title =
    response.editorialTitle ||
    `How ${response.companyName} Accelerated Performance with Praise`;
  const subtitle =
    response.editorialSubtitle ||
    `${response.customerName}, ${response.customerRole || "Leader"} at ${response.companyName}, shares the journey.`;
  const summary =
    response.editorialSummary ||
    `${response.companyName} tackled critical operational bottlenecks by implementing Praise. Here is their full story and measurable outcomes.`;

  const quote = response.featuredQuoteOverride || response.primaryQuote;
  const baseSlug = options?.customSlug || slugify(`${response.companyName}-case-study`);

  return {
    workspaceId: response.workspaceId,
    responseId: response.id,
    projectId: response.projectId || null,
    brandId: response.brandId || null,
    customerId: response.customerId || null,
    slug: baseSlug,
    status: "DRAFT",
    title,
    subtitle,
    summary,
    readingTimeMinutes: Math.max(3, Math.ceil((challengeContent.length + response.resultsAchieved.length) / 800)),
    customerName: response.customerName,
    customerTitle: response.customerRole || null,
    customerAvatarUrl: response.avatarUrl || null,
    companyName: response.companyName,
    companyLogoUrl: null,
    companyWebsite: response.companyWebsite || null,
    companyIndustry: response.companyIndustry || null,
    companySize: response.companySize || null,
    featuredQuote: quote || null,
    featuredQuoteAuthor: response.customerName,
    featuredQuoteRole: response.customerRole || response.companyName,
    peerAdvice: response.peerAdvice || null,
    measurableOutcomesJson: measurableOutcomes.length > 0 ? JSON.stringify(measurableOutcomes) : null,
    keyTakeawaysJson: keyTakeaways.length > 0 ? JSON.stringify(keyTakeaways) : null,
    sectionsJson: JSON.stringify(sections),
    coverImageUrl: approvedMedia.find((m) => m.type === "IMAGE")?.url || null,
    videoUrl: response.videoAssetId || null,
    approvedMediaJson: approvedMedia.length > 0 ? JSON.stringify(approvedMedia) : null,
    theme: options?.theme || "warm",
    accentColor: options?.accentColor || "#4f46e5",
    seoTitle: `${title} | ${response.companyName} Customer Story`,
    seoDescription: subtitle || summary,
    permissionVerified: response.consentGranted === true,
    permissionNotes: `Verified consent from ${response.customerName} (${response.customerEmail}) on ${new Date(response.consentTimestamp).toISOString()}: "${response.consentText}"`,
  };
}
