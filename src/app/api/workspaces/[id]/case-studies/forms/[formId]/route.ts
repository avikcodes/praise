import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { DEFAULT_QUESTIONS_CONFIG } from "@/lib/case-studies/templates";
import { CaseStudyFormDetail, CaseStudyQuestionsConfig } from "@/lib/case-studies/types";

type RouteParams = {
  params: Promise<{ id: string; formId: string }>;
};

/**
 * GET: Returns a specific case study form by ID.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, formId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const form = await prisma.caseStudyForm.findFirst({
      where: { id: formId, workspaceId },
      include: {
        project: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        _count: { select: { responses: true } },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Case study form not found" }, { status: 404 });
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

    const formatted: CaseStudyFormDetail = {
      id: form.id,
      workspaceId: form.workspaceId,
      projectId: form.projectId,
      projectName: form.project?.name || null,
      brandId: form.brandId,
      brandName: form.brand?.name || null,
      templateId: form.templateId,
      templateName: form.template?.name || null,
      templateType: form.templateType,
      title: form.title,
      slug: form.slug,
      description: form.description,
      status: form.status as any,
      accentColor: form.accentColor || "#7049D8",
      theme: form.theme || "warm",
      customLogoUrl: form.customLogoUrl,
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

    return NextResponse.json({ form: formatted });
  } catch (error: any) {
    console.error("Error fetching case study form:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch case study form" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH: Updates a case study form.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, formId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const existing = await prisma.caseStudyForm.findFirst({
      where: { id: formId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Case study form not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = String(body.title).trim();
    if (body.description !== undefined) updateData.description = body.description ? String(body.description).trim() : null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null;
    if (body.brandId !== undefined) updateData.brandId = body.brandId || null;
    if (body.accentColor !== undefined) updateData.accentColor = body.accentColor;
    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.customLogoUrl !== undefined) updateData.customLogoUrl = body.customLogoUrl || null;
    if (body.showBranding !== undefined) updateData.showBranding = Boolean(body.showBranding);
    if (body.welcomeHeading !== undefined) updateData.welcomeHeading = body.welcomeHeading;
    if (body.welcomeText !== undefined) updateData.welcomeText = body.welcomeText;
    if (body.thankYouHeading !== undefined) updateData.thankYouHeading = body.thankYouHeading;
    if (body.thankYouText !== undefined) updateData.thankYouText = body.thankYouText;
    if (body.redirectUrl !== undefined) updateData.redirectUrl = body.redirectUrl || null;

    // Section toggles
    if (body.collectCustomerBackground !== undefined) updateData.collectCustomerBackground = Boolean(body.collectCustomerBackground);
    if (body.collectCompanyRole !== undefined) updateData.collectCompanyRole = Boolean(body.collectCompanyRole);
    if (body.collectInitialProblem !== undefined) updateData.collectInitialProblem = Boolean(body.collectInitialProblem);
    if (body.collectPreviousSolution !== undefined) updateData.collectPreviousSolution = Boolean(body.collectPreviousSolution);
    if (body.collectProductImplementation !== undefined) updateData.collectProductImplementation = Boolean(body.collectProductImplementation);
    if (body.collectExperience !== undefined) updateData.collectExperience = Boolean(body.collectExperience);
    if (body.collectResultsAchieved !== undefined) updateData.collectResultsAchieved = Boolean(body.collectResultsAchieved);
    if (body.collectMeasurableOutcomes !== undefined) updateData.collectMeasurableOutcomes = Boolean(body.collectMeasurableOutcomes);
    if (body.collectQuotes !== undefined) updateData.collectQuotes = Boolean(body.collectQuotes);
    if (body.allowImages !== undefined) updateData.allowImages = Boolean(body.allowImages);
    if (body.allowVideo !== undefined) updateData.allowVideo = Boolean(body.allowVideo);
    if (body.collectConsent !== undefined) updateData.collectConsent = Boolean(body.collectConsent);
    if (body.consentRequired !== undefined) updateData.consentRequired = Boolean(body.consentRequired);
    if (body.consentText !== undefined) updateData.consentText = String(body.consentText);

    if (body.questionsConfig !== undefined) {
      updateData.questionsConfigJson = JSON.stringify(body.questionsConfig);
    }

    const updated = await prisma.caseStudyForm.update({
      where: { id: formId },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        _count: { select: { responses: true } },
      },
    });

    let questionsConfig: CaseStudyQuestionsConfig = DEFAULT_QUESTIONS_CONFIG;
    if (updated.questionsConfigJson) {
      try {
        questionsConfig = {
          ...DEFAULT_QUESTIONS_CONFIG,
          ...JSON.parse(updated.questionsConfigJson),
        };
      } catch {}
    }

    return NextResponse.json({
      form: {
        ...updated,
        projectName: updated.project?.name || null,
        brandName: updated.brand?.name || null,
        templateName: updated.template?.name || null,
        questionsConfig,
        submissionsCount: updated._count.responses,
      },
    });
  } catch (error: any) {
    console.error("Error updating case study form:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update case study form" },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE: Deletes a case study form.
 */
export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, formId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const existing = await prisma.caseStudyForm.findFirst({
      where: { id: formId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Case study form not found" }, { status: 404 });
    }

    await prisma.caseStudyForm.delete({
      where: { id: formId },
    });

    return NextResponse.json({ success: true, message: "Case study form deleted" });
  } catch (error: any) {
    console.error("Error deleting case study form:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete case study form" },
      { status: error.status || 500 }
    );
  }
}
