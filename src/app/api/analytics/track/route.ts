import { NextResponse } from "next/server";
import { recordAnalyticsEvent } from "@/lib/analytics/tracker";
import { getClientIp } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || "";
    const body = await request.json();

    const { workspaceId, targetType, targetId, eventType = "VIEW", metadata } = body;

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: "targetType and targetId are required" },
        { status: 400 }
      );
    }

    if (targetType !== "FORM" && targetType !== "WIDGET") {
      return NextResponse.json(
        { error: "Invalid targetType: must be FORM or WIDGET" },
        { status: 400 }
      );
    }

    const validEventTypes = ["VIEW", "INTERACT", "VIDEO_PLAY"];
    const sanitizedEventType = validEventTypes.includes(eventType)
      ? eventType
      : "VIEW";

    const result = await recordAnalyticsEvent({
      workspaceId: workspaceId || "default",
      targetType,
      targetId,
      eventType: sanitizedEventType as "VIEW" | "INTERACT" | "VIDEO_PLAY",
      clientIp,
      userAgent,
      metadata,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    console.error("Error in analytics track API:", err);
    return NextResponse.json(
      { error: "Failed to record event" },
      { status: 500 }
    );
  }
}

