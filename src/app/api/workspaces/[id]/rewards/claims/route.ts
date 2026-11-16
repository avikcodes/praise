import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const programId = searchParams.get("programId");

    const where: any = { workspaceId };

    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { recipientName: { contains: q, mode: "insensitive" } },
        { recipientEmail: { contains: q, mode: "insensitive" } },
        { rewardCode: { contains: q, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }

    if (programId && programId !== "all") {
      where.rewardProgramId = programId;
    }

    const claims = await prisma.rewardClaim.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        rewardProgram: {
          select: { id: true, name: true, rewardType: true },
        },
        form: {
          select: { id: true, title: true, slug: true },
        },
        testimonial: {
          select: { id: true, rating: true, type: true, content: true },
        },
        customer: {
          select: { id: true, name: true, email: true, company: true },
        },
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      claims,
      count: claims.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch reward claims:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reward claims" },
      { status: error.status || 500 }
    );
  }
}
