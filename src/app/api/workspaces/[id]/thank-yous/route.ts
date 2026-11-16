import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { getThankYous, sendCustomerThankYou } from "@/lib/rewards/thank-you-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const testimonialId = searchParams.get("testimonialId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const channel = searchParams.get("channel") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;

    const result = await getThankYous(workspaceId, {
      testimonialId,
      customerId,
      channel,
      limit,
    });

    return NextResponse.json({
      success: true,
      records: result.records,
      count: result.count,
    });
  } catch (error: any) {
    console.error("Failed to fetch thank you notes:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch thank you records" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const {
      testimonialId,
      customerId,
      recipientName,
      recipientEmail,
      subject,
      message,
      channel = "EMAIL",
      videoUrl,
      videoAssetId,
    } = body;

    if (!recipientName?.trim()) {
      return NextResponse.json(
        { error: "Recipient name is required." },
        { status: 400 }
      );
    }

    if (!subject?.trim()) {
      return NextResponse.json(
        { error: "Subject line is required." },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Thank-you message body is required." },
        { status: 400 }
      );
    }

    if (channel === "EMAIL" && !recipientEmail?.trim()) {
      return NextResponse.json(
        { error: "Recipient email is required for email thank-yous." },
        { status: 400 }
      );
    }

    const record = await sendCustomerThankYou({
      workspaceId,
      testimonialId: testimonialId || null,
      customerId: customerId || null,
      recipientName: recipientName.trim(),
      recipientEmail: recipientEmail?.trim() || null,
      subject: subject.trim(),
      message: message.trim(),
      channel,
      videoUrl: videoUrl?.trim() || null,
      videoAssetId: videoAssetId || null,
      sentByUserId: member.user.id,
      sentByName: member.user?.name || "Workspace Staff",
    });

    return NextResponse.json(
      {
        success: true,
        record,
        message:
          channel === "EMAIL"
            ? "Thank-you email sent successfully."
            : "Customer appreciation record logged.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to send customer thank-you:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process thank-you" },
      { status: error.status || 500 }
    );
  }
}
