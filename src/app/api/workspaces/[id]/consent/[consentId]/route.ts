import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  parseConsentPayload,
  serializeConsentPayload,
  recordTombstone,
} from "@/lib/privacy/consent";

type RouteParams = {
  params: Promise<{ id: string; consentId: string }>;
};

/**
 * Access-controlled consent revocation & management endpoint.
 * Restricted to workspace Owners and Admins only.
 */
export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, consentId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { action, reason } = body;

    const record = await prisma.consentRecord.findUnique({
      where: {
        id: consentId,
        workspaceId,
      },
      include: {
        testimonial: {
          select: { id: true, status: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Consent record not found." },
        { status: 404 },
      );
    }

    if (action === "REVOKE") {
      const now = new Date();
      const currentPayload = parseConsentPayload(record.consentText);
      const updatedPayload = {
        ...currentPayload,
        revokedAt: now.toISOString(),
        revocationReason: reason || "Revoked by customer request / workspace administrator.",
        permittedPurposes: {
          publicWebsite: false,
          socialMedia: false,
          marketingMaterials: false,
        },
      };

      // 1. Update ConsentRecord
      await prisma.consentRecord.update({
        where: { id: consentId },
        data: {
          isConsentGranted: false,
          revokedAt: now,
          consentText: serializeConsentPayload(updatedPayload),
        },
      });

      // 2. Unpublish testimonial immediately (set to ARCHIVED if currently APPROVED)
      if (record.testimonial && record.testimonial.status === "APPROVED") {
        await prisma.testimonial.update({
          where: { id: record.testimonialId },
          data: { status: "ARCHIVED" },
        });
      }

      // 3. Record in tombstone registry so backups never republish it
      recordTombstone({
        type: "TESTIMONIAL",
        originalId: record.testimonialId,
        workspaceId,
        reason: "WITHDRAWAL",
      });

      return NextResponse.json({
        success: true,
        message: "Consent successfully revoked. Content has been unpublished and archived.",
        revokedAt: now.toISOString(),
      });
    }

    if (action === "RESTORE") {
      const currentPayload = parseConsentPayload(record.consentText);
      const updatedPayload = {
        ...currentPayload,
        revokedAt: null,
        revocationReason: null,
        permittedPurposes: {
          publicWebsite: true,
          socialMedia: currentPayload.permittedPurposes.socialMedia,
          marketingMaterials: currentPayload.permittedPurposes.marketingMaterials,
        },
      };

      await prisma.consentRecord.update({
        where: { id: consentId },
        data: {
          isConsentGranted: true,
          revokedAt: null,
          consentText: serializeConsentPayload(updatedPayload),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Consent record restored as active.",
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions are "REVOKE" and "RESTORE".' },
      { status: 400 },
    );
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to update consent record.";
    return NextResponse.json({ error: message }, { status });
  }
}

