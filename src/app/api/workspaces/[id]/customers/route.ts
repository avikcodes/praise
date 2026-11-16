import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember, AuthError } from "@/lib/auth/guards";
import {
  displayCustomerEmail,
  formatCustomerMeta,
  INTERNAL_EMAIL_SUFFIX,
  parseCustomerMeta,
} from "@/lib/customers/utils";
import { logCustomerActivity } from "@/lib/customers/crm";
import { evaluateCustomerAgainstSegment } from "@/lib/customers/segments";
import { Prisma } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: rawId } = await context.params;
    const { workspace } = await requireWorkspaceMember(rawId);
    const workspaceId = workspace.id;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const projectId = searchParams.get("projectId");
    const stage = searchParams.get("stage"); // e.g. "PROMOTER", "CHAMPION", "all"
    const tagId = searchParams.get("tagId");
    const segmentId = searchParams.get("segmentId");
    const activity = searchParams.get("activity"); // "all" | "with_reviews" | "multiple"
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where: Prisma.CustomerWhereInput = { workspaceId };

    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { website: { contains: q, mode: "insensitive" } },
        { socialHandle: { contains: q, mode: "insensitive" } },
      ];
    }

    if (stage && stage !== "all") {
      where.stage = stage.toUpperCase();
    }

    if (tagId && tagId !== "all") {
      where.customerTags = {
        some: { tagId },
      };
    }

    if (projectId && projectId !== "all") {
      where.testimonials = {
        some: {
          projectId,
        },
      };
    }

    if (activity === "with_reviews") {
      where.testimonials = {
        some: {},
      };
    }

    // Load segment rules if filtering by dynamic segment
    let segmentRules = null;
    if (segmentId && segmentId !== "all") {
      const segment = await prisma.customerSegment.findUnique({
        where: { id: segmentId },
      });
      if (segment?.filterRulesJson) {
        try {
          segmentRules = JSON.parse(segment.filterRulesJson);
        } catch {
          // ignore
        }
      }
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { testimonials: true, notes: true },
        },
        customerTags: {
          include: {
            tag: {
              select: { id: true, name: true, color: true },
            },
          },
        },
        testimonials: {
          orderBy: { submittedAt: "desc" },
          select: {
            id: true,
            rating: true,
            status: true,
            type: true,
            submittedAt: true,
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
                brand: {
                  select: { id: true, name: true, logoUrl: true },
                },
              },
            },
          },
        },
      },
      orderBy:
        sortBy === "name"
          ? { name: sortOrder }
          : { createdAt: sortOrder },
    });

    // Format customer profiles with CRM metadata
    let formatted = customers.map((c) => {
      const meta = parseCustomerMeta(c.socialHandle);
      const cleanDisplayEmail = displayCustomerEmail(c.email);

      // Extract distinct associated projects and brands
      const projectMap = new Map<
        string,
        { id: string; name: string; slug: string; color?: string | null; brandName?: string | null }
      >();
      const brandMap = new Map<string, { id: string; name: string; logoUrl?: string | null }>();

      for (const t of c.testimonials) {
        if (t.project) {
          projectMap.set(t.project.id, {
            id: t.project.id,
            name: t.project.name,
            slug: t.project.slug,
            color: t.project.color,
            brandName: t.project.brand?.name || null,
          });
          if (t.project.brand) {
            brandMap.set(t.project.brand.id, t.project.brand);
          }
        }
      }

      // Parse custom attributes
      let customAttributes: Record<string, unknown> = {};
      if (c.customAttributesJson) {
        try {
          customAttributes = JSON.parse(c.customAttributesJson);
        } catch {
          // ignore
        }
      }

      return {
        id: c.id,
        name: c.name,
        email: cleanDisplayEmail,
        rawEmail: c.email,
        hasEmail: Boolean(cleanDisplayEmail),
        company: c.company,
        title: c.title,
        avatarUrl: c.avatarUrl,
        website: c.website || meta.website,
        stage: c.stage || "NEW",
        customAttributes,
        tags: c.customerTags.map((ct) => ({
          id: ct.tag.id,
          name: ct.tag.name,
          color: ct.tag.color,
        })),
        tagIds: c.customerTags.map((ct) => ct.tag.id),
        notesCount: c._count.notes,
        testimonialCount: c._count.testimonials,
        associatedProjects: Array.from(projectMap.values()),
        associatedBrands: Array.from(brandMap.values()),
        latestSubmission: c.testimonials[0] || null,
        testimonials: c.testimonials,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    // If segment filter rules are active, filter dynamically
    if (segmentRules) {
      formatted = formatted.filter((c) =>
        evaluateCustomerAgainstSegment(
          {
            ...c,
            testimonialCount: c.testimonialCount,
            tagIds: c.tagIds,
            customAttributes: c.customAttributes,
          },
          segmentRules,
        ),
      );
    }

    if (activity === "multiple") {
      formatted = formatted.filter((c) => c.testimonialCount > 1);
    }

    if (sortBy === "testimonialsCount") {
      formatted.sort((a, b) =>
        sortOrder === "asc"
          ? a.testimonialCount - b.testimonialCount
          : b.testimonialCount - a.testimonialCount,
      );
    }

    return NextResponse.json({
      customers: formatted,
      total: formatted.length,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Customers list error:", error);
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: rawId } = await context.params;
    const member = await requireWorkspaceMember(rawId, ["OWNER", "ADMIN"]);
    const workspaceId = member.workspace.id;

    const body = await request.json();
    const {
      name,
      email,
      company,
      title,
      website,
      avatarUrl,
      stage,
      customAttributes,
      tagIds,
      notes,
    } = body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Customer name is required." },
        { status: 400 },
      );
    }

    let finalEmail: string;
    if (typeof email === "string" && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return NextResponse.json(
          { error: "Please enter a valid email address." },
          { status: 400 },
        );
      }

      // Check if email already belongs to a customer in this workspace
      const existing = await prisma.customer.findUnique({
        where: {
          workspaceId_email: {
            workspaceId,
            email: normalizedEmail,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: `A customer profile with email "${normalizedEmail}" already exists in this workspace.` },
          { status: 409 },
        );
      }
      finalEmail = normalizedEmail;
    } else {
      finalEmail = `no-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${INTERNAL_EMAIL_SUFFIX}`;
    }

    const mergedSocialHandle = formatCustomerMeta(website, notes);

    const customer = await prisma.customer.create({
      data: {
        workspaceId,
        name: trimmedName,
        email: finalEmail,
        company: typeof company === "string" && company.trim() ? company.trim() : null,
        title: typeof title === "string" && title.trim() ? title.trim() : null,
        website: typeof website === "string" && website.trim() ? website.trim() : null,
        avatarUrl: typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null,
        stage: typeof stage === "string" && stage.trim() ? stage.trim().toUpperCase() : "NEW",
        customAttributesJson: customAttributes ? JSON.stringify(customAttributes) : null,
        socialHandle: mergedSocialHandle,
      },
    });

    // Link tags
    if (tagIds && Array.isArray(tagIds)) {
      for (const tid of tagIds) {
        await prisma.customerTag.create({
          data: {
            customerId: customer.id,
            tagId: tid,
            workspaceId,
          },
        }).catch(() => {});
      }
    }

    // If initial notes were provided, create a CustomerNote entry
    if (notes && typeof notes === "string" && notes.trim()) {
      await prisma.customerNote.create({
        data: {
          workspaceId,
          customerId: customer.id,
          authorId: member.user.id,
          authorName: member.user.name,
          authorEmail: member.user.email,
          content: notes.trim(),
        },
      }).catch(() => {});
    }

    // Log activity
    await logCustomerActivity({
      workspaceId,
      customerId: customer.id,
      action: "CREATED",
      actorId: member.user.id,
      actorName: member.user.name,
      details: `Customer profile created with lifecycle stage: ${customer.stage}`,
    });

    return NextResponse.json(
      {
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          email: displayCustomerEmail(customer.email),
          hasEmail: Boolean(displayCustomerEmail(customer.email)),
          company: customer.company,
          title: customer.title,
          website: customer.website,
          stage: customer.stage,
          customAttributes: customAttributes || {},
          avatarUrl: customer.avatarUrl,
          createdAt: customer.createdAt.toISOString(),
          testimonialCount: 0,
          associatedProjects: [],
          associatedBrands: [],
          latestSubmission: null,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Create customer error:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 },
    );
  }
}
