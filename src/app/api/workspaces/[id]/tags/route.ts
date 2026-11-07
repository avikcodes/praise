import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const tags = await prisma.tag.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { testimonials: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color || "#7049D8",
        createdAt: t.createdAt.toISOString(),
        testimonialCount: t._count.testimonials,
      })),
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load tags.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { name, color } = body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Tag name cannot be empty." },
        { status: 400 },
      );
    }

    // Check if tag already exists in workspace
    const existing = await prisma.tag.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: trimmedName,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Tag "${trimmedName}" already exists.` },
        { status: 409 },
      );
    }

    const tag = await prisma.tag.create({
      data: {
        workspaceId,
        name: trimmedName,
        color: color?.trim() || "#7049D8",
      },
    });

    return NextResponse.json(
      {
        success: true,
        tag: {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          createdAt: tag.createdAt.toISOString(),
          testimonialCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to create tag.";
    return NextResponse.json({ error: message }, { status });
  }
}

