import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { Prisma } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const rating = searchParams.get("rating");
    const projectId = searchParams.get("projectId");
    const formId = searchParams.get("formId");
    const type = searchParams.get("type");
    const tagId = searchParams.get("tagId");
    const dateRange = searchParams.get("dateRange");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "submittedAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10) || 25));

    // Build Prisma where filter
    const where: Prisma.TestimonialWhereInput = { workspaceId };

    if (status && status !== "all") {
      where.status = status.toUpperCase() as Prisma.EnumTestimonialStatusFilter;
    }

    if (rating && rating !== "all") {
      const parsedRating = parseInt(rating, 10);
      if (!isNaN(parsedRating)) {
        where.rating = parsedRating;
      }
    }

    if (projectId && projectId !== "all") {
      where.projectId = projectId;
    }

    if (formId && formId !== "all") {
      where.formId = formId;
    }

    if (type && type !== "all") {
      where.type = type.toUpperCase() as Prisma.EnumTestimonialTypeFilter;
    }

    if (tagId && tagId !== "all") {
      where.tags = {
        some: {
          tagId,
        },
      };
    }

    if (dateRange && dateRange !== "all") {
      const now = new Date();
      let days = 0;
      if (dateRange === "7d") days = 7;
      else if (dateRange === "30d") days = 30;
      else if (dateRange === "90d") days = 90;

      if (days > 0) {
        const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        where.submittedAt = { gte: threshold };
      }
    }

    if (search?.trim()) {
      const query = search.trim();
      where.OR = [
        { content: { contains: query, mode: "insensitive" } },
        { customer: { name: { contains: query, mode: "insensitive" } } },
        { customer: { email: { contains: query, mode: "insensitive" } } },
        { customer: { company: { contains: query, mode: "insensitive" } } },
        { customer: { title: { contains: query, mode: "insensitive" } } },
      ];
    }

    // Build orderBy
    const orderBy: Prisma.TestimonialOrderByWithRelationInput =
      sortBy === "rating"
        ? { rating: sortOrder }
        : { submittedAt: sortOrder };

    const [totalMatching, testimonials, statusGroupCounts] = await Promise.all([
      prisma.testimonial.count({ where }),
      prisma.testimonial.findMany({
        where,
        include: {
          customer: true,
          form: {
            select: { id: true, title: true, slug: true },
          },
          project: {
            select: { id: true, name: true, slug: true, color: true },
          },
          consentRecords: {
            take: 1,
            orderBy: { grantedAt: "desc" },
          },
          mediaAssets: true,
          tags: {
            include: { tag: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.testimonial.groupBy({
        by: ["status"],
        where: { workspaceId },
        _count: { _all: true },
      }),
    ]);

    const countMap = {
      pending: 0,
      approved: 0,
      rejected: 0,
      archived: 0,
      all: 0,
    };

    for (const item of statusGroupCounts) {
      const key = item.status.toLowerCase() as keyof typeof countMap;
      if (key in countMap) {
        countMap[key] = item._count._all;
      }
      countMap.all += item._count._all;
    }

    return NextResponse.json({
      testimonials: testimonials.map((t) => ({
        ...t,
        consentRecord: t.consentRecords[0] || null,
      })),
      counts: countMap,
      pagination: {
        total: totalMatching,
        page,
        limit,
        totalPages: Math.ceil(totalMatching / limit) || 1,
      },
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to fetch testimonials.";
    return NextResponse.json({ error: message }, { status });
  }
}
