import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { Prisma } from "@prisma/client";
import { displayCustomerEmail, parseCustomerMeta } from "@/lib/customers/utils";
import { getStorageEngine } from "@/lib/storage/engine";
import {
  ExportTestimonialRecord,
  formatTestimonialsToCsv,
  formatTestimonialsToJson,
  generateManifest,
} from "@/lib/export/formatter";
import { SimpleZip } from "@/lib/export/zip-builder";

type RouteParams = {
  params: Promise<{ id: string }>;
};

async function handleExport(
  workspaceId: string,
  requestUrl: string,
  options: {
    format?: string;
    testimonialIds?: string[];
    projectId?: string | null;
    status?: string | null;
    rating?: string | number | null;
    dateRange?: string | null;
    search?: string | null;
    includeCustomerInfo?: boolean;
    anonymizeEmails?: boolean;
    includeMedia?: boolean;
  }
) {
  // 1. Auth check: verify workspace membership
  await requireWorkspaceMember(workspaceId);
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const {
    format = "csv",
    testimonialIds = [],
    projectId = null,
    status = "all",
    rating = "all",
    dateRange = "all",
    search = null,
    includeCustomerInfo = true,
    anonymizeEmails = false,
    includeMedia = true,
  } = options;

  // 2. Build Prisma Query strictly scoped to this workspace
  const where: Prisma.TestimonialWhereInput = {
    workspaceId,
  };

  if (Array.isArray(testimonialIds) && testimonialIds.length > 0) {
    where.id = { in: testimonialIds };
  }

  if (projectId && projectId !== "all") {
    where.projectId = projectId;
  }

  if (status && status !== "all") {
    where.status = status.toUpperCase() as Prisma.EnumTestimonialStatusFilter;
  }

  if (rating && rating !== "all") {
    const rNum = Number(rating);
    if (!isNaN(rNum)) {
      where.rating = rNum;
    }
  }

  if (dateRange && dateRange !== "all") {
    const now = new Date();
    let days = 0;
    if (dateRange === "7d") days = 7;
    else if (dateRange === "30d") days = 30;
    else if (dateRange === "90d") days = 90;

    if (days > 0) {
      const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      where.submittedAt = { gte: threshold };
    }
  }

  if (search && search.trim()) {
    const query = search.trim();
    where.OR = [
      { content: { contains: query, mode: "insensitive" } },
      { customer: { name: { contains: query, mode: "insensitive" } } },
      { customer: { email: { contains: query, mode: "insensitive" } } },
      { customer: { company: { contains: query, mode: "insensitive" } } },
      { customer: { title: { contains: query, mode: "insensitive" } } },
    ];
  }

  // 3. Fetch testimonials with all relations
  const testimonials = await prisma.testimonial.findMany({
    where,
    include: {
      customer: true,
      project: {
        select: { id: true, name: true, slug: true, color: true },
      },
      form: {
        select: { id: true, title: true, slug: true },
      },
      tags: {
        include: { tag: true },
      },
      mediaAssets: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  if (testimonials.length === 0) {
    return NextResponse.json(
      { error: "No testimonials matched the selected export criteria." },
      { status: 404 }
    );
  }

  // 4. Transform records into exportable representation
  const exportRecords: ExportTestimonialRecord[] = testimonials.map((t) => {
    let customerData = null;
    if (t.customer) {
      const meta = parseCustomerMeta(t.customer.socialHandle);
      customerData = {
        id: t.customer.id,
        name: t.customer.name,
        email: displayCustomerEmail(t.customer.email),
        company: t.customer.company,
        title: t.customer.title,
        website: meta.website,
        avatarUrl: t.customer.avatarUrl,
      };
    }

    const tagNames = t.tags.map((tagRel) => tagRel.tag.name);

    return {
      id: t.id,
      content: t.content,
      rating: t.rating ?? 5,
      status: t.status,
      type: t.type,
      isFeatured: t.isFeatured,
      submittedAt: t.submittedAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      customer: customerData,
      project: t.project,
      form: t.form,
      tags: tagNames,
      mediaAssets: t.mediaAssets.map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url,
        mimeType: m.mimeType,
        fileSizeBytes: m.fileSizeBytes,
        localPath: m.localPath,
      })),
    };
  });

  const nowStr = new Date().toISOString().split("T")[0];
  const urlObj = new URL(requestUrl);
  const baseUrl = urlObj.origin;

  // 5. Output format delivery
  if (format === "json") {
    const jsonOutput = formatTestimonialsToJson(
      exportRecords,
      {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        filters: { status, projectId, rating, dateRange },
      },
      { includeCustomerInfo, anonymizeEmails, baseUrl }
    );

    return new NextResponse(jsonOutput, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="praise-testimonials-${workspace.slug}-${nowStr}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "zip") {
    const zip = new SimpleZip();

    // 1. Add CSV
    const csvContent = formatTestimonialsToCsv(exportRecords, {
      includeCustomerInfo,
      anonymizeEmails,
      baseUrl,
    });
    zip.addFile("testimonials.csv", csvContent);

    // 2. Add JSON
    const jsonContent = formatTestimonialsToJson(
      exportRecords,
      {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        filters: { status, projectId, rating, dateRange },
      },
      { includeCustomerInfo, anonymizeEmails, baseUrl }
    );
    zip.addFile("testimonials.json", jsonContent);

    // 3. Add Manifest
    const { manifestString, mediaEntries } = generateManifest(exportRecords, {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    });
    zip.addFile("manifest.json", manifestString);

    // 4. Add original media files if requested
    if (includeMedia && mediaEntries.length > 0) {
      const storageEngine = getStorageEngine();
      for (const entry of mediaEntries) {
        try {
          const fileResult = await storageEngine.read(entry.localKey);
          if (fileResult && fileResult.buffer) {
            zip.addFile(entry.archivePath, fileResult.buffer);
          }
        } catch (err) {
          console.warn(`Could not read media file ${entry.localKey} for zip:`, err);
        }
      }
    }

    const zipBuffer = zip.generateBuffer();

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="praise-export-${workspace.slug}-${nowStr}.zip"`,
        "Content-Length": String(zipBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  }

  // Default: CSV format
  const csvOutput = formatTestimonialsToCsv(exportRecords, {
    includeCustomerInfo,
    anonymizeEmails,
    baseUrl,
  });

  return new NextResponse(csvOutput, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="praise-testimonials-${workspace.slug}-${nowStr}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    const body = await request.json().catch(() => ({}));
    return await handleExport(workspaceId, request.url, body);
  } catch (error: unknown) {
    console.error("Testimonial export failed:", error);
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to generate export.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    const { searchParams } = new URL(request.url);

    const idsParam = searchParams.get("ids");
    const testimonialIds = idsParam ? idsParam.split(",").filter(Boolean) : [];

    return await handleExport(workspaceId, request.url, {
      format: searchParams.get("format") || "csv",
      testimonialIds,
      projectId: searchParams.get("projectId"),
      status: searchParams.get("status"),
      rating: searchParams.get("rating"),
      dateRange: searchParams.get("dateRange"),
      search: searchParams.get("search"),
      includeCustomerInfo: searchParams.get("includeCustomerInfo") !== "false",
      anonymizeEmails: searchParams.get("anonymizeEmails") === "true",
      includeMedia: searchParams.get("includeMedia") !== "false",
    });
  } catch (error: unknown) {
    console.error("Testimonial export failed:", error);
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to generate export.";
    return NextResponse.json({ error: message }, { status });
  }
}
