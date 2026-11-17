import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import {
  validateScore,
  validateFollowUpAnswers,
  FollowUpQuestion,
  SurveyType,
} from "@/types/surveys";
import { executeSurveyRouting } from "@/lib/surveys/routing-engine";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/**
 * POST: Submits a survey response publicly without requiring a Praise account.
 * Validates score ranges, question constraints, and active survey status.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json({ error: "Survey slug is required." }, { status: 400 });
    }

    // Lookup survey
    const survey = await prisma.survey.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    }

    // Check status
    if (survey.status !== "ACTIVE") {
      const msg =
        survey.status === "PAUSED"
          ? "This survey is currently paused and not accepting responses."
          : survey.status === "CLOSED"
          ? "This survey has concluded and is closed."
          : "This survey is currently in draft mode.";
      return NextResponse.json({ error: msg, code: "SURVEY_INACTIVE" }, { status: 403 });
    }

    const body = await request.json();
    const {
      score,
      feedback,
      answers = {},
      respondentName,
      respondentEmail,
      respondentCompany,
      metadata = {},
    } = body;

    // 1. Validate primary score rating
    const scoreVal = validateScore(survey.type as SurveyType, score);
    if (!scoreVal.isValid) {
      return NextResponse.json({ error: scoreVal.error }, { status: 400 });
    }

    // 2. Validate feedback if marked required
    if (survey.feedbackRequired && (!feedback || !String(feedback).trim())) {
      return NextResponse.json(
        { error: "Written feedback is required for this survey." },
        { status: 400 }
      );
    }

    // 3. Validate respondent fields if required
    if (survey.collectName && survey.nameRequired && (!respondentName || !String(respondentName).trim())) {
      return NextResponse.json({ error: "Your name is required." }, { status: 400 });
    }

    if (survey.collectEmail && survey.emailRequired) {
      if (!respondentEmail || !String(respondentEmail).trim()) {
        return NextResponse.json({ error: "Your email is required." }, { status: 400 });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(respondentEmail).trim())) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
    }

    if (
      survey.collectCompany &&
      survey.companyRequired &&
      (!respondentCompany || !String(respondentCompany).trim())
    ) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }

    // 4. Validate custom follow-up questions
    let questions: FollowUpQuestion[] = [];
    try {
      questions = survey.questionsJson ? JSON.parse(survey.questionsJson) : [];
    } catch {
      questions = [];
    }

    const questionVal = validateFollowUpAnswers(questions, answers || {});
    if (!questionVal.isValid) {
      const firstError = Object.values(questionVal.errors)[0] || "Invalid follow-up answer.";
      return NextResponse.json(
        { error: firstError, fieldErrors: questionVal.errors },
        { status: 400 }
      );
    }

    // Capture request headers for audit/device metadata
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") || undefined;
    const referer = headerList.get("referer") || undefined;
    const ip =
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerList.get("x-real-ip") ||
      undefined;

    const enrichedMetadata = {
      ...metadata,
      ip,
      userAgent,
      referer,
      submittedVia: "public_survey_web",
    };

    // 5. Store response securely linked to survey & workspace
    const responseRecord = await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        workspaceId: survey.workspaceId,
        score: typeof score === "number" ? score : null,
        scoreType: survey.type,
        feedback: feedback ? String(feedback).trim() : null,
        answersJson: JSON.stringify(answers || {}),
        respondentName: respondentName ? String(respondentName).trim() : null,
        respondentEmail: respondentEmail ? String(respondentEmail).trim().toLowerCase() : null,
        respondentCompany: respondentCompany ? String(respondentCompany).trim() : null,
        metadataJson: JSON.stringify(enrichedMetadata),
      },
    });

    // Increment survey submissionsCount
    await prisma.survey.update({
      where: { id: survey.id },
      data: { submissionsCount: { increment: 1 } },
    });

    // Execute configurable feedback routing (safety protected, never fails submission)
    try {
      await executeSurveyRouting({
        workspaceId: survey.workspaceId,
        surveyId: survey.id,
        responseId: responseRecord.id,
      });
    } catch (routingErr) {
      console.error("[Routing Error]", routingErr);
      // Survey results are 100% preserved even when routing fails!
    }

    return NextResponse.json({
      success: true,
      responseId: responseRecord.id,
      thankYouHeading: survey.thankYouHeading || "Thank you for your feedback!",
      thankYouMessage:
        survey.thankYouMessage || "Your response helps us improve our product and service.",
      redirectUrl: survey.redirectUrl || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to submit survey." },
      { status: 500 }
    );
  }
}
