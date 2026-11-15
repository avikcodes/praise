import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { scheduleCampaign } from "@/lib/email/scheduler";

type RouteParams = {
  params: Promise<{ id: string; campaignId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { scheduledAt, timezone = "UTC", recurringInterval = "NONE", confirmed } = body;

    if (!confirmed) {
      return NextResponse.json(
        {
          error:
            "Explicit campaign approval is required. Please confirm before scheduling.",
        },
        { status: 400 },
      );
    }

    if (!scheduledAt) {
      return NextResponse.json(
        { error: "Scheduled delivery date and time is required." },
        { status: 400 },
      );
    }

    const parsedDate = new Date(scheduledAt);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid scheduled date format." },
        { status: 400 },
      );
    }

    const campaign = await scheduleCampaign({
      workspaceId,
      campaignId,
      scheduledAt: parsedDate,
      timezone,
      recurringInterval,
      confirmedByUserId: member.user.id,
      confirmedByUserName: member.user.name || "Owner",
    });

    return NextResponse.json({
      success: true,
      message: `Campaign scheduled for ${parsedDate.toISOString()} (${timezone})`,
      campaign,
    });
  } catch (error: any) {
    console.error("Failed to schedule campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to schedule campaign" },
      { status: error.status || 500 },
    );
  }
}
