import { NextRequest, NextResponse } from "next/server";
import { authenticateExtensionRequest } from "@/lib/extension/service";
import { prisma } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateExtensionRequest(request);
    if (!auth) {
      return NextResponse.json(
        {
          error: "Unauthorized: Invalid or missing Praise API key / session. Please check your extension settings.",
        },
        { status: 401 }
      );
    }

    // Retrieve active projects for the workspace
    const projects = await prisma.project.findMany({
      where: { workspaceId: auth.workspaceId },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      workspace: {
        id: auth.workspaceId,
        name: auth.workspaceName,
        slug: auth.workspaceSlug,
      },
      workspaces: auth.allWorkspaces || [
        { id: auth.workspaceId, name: auth.workspaceName, slug: auth.workspaceSlug },
      ],
      projects,
      authenticatedAs: auth.userName,
    });
  } catch (error: any) {
    console.error("Extension verify error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify extension connection." },
      { status: 500 }
    );
  }
}
