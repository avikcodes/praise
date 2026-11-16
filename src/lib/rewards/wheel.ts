import crypto from "crypto";

export interface WheelRewardOption {
  id: string;
  label: string;
  rewardType: "COUPON_CODE" | "REWARD_URL" | "DIGITAL_GIFT" | "MANUAL" | string;
  couponCode?: string | null;
  rewardUrl?: string | null;
  description?: string | null;
  instructions?: string | null;
  probabilityWeight: number; // e.g., 40
  color: string;
}

export interface WheelConfig {
  enabled: boolean;
  title?: string;
  description?: string;
  options: WheelRewardOption[];
}

export const DEFAULT_WHEEL_PALETTE = [
  "#2563EB", // Blue
  "#059669", // Emerald
  "#7C3AED", // Violet
  "#D97706", // Amber
  "#DC2626", // Rose
  "#0D9488", // Teal
  "#4F46E5", // Indigo
  "#E11D48", // Pink
];

export const STARTER_WHEEL_OPTIONS: WheelRewardOption[] = [
  {
    id: "opt-1",
    label: "15% Off Order",
    rewardType: "COUPON_CODE",
    couponCode: "HONEST15",
    description: "15% discount on your next order",
    probabilityWeight: 40,
    color: "#2563EB",
  },
  {
    id: "opt-2",
    label: "Resource Guide",
    rewardType: "DIGITAL_GIFT",
    rewardUrl: "https://example.com/guide.pdf",
    description: "Exclusive downloadable customer guide",
    probabilityWeight: 30,
    color: "#059669",
  },
  {
    id: "opt-3",
    label: "25% VIP Discount",
    rewardType: "COUPON_CODE",
    couponCode: "VIP25",
    description: "25% off storewide coupon",
    probabilityWeight: 20,
    color: "#7C3AED",
  },
  {
    id: "opt-4",
    label: "Hand-Packed Swag",
    rewardType: "MANUAL",
    description: "Custom team appreciation gift pack",
    probabilityWeight: 10,
    color: "#D97706",
  },
];

/**
 * Validates wheel configuration and ensures probabilities and options are sound.
 */
export function validateWheelConfig(raw: unknown): {
  valid: boolean;
  error?: string;
  config?: WheelConfig;
} {
  if (!raw || typeof raw !== "object") {
    return { valid: false, error: "Wheel configuration must be an object." };
  }

  const data = raw as Partial<WheelConfig>;
  if (!Array.isArray(data.options) || data.options.length < 2) {
    return {
      valid: false,
      error: "The appreciation wheel requires at least 2 distinct reward options.",
    };
  }

  if (data.options.length > 12) {
    return {
      valid: false,
      error: "The appreciation wheel supports a maximum of 12 options.",
    };
  }

  const cleanOptions: WheelRewardOption[] = [];
  for (let i = 0; i < data.options.length; i++) {
    const opt = data.options[i];
    if (!opt.label || !opt.label.trim()) {
      return {
        valid: false,
        error: `Option #${i + 1} must have a non-empty label.`,
      };
    }

    const weight = Number(opt.probabilityWeight);
    if (isNaN(weight) || weight <= 0) {
      return {
        valid: false,
        error: `Option "${opt.label}" must have a positive probability weight.`,
      };
    }

    cleanOptions.push({
      id: opt.id || `opt-${i + 1}-${Date.now()}`,
      label: opt.label.trim(),
      rewardType: opt.rewardType || "COUPON_CODE",
      couponCode: opt.couponCode?.trim() || null,
      rewardUrl: opt.rewardUrl?.trim() || null,
      description: opt.description?.trim() || null,
      instructions: opt.instructions?.trim() || null,
      probabilityWeight: weight,
      color:
        opt.color?.trim() ||
        DEFAULT_WHEEL_PALETTE[i % DEFAULT_WHEEL_PALETTE.length],
    });
  }

  return {
    valid: true,
    config: {
      enabled: Boolean(data.enabled),
      title: data.title?.trim() || "Spin for Your Appreciation Reward",
      description:
        data.description?.trim() ||
        "Every honest review qualifies for an appreciation gift. Spin the wheel or reveal your reward directly.",
      options: cleanOptions,
    },
  };
}

/**
 * Strips secret coupon codes and reward URLs from wheel options before sending to client,
 * preventing respondents from inspecting or spoofing unearned rewards.
 */
export function sanitizeWheelOptionsForClient(options: WheelRewardOption[]) {
  const totalWeight = options.reduce(
    (sum, opt) => sum + (Number(opt.probabilityWeight) || 0),
    0
  );

  return options.map((opt, index) => {
    const weight = Number(opt.probabilityWeight) || 0;
    const probabilityPercent =
      totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;

    return {
      id: opt.id || `opt-${index}`,
      index,
      label: opt.label,
      description: opt.description || null,
      rewardType: opt.rewardType,
      probabilityWeight: weight,
      probabilityPercent,
      color: opt.color || DEFAULT_WHEEL_PALETTE[index % DEFAULT_WHEEL_PALETTE.length],
    };
  });
}

/**
 * Cryptographically weighted server-side random selection.
 * Calculates rotation degrees so the pointer at 270 degrees (top center) aligns exactly
 * with the center of the chosen slice.
 */
export function selectWeightedWheelOption(options: WheelRewardOption[]): {
  winningOption: WheelRewardOption;
  winningIndex: number;
  totalWeight: number;
  rotationDegrees: number;
} {
  if (options.length === 0) {
    throw new Error("No wheel options available for selection.");
  }

  const totalWeight = options.reduce(
    (sum, opt) => sum + (Number(opt.probabilityWeight) || 0),
    0
  );

  if (totalWeight <= 0) {
    throw new Error("Total probability weight must be greater than zero.");
  }

  // Cryptographically secure integer selection in [0, totalWeight - 1]
  const randomPick = crypto.randomInt(0, totalWeight);

  let accumulated = 0;
  let winningIndex = 0;

  for (let i = 0; i < options.length; i++) {
    accumulated += Number(options[i].probabilityWeight) || 0;
    if (randomPick < accumulated) {
      winningIndex = i;
      break;
    }
  }

  const winningOption = options[winningIndex];

  // Rotation calculation:
  // With N slices, each slice has sliceAngle = 360 / N.
  // In standard SVG rendering:
  // Slice 0 starts at angle 0° to sliceAngle.
  // Slice i starts at i * sliceAngle, center at (i + 0.5) * sliceAngle.
  // The wheel pointer sits at 270° (top of the circle) or 0° depending on alignment.
  // Let pointer be at 270° (top).
  // When rotated by R degrees clockwise, angle A on wheel moves to (A + R) % 360.
  // For center of slice i to land at 270°:
  // (centerAngle + R) % 360 = 270 => R = (270 - centerAngle + 360) % 360.
  // To provide a dramatic, satisfying spin: add 5 to 7 full 360° revolutions.
  const sliceAngle = 360 / options.length;
  const sliceCenter = (winningIndex + 0.5) * sliceAngle;
  const targetOffset = (270 - sliceCenter + 360) % 360;

  // Add 5 full rotations (1800 degrees)
  const fullSpins = 5 * 360;
  const rotationDegrees = fullSpins + targetOffset;

  return {
    winningOption,
    winningIndex,
    totalWeight,
    rotationDegrees,
  };
}
