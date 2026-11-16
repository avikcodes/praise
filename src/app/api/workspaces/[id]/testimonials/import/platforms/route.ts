import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { getAvailablePlatformCatalog } from "@/lib/import/adapters/registry";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const platforms = getAvailablePlatformCatalog();

    return NextResponse.json({
      success: true,
      platforms,
    });
  } catch (error: any) {
    console.error("Failed to fetch import platforms:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch platforms" },
      { status: error.status || 500 }
    );
  }
}
