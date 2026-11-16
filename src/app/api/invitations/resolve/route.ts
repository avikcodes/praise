import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token?.trim()) {
      return NextResponse.json(
        { error: "Invitation token is required." },
        { status: 400 },
      );
    }

    const recipient = await prisma.invitationRecipient.findUnique({
      where: { token: token.trim() },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            workspaceId: true,
            form: {
              select: {
                id: true,
                slug: true,
                title: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            title: true,
            avatarUrl: true,
            socialHandle: true,
          },
        },
      },
    });

    if (recipient) {
      // Mark as CLICKED/OPENED if not yet submitted
      if (recipient.status === "DELIVERED" || recipient.status === "SENT" || recipient.status === "PENDING") {
        await prisma.invitationRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "CLICKED",
            clickedAt: recipient.clickedAt || new Date(),
            openedAt: recipient.openedAt || new Date(),
          },
        });

        // Increment campaign clicked count
        await prisma.emailCampaign.update({
          where: { id: recipient.campaignId },
          data: {
            clickedCount: { increment: 1 },
            openedCount: recipient.openedAt ? undefined : { increment: 1 },
          },
        });
      }

      return NextResponse.json({
        success: true,
        type: "EMAIL",
        recipient: {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          company: recipient.company,
          title: recipient.title,
          token: recipient.token,
          status: recipient.status,
        },
        form: recipient.campaign.form,
        campaign: {
          id: recipient.campaign.id,
          name: recipient.campaign.name,
        },
      });
    }

    // Check if token belongs to an SMS invitation recipient
    const smsRecipient = await prisma.smsRecipient.findUnique({
      where: { token: token.trim() },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            workspaceId: true,
            form: {
              select: {
                id: true,
                slug: true,
                title: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            company: true,
            title: true,
            avatarUrl: true,
            socialHandle: true,
          },
        },
      },
    });

    if (!smsRecipient) {
      return NextResponse.json(
        { error: "Invitation link is invalid or has expired." },
        { status: 404 },
      );
    }

    // Mark SMS recipient as CLICKED
    if (smsRecipient.status === "DELIVERED" || smsRecipient.status === "SENT" || smsRecipient.status === "PENDING") {
      await prisma.smsRecipient.update({
        where: { id: smsRecipient.id },
        data: {
          status: "CLICKED",
          clickedAt: smsRecipient.clickedAt || new Date(),
        },
      });

      await prisma.smsCampaign.update({
        where: { id: smsRecipient.campaignId },
        data: {
          clickedCount: { increment: 1 },
        },
      });
    }

    return NextResponse.json({
      success: true,
      type: "SMS",
      recipient: {
        id: smsRecipient.id,
        name: smsRecipient.name,
        email: smsRecipient.customer?.email || null,
        company: smsRecipient.customer?.company || null,
        phoneNumber: smsRecipient.phoneNumber,
        token: smsRecipient.token,
        status: smsRecipient.status,
      },
      form: smsRecipient.campaign.form,
      campaign: {
        id: smsRecipient.campaign.id,
        name: smsRecipient.campaign.name,
      },
    });
  } catch (error: any) {
    console.error("Failed to resolve invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resolve invitation" },
      { status: 500 },
    );
  }
}
