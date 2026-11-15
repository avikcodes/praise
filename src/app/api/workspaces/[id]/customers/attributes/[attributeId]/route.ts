import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string; attributeId: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, attributeId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { name, type, options, description, order } = body;

    const existing = await prisma.customerAttributeDefinition.findUnique({
      where: { id: attributeId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Attribute definition not found." },
        { status: 404 },
      );
    }

    const updated = await prisma.customerAttributeDefinition.update({
      where: { id: attributeId },
      data: {
        name: typeof name === "string" && name.trim() ? name.trim() : existing.name,
        type: typeof type === "string" ? type : existing.type,
        optionsJson: Array.isArray(options) ? JSON.stringify(options) : existing.optionsJson,
        description: description !== undefined ? description : existing.description,
        order: typeof order === "number" ? order : existing.order,
      },
    });

    return NextResponse.json({
      success: true,
      attribute: {
        id: updated.id,
        key: updated.key,
        name: updated.name,
        type: updated.type,
        options: updated.optionsJson ? JSON.parse(updated.optionsJson) : [],
        description: updated.description,
        order: updated.order,
      },
    });
  } catch (error) {
    console.error("Update attribute error:", error);
    return NextResponse.json(
      { error: "Failed to update attribute definition." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, attributeId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const existing = await prisma.customerAttributeDefinition.findUnique({
      where: { id: attributeId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Attribute definition not found." },
        { status: 404 },
      );
    }

    await prisma.customerAttributeDefinition.delete({
      where: { id: attributeId },
    });

    return NextResponse.json({
      success: true,
      message: "Attribute definition deleted successfully.",
    });
  } catch (error) {
    console.error("Delete attribute error:", error);
    return NextResponse.json(
      { error: "Failed to delete attribute definition." },
      { status: 500 },
    );
  }
}
