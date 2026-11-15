import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { suppressEmail } from "@/lib/email/campaign-service";

type RouteParams = {
  params: Promise<{ token: string }>;
};

async function processUnsubscribe(token: string) {
  const recipient = await prisma.invitationRecipient.findUnique({
    where: { token },
    include: {
      campaign: {
        select: { id: true, name: true, workspaceId: true },
      },
      workspace: {
        select: { id: true, name: true },
      },
    },
  });

  if (!recipient) {
    return { success: false, error: "Invalid or expired invitation token." };
  }

  // Add to suppression
  await suppressEmail(
    recipient.workspaceId,
    recipient.email,
    "UNSUBSCRIBE",
    `Unsubscribed via campaign "${recipient.campaign.name}"`,
  );

  // Update recipient status
  await prisma.invitationRecipient.update({
    where: { id: recipient.id },
    data: {
      status: "UNSUBSCRIBED",
      errorMessage: "Unsubscribed by recipient",
    },
  });

  // Increment campaign unsubscribed count
  await prisma.emailCampaign.update({
    where: { id: recipient.campaignId },
    data: {
      unsubscribedCount: { increment: 1 },
    },
  });

  return {
    success: true,
    email: recipient.email,
    workspaceName: recipient.workspace.name,
  };
}

export async function GET(request: Request, context: RouteParams) {
  try {
    const { token } = await context.params;
    const result = await processUnsubscribe(token);

    const acceptsJson = request.headers.get("accept")?.includes("application/json");
    if (acceptsJson) {
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: `Successfully unsubscribed ${result.email} from future invitations.`,
      });
    }

    // Render clean, respectful HTML confirmation page
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribe Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 2.5rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #ecfdf5;
      color: #059669;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    p {
      color: #64748b;
      line-height: 1.5;
      font-size: 0.95rem;
      margin-bottom: 1.5rem;
    }
    .email-box {
      background: #f1f5f9;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 1.5rem;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    </div>
    <h1>Unsubscribed Successfully</h1>
    <div class="email-box">${result.email || "Your email"}</div>
    <p>You have been removed from testimonial invitations from <strong>${result.workspaceName || "this workspace"}</strong>. We respect your preferences and will not send further invitation emails to this address.</p>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("Failed to process unsubscribe:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process unsubscribe" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { token } = await context.params;
    const result = await processUnsubscribe(token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully unsubscribed ${result.email} from future invitations.`,
    });
  } catch (error: any) {
    console.error("Failed to process unsubscribe:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process unsubscribe" },
      { status: 500 },
    );
  }
}
