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

    const where: any = { workspaceId }; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { testimonials: true },
        },
        testimonials: {
          take: 1,
          orderBy: { submittedAt: "desc" },
          select: {
            id: true,
            rating: true,
            status: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company,
        title: c.title,
        avatarUrl: c.avatarUrl,
        socialHandle: c.socialHandle,
        createdAt: c.createdAt.toISOString(),
        testimonialCount: c._count.testimonials,
        latestSubmission: c.testimonials[0] || null,
      })),
      total: customers.length,
    });
  } catch (error) {
    console.error("Customers list error:", error);
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 },
    );
  }
}

