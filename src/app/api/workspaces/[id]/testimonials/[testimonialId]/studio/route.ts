import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { getStudioConfig, saveStudioConfig } from "@/lib/video/service";
import { VideoStudioConfig } from "@/lib/video/types";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

/**
 * GET: Retrieves the current Video Studio draft configuration and video assets for this testimonial.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const testimonial = await prisma.testimonial.findFirst({
      where: {
        id: testimonialId,
        workspaceId,
      },
      include: {
        customer: true,
        mediaAssets: {
          where: { type: "VIDEO" },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!testimonial) {
      return NextResponse.json(
        { error: "Testimonial not found in this workspace." },
        { status: 404 },
      );
    }

    const savedConfig = await getStudioConfig(testimonialId, workspaceId);

    return NextResponse.json({
      success: true,
      testimonial: {
        id: testimonial.id,
        content: testimonial.content,
        customerName: testimonial.customer?.name || "Customer",
        customerCompany: testimonial.customer?.company || "",
        videoAssets: testimonial.mediaAssets.map((m) => ({
          id: m.id,
          url: m.url,
          durationSeconds: m.durationSeconds || 30,
          fileSizeBytes: m.fileSizeBytes,
        })),
      },
      studioConfig: savedConfig,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load studio configuration.";
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT: Saves the Video Studio draft configuration non-destructively.
 */
export async function PUT(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN", "MEMBER"]);

    const body = await request.json();
    const studioConfig = body.studioConfig as VideoStudioConfig;

    if (!studioConfig) {
      return NextResponse.json(
        { error: "Invalid request: studioConfig payload is required." },
        { status: 400 },
      );
    }

    const saved = await saveStudioConfig(testimonialId, workspaceId, studioConfig);

    return NextResponse.json({
      success: true,
      message: "Video Studio draft configuration saved successfully.",
      studioConfig: saved,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to save studio configuration.";
    return NextResponse.json({ error: message }, { status });
  }
}
