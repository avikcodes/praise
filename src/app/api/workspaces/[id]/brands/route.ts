import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { createBrandSchema } from "@/lib/auth/validation";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireWorkspaceMember(id);

    try {
      const brands = await prisma.brand.findMany({
        where: { workspaceId: id },
        include: {
          _count: {
            select: {
              projects: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ brands });
    } catch (dbError) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ brands: [] });
      }
      throw dbError;
    }
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to fetch brands";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireWorkspaceMember(id, ["OWNER", "ADMIN"]);
    const body = await request.json();
    const validated = createBrandSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 },
      );
    }

    const { name, slug, logoUrl, accentColor, websiteUrl } = validated.data;

    // Check slug uniqueness in this workspace
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

    const brand = await prisma.brand.create({
      data: {
        workspaceId: id,
        name,
        slug,
        logoUrl: logoUrl || null,
        accentColor: accentColor || "#7049D8",
        websiteUrl: websiteUrl || null,
      },
    });

    return NextResponse.json(
      { message: "Brand created successfully.", brand },
      { status: 201 },
    );
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message = error instanceof Error ? error.message : "Failed to create brand";
    return NextResponse.json({ error: message }, { status });
  }
}
