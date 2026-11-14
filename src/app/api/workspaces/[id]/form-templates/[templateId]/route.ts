import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { SYSTEM_FORM_TEMPLATES } from "@/lib/forms/templates";

type RouteParams = {
  params: Promise<{ id: string; templateId: string }>;
};

/**
 * GET /api/workspaces/[id]/form-templates/[templateId]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId, templateId } = await params;
    await requireWorkspaceMember(workspaceId);

    // Check system templates
    if (templateId.startsWith("sys_tmpl_")) {
      const idx = parseInt(templateId.replace("sys_tmpl_", ""), 10) - 1;
      const sys = SYSTEM_FORM_TEMPLATES[idx];
      if (!sys) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      return NextResponse.json({
        template: {
          id: templateId,
          workspaceId: null,
          name: sys.name,
          description: sys.description,
          category: sys.category,
          icon: sys.icon,
          isSystem: true,
          configJson: sys.configJson,
        },
      });
    }

    // Check workspace database templates
    const template = await prisma.formTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * DELETE /api/workspaces/[id]/form-templates/[templateId]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId, templateId } = await params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    if (templateId.startsWith("sys_tmpl_")) {
      return NextResponse.json(
        { error: "Cannot delete built-in system templates." },
        { status: 403 }
      );
    }

    const template = await prisma.formTemplate.findFirst({
      where: { id: templateId, workspaceId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.formTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
