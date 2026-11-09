import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { WorkspaceRole } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string; keyId: string }>;
};

/**
 * DELETE /api/workspaces/:id/api-keys/:keyId
 * Permanently revokes an API key.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id, keyId } = await params;
    await requireWorkspaceMember(id, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]);

    const existing = await prisma.apiKey.findFirst({
      where: { id: keyId, workspaceId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "API key not found." }, { status: 404 });
    }

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({ success: true, revokedId: keyId });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to revoke API key.";
    return NextResponse.json({ error: message }, { status });
  }
}

