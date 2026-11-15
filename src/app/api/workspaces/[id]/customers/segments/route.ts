import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { evaluateCustomerAgainstSegment } from "@/lib/customers/segments";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const segments = await prisma.customerSegment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    // If segments exist, evaluate dynamic counts
    let allCustomersForEval: any[] = [];
    if (segments.length > 0) {
      const customers = await prisma.customer.findMany({
        where: { workspaceId },
        include: {
          customerTags: { select: { tagId: true } },
          testimonials: {
            select: { id: true, status: true, type: true, submittedAt: true },
          },
        },
      });

      allCustomersForEval = customers.map((c) => {
        let customAttributes = {};
        if (c.customAttributesJson) {
          try {
            customAttributes = JSON.parse(c.customAttributesJson);
          } catch {}
        }
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          company: c.company,
          title: c.title,
          website: c.website,
          stage: c.stage,
          createdAt: c.createdAt,
          testimonialCount: c.testimonials.length,
          tagIds: c.customerTags.map((ct) => ct.tagId),
          testimonials: c.testimonials,
          customAttributes,
        };
      });
    }

    const segmentsWithCounts = segments.map((seg) => {
      let count = 0;
      let filterRules = {};
      try {
        filterRules = JSON.parse(seg.filterRulesJson);
        count = allCustomersForEval.filter((c) =>
          evaluateCustomerAgainstSegment(c, filterRules),
        ).length;
      } catch {
        count = 0;
      }

      return {
        id: seg.id,
        name: seg.name,
        description: seg.description,
        color: seg.color,
        icon: seg.icon,
        isDynamic: seg.isDynamic,
        filterRules,
        customerCount: count,
        createdAt: seg.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ segments: segmentsWithCounts });
  } catch (error) {
    console.error("List customer segments error:", error);
    return NextResponse.json(
      { error: "Failed to load customer segments." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { name, description, color, icon, isDynamic, filterRules } = body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Segment name is required." },
        { status: 400 },
      );
    }

    // Check name uniqueness
    const existing = await prisma.customerSegment.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: trimmedName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Segment "${trimmedName}" already exists.` },
        { status: 409 },
      );
    }

    const rulesJson = typeof filterRules === "object" ? JSON.stringify(filterRules) : "{}";

    const segment = await prisma.customerSegment.create({
      data: {
        workspaceId,
        name: trimmedName,
        description: typeof description === "string" ? description.trim() : null,
        color: typeof color === "string" && color.trim() ? color.trim() : "#7049D8",
        icon: typeof icon === "string" && icon.trim() ? icon.trim() : "Users",
        isDynamic: isDynamic !== undefined ? Boolean(isDynamic) : true,
        filterRulesJson: rulesJson,
      },
    });

    return NextResponse.json(
      {
        success: true,
        segment: {
          id: segment.id,
          name: segment.name,
          description: segment.description,
          color: segment.color,
          icon: segment.icon,
          isDynamic: segment.isDynamic,
          filterRules: JSON.parse(segment.filterRulesJson),
          createdAt: segment.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create customer segment error:", error);
    return NextResponse.json(
      { error: "Failed to create customer segment." },
      { status: 500 },
    );
  }
}
