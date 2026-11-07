import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string; tagId: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, tagId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { name, color } = body;

    const updateData: { name?: string; color?: string } = {};

    if (typeof name === "string") {
      const trimmed = name.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: "Tag name cannot be empty." },
          { status: 400 },
        );
      }
      updateData.name = trimmed;
    }

    if (typeof color === "string" && color.trim()) {
      updateData.color = color.trim();
    }

    const updated = await prisma.tag.update({
      where: {
        id: tagId,
        workspaceId,
      },
      data: updateData,
    });

    return NextResponse.json({ success: true, tag: updated });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to update tag.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, tagId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    await prisma.tag.delete({
      where: {
        id: tagId,
        workspaceId,
      },
    });

    return NextResponse.json({ success: true, message: "Tag deleted successfully." });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to delete tag.";
    return NextResponse.json({ error: message }, { status });
  }
}

