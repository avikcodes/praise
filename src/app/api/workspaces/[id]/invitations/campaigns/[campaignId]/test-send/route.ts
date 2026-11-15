import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { sendTestInvitationEmail } from "@/lib/email/campaign-service";

type RouteParams = {
  params: Promise<{ id: string; campaignId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId);

    const body = await request.json().catch(() => ({}));
    const toEmail = body.toEmail?.trim() || member.user.email;

    if (!toEmail) {
      return NextResponse.json(
        { error: "Recipient email address for test message is required." },
        { status: 400 },
      );
    }

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId, workspaceId },
      include: {
        form: { select: { title: true, slug: true } },
        workspace: { select: { name: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const result = await sendTestInvitationEmail({
      workspaceId,
      toEmail,
      subject: campaign.subject,
      bodyText: campaign.bodyText,
      formTitle: campaign.form.title,
      formSlug: campaign.form.slug,
      workspaceName: campaign.workspace.name,
      baseUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send test email" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${toEmail}`,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error("Failed to send test email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send test email" },
      { status: error.status || 500 },
    );
  }
}
