import { NextResponse } from "next/server";
import { recordAnalyticsEvent, AnalyticsEventType } from "@/lib/analytics/tracker";
import { getClientIp } from "@/lib/security/rate-limit";

const VALID_TARGET_TYPES = ["FORM", "WIDGET", "TESTIMONIAL", "VIDEO"] as const;
const VALID_EVENT_TYPES: AnalyticsEventType[] = [
  "IMPRESSION",
  "VIEW",
  "INTERACTION",
  "CTA_CLICK",
  "TESTIMONIAL_CLICK",
  "VIDEO_PLAY",
  "VIDEO_PROGRESS",
  "VIDEO_COMPLETE",
];

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || "";
    
    // Support JSON body or standard Beacon payloads
    let body: Record<string, any> = {};
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await request.json().catch(() => ({}));
    } else {
      const text = await request.text().catch(() => "");
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const {
      workspaceId,
      targetType = "WIDGET",
      targetId,
      testimonialId,
      eventType = "VIEW",
      metadata,
    } = body;

    if (!targetId) {
      return NextResponse.json(
        { error: "targetId is required" },
        { status: 400 }
      );
    }

    const sanitizedTargetType = VALID_TARGET_TYPES.includes(targetType)
      ? targetType
      : "WIDGET";

    // Normalize event type (e.g. "INTERACT" -> "INTERACTION")
    let normalizedEvent: AnalyticsEventType = "VIEW";
    if (eventType === "INTERACT") {
      normalizedEvent = "INTERACTION";
    } else if (VALID_EVENT_TYPES.includes(eventType as AnalyticsEventType)) {
      normalizedEvent = eventType as AnalyticsEventType;
    }

    const result = await recordAnalyticsEvent({
      workspaceId: workspaceId || "default",
      targetType: sanitizedTargetType,
      targetId: String(targetId),
      testimonialId: testimonialId ? String(testimonialId) : null,
      eventType: normalizedEvent,
      clientIp,
      userAgent,
      metadata: typeof metadata === "object" && metadata !== null ? metadata : undefined,
    });

    return NextResponse.json(
      { success: true, ...result },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (err: unknown) {
    console.error("Error in analytics track API:", err);
    return NextResponse.json(
      { error: "Failed to record event" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
