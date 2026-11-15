import { NextResponse } from "next/server";
import { processScheduledEmailCampaigns } from "@/lib/email/scheduler";

export async function GET(request: Request) {
  try {
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const report = await processScheduledEmailCampaigns({
      now: new Date(),
      baseUrl,
      limit: 50,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("Cron worker error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run cron scheduler" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
