import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { createFormTemplateSchema } from "@/lib/auth/validation";
import { SYSTEM_FORM_TEMPLATES } from "@/lib/forms/templates";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/workspaces/[id]/form-templates
 * Returns system templates merged with workspace-specific templates.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    // Fetch custom workspace templates
    const dbTemplates = await prisma.formTemplate.findMany({
      where: {
        workspaceId,
        ...(category && category !== "ALL" ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    // Format system templates
    let systemTemplates = SYSTEM_FORM_TEMPLATES.map((tmpl, idx) => ({
      id: `sys_tmpl_${idx + 1}`,
      workspaceId: null,
      name: tmpl.name,
      description: tmpl.description,
      category: tmpl.category,
      icon: tmpl.icon,
      isSystem: true,
      configJson: tmpl.configJson,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    if (category && category !== "ALL") {
      systemTemplates = systemTemplates.filter((t) => t.category === category);
    }

    // Return custom first, then system templates
    return NextResponse.json({
      templates: [...dbTemplates, ...systemTemplates],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load templates";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * POST /api/workspaces/[id]/form-templates
 * Creates or saves a new reusable template for this workspace.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId } = await params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const validated = createFormTemplateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 }
      );
    }

    const { name, description, category, icon, configJson } = validated.data;

    const template = await prisma.formTemplate.create({
      data: {
        workspaceId,
        name,
        description: description || null,
        category: category || "GENERAL",
        icon: icon || "file-text",
        isSystem: false,
        configJson,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
