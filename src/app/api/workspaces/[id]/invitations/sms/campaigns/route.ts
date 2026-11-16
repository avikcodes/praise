import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { createSmsCampaign, normalizePhoneNumber } from "@/lib/sms/campaign-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const where: any = { workspaceId };
    if (search?.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }
    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }

    const campaigns = await prisma.smsCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        form: {
          select: { id: true, title: true, slug: true },
        },
        template: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    const stats = {
      totalCampaigns: campaigns.length,
      totalRecipients: campaigns.reduce((acc, c) => acc + c.totalRecipients, 0),
      totalSent: campaigns.reduce((acc, c) => acc + c.sentCount, 0),
      totalDelivered: campaigns.reduce((acc, c) => acc + c.deliveredCount, 0),
      totalClicked: campaigns.reduce((acc, c) => acc + c.clickedCount, 0),
      totalSubmitted: campaigns.reduce((acc, c) => acc + c.submittedCount, 0),
      totalFailed: campaigns.reduce((acc, c) => acc + c.failedCount, 0),
      totalOptOuts: campaigns.reduce((acc, c) => acc + c.optedOutCount, 0),
    };

    return NextResponse.json({
      success: true,
      campaigns,
      stats,
    });
  } catch (error: any) {
    console.error("Failed to fetch SMS campaigns:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch SMS campaigns" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const {
      name,
      formId,
      templateId,
      messageBody,
      recipients = [],
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Campaign name is required." },
        { status: 400 }
      );
    }

    if (!formId?.trim()) {
      return NextResponse.json(
        { error: "Collection form selection is required." },
        { status: 400 }
      );
    }

    if (!messageBody?.trim()) {
      return NextResponse.json(
        { error: "SMS message text is required." },
        { status: 400 }
      );
    }

    // Verify form belongs to workspace
    const form = await prisma.collectionForm.findUnique({
      where: { id: formId, workspaceId },
    });
    if (!form) {
      return NextResponse.json(
        { error: "Collection form not found in this workspace." },
        { status: 404 }
      );
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "At least one recipient phone number is required." },
        { status: 400 }
      );
    }

    // Format recipients
    const cleanRecipients = recipients
      .map((r: any) => ({
        phoneNumber: r.phoneNumber || r.phone || "",
        name: r.name || "",
        email: r.email || undefined,
        company: r.company || undefined,
        customerId: r.customerId || undefined,
      }))
      .filter((r) => Boolean(normalizePhoneNumber(r.phoneNumber)));

    if (cleanRecipients.length === 0) {
      return NextResponse.json(
        { error: "No valid phone numbers found. Please check country codes and formats." },
        { status: 400 }
      );
    }

    const campaign = await createSmsCampaign({
      workspaceId,
      createdById: member.user.id,
      name: name.trim(),
      messageBody: messageBody.trim(),
      formId,
      templateId: templateId || undefined,
      recipients: cleanRecipients,
    });

    return NextResponse.json(
      {
        success: true,
        campaign,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create SMS campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create SMS campaign" },
      { status: error.status || 500 }
    );
  }
}
