import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { DryRunResult, ParsedImportRecord } from "@/lib/import/types";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function normalizeText(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId);

    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only workspace owners and administrators can import testimonials." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      records = [],
      defaultProjectId = null,
      defaultStatus = "PENDING",
    } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "No records supplied for validation." },
        { status: 400 }
      );
    }

    // Maximum safe limit per single file
    if (records.length > 5000) {
      return NextResponse.json(
        {
          error:
            "File contains too many records (limit is 5,000 per import). Please split your file into smaller batches.",
        },
        { status: 400 }
      );
    }

    // Pre-fetch workspace state for lightning-fast dry-run analysis
    const [existingProjects, existingCustomers, existingTestimonials, existingTags] =
      await Promise.all([
        prisma.project.findMany({
          where: { workspaceId },
          select: { id: true, name: true, slug: true },
        }),
        prisma.customer.findMany({
          where: { workspaceId },
          select: { id: true, email: true, name: true },
        }),
        prisma.testimonial.findMany({
          where: { workspaceId },
          select: { id: true, content: true, customerId: true },
        }),
        prisma.tag.findMany({
          where: { workspaceId },
          select: { id: true, name: true },
        }),
      ]);

    // Fast lookup structures
    const projectLookup = new Map<string, string>(); // name/slug/id -> id
    for (const p of existingProjects) {
      projectLookup.set(p.id.toLowerCase(), p.id);
      projectLookup.set(p.name.toLowerCase().trim(), p.id);
      projectLookup.set(p.slug.toLowerCase().trim(), p.id);
    }

    const existingEmailSet = new Set<string>();
    for (const c of existingCustomers) {
      existingEmailSet.add(c.email.toLowerCase().trim());
    }

    const existingTextSet = new Set<string>();
    for (const t of existingTestimonials) {
      existingTextSet.add(normalizeText(t.content));
    }

    const existingTagNameSet = new Set<string>();
    for (const tag of existingTags) {
      existingTagNameSet.add(tag.name.toLowerCase().trim());
    }

    const seenImportTexts = new Set<string>();
    const seenNewEmails = new Set<string>();
    const seenNewTags = new Set<string>();

    const parsedRecords: ParsedImportRecord[] = [];
    const errorsList: { rowNumber: number; error: string; snippet?: string }[] = [];

    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    let newCustomersCount = 0;
    let existingCustomersCount = 0;

    for (let index = 0; index < records.length; index++) {
      const raw = records[index];
      const rowNumber = raw.rowNumber || index + 1;
      const validationErrors: string[] = [];

      // 1. Content validation
      const content = typeof raw.content === "string" ? raw.content.trim() : "";
      if (!content) {
        validationErrors.push("Testimonial content / review text is missing.");
      } else if (content.length > 50000) {
        validationErrors.push("Testimonial text exceeds maximum length of 50,000 characters.");
      }

      // 2. Rating normalization
      let rating = 5;
      if (raw.rating !== undefined && raw.rating !== null && raw.rating !== "") {
        const parsedR = Number(raw.rating);
        if (isNaN(parsedR)) {
          validationErrors.push(`Rating "${raw.rating}" is not a valid number.`);
        } else {
          // Normalize if on a 10-point scale
          if (parsedR > 5 && parsedR <= 10) {
            rating = Math.round(parsedR / 2);
          } else {
            rating = Math.max(1, Math.min(5, Math.round(parsedR)));
          }
        }
      }

      // 3. Date normalization
      let submittedAtIso = new Date().toISOString();
      if (raw.submittedAt && String(raw.submittedAt).trim()) {
        const parsedDate = new Date(String(raw.submittedAt).trim());
        if (isNaN(parsedDate.getTime())) {
          validationErrors.push(
            `Submission date "${raw.submittedAt}" could not be recognized as a valid date.`
          );
        } else {
          submittedAtIso = parsedDate.toISOString();
        }
      }

      // 4. Customer Info & Deduplication
      const customerName =
        typeof raw.customerName === "string" && raw.customerName.trim()
          ? raw.customerName.trim()
          : "Anonymous Customer";

      const cleanEmail =
        typeof raw.customerEmail === "string" && raw.customerEmail.trim()
          ? raw.customerEmail.trim().toLowerCase()
          : null;

      let isExistingCustomer = false;
      if (cleanEmail) {
        // Validate basic email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          validationErrors.push(`Email address "${cleanEmail}" is invalid.`);
        } else if (existingEmailSet.has(cleanEmail)) {
          isExistingCustomer = true;
          existingCustomersCount++;
        } else {
          if (!seenNewEmails.has(cleanEmail)) {
            seenNewEmails.add(cleanEmail);
            newCustomersCount++;
          }
        }
      } else {
        // Customer without email will be assigned a synthetic workspace key
        newCustomersCount++;
      }

      // 5. Project Resolution
      let targetProjectId: string | null = null;
      if (raw.projectName && String(raw.projectName).trim()) {
        const query = String(raw.projectName).trim().toLowerCase();
        if (projectLookup.has(query)) {
          targetProjectId = projectLookup.get(query)!;
        }
      }
      if (!targetProjectId && defaultProjectId) {
        targetProjectId = defaultProjectId;
      }

      // 6. Tags parsing
      let parsedTags: string[] = [];
      if (Array.isArray(raw.tags)) {
        parsedTags = raw.tags
          .map((t: unknown) => String(t).trim())
          .filter((t: string) => t.length > 0);
      } else if (typeof raw.tags === "string" && raw.tags.trim()) {
        parsedTags = raw.tags
          .split(/[,;|]/)
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);
      }

      // If source platform is provided, add it as a tag (e.g. "Source: G2")
      const sourceStr =
        typeof raw.source === "string" && raw.source.trim() ? raw.source.trim() : null;
      if (sourceStr && !parsedTags.includes(sourceStr)) {
        parsedTags.push(sourceStr);
      }

      for (const t of parsedTags) {
        const lowerT = t.toLowerCase();
        if (!existingTagNameSet.has(lowerT) && !seenNewTags.has(lowerT)) {
          seenNewTags.add(lowerT);
        }
      }

      // 7. Duplicate Detection
      let isDuplicate = false;
      let duplicateReason: string | null = null;
      if (content) {
        const norm = normalizeText(content);
        if (existingTextSet.has(norm)) {
          isDuplicate = true;
          duplicateReason = "Identical testimonial already exists in this workspace.";
          duplicateCount++;
        } else if (seenImportTexts.has(norm)) {
          isDuplicate = true;
          duplicateReason = "Duplicate testimonial content within this import file.";
          duplicateCount++;
        } else {
          seenImportTexts.add(norm);
        }
      }

      // Aggregate row status
      if (validationErrors.length > 0) {
        invalidCount++;
        for (const err of validationErrors) {
          errorsList.push({
            rowNumber,
            error: err,
            snippet: content ? content.slice(0, 80) : undefined,
          });
        }
      } else {
        validCount++;
      }

      parsedRecords.push({
        rowNumber,
        content,
        customerName,
        customerEmail: cleanEmail,
        customerCompany:
          typeof raw.customerCompany === "string" ? raw.customerCompany.trim() : null,
        customerTitle:
          typeof raw.customerTitle === "string" ? raw.customerTitle.trim() : null,
        customerWebsite:
          typeof raw.customerWebsite === "string" ? raw.customerWebsite.trim() : null,
        customerAvatar:
          typeof raw.customerAvatar === "string" ? raw.customerAvatar.trim() : null,
        rating,
        submittedAt: submittedAtIso,
        projectName: targetProjectId,
        tags: parsedTags,
        source: sourceStr,
        status: defaultStatus || "PENDING",
        validationErrors,
        isDuplicate,
        duplicateReason,
        isExistingCustomer,
      });
    }

    const result: DryRunResult = {
      totalRows: records.length,
      validCount,
      invalidCount,
      duplicateCount,
      newCustomersCount,
      existingCustomersCount,
      newTagsCount: seenNewTags.size,
      records: parsedRecords,
      errors: errorsList,
    };

    return NextResponse.json({ dryRun: result });
  } catch (error: unknown) {
    console.error("Dry run validation error:", error);
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to run import dry run.";
    return NextResponse.json({ error: message }, { status });
  }
}

