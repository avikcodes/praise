import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { CaseStudyResponseDetail, MeasurableOutcome } from "@/lib/case-studies/types";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET: Lists all case study responses for a workspace with filtering options.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const formId = searchParams.get("formId");
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");
    const brandId = searchParams.get("brandId");
    const search = searchParams.get("search");

    const where: any = { workspaceId };
    if (formId) where.formId = formId;
    if (status && status !== "ALL") where.status = status;
    if (projectId) where.projectId = projectId;
    if (brandId) where.brandId = brandId;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { customerName: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { resultsAchieved: { contains: q, mode: "insensitive" } },
        { initialProblem: { contains: q, mode: "insensitive" } },
        { editorialTitle: { contains: q, mode: "insensitive" } },
      ];
    }

    const responses = await prisma.caseStudyResponse.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: {
        form: { select: { id: true, title: true, slug: true } },
        project: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    const formatted: CaseStudyResponseDetail[] = responses.map((r) => {
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

      return {
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
        videoAssetId: r.videoAssetId,

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
    });

    return NextResponse.json({ responses: formatted });
  } catch (error: any) {
    console.error("Error fetching case study responses:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch case study responses" },
      { status: error.status || 500 }
    );
  }
}
