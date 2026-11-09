import { requireApiAuth } from "@/lib/api/auth";
import { apiSuccess, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/db/client";
import { WorkspaceRole } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * DELETE /api/v1/auth/keys/:id
 * Revokes and deletes an API key. Requires ADMIN or OWNER.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const authResult = await requireApiAuth(request, {
    allowedRoles: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
  });
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const key = await prisma.apiKey.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    });

    if (!key) {
      return apiError("key_not_found", "API key not found.", 404, undefined, rateLimitHeaders);
    }

    // Do not allow revoking the active master key
    if (id === auth.keyId) {
      return apiError("cannot_revoke_active_key", "Cannot revoke the API key currently in use.", 400, undefined, rateLimitHeaders);
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return apiSuccess({ revoked: true, id }, undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to revoke API key.", 500, error instanceof Error ? error.message : undefined);
  }
}

