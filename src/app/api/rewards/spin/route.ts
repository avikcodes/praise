import { NextRequest, NextResponse } from "next/server";
import { spinRewardWheel } from "@/lib/rewards/service";

/**
 * Public Endpoint: Spin Appreciation Wheel / Reveal Reward
 *
 * Guaranteed Safety & Compliance:
 * - Single-use token per testimonial submission prevents repeated reward claims.
 * - Server-side cryptographically secure weighted selection protects against manipulation.
 * - Returns winning angle, index, and full reward details.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { claimToken, forceReveal } = body;

    if (!claimToken || typeof claimToken !== "string") {
      return NextResponse.json(
        { error: "A valid claim token is required." },
        { status: 400 }
      );
    }

    const result = await spinRewardWheel({
      claimToken,
      forceReveal: Boolean(forceReveal),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("Spin reward wheel error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to reveal reward.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
