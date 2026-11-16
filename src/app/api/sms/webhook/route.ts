import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { normalizePhoneNumber, suppressPhoneNumber } from "@/lib/sms/campaign-service";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let data: Record<string, any> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        data[key] = value.toString();
      });
    } else {
      data = await request.json().catch(() => ({}));
    }

    // Extract parameters from Twilio or generic SMS gateways
    // From: sender phone (inbound)
    // To: destination phone
    // Body: text message content
    // MessageSid or SmsSid: message ID
    // MessageStatus or SmsStatus: delivery callback status
    const fromPhone = data.From || data.from || data.sender;
    const bodyText = (data.Body || data.body || data.text || data.message || "").trim();
    const messageSid = data.MessageSid || data.SmsSid || data.messageId || data.id;
    const messageStatus = (data.MessageStatus || data.SmsStatus || data.status || "").toLowerCase();

    // 1. Inbound STOP/Opt-out detection
    const optOutKeywords = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
    const isOptOutReply = optOutKeywords.includes(bodyText.toUpperCase());

    if (fromPhone && isOptOutReply) {
      const normalizedPhone = normalizePhoneNumber(fromPhone) || fromPhone;

      // Find any workspace associated with recent campaigns for this number
      const recentRecipients = await prisma.smsRecipient.findMany({
        where: { phoneNumber: normalizedPhone },
        take: 10,
        orderBy: { createdAt: "desc" },
      });

      const workspaceIds = Array.from(new Set(recentRecipients.map((r) => r.workspaceId)));

      for (const wsId of workspaceIds) {
        await suppressPhoneNumber(
          wsId,
          normalizedPhone,
          "STOP_REPLY",
          `Opted out via inbound reply: "${bodyText}"`
        );
      }

      // Mark matching recipients as OPTED_OUT
      if (recentRecipients.length > 0) {
        await prisma.smsRecipient.updateMany({
          where: {
            phoneNumber: normalizedPhone,
            status: { in: ["PENDING", "SENT", "DELIVERED"] },
          },
          data: {
            status: "OPTED_OUT",
            errorMessage: `Opted out via inbound STOP reply`,
          },
        });
      }

      // Return standard TwiML response for Twilio or JSON
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have successfully unsubscribed and will receive no further messages.</Message></Response>`,
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    // 2. Status Callback Handling (e.g. Twilio / provider delivery updates)
    if (messageSid && messageStatus) {
      const recipient = await prisma.smsRecipient.findFirst({
        where: { providerMessageId: messageSid },
      });

      if (recipient) {
        if (messageStatus === "delivered" && recipient.status !== "DELIVERED" && recipient.status !== "SUBMITTED") {
          await prisma.smsRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "DELIVERED",
              deliveredAt: new Date(),
            },
          });
          await prisma.smsCampaign.update({
            where: { id: recipient.campaignId },
            data: {
              deliveredCount: { increment: 1 },
            },
          });
        } else if (["failed", "undelivered"].includes(messageStatus)) {
          const errorCode = data.ErrorCode || data.errorCode || "DELIVERY_FAILED";
          await prisma.smsRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "FAILED",
              errorMessage: `Provider reported status ${messageStatus} (${errorCode})`,
            },
          });
          await prisma.smsCampaign.update({
            where: { id: recipient.campaignId },
            data: {
              failedCount: { increment: 1 },
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error: any) {
    console.error("SMS webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process webhook" },
      { status: 500 }
    );
  }
}
