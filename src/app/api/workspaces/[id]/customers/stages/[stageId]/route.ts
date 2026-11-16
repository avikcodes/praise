import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember, AuthError } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string; stageId: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: rawId, stageId } = await context.params;
    const { workspace } = await requireWorkspaceMember(rawId, ["OWNER", "ADMIN"]);
    const workspaceId = workspace.id;

    const body = await request.json();
    const { name, description, color, order } = body;

    const existing = await prisma.customerStage.findUnique({
      where: { id: stageId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Stage not found." },
        { status: 404 },
      );
    }

    const updated = await prisma.customerStage.update({
      where: { id: stageId },
      data: {
        name: typeof name === "string" && name.trim() ? name.trim() : existing.name,
        description: description !== undefined ? description : existing.description,
        color: typeof color === "string" && color.trim() ? color.trim() : existing.color,
        order: typeof order === "number" ? order : existing.order,
      },
    });

    return NextResponse.json({ success: true, stage: updated });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Update stage error:", error);
    return NextResponse.json(
      { error: "Failed to update stage." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: rawId, stageId } = await context.params;
    const { workspace } = await requireWorkspaceMember(rawId, ["OWNER", "ADMIN"]);
    const workspaceId = workspace.id;

    const stage = await prisma.customerStage.findUnique({
      where: { id: stageId, workspaceId },
    });

    if (!stage) {
      return NextResponse.json(
        { error: "Stage not found." },
        { status: 404 },
      );
    }

    if (stage.isSystem && stage.isDefault) {
      return NextResponse.json(
        { error: "Default system stage cannot be deleted." },
        { status: 400 },
      );
    }

    // Move any customers in this stage to "NEW"
    await prisma.customer.updateMany({
      where: { workspaceId, stage: stage.key },
      data: { stage: "NEW" },
    });

    await prisma.customerStage.delete({
      where: { id: stageId },
    });

    return NextResponse.json({
      success: true,
      message: "Stage deleted. Associated customers reassigned to New.",
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Delete stage error:", error);
    return NextResponse.json(
      { error: "Failed to delete stage." },
      { status: 500 },
    );
  }
}
