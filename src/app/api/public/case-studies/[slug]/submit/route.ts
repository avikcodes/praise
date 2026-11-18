import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { MeasurableOutcome } from "@/lib/case-studies/types";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/**
 * POST: Handles public case study submission without requiring a user account.
 */
export async function POST(request: Request, context: RouteParams) {
  const clientIp = getClientIp(request);

  // Rate limiting: 10 submissions per 10 minutes per IP
  const rateLimit = checkRateLimit(`cs-sub-${clientIp}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many submissions. Please wait ${rateLimit.resetSeconds}s before trying again.` },
      { status: 429 }
    );
  }

  try {
    const { slug } = await context.params;

    const form = await prisma.caseStudyForm.findFirst({
      where: { slug },
    });

    if (!form) {
      return NextResponse.json({ error: "Case study form not found" }, { status: 404 });
    }

    if (form.status === "PAUSED" || form.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "This case study form is not currently accepting submissions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerRole,
      companyName,
      companySize,
      companyIndustry,
      companyWebsite,
      avatarUrl,

      initialProblem,
      previousSolution,
      productImplementation,
      experienceSummary,
      resultsAchieved,
      measurableOutcomes,
      primaryQuote,
      peerAdvice,
      imageAssetIds,
      videoAssetId,

      consentGranted,
      consentText,
    } = body;

    // 1. Mandatory Validations
    if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
      return NextResponse.json({ error: "Your name is required." }, { status: 400 });
    }

    if (!customerEmail || typeof customerEmail !== "string" || !customerEmail.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }

    if (!initialProblem || typeof initialProblem !== "string" || !initialProblem.trim()) {
      return NextResponse.json(
        { error: "Please describe the initial challenge or problem your team faced." },
        { status: 400 }
      );
    }

    if (!resultsAchieved || typeof resultsAchieved !== "string" || !resultsAchieved.trim()) {
      return NextResponse.json(
        { error: "Please describe the business results or outcomes achieved." },
        { status: 400 }
      );
    }

    // Consent Validation
    if (form.collectConsent && form.consentRequired && !consentGranted) {
      return NextResponse.json(
        { error: "Consent to publish this case study is required to submit." },
        { status: 400 }
      );
    }

    // 2. Validate & Sanitize Measurable Outcomes
    let sanitizedOutcomes: MeasurableOutcome[] = [];
    if (Array.isArray(measurableOutcomes)) {
      sanitizedOutcomes = measurableOutcomes
        .filter((o) => o && typeof o.metric === "string" && o.metric.trim() && o.improvement?.trim())
        .map((o, idx) => ({
          id: o.id || `metric-${idx + 1}-${Date.now().toString().slice(-4)}`,
          metric: String(o.metric).trim(),
          before: o.before ? String(o.before).trim() : undefined,
          after: o.after ? String(o.after).trim() : undefined,
          improvement: String(o.improvement).trim(),
          timeframe: o.timeframe ? String(o.timeframe).trim() : undefined,
        }));
    }

    // 3. Resolve or Create Customer in Workspace
    const normalizedEmail = customerEmail.trim().toLowerCase();
    let customerId: string | null = null;

    try {
      let existingCustomer = await prisma.customer.findUnique({
        where: {
          workspaceId_email: {
            workspaceId: form.workspaceId,
            email: normalizedEmail,
          },
        },
      });

      if (existingCustomer) {
        // Update customer details if missing
        if (!existingCustomer.company || !existingCustomer.title) {
          existingCustomer = await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: {
              company: existingCustomer.company || companyName.trim(),
              title: existingCustomer.title || (customerRole ? customerRole.trim() : null),
              avatarUrl: existingCustomer.avatarUrl || avatarUrl || null,
              website: existingCustomer.website || companyWebsite || null,
            },
          });
        }
        customerId = existingCustomer.id;
      } else {
        const newCustomer = await prisma.customer.create({
          data: {
            workspaceId: form.workspaceId,
            name: customerName.trim(),
            email: normalizedEmail,
            company: companyName.trim(),
            title: customerRole?.trim() || null,
            avatarUrl: avatarUrl || null,
            website: companyWebsite || null,
            stage: "CHAMPION",
          },
        });
        customerId = newCustomer.id;
      }
    } catch (custErr) {
      console.warn("Could not upsert customer record:", custErr);
    }

    // 4. Create Immutable Case Study Response
    const responseRecord = await prisma.caseStudyResponse.create({
      data: {
        formId: form.id,
        workspaceId: form.workspaceId,
        customerId,
        projectId: form.projectId,
        brandId: form.brandId,
        status: "SUBMITTED",
        submittedAt: new Date(),

        // Customer statements (Preserved verbatim)
        customerName: customerName.trim(),
        customerEmail: normalizedEmail,
        customerRole: customerRole?.trim() || null,
        companyName: companyName.trim(),
        companySize: companySize?.trim() || null,
        companyIndustry: companyIndustry?.trim() || null,
        companyWebsite: companyWebsite?.trim() || null,
        avatarUrl: avatarUrl || null,

        initialProblem: initialProblem.trim(),
        previousSolution: previousSolution?.trim() || null,
        productImplementation: productImplementation?.trim() || null,
        experienceSummary: experienceSummary?.trim() || null,
        resultsAchieved: resultsAchieved.trim(),
        measurableOutcomesJson: sanitizedOutcomes.length > 0 ? JSON.stringify(sanitizedOutcomes) : null,
        primaryQuote: primaryQuote?.trim() || null,
        peerAdvice: peerAdvice?.trim() || null,
        imageAssetIdsJson: Array.isArray(imageAssetIds) && imageAssetIds.length > 0 ? JSON.stringify(imageAssetIds) : null,
        videoAssetId: videoAssetId || null,

        consentGranted: Boolean(consentGranted),
        consentText: consentText || form.consentText,
        consentTimestamp: new Date(),

        // Default editorial summary from verbatim results
        editorialTitle: `${companyName.trim()}: Success Story`,
      },
    });

    // 5. Increment Form Submissions Count
    await prisma.caseStudyForm.update({
      where: { id: form.id },
      data: { submissionsCount: { increment: 1 } },
    });

    return NextResponse.json(
      {
        success: true,
        responseId: responseRecord.id,
        message: form.thankYouHeading || "Thank you for sharing your story!",
        thankYouText: form.thankYouText || "We appreciate your time and transparency.",
        redirectUrl: form.redirectUrl || null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error submitting case study:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit case study" },
      { status: 500 }
    );
  }
}
