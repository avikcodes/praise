import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  getWorkspaceCampaignAnalytics,
  generateCampaignCsv,
  generateRecipientCsv,
} from "@/lib/analytics/campaign-tracker";
import { AnalyticsPeriod, CampaignChannel } from "@/lib/analytics/types";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "30d";
    const channelParam = (searchParams.get("channel") || "ALL").toUpperCase();
    const projectId = searchParams.get("projectId") || null;
    const startDate = searchParams.get("startDate") || null;
    const endDate = searchParams.get("endDate") || null;
    const campaignId = searchParams.get("campaignId") || null;
    const exportFormat = searchParams.get("export") || null;

    const validPeriods: AnalyticsPeriod[] = ["7d", "30d", "90d", "all", "custom"];
    const period: AnalyticsPeriod = validPeriods.includes(periodParam as AnalyticsPeriod)
      ? (periodParam as AnalyticsPeriod)
      : "30d";

    const validChannels: CampaignChannel[] = ["ALL", "EMAIL", "SMS"];
    const channel: CampaignChannel = validChannels.includes(channelParam as CampaignChannel)
      ? (channelParam as CampaignChannel)
      : "ALL";

    const analytics = await getWorkspaceCampaignAnalytics({
      workspaceId,
      period,
      channel,
      projectId,
      startDate,
      endDate,
      campaignId,
    });

    // Handle CSV Export requests
    if (exportFormat === "csv") {
      const csvData = generateCampaignCsv(analytics.campaigns);
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="praise-campaign-analytics-${period}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (exportFormat === "recipients-csv") {
      const csvData = generateRecipientCsv(analytics.recipients);
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="praise-recipients-audit-${period}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(analytics, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("Failed to fetch campaign analytics:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load campaign analytics" },
      { status: 500 }
    );
  }
}
