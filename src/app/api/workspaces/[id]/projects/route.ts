import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { createProjectSchema } from "@/lib/auth/validation";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireWorkspaceMember(id);

    try {
      const projects = await prisma.project.findMany({
        where: { workspaceId: id },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              accentColor: true,
            },
          },
          _count: {
            select: {
              forms: true,
              testimonials: true,
              widgets: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ projects });
    } catch (dbError) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          projects: [
            {
              id: "proj-default",
              workspaceId: id,
              name: "Primary Web Application",
              slug: "web-app",
              description: "Main marketing and web app testimonial collection.",
              color: "#7049D8",
              formsCount: 1,
              widgetsCount: 1,
              testimonialsCount: 0,
            },
          ],
        });
      }
      throw dbError;
    }
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to fetch projects";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireWorkspaceMember(id, ["OWNER", "ADMIN"]);
    const body = await request.json();
    const validated = createProjectSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 },
      );
    }

    const { name, slug, description, color, logoUrl, brandId } = validated.data;

    // Check slug uniqueness within this workspace
    const existing = await prisma.project.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId: id,
          slug,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A project with this URL slug already exists in this workspace." },
        { status: 409 },
      );
    }

    // If brandId is provided, verify it belongs to this workspace
    if (brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: brandId, workspaceId: id },
      });
      if (!brand) {
        return NextResponse.json(
          { error: "The selected brand was not found in this workspace." },
          { status: 400 },
        );
      }
    }

    const project = await prisma.project.create({
      data: {
        workspaceId: id,
        name,
        slug,
        description: description || null,
        color: color || "#7049D8",
        logoUrl: logoUrl || null,
        brandId: brandId || null,
      },
      include: {
        brand: true,
      },
    });

    return NextResponse.json(
      { message: "Project created successfully.", project },
      { status: 201 },
    );
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status });
  }
}
