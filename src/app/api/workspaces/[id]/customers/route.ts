import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  displayCustomerEmail,
  formatCustomerMeta,
  INTERNAL_EMAIL_SUFFIX,
  parseCustomerMeta,
} from "@/lib/customers/utils";
import { Prisma } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const projectId = searchParams.get("projectId");
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
        { socialHandle: { contains: q, mode: "insensitive" } },
      ];
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

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { testimonials: true },
        },
        testimonials: {
          orderBy: { submittedAt: "desc" },
          select: {
            id: true,
            rating: true,
            status: true,
            submittedAt: true,
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
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

    // Post-filter or sort for computed properties if needed
    let formatted = customers.map((c) => {
      const meta = parseCustomerMeta(c.socialHandle);
      const cleanDisplayEmail = displayCustomerEmail(c.email);

      // Extract distinct associated projects
      const projectMap = new Map<string, { id: string; name: string; slug: string; color?: string | null }>();
      for (const t of c.testimonials) {
        if (t.project) {
          projectMap.set(t.project.id, t.project);
        }
      }

      return {
        id: c.id,
        name: c.name,
        email: cleanDisplayEmail,
        hasEmail: Boolean(cleanDisplayEmail),
        company: c.company,
        title: c.title,
        avatarUrl: c.avatarUrl,
        website: meta.website,
        notes: meta.notes,
        createdAt: c.createdAt.toISOString(),
        testimonialCount: c._count.testimonials,
        associatedProjects: Array.from(projectMap.values()),
        latestSubmission: c.testimonials[0] || null,
      };
    });

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
  } catch (error) {
    console.error("Customers list error:", error);
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { name, email, company, title, website, avatarUrl, notes } = body;

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
      // Customer without email address permitted by form/manual creation
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
        avatarUrl: typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null,
        socialHandle: mergedSocialHandle,
      },
    });

    const meta = parseCustomerMeta(customer.socialHandle);

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
          avatarUrl: customer.avatarUrl,
          website: meta.website,
          notes: meta.notes,
          createdAt: customer.createdAt.toISOString(),
          testimonialCount: 0,
          associatedProjects: [],
          latestSubmission: null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 },
    );
  }
}
