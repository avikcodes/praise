import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { ensureDefaultStages } from "@/lib/customers/crm";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const stages = await ensureDefaultStages(workspaceId);

    // Compute customer counts per stage
    const counts = await prisma.customer.groupBy({
      by: ["stage"],
      where: { workspaceId },
      _count: true,
    });
    const countMap = new Map(counts.map((c) => [c.stage.toUpperCase(), c._count]));

    return NextResponse.json({
      stages: stages.map((s) => ({
        id: s.id,
        key: s.key,
        name: s.name,
        description: s.description,
        color: s.color,
        order: s.order,
        isDefault: s.isDefault,
        isSystem: s.isSystem,
        customerCount: countMap.get(s.key.toUpperCase()) || 0,
      })),
    });
  } catch (error) {
    console.error("List customer stages error:", error);
    return NextResponse.json(
      { error: "Failed to load customer stages." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { name, key, description, color, order } = body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Stage name is required." },
        { status: 400 },
      );
    }

    const stageKey = (
      typeof key === "string" && key.trim()
        ? key.trim()
        : trimmedName.toUpperCase().replace(/\s+/g, "_")
    ).toUpperCase();

    // Check key uniqueness
    const existing = await prisma.customerStage.findUnique({
      where: {
        workspaceId_key: {
          workspaceId,
          key: stageKey,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Stage with key "${stageKey}" already exists.` },
        { status: 409 },
      );
    }

    const stage = await prisma.customerStage.create({
      data: {
        workspaceId,
        key: stageKey,
        name: trimmedName,
        description: typeof description === "string" ? description.trim() : null,
        color: typeof color === "string" && color.trim() ? color.trim() : "#10B981",
        order: typeof order === "number" ? order : 10,
        isDefault: false,
        isSystem: false,
      },
    });

    return NextResponse.json(
      { success: true, stage },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create customer stage error:", error);
    return NextResponse.json(
      { error: "Failed to create stage." },
      { status: 500 },
    );
  }
}
