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

      if (memberships.length === 0) {
        // Ensure user has at least one real workspace in the database
        const workspaceName = `${user.name || "My"}'s Workspace`;
        const baseSlug = (user.name || "workspace")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "workspace";
        const safeSuffix = user.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "team";
        const slug = `${baseSlug}-${safeSuffix}`;

        const existingSlug = await prisma.workspace.findUnique({ where: { slug } });
        const finalSlug = existingSlug
          ? `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
          : slug;

        const created = await prisma.workspace.create({
          data: {
            name: workspaceName,
            slug: finalSlug,
            members: {
              create: {
                userId: user.id,
                role: "OWNER",
              },
            },
            projects: {
              create: {
                name: "Main Product Web",
                slug: "web-app",
                description: "Primary website and web application testimonials.",
                color: "#7049D8",
              },
            },
          },
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
        });

        return NextResponse.json({
          workspaces: [
            {
              id: created.id,
              name: created.name,
              slug: created.slug,
              role: "OWNER",
              counts: created._count,
              createdAt: created.createdAt,
            },
          ],
        });
      }

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
      console.error("Fetch workspaces error:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch workspaces" },
        { status: 500 },
      );
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
