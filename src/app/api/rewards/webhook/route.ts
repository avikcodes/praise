import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let data: any = {};
    try {
      data = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Extract claim identifier and provider status
    // event e.g. "reward.delivered", "reward.redeemed", "reward.failed"
    const event = data.event || data.type || "";
    const claimId = data.claimId || data.referenceId || data.id;
    const providerReference = data.providerReference || data.rewardId;
    const rewardCode = data.code || data.rewardCode;
    const rewardUrl = data.url || data.rewardUrl;
    const status = data.status?.toUpperCase() || (event.includes("redeemed") ? "REDEEMED" : "DELIVERED");

    if (!claimId && !providerReference) {
      return NextResponse.json(
        { error: "Missing claimId or providerReference identifier." },
        { status: 400 }
      );
    }

    const claim = await prisma.rewardClaim.findFirst({
      where: {
        OR: [
          ...(claimId ? [{ id: claimId }] : []),
          ...(providerReference ? [{ providerReference }] : []),
        ],
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: "Reward claim not found." },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (["DELIVERED", "REDEEMED", "FAILED", "REVOKED"].includes(status)) {
      updateData.status = status;
      if (status === "DELIVERED" && !claim.deliveredAt) {
        updateData.deliveredAt = new Date();
      }
      if (status === "REDEEMED" && !claim.redeemedAt) {
        updateData.redeemedAt = new Date();
      }
    }
    if (rewardCode) updateData.rewardCode = rewardCode;
    if (rewardUrl) updateData.rewardUrl = rewardUrl;

    const updated = await prisma.rewardClaim.update({
      where: { id: claim.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      claimId: updated.id,
      status: updated.status,
    });
  } catch (error: any) {
    console.error("External reward webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process reward webhook" },
      { status: 500 }
    );
  }
}
