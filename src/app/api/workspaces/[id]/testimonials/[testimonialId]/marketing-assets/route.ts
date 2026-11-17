import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { uploadMediaAsset, MediaUploadError } from "@/lib/storage/service";

type RouteParams = {
  params: Promise<{ id: string; testimonialId: string }>;
};

/**
 * GET: Lists marketing assets and returns customer consent status for a testimonial.
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const testimonial = await prisma.testimonial.findFirst({
      where: {
        id: testimonialId,
        workspaceId,
      },
      include: {
        customer: true,
        consentRecords: {
          orderBy: { grantedAt: "desc" },
          take: 1,
        },
        mediaAssets: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!testimonial) {
      return NextResponse.json(
        { error: "Testimonial not found in this workspace." },
        { status: 404 },
      );
    }

    const consentRecord = testimonial.consentRecords[0] || null;
    const isConsentRevoked = Boolean(
      consentRecord && (!consentRecord.isConsentGranted || consentRecord.revokedAt),
    );
    const hasConsent = !isConsentRevoked;

    return NextResponse.json({
      success: true,
      testimonial: {
        id: testimonial.id,
        content: testimonial.content,
        rating: testimonial.rating,
        type: testimonial.type,
        submittedAt: testimonial.submittedAt.toISOString(),
        customer: testimonial.customer
          ? {
              name: testimonial.customer.name,
              company: testimonial.customer.company,
              title: testimonial.customer.title,
              avatarUrl: testimonial.customer.avatarUrl,
              website: testimonial.customer.website,
            }
          : {
              name: "Customer",
              company: null,
              title: null,
              avatarUrl: null,
              website: null,
            },
      },
      consent: {
        hasConsent,
        isRevoked: isConsentRevoked,
        consentText: consentRecord?.consentText || null,
        grantedAt: consentRecord?.grantedAt?.toISOString() || null,
        revokedAt: consentRecord?.revokedAt?.toISOString() || null,
      },
      assets: testimonial.mediaAssets.map((m) => ({
        id: m.id,
        testimonialId: m.testimonialId,
        workspaceId: m.workspaceId,
        type: m.type,
        url: m.url,
        fileSizeBytes: m.fileSizeBytes,
        mimeType: m.mimeType,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load marketing assets.";
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST: Saves a rendered marketing asset (image card, quote graphic, or thumbnail).
 * Enforces customer consent and workspace ownership.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, testimonialId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN", "MEMBER"]);

    // 1. Verify testimonial exists in this workspace
    const testimonial = await prisma.testimonial.findFirst({
      where: {
        id: testimonialId,
        workspaceId,
      },
      include: {
        consentRecords: {
          orderBy: { grantedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!testimonial) {
      return NextResponse.json(
        { error: "Testimonial not found in this workspace." },
        { status: 404 },
      );
    }

    // 2. Strict Consent Gate: If consent was revoked, forbid generating or saving marketing assets
    const latestConsent = testimonial.consentRecords[0];
    if (latestConsent && (!latestConsent.isConsentGranted || latestConsent.revokedAt)) {
      return NextResponse.json(
        {
          error:
            "Marketing asset export blocked: Customer has revoked or declined consent for marketing usage of this testimonial.",
          code: "CONSENT_REVOKED",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { dataUrl, type = "IMAGE", isEdited = false } = body;

    if (!dataUrl || typeof dataUrl !== "string") {
      return NextResponse.json(
        { error: "Invalid payload: dataUrl is required." },
        { status: 400 },
      );
    }

    // Convert base64 dataUrl to buffer
    const base64Data = dataUrl.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "Provided asset data is empty or invalid." },
        { status: 400 },
      );
    }

    // 3. Save asset via storage service and create MediaAsset record
    const asset = await uploadMediaAsset({
      buffer,
      workspaceId,
      testimonialId,
      allowedTypes: ["IMAGE", "VIDEO"],
      typeHint: type.toLowerCase(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Marketing asset saved successfully.",
        asset,
        isEdited,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof MediaUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to save marketing asset.";
    return NextResponse.json({ error: message }, { status });
  }
}
