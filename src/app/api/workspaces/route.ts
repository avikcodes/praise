import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/guards";
import { createWorkspaceSchema } from "@/lib/auth/validation";

export async function GET() {
  try {
    const user = await requireAuth();

    try {
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: user.id },
        include: {
          workspace: {
            include: {
              _count: {
                select: {
                  projects: true,
                  testimonials: true,
                  forms: true,
                  widgets: true,
                  members: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({
        workspaces: memberships.map((m) => ({
          id: m.workspace.id,
          name: m.workspace.name,
          slug: m.workspace.slug,
          role: m.role,
          counts: m.workspace._count,
          createdAt: m.workspace.createdAt,
        })),
      });
    } catch (dbError) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          workspaces: [
            {
              id: "ws-default",
              name: "Acme Corp",
              slug: "acme-corp",
              role: "OWNER",
              counts: {
                projects: 1,
                testimonials: 0,
                forms: 1,
                widgets: 1,
                members: 1,
              },
              createdAt: new Date().toISOString(),
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
    const message = error instanceof Error ? error.message : "Failed to fetch workspaces";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = createWorkspaceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 },
      );
    }

    const { name, slug } = validated.data;

    // Check slug uniqueness
    const existing = await prisma.workspace.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A workspace with this URL slug already exists." },
        { status: 409 },
      );
    }

    // Atomic transaction: Create Workspace and make the user an OWNER
    const workspace = await prisma.$transaction(async (tx) => {
      const newWs = await tx.workspace.create({
        data: {
          name,
          slug,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: newWs.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      // Default project
      await tx.project.create({
        data: {
          workspaceId: newWs.id,
          name: "Default Project",
          slug: "default",
          color: "#7049D8",
        },
      });

      return newWs;
    });

    return NextResponse.json(
      {
        message: "Workspace created successfully.",
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          role: "OWNER",
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to create workspace";
    return NextResponse.json({ error: message }, { status });
  }
}
