import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { sendTestSms } from "@/lib/sms/campaign-service";

type RouteParams = {
  params: Promise<{ id: string; campaignId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { toPhone, messageBody } = body;

    if (!toPhone?.trim()) {
      return NextResponse.json(
        { error: "Destination phone number is required for test send." },
        { status: 400 }
      );
    }

    const campaign = await prisma.smsCampaign.findUnique({
      where: { id: campaignId, workspaceId },
      include: {
        form: { select: { title: true, slug: true } },
        workspace: { select: { name: true } },
      },
    });

    const textToSend = messageBody?.trim() || campaign?.messageBody;
    if (!textToSend) {
      return NextResponse.json(
        { error: "SMS message text is required." },
        { status: 400 }
      );
    }

    const result = await sendTestSms({
      workspaceId,
      toPhone: toPhone.trim(),
      messageBody: textToSend,
      formTitle: campaign?.form?.title,
      formSlug: campaign?.form?.slug,
      workspaceName: campaign?.workspace?.name,
    });

    return NextResponse.json({
      success: true,
      result,
      message: `Test SMS sent to ${toPhone}. (${result.segments.segmentCount} segment(s), ${result.segments.encoding})`,
    });
  } catch (error: any) {
    console.error("Failed to send test SMS:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send test SMS" },
      { status: error.status || 500 }
    );
  }
}
