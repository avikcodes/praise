import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { deleteMediaAsset } from "@/lib/storage/service";

type RouteParams = {
  params: Promise<{ id: string; assetId: string }>;
};

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, assetId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const deleted = await deleteMediaAsset(assetId, workspaceId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Media asset not found in this workspace." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Media asset and associated files deleted successfully.",
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to delete media asset.";
    return NextResponse.json({ error: message }, { status });
  }
}

