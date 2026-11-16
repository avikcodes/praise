import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import {
  checkRateLimit,
  getClientIp,
  validateSpamHeuristics,
} from "@/lib/security/rate-limit";
import {
  formatCustomerMeta,
  parseCustomerMeta,
  INTERNAL_EMAIL_SUFFIX,
} from "@/lib/customers/utils";
import { logCustomerActivity } from "@/lib/customers/crm";
import {
  serializeConsentPayload,
  StructuredConsentPayload,
} from "@/lib/privacy/consent";
import {
  getTraversedVisibleFieldIds,
  FormFlowConfig,
} from "@/lib/forms/flow-engine";
import { triggerMediaTranscription } from "@/lib/transcription/service";
import { logModerationActivity } from "@/lib/moderation/activity";
import { processRewardForSubmission } from "@/lib/rewards/service";

// Basic email regex validator
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "Unknown Browser";

  // 1. Rate Limiting Check (5 submissions per 3 minutes per IP)
  const rateLimit = checkRateLimit(clientIp, 5, 3 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Too many submissions. Please wait ${rateLimit.resetSeconds} seconds before submitting again.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimit.resetSeconds.toString(),
        },
      },
    );
  }

  try {
    const body = await request.json();
    const {
      formSlug,
      customerName,
      customerEmail,
      customerCompany,
      customerTitle,
      customerWebsite,
      customerAvatarUrl,
      content,
      rating = 5,
      type = "TEXT",
      isConsentGranted,
      consentVersion = "v1.0",
      permittedPurposes = { publicWebsite: true, socialMedia: false, marketingMaterials: false },
      mediaConsentGranted,
      allowNameDisplay = true,
      allowCompanyDisplay = true,
      customResponses = {},
      mediaAssetId,
      recordingQuestionsJson,
      inviteToken,
      // Anti-abuse tokens
      honeypot,
      formLoadedAt,
    } = body;

    // 2. Anti-Spam Heuristics Check (Honeypot & Fast-Bot timing)
    const spamCheck = validateSpamHeuristics({
      honeypot,
      formLoadedAt: typeof formLoadedAt === "number" ? formLoadedAt : null,
      content,
    });

    if (spamCheck.isSpam) {
      return NextResponse.json(
        { error: spamCheck.reason || "Submission rejected by automated security filters." },
        { status: 400 },
      );
    }

    if (!formSlug || typeof formSlug !== "string") {
      return NextResponse.json(
        { error: "Form slug identifier is required." },
        { status: 400 },
      );
    }

    // 3. Find the collection form from the database
    let form: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      form = await prisma.collectionForm.findFirst({
        where: { slug: formSlug.trim() },
        include: {
          fields: {
            orderBy: { orderIndex: "asc" },
          },
          rewardProgram: true,
          workspace: {
            select: { id: true, name: true },
          },
        },
      });
    } catch (dbError) {
      // In local development when database is unseeded or offline
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json(
          {
            success: true,
            message: "Thank you for sharing your feedback! (Dev mode: Submission simulated successfully)",
            testimonialId: `test-sub-${Date.now()}`,
            redirectUrl: null,
            status: "PENDING",
          },
          { status: 201 },
        );
      }
      throw dbError;
    }

    if (!form || !form.isPublished) {
      return NextResponse.json(
        { error: "This collection form is unpublished or does not exist." },
        { status: 404 },
      );
    }

    if (!form.submissionsEnabled) {
      return NextResponse.json(
        { error: "Submissions are currently paused for this form by the administrator." },
        { status: 403 },
      );
    }

    // 4. Server-Side Field Validation according to configured form options
    // In multi-step forms, validate ONLY fields that were visible and traversed
    let applicableVisibleFields: Set<string> | null = null;
    if (form.isMultiStep && form.flowConfigJson) {
      try {
        const parsedFlow: FormFlowConfig = JSON.parse(form.flowConfigJson);
        if (parsedFlow && parsedFlow.enabled) {
          const formValues: Record<string, unknown> = {
            rating: Number(rating),
            content,
            name: customerName,
            email: customerEmail,
            company: customerCompany,
            title: customerTitle,
            website: customerWebsite,
            consent: isConsentGranted,
            ...customResponses,
          };
          applicableVisibleFields = getTraversedVisibleFieldIds(parsedFlow, formValues);
        }
      } catch {
        // Fallback to standard validation if parsing fails
      }
    }

    const isFieldApplicable = (fieldId: string) => {
      if (!applicableVisibleFields) return true;
      return applicableVisibleFields.has(fieldId);
    };

    if (isFieldApplicable("name") && form.collectName && form.nameRequired && !customerName?.trim()) {
      return NextResponse.json(
        { error: "Your full name is required." },
        { status: 400 },
      );
    }

    if (isFieldApplicable("email") && form.collectEmail) {
      if (form.emailRequired && !customerEmail?.trim()) {
        return NextResponse.json(
          { error: "A valid email address is required." },
          { status: 400 },
        );
      }
      if (customerEmail?.trim() && !EMAIL_REGEX.test(customerEmail.trim())) {
        return NextResponse.json(
          { error: "Please provide a valid email address (e.g. name@domain.com)." },
          { status: 400 },
        );
      }
    }

    if (isFieldApplicable("company") && form.collectCompany && form.companyRequired && !customerCompany?.trim()) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 },
      );
    }

    if (isFieldApplicable("title") && form.collectJobTitle && form.jobTitleRequired && !customerTitle?.trim()) {
      return NextResponse.json(
        { error: "Job title is required." },
        { status: 400 },
      );
    }

    if (isFieldApplicable("website") && form.collectWebsite && form.websiteRequired && !customerWebsite?.trim()) {
      return NextResponse.json(
        { error: "Website or profile URL is required." },
        { status: 400 },
      );
    }

    const numericRating = Number(rating);
    if (isFieldApplicable("rating") && form.collectRating && form.ratingRequired) {
      if (!numericRating || numericRating < 1 || numericRating > 5) {
        return NextResponse.json(
          { error: "Please select an overall rating between 1 and 5 stars." },
          { status: 400 },
        );
      }
    }

    if (isFieldApplicable("content") && form.collectText && type === "TEXT") {
      if (form.textRequired && !content?.trim()) {
        return NextResponse.json(
          { error: "Testimonial text content is required." },
          { status: 400 },
        );
      }
    }

    if (isFieldApplicable("consent") && form.collectConsent && form.consentRequired && !isConsentGranted) {
      return NextResponse.json(
        { error: "You must grant permission to submit your feedback." },
        { status: 400 },
      );
    }

    // Validate required custom fields and validation rules
    if (form.fields && form.fields.length > 0) {
      for (const field of form.fields) {
        if (!isFieldApplicable(field.id)) continue;

        const val = customResponses[field.id];
        const isEmpty =
          val === undefined ||
          val === null ||
          (typeof val === "string" && !val.trim()) ||
          (Array.isArray(val) && val.length === 0);

        if (field.isRequired && isEmpty) {
          return NextResponse.json(
            { error: `Question "${field.label}" is required.` },
            { status: 400 },
          );
        }

        // Enforce validation rules
        if (!isEmpty && field.validationRulesJson) {
          try {
            const rules = JSON.parse(field.validationRulesJson);

            // Numeric range
            if (field.type === "NUMBER") {
              const num = Number(val);
              if (isNaN(num)) {
                return NextResponse.json(
                  {
                    error:
                      rules.customErrorMessage ||
                      `Question "${field.label}" must be a number.`,
                  },
                  { status: 400 },
                );
              }
              if (rules.minNumeric !== undefined && num < rules.minNumeric) {
                return NextResponse.json(
                  {
                    error:
                      rules.customErrorMessage ||
                      `Question "${field.label}" must be at least ${rules.minNumeric}.`,
                  },
                  { status: 400 },
                );
              }
              if (rules.maxNumeric !== undefined && num > rules.maxNumeric) {
                return NextResponse.json(
                  {
                    error:
                      rules.customErrorMessage ||
                      `Question "${field.label}" cannot exceed ${rules.maxNumeric}.`,
                  },
                  { status: 400 },
                );
              }
            }

            // String length and pattern
            if (typeof val === "string") {
              if (rules.minLength !== undefined && val.length < rules.minLength) {
                return NextResponse.json(
                  {
                    error:
                      rules.customErrorMessage ||
                      `Question "${field.label}" must be at least ${rules.minLength} characters.`,
                  },
                  { status: 400 },
                );
              }
              if (rules.maxLength !== undefined && val.length > rules.maxLength) {
                return NextResponse.json(
                  {
                    error:
                      rules.customErrorMessage ||
                      `Question "${field.label}" cannot exceed ${rules.maxLength} characters.`,
                  },
                  { status: 400 },
                );
              }
              if (rules.pattern) {
                try {
                  const reg = new RegExp(rules.pattern);
                  if (!reg.test(val)) {
                    return NextResponse.json(
                      {
                        error:
                          rules.customErrorMessage ||
                          `Question "${field.label}" format is invalid.`,
                      },
                      { status: 400 },
                    );
                  }
                } catch {
                  // ignore
                }
              }
            }

            // Date range
            if (field.type === "DATE" && typeof val === "string") {
              if (rules.minDate && val < rules.minDate) {
                return NextResponse.json(
                  {
                    error:
                      rules.customErrorMessage ||
                      `Question "${field.label}" cannot be earlier than ${rules.minDate}.`,
                  },
                  { status: 400 },
                );
              }
              if (rules.maxDate && val > rules.maxDate) {
                return NextResponse.json(
                  {
                    error:
                      rules.customErrorMessage ||
                      `Question "${field.label}" cannot be later than ${rules.maxDate}.`,
                  },
                  { status: 400 },
                );
              }
            }
          } catch {
            // ignore JSON parse errors
          }
        }
      }
    }

    // 5. Duplicate Submission Detection (same email & content within last 10 minutes)
    const hasProvidedEmail = Boolean(customerEmail && customerEmail.trim());
    const cleanEmail = hasProvidedEmail
      ? customerEmail!.trim().toLowerCase()
      : `no-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${INTERNAL_EMAIL_SUFFIX}`;
    const cleanContent = content?.trim() || "Customer submitted feedback.";

    if (hasProvidedEmail) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const existingSubmission = await prisma.testimonial.findFirst({
        where: {
          formId: form.id,
          content: { startsWith: cleanContent.slice(0, 50) },
          customer: { email: cleanEmail },
          submittedAt: { gte: tenMinutesAgo },
        },
      });

      if (existingSubmission) {
        return NextResponse.json(
          {
            success: true,
            message: "We have already received your testimonial. Thank you!",
            testimonialId: existingSubmission.id,
            redirectUrl: form.redirectUrl || null,
            status: "PENDING",
          },
          { status: 200 },
        );
      }
    }

    // 6. Build structured testimonial content including custom question responses if any
    let finalContent = cleanContent;
    if (form.fields && form.fields.length > 0) {
      const answeredFields: string[] = [];
      for (const field of form.fields) {
        const val = customResponses[field.id];
        if (val !== undefined && val !== null && val !== "") {
          const formattedVal = Array.isArray(val) ? val.join(", ") : String(val);
          answeredFields.push(`\n\nQ: ${field.label}\nA: ${formattedVal}`);
        }
      }
      if (answeredFields.length > 0) {
        finalContent += answeredFields.join("");
      }
    }

    // 7. Atomic Storage: Upsert Customer, Create Testimonial with PENDING status, Create ConsentRecord
    const savedTestimonial = await prisma.$transaction(async (tx) => {
      // 7a. Customer record
      let existingCustomer = null;
      if (hasProvidedEmail) {
        existingCustomer = await tx.customer.findUnique({
          where: {
            workspaceId_email: {
              workspaceId: form.workspaceId,
              email: cleanEmail,
            },
          },
          select: { socialHandle: true },
        });
      }

      const existingMeta = parseCustomerMeta(existingCustomer?.socialHandle);
      const mergedSocialHandle = formatCustomerMeta(
        customerWebsite?.trim() || existingMeta.website,
        existingMeta.notes,
      );

      const customer = await tx.customer.upsert({
        where: {
          workspaceId_email: {
            workspaceId: form.workspaceId,
            email: cleanEmail,
          },
        },
        update: {
          name: customerName?.trim() || "Anonymous Respondent",
          company: customerCompany?.trim() || null,
          title: customerTitle?.trim() || null,
          socialHandle: mergedSocialHandle,
          ...(customerAvatarUrl ? { avatarUrl: customerAvatarUrl } : {}),
        },
        create: {
          workspaceId: form.workspaceId,
          name: customerName?.trim() || "Anonymous Respondent",
          email: cleanEmail,
          company: customerCompany?.trim() || null,
          title: customerTitle?.trim() || null,
          socialHandle: mergedSocialHandle,
          ...(customerAvatarUrl ? { avatarUrl: customerAvatarUrl } : {}),
        },
      });

      // 7b. Testimonial record (Always PENDING - never published automatically)
      const testimonial = await tx.testimonial.create({
        data: {
          workspaceId: form.workspaceId,
          projectId: form.projectId,
          formId: form.id,
          customerId: customer.id,
          content: finalContent,
          rating: numericRating >= 1 && numericRating <= 5 ? numericRating : 5,
          type: type === "VIDEO" ? "VIDEO" : type === "AUDIO" ? "AUDIO" : "TEXT",
          status: "PENDING",
          isFeatured: false,
          sourceType: "FORM",
          sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : null,
          recordingQuestionsJson:
            recordingQuestionsJson || form.recordingQuestionsJson || null,
        },
      });

      // 7c. Associate media asset if an image or video was uploaded
      if (mediaAssetId) {
        await tx.mediaAsset.updateMany({
          where: {
            id: mediaAssetId,
            workspaceId: form.workspaceId,
          },
          data: {
            testimonialId: testimonial.id,
          },
        });
      }

      // 7c. Explicit Consent record capture with Version 1 structured payload
      if (isConsentGranted) {
        const payload: StructuredConsentPayload = {
          version: typeof consentVersion === "string" ? consentVersion : "v1.0",
          statement: form.consentText || "Permission to publish feedback",
          permittedPurposes: {
            publicWebsite: permittedPurposes?.publicWebsite !== false,
            socialMedia: Boolean(permittedPurposes?.socialMedia),
            marketingMaterials: Boolean(permittedPurposes?.marketingMaterials),
          },
          mediaPermission: mediaConsentGranted !== false,
          allowNameDisplay: allowNameDisplay !== false,
          allowCompanyDisplay: allowCompanyDisplay !== false,
          revokedAt: null,
          revocationReason: null,
        };

        const serialized = serializeConsentPayload(payload);

        await tx.consentRecord.create({
          data: {
            workspaceId: form.workspaceId,
            testimonialId: testimonial.id,
            customerName: customerName?.trim() || "Respondent",
            customerEmail: cleanEmail,
            consentText: serialized,
            ipAddress: clientIp,
            userAgent: userAgent.slice(0, 255),
            isConsentGranted: true,
          },
        });
      }

      // 7d. Link invitation recipient if inviteToken is present
      if (inviteToken && typeof inviteToken === "string") {
        const cleanToken = inviteToken.trim();
        const recipient = await tx.invitationRecipient.findUnique({
          where: { token: cleanToken },
        });

        if (recipient && recipient.workspaceId === form.workspaceId) {
          await tx.invitationRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "SUBMITTED",
              submittedAt: new Date(),
              testimonialId: testimonial.id,
            },
          });

          await tx.emailCampaign.update({
            where: { id: recipient.campaignId },
            data: {
              submittedCount: { increment: 1 },
            },
          });
        } else {
          // Check if it belongs to an SMS invitation
          const smsRecipient = await tx.smsRecipient.findUnique({
            where: { token: cleanToken },
          });

          if (smsRecipient && smsRecipient.workspaceId === form.workspaceId) {
            await tx.smsRecipient.update({
              where: { id: smsRecipient.id },
              data: {
                status: "SUBMITTED",
                submittedAt: new Date(),
                testimonialId: testimonial.id,
              },
            });

            await tx.smsCampaign.update({
              where: { id: smsRecipient.campaignId },
              data: {
                submittedCount: { increment: 1 },
              },
            });
          }
        }
      }

      return testimonial;
    });

    // 8. Log Initial Submission Moderation Activity (Non-blocking)
    logModerationActivity({
      workspaceId: form.workspaceId,
      testimonialId: savedTestimonial.id,
      actorName: customerName?.trim() || "Public Respondent",
      actorEmail: hasProvidedEmail ? cleanEmail : null,
      action: "SUBMITTED",
      newStatus: "PENDING",
      details: `Submitted via collection form "${form.title}".`,
      metadata: {
        formId: form.id,
        formSlug: form.slug,
        type,
        rating: numericRating,
      },
    }).catch(() => {});

    // 8b. Log Customer CRM activity if respondent has customer record
    if (savedTestimonial.customerId) {
      logCustomerActivity({
        workspaceId: form.workspaceId,
        customerId: savedTestimonial.customerId,
        action: "TESTIMONIAL_SUBMITTED" as any,
        actorName: customerName?.trim() || "Respondent",
        details: inviteToken
          ? `Submitted testimonial in response to email invitation for form "${form.title}"`
          : `Submitted testimonial via form "${form.title}"`,
        metadata: {
          testimonialId: savedTestimonial.id,
          inviteToken: inviteToken || null,
        },
      }).catch(() => {});
    }

    // 9. Background Media Transcription Job (Non-blocking)
    if (mediaAssetId && (type === "VIDEO" || type === "AUDIO")) {
      triggerMediaTranscription(
        savedTestimonial.id,
        mediaAssetId,
        form.workspaceId,
      ).catch((err) => {
        console.error("Non-blocking transcription dispatch error:", err);
      });
    }

    // 10. Customer Rewards Fulfillment (Non-discriminatory, transparent incentive)
    let rewardInfo: any = null;
    try {
      rewardInfo = await processRewardForSubmission({
        workspaceId: form.workspaceId,
        formId: form.id,
        testimonialId: savedTestimonial.id,
        customerId: savedTestimonial.customerId,
        recipientName: customerName?.trim() || "Respondent",
        recipientEmail: hasProvidedEmail ? cleanEmail : null,
        recipientPhone: body.phoneNumber || null,
        formTitle: form.title,
        workspaceName: form.workspace?.name,
      });
    } catch (rewardErr) {
      console.error("Reward processing non-blocking error:", rewardErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: form.thankYouMessage || "Thank you for sharing your feedback!",
        testimonialId: savedTestimonial.id,
        redirectUrl: form.redirectUrl || null,
        status: "PENDING",
        reward: rewardInfo,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Public submission error:", error);
    const message = error instanceof Error ? error.message : "Failed to submit testimonial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
