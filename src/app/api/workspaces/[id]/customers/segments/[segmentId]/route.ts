import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string; segmentId: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, segmentId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { name, description, color, icon, isDynamic, filterRules } = body;

    const existing = await prisma.customerSegment.findUnique({
      where: { id: segmentId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Segment not found." },
        { status: 404 },
      );
    }

    const updated = await prisma.customerSegment.update({
      where: { id: segmentId },
      data: {
        name: typeof name === "string" && name.trim() ? name.trim() : existing.name,
        description: description !== undefined ? description : existing.description,
        color: typeof color === "string" && color.trim() ? color.trim() : existing.color,
        icon: typeof icon === "string" && icon.trim() ? icon.trim() : existing.icon,
        isDynamic: isDynamic !== undefined ? Boolean(isDynamic) : existing.isDynamic,
        filterRulesJson: filterRules ? JSON.stringify(filterRules) : existing.filterRulesJson,
      },
    });

    return NextResponse.json({
      success: true,
      segment: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        color: updated.color,
        icon: updated.icon,
        isDynamic: updated.isDynamic,
        filterRules: JSON.parse(updated.filterRulesJson),
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Update segment error:", error);
    return NextResponse.json(
      { error: "Failed to update segment." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, segmentId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const existing = await prisma.customerSegment.findUnique({
      where: { id: segmentId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Segment not found." },
        { status: 404 },
      );
    }

    await prisma.customerSegment.delete({
      where: { id: segmentId },
    });

    return NextResponse.json({
      success: true,
      message: "Customer segment deleted successfully.",
    });
  } catch (error) {
    console.error("Delete segment error:", error);
    return NextResponse.json(
      { error: "Failed to delete segment." },
      { status: 500 },
    );
  }
}
