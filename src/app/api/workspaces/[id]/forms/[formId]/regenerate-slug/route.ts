import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string; formId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, formId } = await context.params;
    // Enforce role authorization: only OWNER or ADMIN can regenerate public slug
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const form = await prisma.collectionForm.findFirst({
      where: { id: formId, workspaceId },
    });

    if (!form) {
      return NextResponse.json({ error: "Collection form not found" }, { status: 404 });
    }

    // Generate a unique, clean, url-friendly slug
    const cleanBase = form.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "form";

    let newSlug = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts += 1;
      const suffix = randomBytes(4).toString("hex");
      newSlug = `${cleanBase}-${suffix}`;

      const existing = await prisma.collectionForm.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug: newSlug,
          },
        },
      });

      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: "Could not generate a unique slug. Please try again." },
        { status: 500 },
      );
    }

    const updated = await prisma.collectionForm.update({
      where: { id: formId },
      data: { slug: newSlug },
      include: {
        fields: {
          orderBy: { orderIndex: "asc" },
        },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
        _count: {
          select: { testimonials: true },
        },
      },
    });

    return NextResponse.json({
      form: {
        ...updated,
        submissionsCount: updated._count.testimonials,
      },
      oldSlug: form.slug,
      newSlug,
      message: `Public link updated to /p/${newSlug}. Note that previous links will no longer be reachable.`,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to regenerate form slug";
    return NextResponse.json({ error: message }, { status });
  }
}

