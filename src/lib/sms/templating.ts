// GSM 7-bit basic character set
const GSM_BASIC_CHARS = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
);

// GSM 7-bit extended character set (each takes 2 GSM chars / escape sequence)
const GSM_EXTENDED_CHARS = new Set("|^€{}[~]\\");

export interface SmsSegmentCalculation {
  length: number;
  encoding: "GSM_7BIT" | "UCS2";
  segmentCount: number;
  maxCharsPerSegment: number;
  remainingInCurrentSegment: number;
  hasUnicode: boolean;
}

/**
 * Calculates SMS character counts and segments according to telecom standards.
 * GSM 7-bit: 160 characters for 1 segment, 153 chars/segment for concatenated SMS.
 * Extended GSM characters (|^€{}[~]\) consume 2 septets.
 * UCS-2 (Unicode): 70 characters for 1 segment, 67 chars/segment for concatenated SMS.
 */
export function calculateSmsSegments(text: string): SmsSegmentCalculation {
  if (!text || text.length === 0) {
    return {
      length: 0,
      encoding: "GSM_7BIT",
      segmentCount: 1,
      maxCharsPerSegment: 160,
      remainingInCurrentSegment: 160,
      hasUnicode: false,
    };
  }

  let isGsm = true;
  let gsmSeptetCount = 0;

  for (const char of text) {
    if (GSM_BASIC_CHARS.has(char)) {
      gsmSeptetCount += 1;
    } else if (GSM_EXTENDED_CHARS.has(char)) {
      gsmSeptetCount += 2;
    } else {
      isGsm = false;
      break;
    }
  }

  if (isGsm) {
    const singleSegmentLimit = 160;
    const multiSegmentLimit = 153;

    if (gsmSeptetCount <= singleSegmentLimit) {
      return {
        length: gsmSeptetCount,
        encoding: "GSM_7BIT",
        segmentCount: 1,
        maxCharsPerSegment: singleSegmentLimit,
        remainingInCurrentSegment: singleSegmentLimit - gsmSeptetCount,
        hasUnicode: false,
      };
    } else {
      const segmentCount = Math.ceil(gsmSeptetCount / multiSegmentLimit);
      const remaining = segmentCount * multiSegmentLimit - gsmSeptetCount;
      return {
        length: gsmSeptetCount,
        encoding: "GSM_7BIT",
        segmentCount,
        maxCharsPerSegment: multiSegmentLimit,
        remainingInCurrentSegment: remaining,
        hasUnicode: false,
      };
    }
  } else {
    // UCS-2 (Unicode / Emoji)
    const charCount = text.length;
    const singleSegmentLimit = 70;
    const multiSegmentLimit = 67;

    if (charCount <= singleSegmentLimit) {
      return {
        length: charCount,
        encoding: "UCS2",
        segmentCount: 1,
        maxCharsPerSegment: singleSegmentLimit,
        remainingInCurrentSegment: singleSegmentLimit - charCount,
        hasUnicode: true,
      };
    } else {
      const segmentCount = Math.ceil(charCount / multiSegmentLimit);
      const remaining = segmentCount * multiSegmentLimit - charCount;
      return {
        length: charCount,
        encoding: "UCS2",
        segmentCount,
        maxCharsPerSegment: multiSegmentLimit,
        remainingInCurrentSegment: remaining,
        hasUnicode: true,
      };
    }
  }
}

export interface SmsPersonalizationContext {
  customer?: {
    name?: string | null;
    firstName?: string | null;
    company?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
  };
  workspace?: {
    name?: string | null;
  };
  form?: {
    title?: string | null;
  };
  invitation?: {
    url?: string | null;
    token?: string | null;
  };
  optout?: {
    text?: string | null;
  };
}

/**
 * Replaces {{placeholders}} in SMS templates with personalized data.
 */
export function interpolateSmsTemplate(
  template: string,
  context: SmsPersonalizationContext
): string {
  if (!template) return "";

  const firstName =
    context.customer?.firstName ||
    (context.customer?.name ? context.customer.name.trim().split(" ")[0] : "there");
  const fullName = context.customer?.name || firstName || "there";
  const company = context.customer?.company || "";
  const workspaceName = context.workspace?.name || "our team";
  const formTitle = context.form?.title || "Testimonial";
  const inviteUrl = context.invitation?.url || "https://praise.example.com/p/submit";
  const optoutText = context.optout?.text || "Reply STOP to opt out";

  return template
    .replace(/\{\{\s*customer\.firstName\s*\}\}/gi, firstName)
    .replace(/\{\{\s*customer\.name\s*\}\}/gi, fullName)
    .replace(/\{\{\s*customer\.company\s*\}\}/gi, company)
    .replace(/\{\{\s*workspace\.name\s*\}\}/gi, workspaceName)
    .replace(/\{\{\s*form\.title\s*\}\}/gi, formTitle)
    .replace(/\{\{\s*invitation\.url\s*\}\}/gi, inviteUrl)
    .replace(/\{\{\s*optout\.text\s*\}\}/gi, optoutText);
}

export interface DefaultSmsTemplateDef {
  name: string;
  category: "STANDARD" | "FOLLOW_UP" | "VIP" | "NPS" | string;
  messageBody: string;
  body: string; // alias
  description: string;
}

export const DEFAULT_SMS_TEMPLATES: DefaultSmsTemplateDef[] = [
  {
    name: "Friendly Short Ask",
    category: "STANDARD",
    messageBody: "Hi {{customer.firstName}}, thank you for working with {{workspace.name}}! Would you mind sharing a quick 60-second review? {{invitation.url}} {{optout.text}}",
    body: "Hi {{customer.firstName}}, thank you for working with {{workspace.name}}! Would you mind sharing a quick 60-second review? {{invitation.url}} {{optout.text}}",
    description: "Compact, polite invitation ideal for standard customer outreach within 1 GSM segment.",
  },
  {
    name: "VIP / Video Request",
    category: "VIP",
    messageBody: "Hey {{customer.firstName}}! Your story with {{workspace.name}} inspires us. Could you record a 1-minute video testimonial? {{invitation.url}} {{optout.text}}",
    body: "Hey {{customer.firstName}}! Your story with {{workspace.name}} inspires us. Could you record a 1-minute video testimonial? {{invitation.url}} {{optout.text}}",
    description: "Personalized request for VIP customers or video testimonials.",
  },
  {
    name: "Post-Purchase / Service",
    category: "STANDARD",
    messageBody: "{{customer.firstName}}, how was your recent experience with {{workspace.name}}? We'd love your honest feedback: {{invitation.url}} {{optout.text}}",
    body: "{{customer.firstName}}, how was your recent experience with {{workspace.name}}? We'd love your honest feedback: {{invitation.url}} {{optout.text}}",
    description: "Targeted message following product delivery, onboarding, or service milestones.",
  },
  {
    name: "Gentle Follow-Up",
    category: "FOLLOW_UP",
    messageBody: "Hi {{customer.firstName}}, just checking in! If you have a minute, your feedback for {{workspace.name}} would mean the world: {{invitation.url}} {{optout.text}}",
    body: "Hi {{customer.firstName}}, just checking in! If you have a minute, your feedback for {{workspace.name}} would mean the world: {{invitation.url}} {{optout.text}}",
    description: "Friendly reminder sent a few days after an initial invitation.",
  },
];
