import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { CaseStudyResponseDetail, MeasurableOutcome } from "@/lib/case-studies/types";

type RouteParams = {
  params: Promise<{ id: string; responseId: string }>;
};

/**
 * GET: Returns a single case study response with resolved media assets and associations.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, responseId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const r = await prisma.caseStudyResponse.findFirst({
      where: { id: responseId, workspaceId },
      include: {
        form: { select: { id: true, title: true, slug: true } },
        project: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, email: true, company: true, title: true, avatarUrl: true } },
      },
    });

    if (!r) {
      return NextResponse.json({ error: "Case study response not found" }, { status: 404 });
    }

    let measurableOutcomes: MeasurableOutcome[] = [];
    if (r.measurableOutcomesJson) {
      try {
        measurableOutcomes = JSON.parse(r.measurableOutcomesJson);
      } catch {}
    }

    let imageAssetIds: string[] = [];
    if (r.imageAssetIdsJson) {
      try {
        imageAssetIds = JSON.parse(r.imageAssetIdsJson);
      } catch {}
    }

    let editorialTakeaways: string[] = [];
    if (r.editorialTakeawaysJson) {
      try {
        editorialTakeaways = JSON.parse(r.editorialTakeawaysJson);
      } catch {}
    }

    // Resolve media asset URLs
    let imageUrls: string[] = [];
    if (imageAssetIds.length > 0) {
      const media = await prisma.mediaAsset.findMany({
        where: { id: { in: imageAssetIds }, workspaceId },
        select: { id: true, url: true },
      });
      imageUrls = media.map((m) => m.url);
    }

    let videoUrl: string | null = null;
    if (r.videoAssetId) {
      const vAsset = await prisma.mediaAsset.findFirst({
        where: { id: r.videoAssetId, workspaceId },
        select: { url: true },
      });
      videoUrl = vAsset?.url || null;
    }

    const formatted: CaseStudyResponseDetail = {
      id: r.id,
      formId: r.formId,
      formTitle: r.form.title,
      formSlug: r.form.slug,
      workspaceId: r.workspaceId,
      customerId: r.customerId,
      projectId: r.projectId,
      projectName: r.project?.name || null,
      brandId: r.brandId,
      brandName: r.brand?.name || null,
      status: r.status as any,
      submittedAt: r.submittedAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() || null,
      reviewedBy: r.reviewedBy || null,
      approvedAt: r.approvedAt?.toISOString() || null,
      approvedBy: r.approvedBy || null,
      publishedAt: r.publishedAt?.toISOString() || null,

      // Original customer statements
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      customerRole: r.customerRole,
      companyName: r.companyName,
      companySize: r.companySize,
      companyIndustry: r.companyIndustry,
      companyWebsite: r.companyWebsite,
      avatarUrl: r.avatarUrl,
      initialProblem: r.initialProblem,
      previousSolution: r.previousSolution,
      productImplementation: r.productImplementation,
      experienceSummary: r.experienceSummary,
      resultsAchieved: r.resultsAchieved,
      measurableOutcomes,
      primaryQuote: r.primaryQuote,
      peerAdvice: r.peerAdvice,
      imageAssetIds,
      imageUrls,
      videoAssetId: r.videoAssetId,
      videoUrl,

      consentGranted: r.consentGranted,
      consentText: r.consentText,
      consentTimestamp: r.consentTimestamp.toISOString(),

      // Owner editorial content
      editorialTitle: r.editorialTitle,
      editorialSubtitle: r.editorialSubtitle,
      editorialSummary: r.editorialSummary,
      editorialTakeaways,
      editorialNotes: r.editorialNotes,
      featuredQuoteOverride: r.featuredQuoteOverride,

      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };

    return NextResponse.json({ response: formatted });
  } catch (error: any) {
    console.error("Error fetching case study response:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch case study response" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH: Review, approve, associate with project/brand/customer, and update owner editorial content.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, responseId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId);

    const existing = await prisma.caseStudyResponse.findFirst({
      where: { id: responseId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Case study response not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Status & Review transitions
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "APPROVED" && existing.status !== "APPROVED") {
        updateData.approvedAt = new Date();
        updateData.approvedBy = member.user?.name || member.user?.email || "Workspace Admin";
      }
      if (body.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
        if (!existing.approvedAt) {
          updateData.approvedAt = new Date();
          updateData.approvedBy = member.user?.name || member.user?.email || "Workspace Admin";
        }
      }
      if (body.status === "UNDER_REVIEW" && !existing.reviewedAt) {
        updateData.reviewedAt = new Date();
        updateData.reviewedBy = member.user?.name || member.user?.email || "Workspace Admin";
      }
    }

    // Associations
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null;
    if (body.brandId !== undefined) updateData.brandId = body.brandId || null;
    if (body.customerId !== undefined) updateData.customerId = body.customerId || null;

    // Owner Editorial content (strictly separate from original customer statements)
    if (body.editorialTitle !== undefined) updateData.editorialTitle = body.editorialTitle ? String(body.editorialTitle).trim() : null;
    if (body.editorialSubtitle !== undefined) updateData.editorialSubtitle = body.editorialSubtitle ? String(body.editorialSubtitle).trim() : null;
    if (body.editorialSummary !== undefined) updateData.editorialSummary = body.editorialSummary ? String(body.editorialSummary).trim() : null;
    if (body.editorialNotes !== undefined) updateData.editorialNotes = body.editorialNotes ? String(body.editorialNotes).trim() : null;
    if (body.featuredQuoteOverride !== undefined) updateData.featuredQuoteOverride = body.featuredQuoteOverride ? String(body.featuredQuoteOverride).trim() : null;
    if (body.editorialTakeaways !== undefined) {
      updateData.editorialTakeawaysJson = Array.isArray(body.editorialTakeaways)
        ? JSON.stringify(body.editorialTakeaways)
        : null;
    }

    const updated = await prisma.caseStudyResponse.update({
      where: { id: responseId },
      data: updateData,
      include: {
        form: { select: { id: true, title: true, slug: true } },
        project: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    let measurableOutcomes: MeasurableOutcome[] = [];
    if (updated.measurableOutcomesJson) {
      try {
        measurableOutcomes = JSON.parse(updated.measurableOutcomesJson);
      } catch {}
    }

    let imageAssetIds: string[] = [];
    if (updated.imageAssetIdsJson) {
      try {
        imageAssetIds = JSON.parse(updated.imageAssetIdsJson);
      } catch {}
    }

    let editorialTakeaways: string[] = [];
    if (updated.editorialTakeawaysJson) {
      try {
        editorialTakeaways = JSON.parse(updated.editorialTakeawaysJson);
      } catch {}
    }

    return NextResponse.json({
      response: {
        ...updated,
        formTitle: updated.form.title,
        formSlug: updated.form.slug,
        projectName: updated.project?.name || null,
        brandName: updated.brand?.name || null,
        measurableOutcomes,
        imageAssetIds,
        editorialTakeaways,
      },
    });
  } catch (error: any) {
    console.error("Error updating case study response:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update case study response" },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE: Deletes a case study response.
 */
export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, responseId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const existing = await prisma.caseStudyResponse.findFirst({
      where: { id: responseId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Case study response not found" }, { status: 404 });
    }

    await prisma.caseStudyResponse.delete({
      where: { id: responseId },
    });

    return NextResponse.json({ success: true, message: "Case study response deleted" });
  } catch (error: any) {
    console.error("Error deleting case study response:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete case study response" },
      { status: error.status || 500 }
    );
  }
}
