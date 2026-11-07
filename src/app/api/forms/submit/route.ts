import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import {
  checkRateLimit,
  getClientIp,
  validateSpamHeuristics,
} from "@/lib/security/rate-limit";

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
      customResponses = {},
      mediaAssetId,
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
    if (form.collectName && form.nameRequired && !customerName?.trim()) {
      return NextResponse.json(
        { error: "Your full name is required." },
        { status: 400 },
      );
    }

    if (form.collectEmail) {
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

    if (form.collectCompany && form.companyRequired && !customerCompany?.trim()) {
      return NextResponse.json(
        { error: "Company name is required." },
        { status: 400 },
      );
    }

    if (form.collectJobTitle && form.jobTitleRequired && !customerTitle?.trim()) {
      return NextResponse.json(
        { error: "Job title is required." },
        { status: 400 },
      );
    }

    if (form.collectWebsite && form.websiteRequired && !customerWebsite?.trim()) {
      return NextResponse.json(
        { error: "Website or profile URL is required." },
        { status: 400 },
      );
    }

    const numericRating = Number(rating);
    if (form.collectRating && form.ratingRequired) {
      if (!numericRating || numericRating < 1 || numericRating > 5) {
        return NextResponse.json(
          { error: "Please select an overall rating between 1 and 5 stars." },
          { status: 400 },
        );
      }
    }

    if (form.collectText && type === "TEXT") {
      if (form.textRequired && !content?.trim()) {
        return NextResponse.json(
          { error: "Testimonial text content is required." },
          { status: 400 },
        );
      }
    }

    if (form.collectConsent && form.consentRequired && !isConsentGranted) {
      return NextResponse.json(
        { error: "You must grant permission to submit your feedback." },
        { status: 400 },
      );
    }

    // Validate required custom fields
    if (form.fields && form.fields.length > 0) {
      for (const field of form.fields) {
        if (field.isRequired) {
          const val = customResponses[field.id];
          const isEmpty =
            val === undefined ||
            val === null ||
            (typeof val === "string" && !val.trim()) ||
            (Array.isArray(val) && val.length === 0);

          if (isEmpty) {
            return NextResponse.json(
              { error: `Question "${field.label}" is required.` },
              { status: 400 },
            );
          }
        }
      }
    }

    // 5. Duplicate Submission Detection (same email & content within last 10 minutes)
    const cleanEmail = (customerEmail || `respondent-${Date.now()}@praise.local`)
      .trim()
      .toLowerCase();
    const cleanContent = content?.trim() || "Customer submitted feedback.";

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
          socialHandle: customerWebsite?.trim() || null,
          ...(customerAvatarUrl ? { avatarUrl: customerAvatarUrl } : {}),
        },
        create: {
          workspaceId: form.workspaceId,
          name: customerName?.trim() || "Anonymous Respondent",
          email: cleanEmail,
          company: customerCompany?.trim() || null,
          title: customerTitle?.trim() || null,
          socialHandle: customerWebsite?.trim() || null,
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

      // 7c. Consent record capture
      if (isConsentGranted) {
        await tx.consentRecord.create({
          data: {
            workspaceId: form.workspaceId,
            testimonialId: testimonial.id,
            customerName: customerName?.trim() || "Respondent",
            customerEmail: cleanEmail,
            consentText: form.consentText || "Permission to publish feedback",
            ipAddress: clientIp,
            userAgent: userAgent.slice(0, 255),
            isConsentGranted: true,
          },
        });
      }

      return testimonial;
    });

    return NextResponse.json(
      {
        success: true,
        message: form.thankYouMessage || "Thank you for sharing your feedback!",
        testimonialId: savedTestimonial.id,
        redirectUrl: form.redirectUrl || null,
        status: "PENDING",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Public submission error:", error);
    const message = error instanceof Error ? error.message : "Failed to submit testimonial.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
