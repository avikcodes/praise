import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string; customerId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, customerId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const activities = await prisma.customerActivity.findMany({
      where: {
        workspaceId,
        customerId,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      activities: activities.map((a) => ({
        id: a.id,
        action: a.action,
        actorId: a.actorId,
        actorName: a.actorName,
        details: a.details,
        metadata: a.metadataJson ? JSON.parse(a.metadataJson) : null,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Customer activity history error:", error);
    return NextResponse.json(
      { error: "Failed to load customer activity history." },
      { status: 500 },
    );
  }
}
