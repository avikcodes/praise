import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { scanWorkspaceDuplicates, DuplicateSignalConfig } from "@/lib/moderation/duplicate-detector";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET: Scans all testimonials in the workspace for potential duplicates.
 * Returns potential duplicate clusters with detailed signal breakdown for human review.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const threshold = parseFloat(searchParams.get("threshold") || "0.8") || 0.8;
    const checkText = searchParams.get("checkText") !== "false";
    const checkCustomer = searchParams.get("checkCustomer") !== "false";
    const checkSourceUrl = searchParams.get("checkSourceUrl") !== "false";
    const checkMediaHash = searchParams.get("checkMediaHash") !== "false";

    const config: DuplicateSignalConfig = {
      enableTextCheck: checkText,
      enableCustomerCheck: checkCustomer,
      enableSourceUrlCheck: checkSourceUrl,
      enableMediaHashCheck: checkMediaHash,
      textSimilarityThreshold: threshold,
    };

    // Fetch active/un-dismissed testimonials from workspace
    const testimonials = await prisma.testimonial.findMany({
      where: {
        workspaceId,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, company: true },
        },
        mediaAssets: {
          select: { id: true, fileHash: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const scanResult = scanWorkspaceDuplicates(testimonials, config);

    // Map matched details to include full testimonial summaries
    const testimonialMap = new Map(testimonials.map((t) => [t.id, t]));

    const duplicateClusters = [];
    const processedPairs = new Set<string>();

    for (const [candidateId, matches] of Object.entries(scanResult.matchesByTestimonialId)) {
      for (const m of matches) {
        const pairKey = [candidateId, m.matchedTestimonialId].sort().join("::");
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const itemA = testimonialMap.get(candidateId);
        const itemB = testimonialMap.get(m.matchedTestimonialId);

        if (itemA && itemB) {
          duplicateClusters.push({
            pairKey,
            confidenceScore: m.confidenceScore,
            matchedSignals: m.matchedSignals,
            signalBreakdown: m.signalBreakdown,
            summary: m.summary,
            testimonialA: {
              id: itemA.id,
              content: itemA.content,
              rating: itemA.rating,
              status: itemA.status,
              sourceType: itemA.sourceType,
              sourceUrl: itemA.sourceUrl,
              submittedAt: itemA.submittedAt,
              customer: itemA.customer,
            },
            testimonialB: {
              id: itemB.id,
              content: itemB.content,
              rating: itemB.rating,
              status: itemB.status,
              sourceType: itemB.sourceType,
              sourceUrl: itemB.sourceUrl,
              submittedAt: itemB.submittedAt,
              customer: itemB.customer,
            },
          });
        }
      }
    }

    // Sort clusters highest confidence first
    duplicateClusters.sort((a, b) => b.confidenceScore - a.confidenceScore);

    return NextResponse.json({
      totalAnalyzed: scanResult.totalAnalyzed,
      duplicateCount: duplicateClusters.length,
      flaggedTestimonialIds: scanResult.flaggedTestimonialIds,
      duplicateClusters,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to scan for duplicates.";
    return NextResponse.json({ error: message }, { status });
  }
}
