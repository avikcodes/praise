import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string; campaignId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const campaign = await prisma.smsCampaign.findUnique({
      where: { id: campaignId, workspaceId },
      include: {
        form: {
          select: { id: true, title: true, slug: true },
        },
        template: {
          select: { id: true, name: true, category: true, messageBody: true },
        },
        recipients: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "SMS Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    console.error("Failed to fetch SMS campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch SMS campaign" },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const campaign = await prisma.smsCampaign.findUnique({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "SMS Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft SMS campaigns can be edited." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, messageBody, formId, templateId } = body;

    const updated = await prisma.smsCampaign.update({
      where: { id: campaignId },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(messageBody?.trim() ? { messageBody: messageBody.trim() } : {}),
        ...(formId?.trim() ? { formId: formId.trim() } : {}),
        ...(templateId !== undefined ? { templateId: templateId || null } : {}),
      },
      include: {
        form: { select: { id: true, title: true, slug: true } },
        template: { select: { id: true, name: true, category: true } },
      },
    });

    return NextResponse.json({
      success: true,
      campaign: updated,
    });
  } catch (error: any) {
    console.error("Failed to update SMS campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update SMS campaign" },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, campaignId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const campaign = await prisma.smsCampaign.findUnique({
      where: { id: campaignId, workspaceId },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "SMS Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status === "SENDING") {
      return NextResponse.json(
        { error: "Cannot delete an active campaign currently in-flight." },
        { status: 400 }
      );
    }

    await prisma.smsCampaign.delete({
      where: { id: campaignId },
    });

    return NextResponse.json({
      success: true,
      message: "SMS Campaign deleted successfully.",
    });
  } catch (error: any) {
    console.error("Failed to delete SMS campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete SMS campaign" },
      { status: error.status || 500 }
    );
  }
}
