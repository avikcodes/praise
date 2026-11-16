import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { suppressPhoneNumber } from "@/lib/sms/campaign-service";

type RouteParams = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { token } = await context.params;

    if (!token?.trim()) {
      return new NextResponse(
        `<!DOCTYPE html><html><body><h3>Invalid Opt-out Token</h3><p>The unsubscribe link is missing or invalid.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    const recipient = await prisma.smsRecipient.findUnique({
      where: { token: token.trim() },
      include: {
        workspace: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    if (!recipient) {
      return new NextResponse(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:500px;margin:50px auto;text-align:center;">
          <h2>Link Expired or Not Found</h2>
          <p>This SMS opt-out link is no longer valid or has already been processed.</p>
        </body></html>`,
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    // Suppress phone number workspace-wide
    await suppressPhoneNumber(
      recipient.workspaceId,
      recipient.phoneNumber,
      "LINK_CLICK_OPTOUT",
      `Opted out via web link from campaign ${recipient.campaign.name}`
    );

    // Update recipient status if not already opted out
    if (recipient.status !== "OPTED_OUT") {
      await prisma.smsRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "OPTED_OUT",
          errorMessage: "Recipient opted out via web link",
        },
      });

      await prisma.smsCampaign.update({
        where: { id: recipient.campaignId },
        data: {
          optedOutCount: { increment: 1 },
        },
      });
    }

    const accept = request.headers.get("accept") || "";
    if (accept.includes("application/json")) {
      return NextResponse.json({
        success: true,
        message: `Successfully unsubscribed ${recipient.phoneNumber} from SMS invitations.`,
        phoneNumber: recipient.phoneNumber,
      });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SMS Opt-out Confirmed - Praise</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 36px 28px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
    .icon { width: 56px; height: 56px; background: #064e3b; color: #34d399; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; font-size: 26px; }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 10px 0; color: #f1f5f9; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0; }
    .badge { display: inline-block; background: #334155; color: #e2e8f0; font-family: monospace; font-size: 13px; padding: 6px 14px; border-radius: 6px; margin-bottom: 20px; }
    .footer { font-size: 12px; color: #64748b; border-top: 1px solid #334155; pt: 16px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>You have been unsubscribed</h1>
    <div class="badge">${recipient.phoneNumber}</div>
    <p>You have successfully opted out of receiving SMS testimonial invitations from <strong>${recipient.workspace.name}</strong>. You will not receive further text messages.</p>
    <div class="footer">Praise Compliance & Consent Protection</div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error: any) {
    console.error("Failed to process SMS optout:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request, context: RouteParams) {
  return GET(request, context);
}
