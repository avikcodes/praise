import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { findDuplicatesForTestimonial, DuplicateSignalConfig } from "@/lib/moderation/duplicate-detector";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

/**
 * GET: Checks a single testimonial against other workspace testimonials for potential duplicate signals.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
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

    const target = await prisma.testimonial.findFirst({
      where: { id: testimonialId, workspaceId },
      include: {
        customer: { select: { id: true, name: true, email: true, company: true } },
        mediaAssets: { select: { id: true, fileHash: true } },
      },
    });

    if (!target) {
      return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });
    }

    const candidates = await prisma.testimonial.findMany({
      where: {
        workspaceId,
        id: { not: testimonialId },
      },
      include: {
        customer: { select: { id: true, name: true, email: true, company: true } },
        mediaAssets: { select: { id: true, fileHash: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    const matches = findDuplicatesForTestimonial(target, candidates, config);

    const candidateMap = new Map(candidates.map((c) => [c.id, c]));
    const hydratedMatches = matches.map((m) => {
      const matchItem = candidateMap.get(m.matchedTestimonialId);
      return {
        ...m,
        matchedTestimonial: matchItem
          ? {
              id: matchItem.id,
              content: matchItem.content,
              rating: matchItem.rating,
              status: matchItem.status,
              sourceType: matchItem.sourceType,
              sourceUrl: matchItem.sourceUrl,
              submittedAt: matchItem.submittedAt,
              customer: matchItem.customer,
            }
          : null,
      };
    });

    return NextResponse.json({
      testimonialId,
      hasDuplicates: hydratedMatches.length > 0,
      matches: hydratedMatches,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to check duplicates.";
    return NextResponse.json({ error: message }, { status });
  }
}
