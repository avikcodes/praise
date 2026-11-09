import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { parseConsentPayload } from "@/lib/privacy/consent";
import { ConsentRecordDetail } from "@/types/privacy";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * Access-controlled consent audit records query endpoint.
 * Restricted to workspace Owners and Admins only.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase().trim() || "";
    const projectId = url.searchParams.get("projectId") || "";
    const statusFilter = url.searchParams.get("status") || "all"; // all, active, revoked

    const consentRecords = await prisma.consentRecord.findMany({
      where: {
        workspaceId,
        ...(projectId
          ? {
              testimonial: {
                projectId,
              },
            }
          : {}),
        ...(statusFilter === "active"
          ? { isConsentGranted: true, revokedAt: null }
          : statusFilter === "revoked"
          ? {
              OR: [
                { isConsentGranted: false },
                { revokedAt: { not: null } },
              ],
            }
          : {}),
        ...(search
          ? {
              OR: [
                { customerName: { contains: search, mode: "insensitive" } },
                { customerEmail: { contains: search, mode: "insensitive" } },
                { consentText: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        testimonial: {
          select: {
            id: true,
            content: true,
            status: true,
            type: true,
            customerId: true,
            project: {
              select: { id: true, name: true },
            },
            mediaAssets: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { grantedAt: "desc" },
    });

    const items: ConsentRecordDetail[] = consentRecords.map((r) => {
      const structured = parseConsentPayload(r.consentText);
      const snippet = r.testimonial?.content
        ? r.testimonial.content.slice(0, 120) + (r.testimonial.content.length > 120 ? "..." : "")
        : "";

      return {
        id: r.id,
        workspaceId: r.workspaceId,
        testimonialId: r.testimonialId,
        customerId: r.testimonial?.customerId || null,
        customerName: r.customerName,
        customerEmail: r.customerEmail,
        consentText: r.consentText,
        structuredConsent: structured,
        isConsentGranted: r.isConsentGranted && !r.revokedAt,
        grantedAt: r.grantedAt.toISOString(),
        revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
        testimonialSnippet: snippet,
        testimonialStatus: r.testimonial?.status || "UNKNOWN",
        testimonialType: r.testimonial?.type || "TEXT",
        projectName: r.testimonial?.project?.name || null,
        projectId: r.testimonial?.project?.id || null,
        hasMedia: Boolean(r.testimonial?.mediaAssets && r.testimonial.mediaAssets.length > 0),
      };
    });

    return NextResponse.json({
      success: true,
      records: items,
      totalCount: items.length,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load consent audit records.";
    return NextResponse.json({ error: message }, { status });
  }
}

