import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { formatCustomerMeta, INTERNAL_EMAIL_SUFFIX } from "@/lib/customers/utils";
import { ImportExecutionPayload, ImportResult } from "@/lib/import/types";
import { TestimonialStatus } from "@prisma/client";

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

    const payload = (await request.json()) as ImportExecutionPayload;
    const {
      records = [],
      skipDuplicates = true,
      skipInvalid = true,
      defaultProjectId = null,
      defaultStatus = "PENDING",
      sourceLabel = "Import",
    } = payload;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "No records provided to import." },
        { status: 400 }
      );
    }

    // Pre-fetch existing testimonials for duplicate prevention
    const existingTestimonials = await prisma.testimonial.findMany({
      where: { workspaceId },
      select: { content: true },
    });
    const existingTextSet = new Set<string>();
    for (const t of existingTestimonials) {
      existingTextSet.add(normalizeText(t.content));
    }

    // Pre-fetch existing projects
    const existingProjects = await prisma.project.findMany({
      where: { workspaceId },
      select: { id: true, name: true, slug: true },
    });
    const projectLookup = new Map<string, string>();
    for (const p of existingProjects) {
      projectLookup.set(p.id.toLowerCase(), p.id);
      projectLookup.set(p.name.toLowerCase().trim(), p.id);
      projectLookup.set(p.slug.toLowerCase().trim(), p.id);
    }

    // Pre-fetch tags for quick reuse
    const existingTags = await prisma.tag.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    });
    const tagMap = new Map<string, string>(); // lowercase name -> tag id
    for (const t of existingTags) {
      tagMap.set(t.name.toLowerCase().trim(), t.id);
    }

    // Pre-fetch customers to prevent duplicates
    const existingCustomers = await prisma.customer.findMany({
      where: { workspaceId },
      select: { id: true, email: true, company: true, title: true, socialHandle: true },
    });
    const customerMap = new Map<string, (typeof existingCustomers)[0]>();
    for (const c of existingCustomers) {
      customerMap.set(c.email.toLowerCase().trim(), c);
    }

    let successCount = 0;
    let failedCount = 0;
    let skippedDuplicatesCount = 0;
    let createdCustomersCount = 0;
    let createdTagsCount = 0;
    const importedIds: string[] = [];
    const failures: { rowNumber: number; error: string; snippet?: string }[] = [];

    const statusToUse: TestimonialStatus =
      defaultStatus === "APPROVED"
        ? TestimonialStatus.APPROVED
        : defaultStatus === "REJECTED"
        ? TestimonialStatus.REJECTED
        : defaultStatus === "ARCHIVED"
        ? TestimonialStatus.ARCHIVED
        : TestimonialStatus.PENDING;

    // Process records in controlled batches for rock-solid stability
    const BATCH_SIZE = 50;
    for (let b = 0; b < records.length; b += BATCH_SIZE) {
      const batch = records.slice(b, b + BATCH_SIZE);

      for (const item of batch) {
        const rowNumber = item.rowNumber || b + 1;
        const rawContent = typeof item.content === "string" ? item.content.trim() : "";

        // 1. Validation check
        if (!rawContent) {
          failedCount++;
          failures.push({
            rowNumber,
            error: "Missing testimonial text",
            snippet: "(empty row)",
          });
          if (skipInvalid) continue;
        }

        // 2. Duplicate check
        const norm = normalizeText(rawContent);
        if (existingTextSet.has(norm)) {
          if (skipDuplicates) {
            skippedDuplicatesCount++;
            continue;
          }
        }

        try {
          // 3. Resolve / Create Customer (Never duplicate existing normalized customer)
          let customerId: string | null = null;
          const cleanEmail =
            typeof item.customerEmail === "string" && item.customerEmail.trim()
              ? item.customerEmail.trim().toLowerCase()
              : null;

          if (cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            const existingCustomer = customerMap.get(cleanEmail);
            if (existingCustomer) {
              customerId = existingCustomer.id;
              // Enrich customer record if company/title was previously blank
              const needsUpdate =
                (!existingCustomer.company && item.customerCompany) ||
                (!existingCustomer.title && item.customerTitle);
              if (needsUpdate) {
                await prisma.customer.update({
                  where: { id: existingCustomer.id },
                  data: {
                    company: existingCustomer.company || item.customerCompany?.trim() || null,
                    title: existingCustomer.title || item.customerTitle?.trim() || null,
                  },
                });
              }
            } else {
              // Create new customer profile
              const meta = formatCustomerMeta(
                item.customerWebsite?.trim() || null,
                sourceLabel ? `Imported via ${sourceLabel}` : null
              );

              const created = await prisma.customer.create({
                data: {
                  workspaceId,
                  name: item.customerName?.trim() || "Anonymous Customer",
                  email: cleanEmail,
                  company: item.customerCompany?.trim() || null,
                  title: item.customerTitle?.trim() || null,
                  avatarUrl: item.customerAvatar?.trim() || null,
                  socialHandle: meta,
                },
              });
              customerId = created.id;
              customerMap.set(cleanEmail, created);
              createdCustomersCount++;
            }
          } else {
            // Customer without email: create internal profile with unique internal address
            const randomPart = Math.random().toString(36).substring(2, 10);
            const internalEmail = `no-email-${Date.now()}-${randomPart}${INTERNAL_EMAIL_SUFFIX}`;
            const meta = formatCustomerMeta(
              item.customerWebsite?.trim() || null,
              sourceLabel ? `Imported via ${sourceLabel}` : null
            );

            const created = await prisma.customer.create({
              data: {
                workspaceId,
                name: item.customerName?.trim() || "Anonymous Customer",
                email: internalEmail,
                company: item.customerCompany?.trim() || null,
                title: item.customerTitle?.trim() || null,
                avatarUrl: item.customerAvatar?.trim() || null,
                socialHandle: meta,
              },
            });
            customerId = created.id;
            createdCustomersCount++;
          }

          // 4. Resolve Project
          let targetProjectId: string | null = null;
          if (item.projectName && String(item.projectName).trim()) {
            const key = String(item.projectName).trim().toLowerCase();
            if (projectLookup.has(key)) {
              targetProjectId = projectLookup.get(key)!;
            }
          }
          if (!targetProjectId && defaultProjectId) {
            targetProjectId = defaultProjectId;
          }

          // 5. Parse and resolve Tags
          const rawTagsList: string[] = [];
          const incomingTags = item.tags as unknown;
          if (Array.isArray(incomingTags)) {
            rawTagsList.push(...incomingTags.map((t) => String(t).trim()));
          } else if (typeof incomingTags === "string" && incomingTags.trim()) {
            rawTagsList.push(...incomingTags.split(/[,;|]/));
          }

          if (item.source && typeof item.source === "string" && item.source.trim()) {
            const src = item.source.trim();
            if (!rawTagsList.some((t) => t.toLowerCase() === src.toLowerCase())) {
              rawTagsList.push(src);
            }
          }

          const tagIdsToConnect: string[] = [];
          for (const rawTag of rawTagsList) {
            const cleanTagName = rawTag.trim();
            if (!cleanTagName) continue;
            const lowerTag = cleanTagName.toLowerCase();

            let tagId = tagMap.get(lowerTag);
            if (!tagId) {
              const newTag = await prisma.tag.upsert({
                where: {
                  workspaceId_name: {
                    workspaceId,
                    name: cleanTagName,
                  },
                },
                update: {},
                create: {
                  workspaceId,
                  name: cleanTagName,
                  color: "#7049D8",
                },
              });
              tagId = newTag.id;
              tagMap.set(lowerTag, tagId);
              createdTagsCount++;
            }
            if (!tagIdsToConnect.includes(tagId)) {
              tagIdsToConnect.push(tagId);
            }
          }

          // 6. Rating & Date
          let rating = 5;
          if (item.rating !== undefined && item.rating !== null) {
            const parsedR = Number(item.rating);
            if (!isNaN(parsedR)) {
              rating = Math.max(1, Math.min(5, Math.round(parsedR)));
            }
          }

          let submittedAt = new Date();
          if (item.submittedAt) {
            const parsedD = new Date(item.submittedAt);
            if (!isNaN(parsedD.getTime())) {
              submittedAt = parsedD;
            }
          }

          // 7. Create Testimonial record (Unverified, never auto-published without user choice)
          const createdTestimonial = await prisma.testimonial.create({
            data: {
              workspaceId,
              projectId: targetProjectId,
              customerId,
              content: rawContent,
              rating,
              type: "TEXT",
              status: statusToUse,
              isFeatured: false,
              submittedAt,
              tags: {
                create: tagIdsToConnect.map((tagId) => ({
                  tagId,
                  workspaceId,
                })),
              },
            },
          });

          importedIds.push(createdTestimonial.id);
          existingTextSet.add(norm);
          successCount++;
        } catch (err: unknown) {
          console.error(`Error importing row ${rowNumber}:`, err);
          failedCount++;
          failures.push({
            rowNumber,
            error: err instanceof Error ? err.message : "Database write error",
            snippet: rawContent.slice(0, 80),
          });
        }
      }
    }

    const result: ImportResult = {
      totalProcessed: records.length,
      successCount,
      failedCount,
      skippedDuplicatesCount,
      createdCustomersCount,
      createdTagsCount,
      importedIds,
      failures,
    };

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${successCount} testimonial${successCount === 1 ? "" : "s"}.`,
      result,
    });
  } catch (error: unknown) {
    console.error("Testimonial import execution failed:", error);
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to execute testimonial import.";
    return NextResponse.json({ error: message }, { status });
  }
}
