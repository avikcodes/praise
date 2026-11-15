import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { processScheduledEmailCampaigns } from "@/lib/email/scheduler";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const report = await processScheduledEmailCampaigns({
      now: new Date(),
      baseUrl,
      limit: 25,
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("Failed to run campaign scheduler:", error);
    return NextResponse.json(
      { error: error.message || "Scheduler execution failed" },
      { status: error.status || 500 },
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  return GET(request, context);
}
