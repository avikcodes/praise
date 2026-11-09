import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { getWorkspaceAnalytics } from "@/lib/analytics/tracker";
import { AnalyticsPeriod } from "@/lib/analytics/types";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "30d";
    const projectId = searchParams.get("projectId") || null;

    const validPeriods: AnalyticsPeriod[] = ["7d", "30d", "90d", "all"];
    const period: AnalyticsPeriod = validPeriods.includes(periodParam as AnalyticsPeriod)
      ? (periodParam as AnalyticsPeriod)
      : "30d";

    const analytics = await getWorkspaceAnalytics({
      workspaceId,
      period,
      projectId,
    });

    return NextResponse.json(analytics, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("Failed to fetch workspace analytics:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load analytics data" },
      { status: 500 }
    );
  }
}

