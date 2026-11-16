import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { ensureDefaultSmsTemplates } from "@/lib/sms/campaign-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    // Auto-seed default starter templates if empty
    await ensureDefaultSmsTemplates(workspaceId);

    const templates = await prisma.smsTemplate.findMany({
      where: { workspaceId },
      orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error("Failed to fetch SMS templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch SMS templates" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { name, category = "STANDARD", body: templateBody, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Template name is required." },
        { status: 400 }
      );
    }

    if (!templateBody?.trim()) {
      return NextResponse.json(
        { error: "Template message body is required." },
        { status: 400 }
      );
    }

    const template = await prisma.smsTemplate.create({
      data: {
        workspaceId,
        name: name.trim(),
        category,
        messageBody: templateBody.trim(),
        isSystem: false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        template,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create SMS template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create SMS template" },
      { status: error.status || 500 }
    );
  }
}
