import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";
import { StoryReadingView } from "@/components/customer-stories/story-reading-view";
import type { CustomerStoryDetail } from "@/lib/customer-stories/types";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await prisma.customerStory.findUnique({
    where: { slug },
    select: {
      title: true,
      subtitle: true,
      summary: true,
      seoTitle: true,
      seoDescription: true,
      ogImageUrl: true,
      coverImageUrl: true,
      companyName: true,
    },
  });

  if (!story) {
    return { title: "Customer Story Not Found | Praise" };
  }

  const title = story.seoTitle || `${story.title} | ${story.companyName} Customer Story`;
  const description =
    story.seoDescription || story.subtitle || story.summary || `Read how ${story.companyName} achieved real outcomes with Praise.`;
  const image = story.ogImageUrl || story.coverImageUrl || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicStoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const isPreview = query.preview === "true";

  const story = await prisma.customerStory.findUnique({
    where: { slug },
    include: {
      workspace: { select: { id: true, name: true, logoUrl: true } },
      project: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
      customer: { select: { id: true, name: true, email: true } },
      response: {
        select: {
          id: true,
          customerName: true,
          companyName: true,
          consentGranted: true,
          consentText: true,
          consentTimestamp: true,
        },
      },
    },
  });

  if (!story) {
    notFound();
  }

  // Authorization check for unpublished draft previews
  if (story.status !== "PUBLISHED") {
    if (!isPreview) {
      notFound();
    }
    const user = await getSessionUser();
    if (!user) {
      notFound();
    }
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: story.workspaceId,
          userId: user.id,
        },
      },
    });
    if (!member) {
      notFound();
    }
  }

  let measurableOutcomes = [];
  if (story.measurableOutcomesJson) {
    try {
      measurableOutcomes = JSON.parse(story.measurableOutcomesJson);
    } catch {
      measurableOutcomes = [];
    }
  }

  let keyTakeaways = [];
  if (story.keyTakeawaysJson) {
    try {
      keyTakeaways = JSON.parse(story.keyTakeawaysJson);
    } catch {
      keyTakeaways = [];
    }
  }

  let sections = [];
  if (story.sectionsJson) {
    try {
      sections = JSON.parse(story.sectionsJson);
    } catch {
      sections = [];
    }
  }

  let approvedMedia = [];
  if (story.approvedMediaJson) {
    try {
      approvedMedia = JSON.parse(story.approvedMediaJson);
    } catch {
      approvedMedia = [];
    }
  }

  const detail: CustomerStoryDetail = {
    id: story.id,
    workspaceId: story.workspaceId,
    responseId: story.responseId,
    projectId: story.projectId,
    brandId: story.brandId,
    customerId: story.customerId,
    slug: story.slug,
    status: story.status as any,
    publishedAt: story.publishedAt ? story.publishedAt.toISOString() : null,
    title: story.title,
    subtitle: story.subtitle,
    summary: story.summary,
    readingTimeMinutes: story.readingTimeMinutes,
    customerName: story.customerName,
    customerTitle: story.customerTitle,
    customerAvatarUrl: story.customerAvatarUrl,
    companyName: story.companyName,
    companyLogoUrl: story.companyLogoUrl,
    companyWebsite: story.companyWebsite,
    companyIndustry: story.companyIndustry,
    companySize: story.companySize,
    featuredQuote: story.featuredQuote,
    featuredQuoteAuthor: story.featuredQuoteAuthor,
    featuredQuoteRole: story.featuredQuoteRole,
    featuredQuoteAvatar: story.featuredQuoteAvatar,
    peerAdvice: story.peerAdvice,
    measurableOutcomes,
    keyTakeaways,
    sections,
    coverImageUrl: story.coverImageUrl,
    videoUrl: story.videoUrl,
    approvedMedia,
    theme: story.theme as any,
    accentColor: story.accentColor,
    customCtaText: story.customCtaText,
    customCtaUrl: story.customCtaUrl,
    seoTitle: story.seoTitle,
    seoDescription: story.seoDescription,
    ogImageUrl: story.ogImageUrl,
    permissionVerified: story.permissionVerified,
    permissionNotes: story.permissionNotes,
    viewsCount: story.viewsCount,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
    project: story.project,
    brand: story.brand,
    customer: story.customer,
    response: story.response
      ? {
          ...story.response,
          consentTimestamp: story.response.consentTimestamp.toISOString(),
        }
      : null,
  };

  return <StoryReadingView story={detail} isPreview={isPreview} />;
}
