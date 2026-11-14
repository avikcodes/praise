import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { SYSTEM_FORM_TEMPLATES } from "@/lib/forms/templates";

type RouteParams = {
  params: Promise<{ id: string; templateId: string }>;
};

/**
 * POST /api/workspaces/[id]/form-templates/[templateId]/duplicate
 * Clones a system or custom template into the workspace.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workspaceId, templateId } = await params;
    await requireWorkspaceMember(workspaceId);

    let sourceName = "";
    let sourceDesc: string | null = null;
    let sourceCategory = "GENERAL";
    let sourceIcon = "file-text";
    let sourceConfig = "{}";

    if (templateId.startsWith("sys_tmpl_")) {
      const idx = parseInt(templateId.replace("sys_tmpl_", ""), 10) - 1;
      const sys = SYSTEM_FORM_TEMPLATES[idx];
      if (!sys) {
        return NextResponse.json({ error: "Source template not found" }, { status: 404 });
      }
      sourceName = sys.name;
      sourceDesc = sys.description ?? null;
      sourceCategory = sys.category;
      sourceIcon = sys.icon ?? "file-text";
      sourceConfig = sys.configJson;
    } else {
      const existing = await prisma.formTemplate.findFirst({
        where: { id: templateId, workspaceId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Source template not found" }, { status: 404 });
      }
      sourceName = existing.name;
      sourceDesc = existing.description;
      sourceCategory = existing.category;
      sourceIcon = existing.icon || "file-text";
      sourceConfig = existing.configJson;
    }

    const duplicated = await prisma.formTemplate.create({
      data: {
        workspaceId,
        name: `${sourceName} (Copy)`,
        description: sourceDesc,
        category: sourceCategory,
        icon: sourceIcon,
        isSystem: false,
        configJson: sourceConfig,
      },
    });

    return NextResponse.json({ template: duplicated }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to duplicate template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
