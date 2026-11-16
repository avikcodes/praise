/**
 * Configurable SMS Provider Abstraction for Praise
 *
 * Supports multiple pluggable SMS providers:
 * 1. MockSmsProvider: Default offline / in-memory provider for zero paid dependencies.
 * 2. TwilioSmsProvider: Standard Twilio REST API integration.
 * 3. GenericWebhookSmsProvider: Custom HTTP SMS gateway / webhook adapter.
 */

export type SendSmsParams = {
  to: string; // E.164 formatted phone number, e.g. +1234567890
  body: string;
  from?: string; // Optional sender ID or phone number
};

export type SendSmsResult = {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  deliveryStatus: "DELIVERED" | "FAILED" | "OPTED_OUT";
};

export interface SmsProvider {
  name: string;
  isAvailable(): boolean;
  send(params: SendSmsParams): Promise<SendSmsResult>;
}

export type WorkspaceSmsConfig = {
  provider: "MOCK" | "TWILIO" | "WEBHOOK" | string;
  accountSid?: string | null;
  authToken?: string | null;
  fromNumber?: string | null;
  webhookUrl?: string | null;
  webhookAuthHeader?: string | null;
  isEnabled?: boolean;
};

/**
 * Mock SMS Provider:
 * Zero-dependency local queue for testing, CI/CD, and self-hosted installs.
 */
export class MockSmsProvider implements SmsProvider {
  name = "mock";
  private sentMessages: Array<SendSmsParams & { sentAt: Date; messageId: string }> = [];

  isAvailable(): boolean {
    return true;
  }

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    const messageId = `mock-sms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const cleanTo = params.to.replace(/\D/g, "");

    // Simulated opt-out check (e.g. numbers ending in 9999 or containing optout)
    if (params.to.includes("optout") || cleanTo.endsWith("9999")) {
      return {
        success: false,
        providerMessageId: messageId,
        error: "Recipient has opted out of SMS messages",
        deliveryStatus: "OPTED_OUT",
      };
    }

    // Simulated failure check (e.g. numbers ending in 0000 or invalid)
    if (params.to.includes("invalid") || params.to.includes("fail") || cleanTo.endsWith("0000")) {
      return {
        success: false,
        providerMessageId: messageId,
        error: "Carrier rejected message: Invalid destination or unreachable subscriber",
        deliveryStatus: "FAILED",
      };
    }

    this.sentMessages.push({
      ...params,
      sentAt: new Date(),
      messageId,
    });

    return {
      success: true,
      providerMessageId: messageId,
      deliveryStatus: "DELIVERED",
    };
  }

  getSentMessages() {
    return [...this.sentMessages];
  }

  clearSentMessages() {
    this.sentMessages = [];
  }
}

/**
 * Twilio SMS Provider:
 * Dispatches SMS via Twilio Messages API using standard HTTP Basic auth.
 */
export class TwilioSmsProvider implements SmsProvider {
  name = "twilio";
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(config: { accountSid?: string; authToken?: string; fromNumber?: string } = {}) {
    this.accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN || "";
    this.fromNumber = config.fromNumber || process.env.TWILIO_FROM_NUMBER || "";
  }

  isAvailable(): boolean {
    return Boolean(this.accountSid && this.authToken && this.fromNumber);
  }

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: "Twilio credentials are not configured or incomplete.",
        deliveryStatus: "FAILED",
      };
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const formBody = new URLSearchParams();
    formBody.append("To", params.to);
    formBody.append("From", params.from || this.fromNumber);
    formBody.append("Body", params.body);

    const authHeader = `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        // Twilio error 21610 = Message cannot be sent to phone number because it has opted out
        const isOptOut = data.code === 21610 || data.message?.toLowerCase().includes("unsubscribed");
        return {
          success: false,
          providerMessageId: data.sid,
          error: data.message || `Twilio error code: ${data.code}`,
          deliveryStatus: isOptOut ? "OPTED_OUT" : "FAILED",
        };
      }

      return {
        success: true,
        providerMessageId: data.sid,
        deliveryStatus: "DELIVERED",
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to connect to Twilio API",
        deliveryStatus: "FAILED",
      };
    }
  }
}

/**
 * Generic Webhook SMS Gateway:
 * Sends SMS via arbitrary HTTP POST endpoint supporting standard gateways.
 */
export class GenericWebhookSmsProvider implements SmsProvider {
  name = "webhook";
  private webhookUrl: string;
  private authHeader?: string;
  private defaultFrom?: string;

  constructor(config: { webhookUrl?: string; authHeader?: string; defaultFrom?: string } = {}) {
    this.webhookUrl = config.webhookUrl || process.env.SMS_WEBHOOK_URL || "";
    this.authHeader = config.authHeader || process.env.SMS_WEBHOOK_AUTH_HEADER;
    this.defaultFrom = config.defaultFrom || process.env.SMS_FROM_NAME || "Praise";
  }

  isAvailable(): boolean {
    return Boolean(this.webhookUrl);
  }

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: "Custom SMS Webhook URL is not configured.",
        deliveryStatus: "FAILED",
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.authHeader) {
        headers["Authorization"] = this.authHeader;
      }

      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          to: params.to,
          message: params.body,
          from: params.from || this.defaultFrom,
          timestamp: new Date().toISOString(),
        }),
      });

      const responseText = await response.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch {}

      if (!response.ok) {
        return {
          success: false,
          error: responseData.error || responseData.message || `Gateway returned HTTP ${response.status}`,
          deliveryStatus: "FAILED",
        };
      }

      return {
        success: true,
        providerMessageId: responseData.id || responseData.messageId || `wh-${Date.now()}`,
        deliveryStatus: "DELIVERED",
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Gateway request failed",
        deliveryStatus: "FAILED",
      };
    }
  }
}

// Singleton in-memory mock instance for development and tests
const globalMockSmsProvider = new MockSmsProvider();

/**
 * Factory that returns the configured SMS provider for a workspace.
 */
export function getSmsProvider(config?: WorkspaceSmsConfig | null): SmsProvider {
  if (!config || !config.isEnabled || config.provider === "MOCK") {
    return globalMockSmsProvider;
  }

  if (config.provider === "TWILIO") {
    return new TwilioSmsProvider({
      accountSid: config.accountSid || undefined,
      authToken: config.authToken || undefined,
      fromNumber: config.fromNumber || undefined,
    });
  }

  if (config.provider === "WEBHOOK") {
    return new GenericWebhookSmsProvider({
      webhookUrl: config.webhookUrl || undefined,
      authHeader: config.webhookAuthHeader || undefined,
      defaultFrom: config.fromNumber || undefined,
    });
  }

  return globalMockSmsProvider;
}
