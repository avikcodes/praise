import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

import { validateWheelConfig } from "@/lib/rewards/wheel";

type RouteParams = {
  params: Promise<{ id: string; programId: string }>;
};

function maskSecret(val: string | null | undefined): string | null {
  if (!val) return null;
  if (val.length <= 6) return "••••••••";
  return `${val.slice(0, 3)}••••••••${val.slice(-3)}`;
}

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, programId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const program = await prisma.rewardProgram.findUnique({
      where: { id: programId, workspaceId },
      include: {
        forms: {
          select: { id: true, title: true, slug: true },
        },
        _count: {
          select: { claims: true },
        },
      },
    });

    if (!program) {
      return NextResponse.json(
        { error: "Reward program not found." },
        { status: 404 }
      );
    }

    // Mask webhook secret if configured
    let sanitizedConfig: any = null;
    if (program.providerConfigJson) {
      try {
        const parsed = JSON.parse(program.providerConfigJson);
        sanitizedConfig = {
          webhookUrl: parsed.webhookUrl,
          authHeaderMasked: maskSecret(parsed.authHeader),
          hasSigningSecret: Boolean(parsed.signingSecret),
        };
      } catch {}
    }

    return NextResponse.json({
      success: true,
      program: {
        ...program,
        providerConfigSanitized: sanitizedConfig,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch reward program:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reward program" },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, programId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const program = await prisma.rewardProgram.findUnique({
      where: { id: programId, workspaceId },
    });

    if (!program) {
      return NextResponse.json(
        { error: "Reward program not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      rewardType,
      couponCode,
      rewardUrl,
      digitalGiftUrl,
      instructions,
      disclosureText,
      deliveryMethod,
      providerType,
      providerConfig,
      isActive,
      maxRewardsTotal,
      formIds,
      wheelEnabled,
      wheelConfig,
    } = body;

    const updateData: any = {};
    if (name?.trim()) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (rewardType) updateData.rewardType = rewardType;
    if (couponCode !== undefined) updateData.couponCode = couponCode?.trim() || null;
    if (rewardUrl !== undefined) updateData.rewardUrl = rewardUrl?.trim() || null;
    if (digitalGiftUrl !== undefined) updateData.digitalGiftUrl = digitalGiftUrl?.trim() || null;
    if (instructions !== undefined) updateData.instructions = instructions?.trim() || null;
    if (disclosureText !== undefined) updateData.disclosureText = disclosureText?.trim() || null;
    if (deliveryMethod) updateData.deliveryMethod = deliveryMethod;
    if (providerType) updateData.providerType = providerType;
    if (providerConfig !== undefined) updateData.providerConfigJson = providerConfig ? JSON.stringify(providerConfig) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (maxRewardsTotal !== undefined) updateData.maxRewardsTotal = maxRewardsTotal ? parseInt(maxRewardsTotal, 10) : null;
    if (wheelEnabled !== undefined) updateData.wheelEnabled = Boolean(wheelEnabled);
    if (wheelConfig !== undefined) {
      if (wheelConfig) {
        const check = validateWheelConfig(wheelConfig);
        if (check.valid && check.config) {
          updateData.wheelConfigJson = JSON.stringify(check.config);
        }
      } else {
        updateData.wheelConfigJson = null;
      }
    }

    const updated = await prisma.rewardProgram.update({
      where: { id: programId },
      data: updateData,
    });

    // Sync forms association if formIds is provided
    if (Array.isArray(formIds)) {
      // Disassociate forms not in formIds
      await prisma.collectionForm.updateMany({
        where: {
          workspaceId,
          rewardProgramId: programId,
          id: { notIn: formIds },
        },
        data: {
          rewardEnabled: false,
          rewardProgramId: null,
        },
      });

      // Associate forms in formIds
      if (formIds.length > 0) {
        await prisma.collectionForm.updateMany({
          where: {
            workspaceId,
            id: { in: formIds },
          },
          data: {
            rewardEnabled: true,
            rewardProgramId: programId,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      program: updated,
      message: "Reward program updated successfully.",
    });
  } catch (error: any) {
    console.error("Failed to update reward program:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update reward program" },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, programId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const program = await prisma.rewardProgram.findUnique({
      where: { id: programId, workspaceId },
    });

    if (!program) {
      return NextResponse.json(
        { error: "Reward program not found." },
        { status: 404 }
      );
    }

    // Detach from forms
    await prisma.collectionForm.updateMany({
      where: { workspaceId, rewardProgramId: programId },
      data: { rewardEnabled: false, rewardProgramId: null },
    });

    // Delete program (cascades claims)
    await prisma.rewardProgram.delete({
      where: { id: programId },
    });

    return NextResponse.json({
      success: true,
      message: "Reward program deleted successfully.",
    });
  } catch (error: any) {
    console.error("Failed to delete reward program:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete reward program" },
      { status: error.status || 500 }
    );
  }
}
