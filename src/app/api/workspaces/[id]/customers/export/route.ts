import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { displayCustomerEmail } from "@/lib/customers/utils";
import { exportCustomersToCsv } from "@/lib/customers/crm";
import { Prisma } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json().catch(() => ({}));
    const {
      format = "csv",
      customerIds,
      stage,
      tagId,
      search,
    } = body;

    const where: Prisma.CustomerWhereInput = { workspaceId };

    if (Array.isArray(customerIds) && customerIds.length > 0) {
      where.id = { in: customerIds };
    } else {
      if (stage && stage !== "all") {
        where.stage = stage.toUpperCase();
      }
      if (tagId && tagId !== "all") {
        where.customerTags = { some: { tagId } };
      }
      if (search && typeof search === "string" && search.trim()) {
        const q = search.trim();
        where.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
        ];
      }
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        customerTags: {
          include: { tag: { select: { name: true } } },
        },
        testimonials: {
          select: {
            id: true,
            project: {
              select: {
                name: true,
                brand: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = customers.map((c) => {
      const projects = new Set<string>();
      const brands = new Set<string>();

      for (const t of c.testimonials) {
        if (t.project?.name) projects.add(t.project.name);
        if (t.project?.brand?.name) brands.add(t.project.brand.name);
      }

      let customAttributes = {};
      if (c.customAttributesJson) {
        try {
          customAttributes = JSON.parse(c.customAttributesJson);
        } catch {}
      }

      return {
        id: c.id,
        name: c.name,
        email: displayCustomerEmail(c.email) || c.email,
        company: c.company,
        title: c.title,
        website: c.website,
        stage: c.stage,
        createdAt: c.createdAt,
        testimonialCount: c.testimonials.length,
        tags: c.customerTags.map((ct) => ct.tag.name),
        associatedProjects: Array.from(projects),
        associatedBrands: Array.from(brands),
        customAttributes,
      };
    });

    if (format === "json") {
      return NextResponse.json({
        total: formatted.length,
        customers: formatted,
      });
    }

    const csvData = exportCustomersToCsv(formatted);

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="praise-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export customers error:", error);
    return NextResponse.json(
      { error: "Failed to export customers." },
      { status: 500 },
    );
  }
}
