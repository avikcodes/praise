import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { executeExternalImport } from "@/lib/import/external-importer";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { platform, items, defaultProjectId, skipDuplicates = true } = body;

    if (!platform || typeof platform !== "string") {
      return NextResponse.json(
        { error: "Platform is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No review items provided to import." },
        { status: 400 }
      );
    }

    const result = await executeExternalImport({
      workspaceId,
      platform,
      items,
      actorUserId: member.user?.id,
      actorName: member.user?.name || "Workspace Admin",
      defaultProjectId,
      skipDuplicates: Boolean(skipDuplicates),
    });

    return NextResponse.json({
      success: true,
      result,
      message: `Successfully imported ${result.importedCount} testimonials as pending unapproved reviews.`,
    });
  } catch (error: any) {
    console.error("Failed to execute external import:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute import" },
      { status: error.status || 500 }
    );
  }
}
