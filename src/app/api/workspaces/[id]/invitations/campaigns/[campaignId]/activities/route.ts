import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string; campaignId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const activities = await prisma.emailCampaignActivity.findMany({
      where: { campaignId, workspaceId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, activities });
  } catch (error: any) {
    console.error("Failed to fetch campaign activities:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch activities" },
      { status: error.status || 500 },
    );
  }
}
