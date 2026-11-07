import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { TestimonialStatus } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { action, testimonialIds, restoreTo } = body;

    if (!Array.isArray(testimonialIds) || testimonialIds.length === 0) {
      return NextResponse.json(
        { error: "No testimonial IDs provided for bulk action." },
        { status: 400 },
      );
    }

    // Ensure we only act on testimonials belonging to this workspace
    const baseWhere = {
      id: { in: testimonialIds },
      workspaceId,
    };

    if (action === "DELETE") {
      const result = await prisma.testimonial.deleteMany({
        where: baseWhere,
      });

      return NextResponse.json({
        success: true,
        action: "DELETE",
        count: result.count,
        message: `Successfully deleted ${result.count} testimonials.`,
      });
    }

    let targetStatus: TestimonialStatus;
    switch (action) {
      case "APPROVE":
        targetStatus = "APPROVED";
        break;
      case "REJECT":
        targetStatus = "REJECTED";
        break;
      case "ARCHIVE":
        targetStatus = "ARCHIVED";
        break;
      case "RESTORE":
        targetStatus = restoreTo === "APPROVED" ? "APPROVED" : "PENDING";
        break;
      default:
        return NextResponse.json(
          { error: `Invalid bulk action "${action}". Valid actions are APPROVE, REJECT, ARCHIVE, RESTORE, DELETE.` },
          { status: 400 },
        );
    }

    const result = await prisma.testimonial.updateMany({
      where: baseWhere,
      data: {
        status: targetStatus,
      },
    });

    return NextResponse.json({
      success: true,
      action,
      targetStatus,
      count: result.count,
      message: `Successfully updated ${result.count} testimonials to ${targetStatus.toLowerCase()}.`,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to execute bulk action.";
    return NextResponse.json({ error: message }, { status });
  }
}

