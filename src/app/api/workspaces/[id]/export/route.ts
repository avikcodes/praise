import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { SimpleZip } from "@/lib/export/zip-builder";
import { parseConsentPayload } from "@/lib/privacy/consent";
import { displayCustomerEmail, parseCustomerMeta } from "@/lib/customers/utils";
import { getStorageEngine } from "@/lib/storage/engine";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * Complete Workspace Data & Privacy Export API.
 * Securely bundles all workspace data:
 * - Projects & Brand Identity settings
 * - Customer profiles & notes
 * - Collection Forms configuration
 * - Testimonial submissions & status
 * - Verifiable Consent Audit Ledger (JSON + CSV)
 * - Media files and integrity manifest
 *
 * Scoped strictly to verified workspace owners/admins.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "zip"; // zip, json

    // 1. Fetch workspace and full relation graph
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        projects: {
          include: { brand: true },
        },
        brands: true,
        customers: {
          include: {
            testimonials: {
              select: { id: true },
            },
          },
        },
        forms: {
          include: { fields: true },
        },
        widgets: true,
        testimonials: {
          include: {
            customer: true,
            project: { select: { id: true, name: true, slug: true } },
            form: { select: { id: true, title: true, slug: true } },
            tags: { include: { tag: true } },
            mediaAssets: true,
            consentRecords: {
              orderBy: { grantedAt: "desc" },
            },
          },
        },
        consentRecords: {
          orderBy: { grantedAt: "desc" },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 },
      );
    }

    const now = new Date();
    const nowStr = now.toISOString().replace(/[:.]/g, "-");

    // 2. Prepare structured data objects
    const exportMetadata = {
      exportVersion: "1.0",
      exportedAt: now.toISOString(),
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        createdAt: workspace.createdAt.toISOString(),
      },
      counts: {
        projects: workspace.projects.length,
        brands: workspace.brands.length,
        customers: workspace.customers.length,
        forms: workspace.forms.length,
        widgets: workspace.widgets.length,
        testimonials: workspace.testimonials.length,
        consentRecords: workspace.consentRecords.length,
      },
    };

    const customersExport = workspace.customers.map((c) => {
      const meta = parseCustomerMeta(c.socialHandle);
      return {
        id: c.id,
        name: c.name,
        email: displayCustomerEmail(c.email),
        company: c.company,
        title: c.title,
        avatarUrl: c.avatarUrl,
        website: meta.website,
        internalNotes: meta.notes,
        submissionCount: c.testimonials.length,
        createdAt: c.createdAt.toISOString(),
      };
    });

    const testimonialsExport = workspace.testimonials.map((t) => {
      const meta = parseCustomerMeta(t.customer?.socialHandle);
      const consent = t.consentRecords[0];
      const parsedConsent = consent ? parseConsentPayload(consent.consentText) : null;

      return {
        id: t.id,
        content: t.content,
        rating: t.rating,
        type: t.type,
        status: t.status,
        isFeatured: t.isFeatured,
        submittedAt: t.submittedAt.toISOString(),
        customer: t.customer
          ? {
              id: t.customer.id,
              name: t.customer.name,
              email: displayCustomerEmail(t.customer.email),
              company: t.customer.company,
              title: t.customer.title,
              website: meta.website,
            }
          : null,
        project: t.project ? { id: t.project.id, name: t.project.name, slug: t.project.slug } : null,
        form: t.form ? { id: t.form.id, title: t.form.title, slug: t.form.slug } : null,
        tags: t.tags.map((tg) => tg.tag.name),
        mediaAssets: t.mediaAssets.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          mimeType: m.mimeType,
          fileSizeBytes: m.fileSizeBytes,
        })),
        consent: consent
          ? {
              id: consent.id,
              isGranted: consent.isConsentGranted && !consent.revokedAt,
              grantedAt: consent.grantedAt.toISOString(),
              revokedAt: consent.revokedAt ? consent.revokedAt.toISOString() : null,
              statement: parsedConsent?.statement,
              version: parsedConsent?.version,
              permittedPurposes: parsedConsent?.permittedPurposes,
              mediaPermission: parsedConsent?.mediaPermission,
            }
          : null,
      };
    });

    const consentLedgerExport = workspace.consentRecords.map((cr) => {
      const parsed = parseConsentPayload(cr.consentText);
      return {
        id: cr.id,
        testimonialId: cr.testimonialId,
        customerName: cr.customerName,
        customerEmail: cr.customerEmail,
        isConsentGranted: cr.isConsentGranted,
        grantedAt: cr.grantedAt.toISOString(),
        revokedAt: cr.revokedAt ? cr.revokedAt.toISOString() : null,
        consentVersion: parsed.version,
        consentStatement: parsed.statement,
        permittedPurposes: parsed.permittedPurposes,
        mediaPermission: parsed.mediaPermission,
        ipAddress: cr.ipAddress || null,
        userAgent: cr.userAgent || null,
      };
    });

    // Consent CSV generation
    const csvEscape = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const consentCsvRows = [
      [
        "Consent ID",
        "Testimonial ID",
        "Customer Name",
        "Customer Email",
        "Status",
        "Granted At",
        "Revoked At",
        "Version",
        "Statement",
        "Public Website",
        "Social Media",
        "Marketing Materials",
        "Media Permitted",
      ].join(","),
      ...consentLedgerExport.map((c) =>
        [
          csvEscape(c.id),
          csvEscape(c.testimonialId),
          csvEscape(c.customerName),
          csvEscape(c.customerEmail),
          csvEscape(c.isConsentGranted && !c.revokedAt ? "ACTIVE" : "REVOKED"),
          csvEscape(c.grantedAt),
          csvEscape(c.revokedAt || ""),
          csvEscape(c.consentVersion),
          csvEscape(c.consentStatement),
          csvEscape(c.permittedPurposes.publicWebsite ? "YES" : "NO"),
          csvEscape(c.permittedPurposes.socialMedia ? "YES" : "NO"),
          csvEscape(c.permittedPurposes.marketingMaterials ? "YES" : "NO"),
          csvEscape(c.mediaPermission ? "YES" : "NO"),
        ].join(",")
      ),
    ].join("\n");

    const fullExportObject = {
      meta: exportMetadata,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        projects: workspace.projects,
        brands: workspace.brands,
        forms: workspace.forms,
        widgets: workspace.widgets,
      },
      customers: customersExport,
      testimonials: testimonialsExport,
      consentLedger: consentLedgerExport,
    };

    if (format === "json") {
      return new NextResponse(JSON.stringify(fullExportObject, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="praise-workspace-${workspace.slug}-${nowStr}.json"`,
        },
      });
    }

    // Default: ZIP archive containing separate structured JSON files, CSV audit ledger, and media
    const zip = new SimpleZip();
    zip.addFile("manifest.json", JSON.stringify(exportMetadata, null, 2));
    zip.addFile("testimonials.json", JSON.stringify(testimonialsExport, null, 2));
    zip.addFile("customers.json", JSON.stringify(customersExport, null, 2));
    zip.addFile("consent-ledger.json", JSON.stringify(consentLedgerExport, null, 2));
    zip.addFile("consent-ledger.csv", consentCsvRows);
    zip.addFile("workspace-config.json", JSON.stringify(workspace, null, 2));

    // Include original media files where stored locally
    const engine = getStorageEngine();
    const mediaList = await prisma.mediaAsset.findMany({
      where: { workspaceId },
      select: { id: true, localPath: true, mimeType: true, testimonialId: true },
    });

    for (const m of mediaList) {
      if (!m.localPath) continue;
      try {
        const file = await engine.read(m.localPath);
        if (file?.buffer) {
          const ext = m.localPath.split(".").pop() || "bin";
          const zipPath = `media/${m.testimonialId || "unassigned"}_${m.id}.${ext}`;
          zip.addFile(zipPath, file.buffer);
        }
      } catch {
        // Skip unreadable files gracefully
      }
    }

    const zipBuffer = zip.generateBuffer();

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="praise-workspace-${workspace.slug}-${nowStr}.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to export workspace data.";
    return NextResponse.json({ error: message }, { status });
  }
}
