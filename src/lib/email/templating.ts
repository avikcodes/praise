/**
 * Praise Email Invitation Templating & Personalization Engine
 */

export type TemplateVariables = {
  customer?: {
    name?: string | null;
    firstName?: string | null;
    email?: string | null;
    company?: string | null;
    title?: string | null;
  };
  workspace?: {
    name?: string | null;
    logoUrl?: string | null;
  };
  form?: {
    title?: string | null;
    headerPrompt?: string | null;
  };
  invitation?: {
    url?: string | null;
    token?: string | null;
  };
  unsubscribe?: {
    url?: string | null;
  };
  custom?: Record<string, unknown>;
};

export const DEFAULT_INVITATION_TEMPLATES = [
  {
    name: "Warm Personal Ask",
    category: "GENERAL",
    subject: "Would you share a quick review for {{workspace.name}}?",
    bodyText: `Hi {{customer.firstName|there}},

Thank you for being such a wonderful part of {{workspace.name}}!

We are collecting honest feedback and stories from our customers to help others discover our work. If you have 60 seconds, we would be incredibly grateful if you could share your experience with us.

You can submit a quick text or video note right here:
{{invitation.url}}

It means the world to our team. Thank you so much!

Best regards,
{{workspace.name}} Team`,
    isSystem: true,
  },
  {
    name: "Executive Video Testimonial",
    category: "EXECUTIVE",
    subject: "Quick question from {{workspace.name}}",
    bodyText: `Hi {{customer.firstName|there}},

Hope you're having a productive week at {{customer.company|your company}}!

We've loved seeing your team's success with {{workspace.name}}. We're putting together a short highlight of our power users and would love to feature a 30-to-60 second video quote from you.

You can record directly from your browser in one click (no software needed):
{{invitation.url}}

Let us know if you have any questions. Thanks for being such a great partner!

Warmly,
The {{workspace.name}} Team`,
    isSystem: true,
  },
  {
    name: "Post-Onboarding Follow-Up",
    category: "POST_PURCHASE",
    subject: "How has your experience been with {{workspace.name}}?",
    bodyText: `Hi {{customer.firstName|there}},

Now that you've had a chance to get started with {{workspace.name}}, how are things going for {{customer.company|you}}?

Your feedback helps us improve and build better tools for everyone. Could you take a moment to share your thoughts on {{form.title}}?

Share your feedback here:
{{invitation.url}}

Thank you for helping us grow!`,
    isSystem: true,
  },
  {
    name: "NPS Promoter Recognition",
    category: "NPS",
    subject: "Thank you for the high rating!",
    bodyText: `Hi {{customer.firstName|there}},

We noticed your recent positive rating and just wanted to send a heartfelt thank you from the whole team at {{workspace.name}}!

Would you be open to turning your feedback into a public testimonial that we can showcase? It only takes one minute:

{{invitation.url}}

Thank you for being our champion!`,
    isSystem: true,
  },
] as const;

/**
 * Extracts first name from a full name string.
 */
export function extractFirstName(fullName?: string | null): string {
  if (!fullName || !fullName.trim()) return "";
  const parts = fullName.trim().split(" ");
  return parts[0] || "";
}

/**
 * Interpolates variables within email subject and body template strings.
 * Supports patterns like:
 * - {{customer.name}}
 * - {{customer.firstName}}
 * - {{name}}
 * - {{company}}
 * - {{invitation.url}}
 * - {{field|default_value}}
 */
export function interpolateEmailTemplate(
  templateText: string,
  variables: TemplateVariables,
): string {
  if (!templateText) return "";

  const name = variables.customer?.name || "";
  const firstName =
    variables.customer?.firstName || extractFirstName(variables.customer?.name);
  const company = variables.customer?.company || "";
  const title = variables.customer?.title || "";
  const email = variables.customer?.email || "";
  const workspaceName = variables.workspace?.name || "Our Team";
  const formTitle = variables.form?.title || "Testimonial Form";
  const inviteUrl = variables.invitation?.url || "#";
  const unsubUrl = variables.unsubscribe?.url || "#";

  return templateText.replace(/\{\{\s*([a-zA-Z0-9_.]+)(?:\|([^}]+))?\s*\}\}/g, (_, key, fallback) => {
    const defaultVal = fallback !== undefined ? fallback.trim() : "";
    const cleanKey = key.trim().toLowerCase();

    switch (cleanKey) {
      case "customer.name":
      case "name":
        return name || defaultVal;
      case "customer.firstname":
      case "firstname":
        return firstName || defaultVal;
      case "customer.company":
      case "company":
        return company || defaultVal;
      case "customer.title":
      case "title":
        return title || defaultVal;
      case "customer.email":
      case "email":
        return email || defaultVal;
      case "workspace.name":
      case "workspacename":
        return workspaceName || defaultVal;
      case "form.title":
      case "formtitle":
        return formTitle || defaultVal;
      case "invitation.url":
      case "url":
      case "link":
        return inviteUrl || defaultVal;
      case "unsubscribe.url":
      case "unsubscribe":
        return unsubUrl || defaultVal;
      default: {
        // Check in custom fields
        const customVal = variables.custom?.[key];
        if (customVal !== undefined && customVal !== null) {
          return String(customVal);
        }
        return defaultVal;
      }
    }
  });
}

/**
 * Builds responsive, clean HTML email markup from plain text / markdown.
 */
export function buildHtmlEmail(params: {
  subject: string;
  bodyText: string;
  invitationUrl: string;
  unsubscribeUrl?: string;
  workspaceName?: string;
  accentColor?: string;
}): string {
  const {
    subject,
    bodyText,
    invitationUrl,
    unsubscribeUrl,
    workspaceName = "Praise Testimonials",
    accentColor = "#7049D8",
  } = params;

  let hasLinkedButton = false;

  // Convert plain text paragraphs and line breaks
  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((p) => {
      const escaped = p
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>");
      // Autolink invitation URL if found in paragraph
      if (escaped.includes(invitationUrl)) {
        hasLinkedButton = true;
        return `<p style="margin: 0 0 16px 0; line-height: 1.6; font-size: 15px; color: #1e293b;">
          <a href="${invitationUrl}" target="_blank" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 8px; font-size: 14px; margin: 8px 0;">
            Share Your Testimonial &rarr;
          </a>
        </p>`;
      }
      return `<p style="margin: 0 0 16px 0; line-height: 1.6; font-size: 15px; color: #1e293b;">${escaped}</p>`;
    })
    .join("\n");

  const ctaButtonHtml = !hasLinkedButton && invitationUrl
    ? `<div style="text-align: center; margin: 24px 0 16px 0;">
        <a href="${invitationUrl}" target="_blank" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 8px; font-size: 14px;">
          Share Your Testimonial &rarr;
        </a>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
              <span style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;">
                ${workspaceName}
              </span>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px;">
              ${paragraphs}
              ${ctaButtonHtml}
            </td>
          </tr>

          <!-- Footer & Unsubscribe -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 8px 0;">
                Sent via <strong>${workspaceName}</strong> testimonial collection.
              </p>
              ${
                unsubscribeUrl
                  ? `<p style="margin: 0;">
                      <a href="${unsubscribeUrl}" target="_blank" style="color: #64748b; text-decoration: underline;">
                        Unsubscribe from testimonial invitations
                      </a>
                    </p>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
