import { NextRequest, NextResponse } from "next/server";
import { authenticateExtensionRequest, checkExtensionDuplicate } from "@/lib/extension/service";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateExtensionRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing Praise API key." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const workspaceId = body.workspaceId || auth.workspaceId;
    const content = body.content || "";
    const sourceUrl = body.sourceUrl || null;

    const result = await checkExtensionDuplicate({
      workspaceId,
      content,
      sourceUrl,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Extension duplicate check error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check duplicates." },
      { status: 500 }
    );
  }
}
