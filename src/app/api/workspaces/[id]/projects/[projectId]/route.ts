import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { updateProjectSchema } from "@/lib/auth/validation";

type RouteParams = {
  params: Promise<{ id: string; projectId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, projectId } = await params;
    await requireWorkspaceMember(id);

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: id },
      include: {
        brand: true,
        _count: {
          select: {
            forms: true,
            testimonials: true,
            widgets: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to fetch project";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id, projectId } = await params;
    await requireWorkspaceMember(id, ["OWNER", "ADMIN"]);
    const body = await request.json();
    const validated = updateProjectSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 },
      );
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { name, slug, description, color, logoUrl, brandId } = validated.data;

    // Check slug uniqueness if changed
    if (slug && slug !== project.slug) {
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
    }

    // If brandId is provided, verify it belongs to this workspace
    if (brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: brandId, workspaceId: id },
      });
      if (!brand) {
        return NextResponse.json(
          { error: "The selected brand does not belong to this workspace." },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(color ? { color } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(brandId !== undefined ? { brandId } : {}),
      },
      include: {
        brand: true,
      },
    });

    return NextResponse.json({
      message: "Project updated successfully.",
      project: updated,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, projectId } = await params;
    await requireWorkspaceMember(id, ["OWNER", "ADMIN"]);

    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: id },
      include: {
        _count: {
          select: {
            forms: true,
            testimonials: true,
            widgets: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete project: foreign keys with onDelete: SetNull will unassign forms and testimonials
    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({
      message: `Project "${project.name}" deleted. Linked forms and testimonials have been unassigned.`,
      deletedId: projectId,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to delete project";
    return NextResponse.json({ error: message }, { status });
  }
}
