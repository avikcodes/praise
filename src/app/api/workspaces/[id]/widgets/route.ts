import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  defaultWallOfLoveConfig,
  parseWidgetConfig,
  sanitizePublicSlug,
  serializeWidgetConfig,
} from "@/lib/widgets/utils";
import { WidgetType, WidgetTheme } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const widgets = await prisma.widget.findMany({
      where: { workspaceId },
      include: {
        project: {
          select: { id: true, name: true, slug: true, color: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Count approved testimonials per project/workspace
    const approvedCounts = await prisma.testimonial.groupBy({
      by: ["projectId"],
      where: { workspaceId, status: "APPROVED" },
      _count: { _all: true },
    });

    const projectApprovedMap = new Map<string, number>();
    let totalWorkspaceApproved = 0;
    for (const item of approvedCounts) {
      if (item.projectId) {
        projectApprovedMap.set(item.projectId, item._count._all);
      }
      totalWorkspaceApproved += item._count._all;
    }

    const formatted = widgets.map((w) => {
      const config = parseWidgetConfig(w.configJson, w.name);
      const approvedCount = w.projectId
        ? projectApprovedMap.get(w.projectId) || 0
        : totalWorkspaceApproved;

      return {
        id: w.id,
        workspaceId: w.workspaceId,
        projectId: w.projectId,
        name: w.name,
        type: w.type,
        theme: w.theme,
        config,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
        project: w.project,
        approvedCount,
        publicUrl: `/w/${config.slug || w.id}`,
      };
    });

    return NextResponse.json({ widgets: formatted });
  } catch (error: unknown) {
    console.error("Failed to fetch widgets:", error);
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load widgets.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId);

    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only workspace owners and administrators can create widgets." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      type = "WALL_OF_LOVE",
      theme = "WARM",
      projectId = null,
      config = {},
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Widget name is required." },
        { status: 400 }
      );
    }

    const baseConfig = defaultWallOfLoveConfig(name.trim());
    const mergedConfig = {
      ...baseConfig,
      ...config,
      slug: sanitizePublicSlug(config.slug || name.trim()),
    };

    const createdWidget = await prisma.widget.create({
      data: {
        workspaceId,
        projectId: projectId || null,
        name: name.trim(),
        type: (type as WidgetType) || WidgetType.WALL_OF_LOVE,
        theme: (theme as WidgetTheme) || WidgetTheme.WARM,
        configJson: serializeWidgetConfig(mergedConfig),
      },
      include: {
        project: {
          select: { id: true, name: true, slug: true, color: true },
        },
      },
    });

    const parsed = parseWidgetConfig(createdWidget.configJson, createdWidget.name);

    return NextResponse.json(
      {
        widget: {
          id: createdWidget.id,
          workspaceId: createdWidget.workspaceId,
          projectId: createdWidget.projectId,
          name: createdWidget.name,
          type: createdWidget.type,
          theme: createdWidget.theme,
          config: parsed,
          createdAt: createdWidget.createdAt.toISOString(),
          updatedAt: createdWidget.updatedAt.toISOString(),
          project: createdWidget.project,
          publicUrl: `/w/${parsed.slug}`,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Failed to create widget:", error);
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to create widget.";
    return NextResponse.json({ error: message }, { status });
  }
}

