import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember, AuthError } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: rawId } = await context.params;
    const { workspace } = await requireWorkspaceMember(rawId);
    const workspaceId = workspace.id;

    const definitions = await prisma.customerAttributeDefinition.findMany({
      where: { workspaceId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({
      attributes: definitions.map((d) => ({
        id: d.id,
        key: d.key,
        name: d.name,
        type: d.type,
        options: d.optionsJson ? JSON.parse(d.optionsJson) : [],
        description: d.description,
        order: d.order,
      })),
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("List customer attributes error:", error);
    return NextResponse.json(
      { error: "Failed to load customer attribute definitions." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: rawId } = await context.params;
    const { workspace } = await requireWorkspaceMember(rawId, ["OWNER", "ADMIN"]);
    const workspaceId = workspace.id;

    const body = await request.json();
    const { name, key, type, options, description, order } = body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Attribute name is required." },
        { status: 400 },
      );
    }

    const attrKey = (
      typeof key === "string" && key.trim()
        ? key.trim()
        : trimmedName.toLowerCase().replace(/[^a-z0-9_]+/g, "_")
    ).toLowerCase();

    // Check uniqueness
    const existing = await prisma.customerAttributeDefinition.findUnique({
      where: {
        workspaceId_key: {
          workspaceId,
          key: attrKey,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Attribute with key "${attrKey}" already exists.` },
        { status: 409 },
      );
    }

    const validTypes = ["TEXT", "NUMBER", "BOOLEAN", "DATE", "SELECT"];
    const attrType = validTypes.includes(type) ? type : "TEXT";

    const definition = await prisma.customerAttributeDefinition.create({
      data: {
        workspaceId,
        key: attrKey,
        name: trimmedName,
        type: attrType,
        optionsJson: Array.isArray(options) ? JSON.stringify(options) : null,
        description: typeof description === "string" ? description.trim() : null,
        order: typeof order === "number" ? order : 10,
      },
    });

    return NextResponse.json(
      {
        success: true,
        attribute: {
          id: definition.id,
          key: definition.key,
          name: definition.name,
          type: definition.type,
          options: definition.optionsJson ? JSON.parse(definition.optionsJson) : [],
          description: definition.description,
          order: definition.order,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Create attribute definition error:", error);
    return NextResponse.json(
      { error: "Failed to create attribute definition." },
      { status: 500 },
    );
  }
}
