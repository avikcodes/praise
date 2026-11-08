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
        testimonials: {
          orderBy: { submittedAt: "desc" },
          include: {
            form: {
              select: { id: true, title: true, slug: true },
            },
            project: {
              select: { id: true, name: true, slug: true, color: true },
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

    // Collect distinct associated projects
    const projectMap = new Map<string, { id: string; name: string; slug: string; color?: string | null }>();
    for (const t of customer.testimonials) {
      if (t.project) {
        projectMap.set(t.project.id, t.project);
      }
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        workspaceId: customer.workspaceId,
        name: customer.name,
        email: cleanDisplayEmail,
        hasEmail: Boolean(cleanDisplayEmail),
        company: customer.company,
        title: customer.title,
        avatarUrl: customer.avatarUrl,
        website: meta.website,
        notes: meta.notes,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        testimonialCount: customer.testimonials.length,
        associatedProjects: Array.from(projectMap.values()),
        testimonials: customer.testimonials.map((t) => ({
          ...t,
          submittedAt: t.submittedAt.toISOString(),
          consentRecord: t.consentRecords[0] || null,
        })),
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
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { name, email, company, title, website, avatarUrl, notes } = body;

    const existing = await prisma.customer.findUnique({
      where: {
        id: customerId,
        workspaceId,
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
      avatarUrl?: string | null;
      socialHandle?: string | null;
    } = {};

    if (typeof name === "string") {
      const trimmed = name.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: "Customer name cannot be empty." },
          { status: 400 },
        );
      }
      updateData.name = trimmed;
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
        // If email changed, check uniqueness
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
        }
        updateData.email = trimmedEmail;
      } else {
        // Clearing email - use internal placeholder if not already internal
        if (!isInternalEmail(existing.email)) {
          updateData.email = `no-email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${INTERNAL_EMAIL_SUFFIX}`;
        }
      }
    }

    if (company !== undefined) {
      updateData.company = typeof company === "string" && company.trim() ? company.trim() : null;
    }

    if (title !== undefined) {
      updateData.title = typeof title === "string" && title.trim() ? title.trim() : null;
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null;
    }

    // Update website and notes
    if (website !== undefined || notes !== undefined) {
      const currentMeta = parseCustomerMeta(existing.socialHandle);
      const newWeb = website !== undefined ? website : currentMeta.website;
      const newNotes = notes !== undefined ? notes : currentMeta.notes;
      updateData.socialHandle = formatCustomerMeta(newWeb, newNotes);
    }

    const updated = await prisma.customer.update({
      where: {
        id: customerId,
        workspaceId,
      },
      data: updateData,
    });

    const meta = parseCustomerMeta(updated.socialHandle);

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
        website: meta.website,
        notes: meta.notes,
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
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 },
      );
    }

    // Delete customer profile (associated testimonials are preserved with customerId set to null)
    await prisma.customer.delete({
      where: {
        id: customerId,
        workspaceId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer profile deleted successfully. Associated testimonials have been retained.",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json(
      { error: "Failed to delete customer." },
      { status: 500 },
    );
  }
}

