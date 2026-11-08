import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  parseWidgetConfig,
  sanitizePublicSlug,
  serializeWidgetConfig,
} from "@/lib/widgets/utils";
import { WidgetType, WidgetTheme } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string; widgetId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, widgetId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const widget = await prisma.widget.findFirst({
      where: { id: widgetId, workspaceId },
      include: {
        project: {
          select: { id: true, name: true, slug: true, color: true },
        },
      },
    });

    if (!widget) {
      return NextResponse.json({ error: "Widget not found." }, { status: 404 });
    }

    const config = parseWidgetConfig(widget.configJson, widget.name);

    return NextResponse.json({
      widget: {
        id: widget.id,
        workspaceId: widget.workspaceId,
        projectId: widget.projectId,
        name: widget.name,
        type: widget.type,
        theme: widget.theme,
        config,
        createdAt: widget.createdAt.toISOString(),
        updatedAt: widget.updatedAt.toISOString(),
        project: widget.project,
        publicUrl: `/w/${config.slug || widget.id}`,
      },
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load widget.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, widgetId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId);

    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only workspace owners and administrators can edit widgets." },
        { status: 403 }
      );
    }

    const existingWidget = await prisma.widget.findFirst({
      where: { id: widgetId, workspaceId },
    });

    if (!existingWidget) {
      return NextResponse.json({ error: "Widget not found." }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, theme, projectId, config } = body;

    const currentConfig = parseWidgetConfig(existingWidget.configJson, existingWidget.name);
    const updatedConfig = {
      ...currentConfig,
      ...(config || {}),
    };

    if (config?.slug) {
      updatedConfig.slug = sanitizePublicSlug(config.slug);
    }

    const updated = await prisma.widget.update({
      where: { id: widgetId },
      data: {
        name: typeof name === "string" && name.trim() ? name.trim() : undefined,
        type: type ? (type as WidgetType) : undefined,
        theme: theme ? (theme as WidgetTheme) : undefined,
        projectId: projectId !== undefined ? projectId || null : undefined,
        configJson: serializeWidgetConfig(updatedConfig),
      },
      include: {
        project: {
          select: { id: true, name: true, slug: true, color: true },
        },
      },
    });

    const parsed = parseWidgetConfig(updated.configJson, updated.name);

    return NextResponse.json({
      widget: {
        id: updated.id,
        workspaceId: updated.workspaceId,
        projectId: updated.projectId,
        name: updated.name,
        type: updated.type,
        theme: updated.theme,
        config: parsed,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        project: updated.project,
        publicUrl: `/w/${parsed.slug}`,
      },
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to update widget.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, widgetId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId);

    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only workspace owners and administrators can delete widgets." },
        { status: 403 }
      );
    }

    const existingWidget = await prisma.widget.findFirst({
      where: { id: widgetId, workspaceId },
    });

    if (!existingWidget) {
      return NextResponse.json({ error: "Widget not found." }, { status: 404 });
    }

    await prisma.widget.delete({
      where: { id: widgetId },
    });

    return NextResponse.json({
      success: true,
      message: "Widget deleted successfully.",
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to delete widget.";
    return NextResponse.json({ error: message }, { status });
  }
}

