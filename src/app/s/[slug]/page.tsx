import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { PublicSurveyClient } from "./public-survey-client";
import { SurveyDetail, SurveyType, SurveyStatus, FollowUpQuestion, ScoringConfig } from "@/types/surveys";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const survey = await prisma.survey.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    select: {
      title: true,
      description: true,
    },
  });

  if (!survey) {
    return {
      title: "Survey Not Found · Praise",
    };
  }

  return {
    title: `${survey.title} · Customer Survey`,
    description: survey.description || "Please take a moment to share your feedback.",
  };
}

export default async function PublicSurveyPage({ params }: PageProps) {
  const { slug } = await params;

  const survey = await prisma.survey.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
  });

  if (!survey) {
    notFound();
  }

  let questions: FollowUpQuestion[] = [];
  try {
    questions = survey.questionsJson ? JSON.parse(survey.questionsJson) : [];
  } catch {
    questions = [];
  }

  let scoringConfig: ScoringConfig | null = null;
  try {
    scoringConfig = survey.scoringConfigJson ? JSON.parse(survey.scoringConfigJson) : null;
  } catch {
    scoringConfig = null;
  }

  const detail: SurveyDetail = {
    id: survey.id,
    workspaceId: survey.workspaceId,
    projectId: survey.projectId,
    title: survey.title,
    slug: survey.slug,
    description: survey.description,
    type: survey.type as SurveyType,
    status: survey.status as SurveyStatus,
    welcomeHeading: survey.welcomeHeading,
    welcomeText: survey.welcomeText,
    primaryPrompt: survey.primaryPrompt,
    feedbackPrompt: survey.feedbackPrompt,
    feedbackRequired: survey.feedbackRequired,
    thankYouHeading: survey.thankYouHeading,
    thankYouMessage: survey.thankYouMessage,
    redirectUrl: survey.redirectUrl,
    accentColor: survey.accentColor,
    theme: survey.theme,
    customLogoUrl: survey.customLogoUrl,
    showBranding: survey.showBranding,
    collectName: survey.collectName,
    nameRequired: survey.nameRequired,
    collectEmail: survey.collectEmail,
    emailRequired: survey.emailRequired,
    collectCompany: survey.collectCompany,
    companyRequired: survey.companyRequired,
    questions,
    scoringConfig,
    viewsCount: survey.viewsCount,
    submissionsCount: survey.submissionsCount,
    createdAt: survey.createdAt.toISOString(),
    updatedAt: survey.updatedAt.toISOString(),
  };

  return <PublicSurveyClient initialSurvey={detail} />;
}
