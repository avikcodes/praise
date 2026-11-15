import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { ensureDefaultInvitationTemplates } from "@/lib/email/campaign-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    // Auto seed default templates if workspace has none
    await ensureDefaultInvitationTemplates(workspaceId);

    const templates = await prisma.invitationTemplate.findMany({
      where: { workspaceId },
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error("Failed to fetch invitation templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch invitation templates" },
      { status: error.status || 500 },
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { name, category = "GENERAL", subject, bodyText } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Template name is required." },
        { status: 400 },
      );
    }
    if (!subject?.trim() || !bodyText?.trim()) {
      return NextResponse.json(
        { error: "Subject and email body are required." },
        { status: 400 },
      );
    }

    const template = await prisma.invitationTemplate.create({
      data: {
        workspaceId,
        name: name.trim(),
        category: category.toUpperCase(),
        subject: subject.trim(),
        bodyText: bodyText.trim(),
        isSystem: false,
      },
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create template" },
      { status: error.status || 500 },
    );
  }
}
