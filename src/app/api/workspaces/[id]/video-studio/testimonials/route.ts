import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET: Lists all video testimonials in this workspace available for editing in Video Studio.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const testimonials = await prisma.testimonial.findMany({
      where: {
        workspaceId,
        OR: [
          { type: "VIDEO" },
          { mediaAssets: { some: { type: "VIDEO" } } },
        ],
      },
      include: {
        customer: true,
        mediaAssets: {
          where: { type: "VIDEO" },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const formatted = testimonials.map((t) => ({
      id: t.id,
      content: t.content,
      rating: t.rating,
      isFeatured: t.isFeatured,
      submittedAt: t.submittedAt.toISOString(),
      customer: t.customer
        ? {
            name: t.customer.name,
            company: t.customer.company,
            title: t.customer.title,
            avatarUrl: t.customer.avatarUrl,
          }
        : {
            name: "Anonymous Customer",
            company: null,
            title: null,
            avatarUrl: null,
          },
      videoAssets: t.mediaAssets.map((m) => ({
        id: m.id,
        url: m.url,
        mimeType: m.mimeType,
        durationSeconds: m.durationSeconds || 30,
        fileSizeBytes: m.fileSizeBytes,
      })),
    }));

    return NextResponse.json({
      success: true,
      testimonials: formatted,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load video testimonials.";
    return NextResponse.json({ error: message }, { status });
  }
}
