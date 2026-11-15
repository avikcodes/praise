import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  displayCustomerEmail,
  formatCustomerMeta,
  INTERNAL_EMAIL_SUFFIX,
  isInternalEmail,
  parseCustomerMeta,
} from "@/lib/customers/utils";
import { logCustomerActivity } from "@/lib/customers/crm";
import { getStorageEngine } from "@/lib/storage/engine";
import { recordTombstone } from "@/lib/privacy/consent";

type RouteParams = {
  params: Promise<{ id: string; customerId: string }>;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, customerId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
        workspaceId,
      },
      include: {
        customerTags: {
          include: {
            tag: {
              select: { id: true, name: true, color: true },
            },
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        testimonials: {
          orderBy: { submittedAt: "desc" },
          include: {
            form: {
              select: { id: true, title: true, slug: true },
            },
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
                brand: {
                  select: { id: true, name: true, logoUrl: true },
                },
              },
            },
            mediaAssets: {
              select: {
                id: true,
                type: true,
                url: true,
                mimeType: true,
                fileSizeBytes: true,
                durationSeconds: true,
              },
            },
            consentRecords: {
              take: 1,
              orderBy: { grantedAt: "desc" },
              select: {
                id: true,
                consentText: true,
                grantedAt: true,
                ipAddress: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 },
      );
    }

    const meta = parseCustomerMeta(customer.socialHandle);
    const cleanDisplayEmail = displayCustomerEmail(customer.email);

    // Collect distinct associated projects and brands
    const projectMap = new Map<
      string,
      { id: string; name: string; slug: string; color?: string | null; brandName?: string | null }
    >();
    const brandMap = new Map<string, { id: string; name: string; logoUrl?: string | null }>();

    let totalRatingSum = 0;
    let ratedCount = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let archivedCount = 0;

    for (const t of customer.testimonials) {
      if (t.rating) {
        totalRatingSum += t.rating;
        ratedCount++;
      }
      if (t.status === "APPROVED") approvedCount++;
      else if (t.status === "PENDING") pendingCount++;
      else if (t.status === "REJECTED") rejectedCount++;
      else if (t.status === "ARCHIVED") archivedCount++;

      if (t.project) {
        projectMap.set(t.project.id, {
          id: t.project.id,
          name: t.project.name,
          slug: t.project.slug,
          color: t.project.color,
          brandName: t.project.brand?.name || null,
        });
        if (t.project.brand) {
          brandMap.set(t.project.brand.id, t.project.brand);
        }
      }
    }

    let customAttributes: Record<string, unknown> = {};
    if (customer.customAttributesJson) {
      try {
        customAttributes = JSON.parse(customer.customAttributesJson);
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        workspaceId: customer.workspaceId,
        name: customer.name,
        email: cleanDisplayEmail,
        rawEmail: customer.email,
        hasEmail: Boolean(cleanDisplayEmail),
        company: customer.company,
        title: customer.title,
        avatarUrl: customer.avatarUrl,
        website: customer.website || meta.website,
        stage: customer.stage || "NEW",
        customAttributes,
        tags: customer.customerTags.map((ct) => ({
          id: ct.tag.id,
          name: ct.tag.name,
          color: ct.tag.color,
        })),
        tagIds: customer.customerTags.map((ct) => ct.tag.id),
        notes: customer.notes.map((n) => ({
          id: n.id,
          content: n.content,
          authorName: n.authorName,
          authorEmail: n.authorEmail,
          isPinned: n.isPinned,
          createdAt: n.createdAt.toISOString(),
        })),
        activities: customer.activities.map((a) => ({
          id: a.id,
          action: a.action,
          actorName: a.actorName,
          details: a.details,
          metadata: a.metadataJson ? JSON.parse(a.metadataJson) : null,
          createdAt: a.createdAt.toISOString(),
        })),
        stats: {
          totalSubmissions: customer.testimonials.length,
          approvedCount,
          pendingCount,
          rejectedCount,
          archivedCount,
          averageRating: ratedCount > 0 ? parseFloat((totalRatingSum / ratedCount).toFixed(1)) : null,
        },
        associatedProjects: Array.from(projectMap.values()),
        associatedBrands: Array.from(brandMap.values()),
        testimonials: customer.testimonials.map((t) => ({
          id: t.id,
          content: t.content,
          rating: t.rating,
          status: t.status,
          type: t.type,
          submittedAt: t.submittedAt.toISOString(),
          form: t.form,
          project: t.project,
          mediaAssets: t.mediaAssets,
          consentRecord: t.consentRecords[0] || null,
        })),
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get customer error:", error);
    return NextResponse.json(
      { error: "Failed to load customer profile." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, customerId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const {
      name,
      email,
      company,
      title,
      website,
      avatarUrl,
      stage,
      customAttributes,
      tagIds,
      notes,
    } = body;

    const existing = await prisma.customer.findUnique({
      where: {
        id: customerId,
        workspaceId,
      },
      include: {
        customerTags: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 },
      );
    }

    const updateData: {
      name?: string;
      email?: string;
      company?: string | null;
      title?: string | null;
      website?: string | null;
      avatarUrl?: string | null;
      socialHandle?: string | null;
      stage?: string;
      customAttributesJson?: string | null;
    } = {};

    const changesLogged: string[] = [];

    if (typeof name === "string") {
      const trimmed = name.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: "Customer name cannot be empty." },
          { status: 400 },
        );
      }
      if (trimmed !== existing.name) {
        updateData.name = trimmed;
        changesLogged.push(`name to "${trimmed}"`);
      }
    }

    if (email !== undefined) {
      const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      if (trimmedEmail) {
        if (!EMAIL_REGEX.test(trimmedEmail)) {
          return NextResponse.json(
            { error: "Please enter a valid email address." },
            { status: 400 },
          );
        }
        if (trimmedEmail !== existing.email.toLowerCase()) {
          const conflict = await prisma.customer.findUnique({
            where: {
              workspaceId_email: {
                workspaceId,
                email: trimmedEmail,
              },
            },
          });
          if (conflict && conflict.id !== customerId) {
            return NextResponse.json(
              { error: `A customer profile with email "${trimmedEmail}" already exists in this workspace.` },
              { status: 409 },
            );
          }
          updateData.email = trimmedEmail;
          changesLogged.push(`email to "${trimmedEmail}"`);
        }
      } else {
        if (!isInternalEmail(existing.email)) {
          updateData.email = `no-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${INTERNAL_EMAIL_SUFFIX}`;
          changesLogged.push("removed email");
        }
      }
    }

    if (company !== undefined) {
      const newCompany = typeof company === "string" && company.trim() ? company.trim() : null;
      if (newCompany !== existing.company) {
        updateData.company = newCompany;
        changesLogged.push(`company to "${newCompany || "none"}"`);
      }
    }

    if (title !== undefined) {
      const newTitle = typeof title === "string" && title.trim() ? title.trim() : null;
      if (newTitle !== existing.title) {
        updateData.title = newTitle;
        changesLogged.push(`title to "${newTitle || "none"}"`);
      }
    }

    if (website !== undefined) {
      const newWeb = typeof website === "string" && website.trim() ? website.trim() : null;
      if (newWeb !== existing.website) {
        updateData.website = newWeb;
        changesLogged.push(`website to "${newWeb || "none"}"`);
      }
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null;
    }

    if (stage !== undefined) {
      const newStage = String(stage).trim().toUpperCase();
      if (newStage && newStage !== existing.stage) {
        updateData.stage = newStage;
        await logCustomerActivity({
          workspaceId,
          customerId,
          action: "STAGE_CHANGED",
          actorId: member.user.id,
          actorName: member.user.name,
          details: `Lifecycle stage transitioned from ${existing.stage} to ${newStage}`,
          metadata: { previousStage: existing.stage, newStage },
        });
      }
    }

    if (customAttributes !== undefined) {
      let merged = {};
      if (existing.customAttributesJson) {
        try {
          merged = JSON.parse(existing.customAttributesJson);
        } catch {}
      }
      merged = { ...merged, ...customAttributes };
      updateData.customAttributesJson = JSON.stringify(merged);
      changesLogged.push("updated custom attributes");
    }

    if (notes !== undefined) {
      const currentMeta = parseCustomerMeta(existing.socialHandle);
      updateData.socialHandle = formatCustomerMeta(existing.website, notes);
    }

    // Update tags
    if (tagIds !== undefined && Array.isArray(tagIds)) {
      await prisma.customerTag.deleteMany({
        where: { customerId, workspaceId },
      });
      for (const tid of tagIds) {
        await prisma.customerTag.create({
          data: {
            customerId,
            tagId: tid,
            workspaceId,
          },
        }).catch(() => {});
      }
      changesLogged.push(`updated tags count to ${tagIds.length}`);
    }

    const updated = await prisma.customer.update({
      where: {
        id: customerId,
        workspaceId,
      },
      data: updateData,
    });

    if (changesLogged.length > 0) {
      await logCustomerActivity({
        workspaceId,
        customerId,
        action: "PROFILE_UPDATED",
        actorId: member.user.id,
        actorName: member.user.name,
        details: `Updated: ${changesLogged.join(", ")}`,
      });
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: updated.id,
        name: updated.name,
        email: displayCustomerEmail(updated.email),
        hasEmail: Boolean(displayCustomerEmail(updated.email)),
        company: updated.company,
        title: updated.title,
        avatarUrl: updated.avatarUrl,
        website: updated.website,
        stage: updated.stage,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json(
      { error: "Failed to update customer profile." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, customerId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
        workspaceId,
      },
      include: {
        testimonials: {
          select: { id: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const purgeAll = url.searchParams.get("purge") === "true";

    if (purgeAll && customer.testimonials.length > 0) {
      const testimonialIds = customer.testimonials.map((t) => t.id);
      const engine = getStorageEngine();

      const mediaAssets = await prisma.mediaAsset.findMany({
        where: {
          testimonialId: { in: testimonialIds },
          workspaceId,
        },
        select: { id: true, localPath: true },
      });

      for (const asset of mediaAssets) {
        if (asset.localPath) {
          await engine.delete(asset.localPath).catch(() => {});
        }
        recordTombstone({
          type: "MEDIA",
          originalId: asset.id,
          workspaceId,
          reason: "CUSTOMER_REQUEST",
        });
      }

      for (const tid of testimonialIds) {
        recordTombstone({
          type: "TESTIMONIAL",
          originalId: tid,
          workspaceId,
          reason: "CUSTOMER_REQUEST",
        });
      }

      await prisma.testimonial.deleteMany({
        where: { id: { in: testimonialIds } },
      });
    }

    recordTombstone({
      type: "CUSTOMER",
      originalId: customer.id,
      workspaceId,
      reason: "CUSTOMER_REQUEST",
    });

    await prisma.customer.delete({
      where: { id: customerId },
    });

    return NextResponse.json({
      success: true,
      message: "Customer profile and associated records successfully removed.",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json(
      { error: "Failed to delete customer." },
      { status: 500 },
    );
  }
}
