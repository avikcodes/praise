import crypto from "crypto";
import { prisma } from "../db/client.ts";
import {
  getRewardProvider,
  DEFAULT_REWARD_DISCLOSURE,
  type DeliverRewardParams,
} from "./provider.ts";
import {
  type WheelConfig,
  type WheelRewardOption,
  selectWeightedWheelOption,
  sanitizeWheelOptionsForClient,
  validateWheelConfig,
} from "./wheel.ts";

export interface CreateRewardProgramInput {
  workspaceId: string;
  name: string;
  description?: string;
  rewardType: "COUPON_CODE" | "REWARD_URL" | "DIGITAL_GIFT" | "MANUAL" | "EXTERNAL_PROVIDER" | string;
  couponCode?: string;
  rewardUrl?: string;
  digitalGiftUrl?: string;
  instructions?: string;
  disclosureText?: string;
  deliveryMethod?: "INSTANT_ON_SUBMISSION" | "MANUAL_REVIEW" | "EXTERNAL_DISPATCH" | string;
  providerType?: "BUILT_IN" | "MANUAL" | "GENERIC_WEBHOOK" | string;
  providerConfig?: Record<string, any>;
  isActive?: boolean;
  maxRewardsTotal?: number | null;
  formIds?: string[];
  wheelEnabled?: boolean;
  wheelConfig?: WheelConfig;
}

/**
 * Creates a new customer reward program.
 */
export async function createRewardProgram(input: CreateRewardProgramInput) {
  const {
    workspaceId,
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
  } = input;

  let validatedWheelJson: string | null = null;
  if (wheelEnabled && wheelConfig) {
    const check = validateWheelConfig(wheelConfig);
    if (check.valid && check.config) {
      validatedWheelJson = JSON.stringify(check.config);
    }
  }

  const program = await prisma.rewardProgram.create({
    data: {
      workspaceId,
      name: name.trim(),
      description: description?.trim() || null,
      rewardType,
      couponCode: couponCode?.trim() || null,
      rewardUrl: rewardUrl?.trim() || null,
      digitalGiftUrl: digitalGiftUrl?.trim() || null,
      instructions: instructions?.trim() || null,
      disclosureText: disclosureText?.trim() || DEFAULT_REWARD_DISCLOSURE,
      deliveryMethod,
      providerType,
      providerConfigJson: providerConfig ? JSON.stringify(providerConfig) : null,
      isActive,
      maxRewardsTotal: maxRewardsTotal || null,
      wheelEnabled: Boolean(wheelEnabled),
      wheelConfigJson: validatedWheelJson,
    },
  });

  // Link selected collection forms to this reward program
  if (formIds.length > 0) {
    await prisma.collectionForm.updateMany({
      where: {
        id: { in: formIds },
        workspaceId,
      },
      data: {
        rewardEnabled: true,
        rewardProgramId: program.id,
      },
    });
  }

  return program;
}

/**
 * Processes reward fulfillment for a submitted testimonial.
 * CRITICAL COMPLIANCE REQUIREMENT:
 * - Never require a positive rating or positive testimonial in exchange for a reward.
 * - Submissions with ANY rating (1 to 5 stars) or sentiment are completely eligible.
 * - Testimonial feedback is never rewritten or influenced.
 */
export async function processRewardForSubmission(params: {
  workspaceId: string;
  formId: string;
  testimonialId: string;
  customerId?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  formTitle?: string | null;
  workspaceName?: string | null;
}) {
  const {
    workspaceId,
    formId,
    testimonialId,
    customerId,
    recipientName,
    recipientEmail,
    recipientPhone,
    formTitle,
    workspaceName,
  } = params;

  // 1. Fetch form to verify if rewards are enabled and linked to an active program
  const form = await prisma.collectionForm.findUnique({
    where: { id: formId, workspaceId },
    include: {
      rewardProgram: true,
    },
  });

  if (!form || !form.rewardEnabled || !form.rewardProgram) {
    return null; // Rewards not enabled for this form
  }

  const program = form.rewardProgram;
  if (!program.isActive) {
    return null; // Program currently paused/disabled
  }

  // 2. Check maximum reward quota if defined
  if (program.maxRewardsTotal && program.claimsCount >= program.maxRewardsTotal) {
    return null; // Max rewards capacity reached
  }

  // 3. Spin-the-Wheel Selection Mode:
  // If the reward program has wheelEnabled: true and valid options,
  // we issue a unique claimToken and reserve a PENDING_SELECTION claim record.
  // The respondent can then spin the wheel or reveal directly on the thank-you screen.
  if (program.wheelEnabled && program.wheelConfigJson) {
    try {
      const parsedWheel = JSON.parse(program.wheelConfigJson);
      if (Array.isArray(parsedWheel.options) && parsedWheel.options.length >= 2) {
        const claimToken = crypto.randomUUID();

        const pendingClaim = await prisma.rewardClaim.create({
          data: {
            workspaceId,
            rewardProgramId: program.id,
            testimonialId,
            customerId: customerId || null,
            formId,
            recipientName: recipientName?.trim() || "Respondent",
            recipientEmail: recipientEmail?.trim() || null,
            recipientPhone: recipientPhone?.trim() || null,
            rewardType: "WHEEL_SELECTION",
            claimToken,
            isWheelSpin: true,
            status: "PENDING_SELECTION",
            deliveryMethod: "WHEEL",
          },
        });

        return {
          mode: "WHEEL",
          claimToken,
          claimId: pendingClaim.id,
          programName: program.name,
          wheelTitle: parsedWheel.title || "Spin the Appreciation Wheel",
          wheelDescription:
            parsedWheel.description ||
            "Every review qualifies for an appreciation reward. Spin to reveal your gift!",
          wheelOptions: sanitizeWheelOptionsForClient(parsedWheel.options),
          disclosureText: program.disclosureText || DEFAULT_REWARD_DISCLOSURE,
        };
      }
    } catch {
      // Fallback to standard delivery if wheel config is corrupted
    }
  }

  // 4. Resolve initial delivery status based on program delivery method
  const initialStatus =
    program.deliveryMethod === "INSTANT_ON_SUBMISSION"
      ? "DELIVERED"
      : program.deliveryMethod === "MANUAL_REVIEW"
      ? "PENDING"
      : "PENDING";

  // 4. Create the RewardClaim record associated with the testimonial and recipient
  const claim = await prisma.rewardClaim.create({
    data: {
      workspaceId,
      rewardProgramId: program.id,
      testimonialId,
      customerId: customerId || null,
      formId,
      recipientName: recipientName?.trim() || "Respondent",
      recipientEmail: recipientEmail?.trim() || null,
      recipientPhone: recipientPhone?.trim() || null,
      rewardType: program.rewardType,
      rewardCode: program.couponCode || null,
      rewardUrl: program.rewardUrl || program.digitalGiftUrl || null,
      status: initialStatus,
      deliveryMethod:
        program.deliveryMethod === "INSTANT_ON_SUBMISSION"
          ? "INSTANT"
          : program.deliveryMethod === "EXTERNAL_DISPATCH"
          ? "PROVIDER"
          : "MANUAL",
      deliveredAt: initialStatus === "DELIVERED" ? new Date() : null,
    },
  });

  // 5. Increment claims count on program
  await prisma.rewardProgram.update({
    where: { id: program.id },
    data: {
      claimsCount: { increment: 1 },
    },
  });

  // 6. Invoke provider adapter if external dispatch or instant built-in
  if (program.deliveryMethod === "EXTERNAL_DISPATCH" && program.providerType === "GENERIC_WEBHOOK") {
    const provider = getRewardProvider(program.providerType, program.providerConfigJson);
    const deliverParams: DeliverRewardParams = {
      claimId: claim.id,
      recipientName: claim.recipientName,
      recipientEmail: claim.recipientEmail,
      recipientPhone: claim.recipientPhone,
      rewardType: claim.rewardType,
      couponCode: program.couponCode,
      rewardUrl: program.rewardUrl || program.digitalGiftUrl,
      instructions: program.instructions,
      testimonialId,
      formTitle: formTitle || form.title,
      workspaceName: workspaceName || "Praise Workspace",
    };

    try {
      const result = await provider.deliver(deliverParams);
      await prisma.rewardClaim.update({
        where: { id: claim.id },
        data: {
          status: result.status,
          providerReference: result.providerReference,
          rewardCode: result.rewardCode || claim.rewardCode,
          rewardUrl: result.rewardUrl || claim.rewardUrl,
          deliveredAt: result.status === "DELIVERED" ? new Date() : null,
          errorMessage: result.error || null,
        },
      });
    } catch (err: any) {
      await prisma.rewardClaim.update({
        where: { id: claim.id },
        data: {
          status: "FAILED",
          errorMessage: err?.message || "External reward provider failure",
        },
      });
    }
  }

  // 7. Return customer-facing reward presentation payload
  return {
    claimId: claim.id,
    programName: program.name,
    description: program.description,
    rewardType: program.rewardType,
    couponCode: program.couponCode,
    rewardUrl: program.rewardUrl,
    digitalGiftUrl: program.digitalGiftUrl,
    instructions: program.instructions,
    disclosureText: program.disclosureText || DEFAULT_REWARD_DISCLOSURE,
    status: initialStatus,
    deliveryMethod: program.deliveryMethod,
  };
}

/**
 * Manually fulfills a pending reward claim.
 */
export async function deliverManualReward(params: {
  workspaceId: string;
  claimId: string;
  deliveredByUserId: string;
  rewardCode?: string;
  rewardUrl?: string;
  notes?: string;
}) {
  const { workspaceId, claimId, deliveredByUserId, rewardCode, rewardUrl, notes } = params;

  const claim = await prisma.rewardClaim.findUnique({
    where: { id: claimId, workspaceId },
  });

  if (!claim) {
    throw new Error("Reward claim not found.");
  }

  return prisma.rewardClaim.update({
    where: { id: claimId },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
      deliveredBy: deliveredByUserId,
      rewardCode: rewardCode?.trim() || claim.rewardCode,
      rewardUrl: rewardUrl?.trim() || claim.rewardUrl,
      metadataJson: notes ? JSON.stringify({ manualNotes: notes }) : claim.metadataJson,
    },
    include: {
      rewardProgram: true,
      testimonial: true,
      customer: true,
      form: true,
    },
  });
}

/**
 * Records redemption when a customer claims, clicks, or applies their reward.
 */
export async function trackRewardRedemption(claimId: string) {
  const claim = await prisma.rewardClaim.findUnique({
    where: { id: claimId },
  });

  if (!claim) {
    throw new Error("Reward claim not found.");
  }

  if (claim.status === "REDEEMED") {
    return claim; // already redeemed
  }

  return prisma.rewardClaim.update({
    where: { id: claimId },
    data: {
      status: "REDEEMED",
      redeemedAt: new Date(),
    },
  });
}

/**
 * Revokes an issued reward claim.
 */
export async function revokeRewardClaim(claimId: string, workspaceId: string, reason?: string) {
  const claim = await prisma.rewardClaim.findUnique({
    where: { id: claimId, workspaceId },
  });

  if (!claim) {
    throw new Error("Reward claim not found.");
  }

  return prisma.rewardClaim.update({
    where: { id: claimId },
    data: {
      status: "REVOKED",
      errorMessage: reason || "Revoked by workspace owner",
    },
  });
}

/**
 * Handles spinning the appreciation wheel or directly revealing the customer reward.
 *
 * PREVENTS DUPLICATE CLAIMS / TAMPERING:
 * 1. Requires valid one-time claimToken tied to a single testimonial submission.
 * 2. If claim has already been resolved or delivered, returns the existing reward.
 * 3. Selection is cryptographically computed on the server based on probability weights.
 */
export async function spinRewardWheel(params: {
  claimToken: string;
  forceReveal?: boolean;
}) {
  const { claimToken, forceReveal = false } = params;
  if (!claimToken || typeof claimToken !== "string") {
    throw new Error("A valid reward claim token is required.");
  }

  const claim = await prisma.rewardClaim.findUnique({
    where: { claimToken },
    include: {
      rewardProgram: true,
    },
  });

  if (!claim) {
    throw new Error("Invalid or expired reward claim token.");
  }

  const program = claim.rewardProgram;

  // PREVENT REPEATED REWARD CLAIMS / IDEMPOTENCY:
  // If the claim was already spun or delivered, return the existing reward without re-rolling!
  if (
    claim.selectedOptionId ||
    claim.status === "DELIVERED" ||
    (claim.status !== "PENDING_SELECTION" && claim.status !== "PENDING")
  ) {
    return {
      success: true,
      alreadyClaimed: true,
      winningOptionId: claim.selectedOptionId,
      rotationDegrees: 1800,
      reward: {
        claimId: claim.id,
        programName: program.name,
        label: claim.selectedOptionLabel || "Your Appreciation Reward",
        rewardType: claim.rewardType,
        couponCode: claim.rewardCode,
        rewardUrl: claim.rewardUrl,
        instructions: program.instructions,
        status: claim.status,
        disclosureText: program.disclosureText || DEFAULT_REWARD_DISCLOSURE,
      },
    };
  }

  if (!program.isActive) {
    throw new Error("This reward program is no longer active.");
  }

  if (program.maxRewardsTotal && program.claimsCount >= program.maxRewardsTotal) {
    throw new Error("The reward quota for this program has reached capacity.");
  }

  // Parse wheel configuration
  let options: WheelRewardOption[] = [];
  if (program.wheelConfigJson) {
    try {
      const parsed = JSON.parse(program.wheelConfigJson);
      if (Array.isArray(parsed.options)) {
        options = parsed.options;
      }
    } catch {
      // ignore parse error
    }
  }

  if (options.length < 2) {
    throw new Error("Reward program wheel options are incomplete.");
  }

  // Cryptographic server-side weighted selection
  const { winningOption, winningIndex, rotationDegrees } =
    selectWeightedWheelOption(options);

  const isManual = winningOption.rewardType === "MANUAL";
  const status = isManual ? "PENDING" : "DELIVERED";
  const code = winningOption.couponCode || null;
  const url = winningOption.rewardUrl || null;

  // Update claim with won reward
  const updatedClaim = await prisma.rewardClaim.update({
    where: { id: claim.id },
    data: {
      selectedOptionId: winningOption.id,
      selectedOptionLabel: winningOption.label,
      rewardType: winningOption.rewardType,
      rewardCode: code,
      rewardUrl: url,
      status,
      deliveredAt: status === "DELIVERED" ? new Date() : null,
    },
  });

  // Increment program claim count
  await prisma.rewardProgram.update({
    where: { id: program.id },
    data: {
      claimsCount: { increment: 1 },
    },
  });

  return {
    success: true,
    alreadyClaimed: false,
    winningOptionId: winningOption.id,
    winningIndex,
    rotationDegrees: forceReveal ? 0 : rotationDegrees,
    reward: {
      claimId: updatedClaim.id,
      programName: program.name,
      label: winningOption.label,
      description: winningOption.description,
      rewardType: winningOption.rewardType,
      couponCode: code,
      rewardUrl: url,
      instructions: winningOption.instructions || program.instructions,
      status,
      disclosureText: program.disclosureText || DEFAULT_REWARD_DISCLOSURE,
    },
  };
}
