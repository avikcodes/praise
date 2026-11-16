import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { createRewardProgram } from "@/lib/rewards/service";
import { DEFAULT_REWARD_DISCLOSURE } from "@/lib/rewards/provider";

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
    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    const [programs, allClaims] = await Promise.all([
      prisma.rewardProgram.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          forms: {
            select: { id: true, title: true, slug: true },
          },
          _count: {
            select: { claims: true },
          },
        },
      }),
      prisma.rewardClaim.findMany({
        where: { workspaceId },
        select: { status: true },
      }),
    ]);

    const stats = {
      totalPrograms: programs.length,
      activePrograms: programs.filter((p) => p.isActive).length,
      totalClaims: allClaims.length,
      deliveredClaims: allClaims.filter((c) => c.status === "DELIVERED" || c.status === "REDEEMED").length,
      redeemedClaims: allClaims.filter((c) => c.status === "REDEEMED").length,
      pendingClaims: allClaims.filter((c) => c.status === "PENDING").length,
    };

    return NextResponse.json({
      success: true,
      programs,
      stats,
    });
  } catch (error: any) {
    console.error("Failed to fetch reward programs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reward programs" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const {
      name,
      description,
      rewardType = "COUPON_CODE",
      couponCode,
      rewardUrl,
      digitalGiftUrl,
      instructions,
      disclosureText = DEFAULT_REWARD_DISCLOSURE,
      deliveryMethod = "INSTANT_ON_SUBMISSION",
      providerType = "BUILT_IN",
      providerConfig,
      isActive = true,
      maxRewardsTotal,
      formIds = [],
      wheelEnabled = false,
      wheelConfig,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Reward program name is required." },
        { status: 400 }
      );
    }

    if (!wheelEnabled) {
      if (rewardType === "COUPON_CODE" && !couponCode?.trim() && deliveryMethod === "INSTANT_ON_SUBMISSION") {
        return NextResponse.json(
          { error: "Coupon code is required for instant coupon delivery." },
          { status: 400 }
        );
      }

      if ((rewardType === "REWARD_URL" || rewardType === "DIGITAL_GIFT") && !rewardUrl?.trim() && !digitalGiftUrl?.trim() && deliveryMethod === "INSTANT_ON_SUBMISSION") {
        return NextResponse.json(
          { error: "Reward URL or digital gift download link is required for instant delivery." },
          { status: 400 }
        );
      }
    }

    const program = await createRewardProgram({
      workspaceId,
      name: name.trim(),
      description: description?.trim(),
      rewardType,
      couponCode: couponCode?.trim(),
      rewardUrl: rewardUrl?.trim(),
      digitalGiftUrl: digitalGiftUrl?.trim(),
      instructions: instructions?.trim(),
      disclosureText: disclosureText?.trim() || DEFAULT_REWARD_DISCLOSURE,
      deliveryMethod,
      providerType,
      providerConfig,
      isActive: Boolean(isActive),
      maxRewardsTotal: maxRewardsTotal ? parseInt(maxRewardsTotal, 10) : null,
      formIds,
      wheelEnabled: Boolean(wheelEnabled),
      wheelConfig,
    });

    return NextResponse.json(
      {
        success: true,
        program,
        message: "Reward program created successfully.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create reward program:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create reward program" },
      { status: error.status || 500 }
    );
  }
}
