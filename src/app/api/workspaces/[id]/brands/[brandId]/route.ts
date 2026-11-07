import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { updateBrandSchema } from "@/lib/auth/validation";

type RouteParams = {
  params: Promise<{ id: string; brandId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id, brandId } = await params;
    await requireWorkspaceMember(id);

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, workspaceId: id },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json({ brand });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to fetch brand";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id, brandId } = await params;
    await requireWorkspaceMember(id, ["OWNER", "ADMIN"]);
    const body = await request.json();
    const validated = updateBrandSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 },
      );
    }

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, workspaceId: id },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const { name, slug, logoUrl, accentColor, websiteUrl } = validated.data;

    // Check slug uniqueness if changed
    if (slug && slug !== brand.slug) {
      const existing = await prisma.brand.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId: id,
            slug,
          },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "A brand with this URL slug already exists in this workspace." },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.brand.update({
      where: { id: brandId },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(accentColor ? { accentColor } : {}),
        ...(websiteUrl !== undefined ? { websiteUrl } : {}),
      },
    });

    return NextResponse.json({
      message: "Brand updated successfully.",
      brand: updated,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to update brand";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, brandId } = await params;
    await requireWorkspaceMember(id, ["OWNER", "ADMIN"]);

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, workspaceId: id },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Delete brand (projects with brandId will have brandId set to null via SetNull)
    await prisma.brand.delete({
      where: { id: brandId },
    });

    return NextResponse.json({
      message: `Brand "${brand.name}" deleted. Any linked projects remain intact and unbranded.`,
      deletedId: brandId,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to delete brand";
    return NextResponse.json({ error: message }, { status });
  }
}
