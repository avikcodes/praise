import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { trackRewardRedemption } from "@/lib/rewards/service";

type RouteParams = {
  params: Promise<{ claimId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { claimId } = await context.params;

    const claim = await prisma.rewardClaim.findUnique({
      where: { id: claimId },
      include: {
        rewardProgram: {
          select: { name: true, description: true, instructions: true, rewardType: true },
        },
        workspace: {
          select: { name: true },
        },
      },
    });

    if (!claim) {
      return new NextResponse(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:50px;">
          <h2>Reward Link Not Found</h2>
          <p>This reward link is invalid or has expired.</p>
        </body></html>`,
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    // Mark as REDEEMED
    await trackRewardRedemption(claimId);

    // If destination URL exists (e.g. digital gift link or external perk URL), redirect there
    if (claim.rewardUrl) {
      return NextResponse.redirect(claim.rewardUrl);
    }

    const accept = request.headers.get("accept") || "";
    if (accept.includes("application/json")) {
      return NextResponse.json({
        success: true,
        status: "REDEEMED",
        claim: {
          id: claim.id,
          rewardType: claim.rewardType,
          rewardCode: claim.rewardCode,
          rewardUrl: claim.rewardUrl,
          recipientName: claim.recipientName,
        },
      });
    }

    // Render redemption display page for coupon codes
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reward Redeemed - ${claim.rewardProgram?.name || "Praise"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); }
    .icon { width: 56px; height: 56px; background: #064e3b; color: #34d399; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; font-size: 26px; }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px 0; color: #f1f5f9; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0; }
    .code-box { background: #0f172a; border: 1px dashed #64748b; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
    .code-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 6px; }
    .code-val { font-family: monospace; font-size: 20px; font-weight: 700; color: #38bdf8; letter-spacing: 0.1em; }
    .instructions { font-size: 13px; color: #cbd5e1; text-align: left; background: #334155/40; padding: 14px; border-radius: 8px; margin-bottom: 20px; }
    .footer { font-size: 11px; color: #64748b; border-top: 1px solid #334155; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎁</div>
    <h1>${claim.rewardProgram?.name || "Your Reward"}</h1>
    <p>Thank you for sharing your feedback with <strong>${claim.workspace.name}</strong>!</p>
    ${
      claim.rewardCode
        ? `<div class="code-box">
             <div class="code-label">Your Reward / Promo Code</div>
             <div class="code-val">${claim.rewardCode}</div>
           </div>`
        : ""
    }
    ${
      claim.rewardProgram?.instructions
        ? `<div class="instructions"><strong>Redemption Instructions:</strong><br />${claim.rewardProgram.instructions}</div>`
        : ""
    }
    <div class="footer">Status: Redeemed · Praise Reward Verification</div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error: any) {
    console.error("Redemption error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { claimId } = await context.params;
    const claim = await trackRewardRedemption(claimId);

    return NextResponse.json({
      success: true,
      status: claim.status,
      redeemedAt: claim.redeemedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to redeem reward" },
      { status: 500 }
    );
  }
}
