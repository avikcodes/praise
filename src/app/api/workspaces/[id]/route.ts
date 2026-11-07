import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { createWorkspaceSchema } from "@/lib/auth/validation";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { workspace, role } = await requireWorkspaceMember(id);

    const fullWorkspace = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: {
        _count: {
          select: {
            projects: true,
            brands: true,
            forms: true,
            testimonials: true,
            widgets: true,
            members: true,
            customers: true,
          },
        },
      },
    });

    return NextResponse.json({
      workspace: fullWorkspace,
      role,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to fetch workspace";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    // Require OWNER or ADMIN role
    const { workspace } = await requireWorkspaceMember(id, ["OWNER", "ADMIN"]);
    const body = await request.json();
    const validated = createWorkspaceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 },
      );
    }

    const { name, slug } = validated.data;

    // Check slug uniqueness if changed
    if (slug !== workspace.slug) {
      const existing = await prisma.workspace.findUnique({ where: { slug } });
      if (existing) {
        return NextResponse.json(
          { error: "A workspace with this URL slug already exists." },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        name,
        slug,
      },
    });

    return NextResponse.json({
      message: "Workspace updated successfully.",
      workspace: updated,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to update workspace";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    // Strictly require OWNER role to delete workspace
    const { user, workspace } = await requireWorkspaceMember(id, ["OWNER"]);

    // Check if user has other workspaces
    const totalMemberships = await prisma.workspaceMember.count({
      where: { userId: user.id },
    });

    if (totalMemberships <= 1) {
      return NextResponse.json(
        {
          error:
            "You cannot delete your only workspace. Create another workspace before removing this one.",
        },
        { status: 400 },
      );
    }

    // Atomic cascade deletion of workspace and all associated projects, brands, forms, testimonials
    await prisma.workspace.delete({
      where: { id: workspace.id },
    });

    return NextResponse.json({
      message: "Workspace and all associated projects and assets deleted successfully.",
      deletedId: workspace.id,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to delete workspace";
    return NextResponse.json({ error: message }, { status });
  }
}
