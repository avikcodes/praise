import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { DEFAULT_QUESTIONS_CONFIG } from "@/lib/case-studies/templates";
import { CaseStudyFormDetail, CaseStudyQuestionsConfig } from "@/lib/case-studies/types";
import { PublicCaseStudyForm } from "@/components/case-studies/public-case-study-form";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const form = await prisma.caseStudyForm.findFirst({
    where: { slug },
    select: { title: true, description: true },
  });

  if (!form) {
    return { title: "Case Study Form Not Found | Praise" };
  }

  return {
    title: `${form.title} | Case Study Submission`,
    description: form.description || "Submit your customer success story and business results.",
  };
}

export default async function PublicCaseStudyPage({ params }: PageProps) {
  const { slug } = await params;

  const form = await prisma.caseStudyForm.findFirst({
    where: { slug },
    include: {
      workspace: { select: { id: true, name: true, logoUrl: true } },
      brand: { select: { id: true, name: true, logoUrl: true, accentColor: true } },
      project: { select: { id: true, name: true, logoUrl: true } },
      _count: { select: { responses: true } },
    },
  });

  if (!form) {
    notFound();
  }

  let questionsConfig: CaseStudyQuestionsConfig = DEFAULT_QUESTIONS_CONFIG;
  if (form.questionsConfigJson) {
    try {
      questionsConfig = {
        ...DEFAULT_QUESTIONS_CONFIG,
        ...JSON.parse(form.questionsConfigJson),
      };
    } catch {}
  }

  const formatted: CaseStudyFormDetail & { workspaceName?: string } = {
    id: form.id,
    workspaceId: form.workspaceId,
    workspaceName: form.workspace.name,
    projectId: form.projectId,
    projectName: form.project?.name || null,
    brandId: form.brandId,
    brandName: form.brand?.name || null,
    templateId: form.templateId,
    templateType: form.templateType,
    title: form.title,
    slug: form.slug,
    description: form.description,
    status: form.status as any,
    accentColor: form.brand?.accentColor || form.accentColor || "#7049D8",
    theme: form.theme || "warm",
    customLogoUrl: form.customLogoUrl || form.brand?.logoUrl || form.workspace.logoUrl || null,
    showBranding: form.showBranding,
    welcomeHeading: form.welcomeHeading || "Share Your Success Story",
    welcomeText: form.welcomeText || "Help others understand how our product helped your team achieve real results.",
    thankYouHeading: form.thankYouHeading || "Thank You for Sharing Your Story!",
    thankYouText: form.thankYouText || "We appreciate your time and transparency. We will review your submission shortly.",
    redirectUrl: form.redirectUrl,
    collectCustomerBackground: form.collectCustomerBackground,
    collectCompanyRole: form.collectCompanyRole,
    collectInitialProblem: form.collectInitialProblem,
    collectPreviousSolution: form.collectPreviousSolution,
    collectProductImplementation: form.collectProductImplementation,
    collectExperience: form.collectExperience,
    collectResultsAchieved: form.collectResultsAchieved,
    collectMeasurableOutcomes: form.collectMeasurableOutcomes,
    collectQuotes: form.collectQuotes,
    allowImages: form.allowImages,
    allowVideo: form.allowVideo,
    collectConsent: form.collectConsent,
    consentRequired: form.consentRequired,
    consentText: form.consentText,
    questionsConfig,
    submissionsCount: form._count.responses,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  };

  return <PublicCaseStudyForm form={formatted} />;
}
