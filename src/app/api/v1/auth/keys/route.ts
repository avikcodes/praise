import { requireApiAuth } from "@/lib/api/auth";
import { createApiKeyRecord } from "@/lib/api/keys";
import { apiSuccess, apiError } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { ApiKeyType, WorkspaceRole } from "@prisma/client";

/**
 * GET /api/v1/auth/keys
 * Lists active API keys in the workspace. Requires ADMIN or OWNER.
 */
export async function GET(request: Request) {
  const authResult = await requireApiAuth(request, {
    allowedRoles: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
  });
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;

  try {
    const keys = await prisma.apiKey.findMany({
      where: { workspaceId: auth.workspaceId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        type: true,
        role: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(keys, undefined, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve API keys.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * POST /api/v1/auth/keys
 * Generates a new API key.
 * 
 * SECURITY: The raw secret key is returned EXACTLY ONCE in this response.
 * Only the SHA-256 hash is persisted in the database.
 */
export async function POST(request: Request) {
  const authResult = await requireApiAuth(request, {
    allowedRoles: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN],
  });
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const { data: body, error: bodyError } = await parseJsonBody<{
    name?: string;
    type?: ApiKeyType;
    role?: WorkspaceRole;
    scopes?: string[];
    expiresInDays?: number;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  if (!body.name || !body.name.trim()) {
    return apiError("validation_error", "Field 'name' is required.", 400, undefined, rateLimitHeaders);
  }

  const type = body.type || ApiKeyType.SECRET;
  const role = body.role || WorkspaceRole.MEMBER;
  let expiresAt: Date | null = null;

  if (body.expiresInDays && body.expiresInDays > 0) {
    expiresAt = new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000);
  }

  try {
    const { rawKey, apiKey } = await createApiKeyRecord({
      workspaceId: auth.workspaceId,
      name: body.name.trim(),
      type,
      role,
      scopes: body.scopes || [],
      expiresAt,
    });

    return apiSuccess(
      {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        key: rawKey, // Raw secret key returned once
        type: apiKey.type,
        role: apiKey.role,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt?.toISOString() || null,
        createdAt: apiKey.createdAt.toISOString(),
      },
      undefined,
      201,
      rateLimitHeaders
    );
  } catch (error) {
    return apiError("internal_error", "Failed to generate API key.", 500, error instanceof Error ? error.message : undefined);
  }
}

