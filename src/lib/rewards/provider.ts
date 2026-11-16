import crypto from "crypto";
export { DEFAULT_REWARD_DISCLOSURE, REWARD_TYPES } from "./constants.ts";

export type DeliverRewardParams = {
  claimId: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  rewardType: "COUPON_CODE" | "REWARD_URL" | "DIGITAL_GIFT" | "MANUAL" | "EXTERNAL_PROVIDER" | string;
  couponCode?: string | null;
  rewardUrl?: string | null;
  digitalGiftUrl?: string | null;
  instructions?: string | null;
  testimonialId?: string | null;
  formTitle?: string | null;
  workspaceName?: string | null;
};

export type DeliverRewardResult = {
  success: boolean;
  status: "DELIVERED" | "PENDING" | "FAILED";
  providerReference?: string;
  rewardCode?: string;
  rewardUrl?: string;
  error?: string;
};

export interface RewardProvider {
  name: string;
  deliver(params: DeliverRewardParams): Promise<DeliverRewardResult>;
  verifyWebhookSignature?(rawBody: string, signature: string, secret: string): boolean;
}

/**
 * Built-in Reward Provider:
 * Delivers configured coupon codes, direct reward URLs, or digital gift links instantly
 * upon submission. Zero third-party dependencies required.
 */
export class BuiltInRewardProvider implements RewardProvider {
  name = "builtin";

  async deliver(params: DeliverRewardParams): Promise<DeliverRewardResult> {
    const code = params.couponCode || undefined;
    const url = params.rewardUrl || params.digitalGiftUrl || undefined;

    return {
      success: true,
      status: "DELIVERED",
      providerReference: `builtin-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      rewardCode: code,
      rewardUrl: url,
    };
  }
}

/**
 * Manual Reward Provider:
 * Queues reward claims for workspace admins to review and manually deliver with
 * custom personalized voucher codes or external gift links.
 */
export class ManualRewardProvider implements RewardProvider {
  name = "manual";

  async deliver(params: DeliverRewardParams): Promise<DeliverRewardResult> {
    return {
      success: true,
      status: "PENDING",
      providerReference: `manual-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      rewardCode: params.couponCode || undefined,
      rewardUrl: params.rewardUrl || params.digitalGiftUrl || undefined,
    };
  }
}

export type WebhookProviderConfig = {
  webhookUrl: string;
  authHeader?: string | null;
  signingSecret?: string | null;
};

/**
 * Generic Webhook Reward Provider:
 * Dispatches an HTTP POST payload to an external reward fulfillment gateway
 * (e.g. Tremendous, company perks gateway, internal incentive microservice)
 * with optional HMAC-SHA256 signature verification.
 */
export class GenericWebhookRewardProvider implements RewardProvider {
  name = "webhook";
  private config: WebhookProviderConfig;

  constructor(config: WebhookProviderConfig) {
    this.config = config;
  }

  async deliver(params: DeliverRewardParams): Promise<DeliverRewardResult> {
    if (!this.config.webhookUrl) {
      return {
        success: false,
        status: "FAILED",
        error: "External reward provider webhook URL is not configured.",
      };
    }

    try {
      const payload = {
        event: "reward.deliver",
        claimId: params.claimId,
        recipient: {
          name: params.recipientName,
          email: params.recipientEmail,
          phone: params.recipientPhone,
        },
        reward: {
          type: params.rewardType,
          couponCode: params.couponCode,
          rewardUrl: params.rewardUrl || params.digitalGiftUrl,
        },
        testimonialId: params.testimonialId,
        workspaceName: params.workspaceName,
        formTitle: params.formTitle,
        timestamp: new Date().toISOString(),
      };

      const bodyStr = JSON.stringify(payload);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Praise-Reward-Dispatcher/1.0",
      };

      if (this.config.authHeader) {
        headers["Authorization"] = this.config.authHeader;
      }

      if (this.config.signingSecret) {
        const signature = crypto
          .createHmac("sha256", this.config.signingSecret)
          .update(bodyStr)
          .digest("hex");
        headers["X-Praise-Signature"] = `sha256=${signature}`;
      }

      const response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers,
        body: bodyStr,
      });

      if (!response.ok) {
        return {
          success: false,
          status: "FAILED",
          error: `External reward provider returned HTTP ${response.status}`,
        };
      }

      let responseData: any = {};
      try {
        responseData = await response.json();
      } catch {}

      return {
        success: true,
        status: responseData.status === "PENDING" ? "PENDING" : "DELIVERED",
        providerReference: responseData.id || responseData.referenceId || `wh-${Date.now()}`,
        rewardCode: responseData.code || params.couponCode || undefined,
        rewardUrl: responseData.url || params.rewardUrl || params.digitalGiftUrl || undefined,
      };
    } catch (err: unknown) {
      return {
        success: false,
        status: "FAILED",
        error: err instanceof Error ? err.message : "Reward provider request failed",
      };
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    const cleanSig = signature.replace(/^sha256=/, "");
    const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(cleanSig, "hex"), Buffer.from(computed, "hex"));
    } catch {
      return false;
    }
  }
}

// Built-in singleton providers
const builtInProvider = new BuiltInRewardProvider();
const manualProvider = new ManualRewardProvider();

/**
 * Factory to resolve configured reward provider.
 */
export function getRewardProvider(
  providerType: string = "BUILT_IN",
  configJson?: string | null
): RewardProvider {
  if (providerType === "MANUAL") {
    return manualProvider;
  }

  if (providerType === "GENERIC_WEBHOOK") {
    let parsedConfig: WebhookProviderConfig = { webhookUrl: "" };
    if (configJson) {
      try {
        parsedConfig = JSON.parse(configJson);
      } catch {}
    }
    return new GenericWebhookRewardProvider(parsedConfig);
  }

  return builtInProvider;
}
