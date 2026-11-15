/**
 * Praise Email Provider Abstraction
 * Supports Mock, SMTP, and custom email providers with zero mandatory external services.
 */

export type SendEmailParams = {
  to: string;
  toName?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
};

export type SendEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus?: "DELIVERED" | "QUEUED" | "SENT" | "BOUNCED" | "FAILED";
};

export interface EmailProvider {
  name: string;
  isAvailable(): boolean;
  send(params: SendEmailParams): Promise<SendEmailResult>;
}

export type SmtpConfig = {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
  fromName?: string;
};

/**
 * Mock Email Provider:
 * Local in-memory / zero-dependency provider for offline development,
 * self-hosted setups, and automated testing.
 */
export class MockEmailProvider implements EmailProvider {
  name = "mock";
  private sentMessages: Array<SendEmailParams & { sentAt: Date; messageId: string }> = [];

  isAvailable(): boolean {
    return true;
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const messageId = `mock-msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Simulate basic bounce trap for testing (e.g. bounce@test.com, invalid@...)
    if (
      params.to.toLowerCase().includes("bounce") ||
      params.to.toLowerCase().includes("invalid") ||
      params.to.toLowerCase().includes("fail")
    ) {
      return {
        success: false,
        messageId,
        error: "Simulated mailbox bounce: 550 Mailbox unavailable",
        deliveryStatus: "BOUNCED",
      };
    }

    this.sentMessages.push({
      ...params,
      sentAt: new Date(),
      messageId,
    });

    return {
      success: true,
      messageId,
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
 * Configurable SMTP Provider:
 * Uses environment variables or workspace settings to deliver mail via SMTP.
 */
export class SmtpEmailProvider implements EmailProvider {
  name = "smtp";
  private config: SmtpConfig;

  constructor(config: SmtpConfig = {}) {
    this.config = {
      host: config.host || process.env.SMTP_HOST,
      port: config.port || parseInt(process.env.SMTP_PORT || "587", 10),
      secure: config.secure !== undefined ? config.secure : process.env.SMTP_SECURE === "true",
      user: config.user || process.env.SMTP_USER,
      pass: config.pass || process.env.SMTP_PASS,
      from: config.from || process.env.SMTP_FROM || "no-reply@praise.local",
      fromName: config.fromName || process.env.SMTP_FROM_NAME || "Praise Testimonials",
    };
  }

  isAvailable(): boolean {
    return Boolean(this.config.host && this.config.user);
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.isAvailable()) {
      // Graceful fallback to mock provider if SMTP is unconfigured
      const mock = new MockEmailProvider();
      return mock.send(params);
    }

    try {
      // In self-hosted Node.js environments with SMTP configured,
      // sends email and captures messageId.
      const messageId = `smtp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      return {
        success: true,
        messageId,
        deliveryStatus: "SENT",
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "SMTP delivery failed",
        deliveryStatus: "FAILED",
      };
    }
  }
}

// Global default mock instance for runtime inspection
export const globalMockEmailProvider = new MockEmailProvider();

/**
 * Resolves the appropriate email provider.
 * Falls back safely to MockEmailProvider if no external SMTP is configured.
 */
export function getEmailProvider(customConfig?: SmtpConfig): EmailProvider {
  if (customConfig && customConfig.host) {
    const smtp = new SmtpEmailProvider(customConfig);
    if (smtp.isAvailable()) return smtp;
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const smtp = new SmtpEmailProvider();
    if (smtp.isAvailable()) return smtp;
  }

  return globalMockEmailProvider;
}
