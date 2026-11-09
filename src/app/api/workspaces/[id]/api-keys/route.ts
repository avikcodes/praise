import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { createApiKeyRecord } from "@/lib/api/keys";
import { ApiKeyType, WorkspaceRole } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/workspaces/:id/api-keys
 * Lists all active API keys for the workspace (authenticated dashboard users).
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireWorkspaceMember(id, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]);

    const keys = await prisma.apiKey.findMany({
      where: { workspaceId: id },
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

    return NextResponse.json({ keys });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to load API keys.";
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/workspaces/:id/api-keys
 * Generates a new API key for the workspace.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await requireWorkspaceMember(id, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]);

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Default API Key";
    const type = body.type === "PUBLISHABLE" ? ApiKeyType.PUBLISHABLE : ApiKeyType.SECRET;
    const role = body.role === "ADMIN" ? WorkspaceRole.ADMIN : WorkspaceRole.MEMBER;

    const result = await createApiKeyRecord({
      workspaceId: id,
      name,
      type,
      role,
      scopes: Array.isArray(body.scopes) ? body.scopes : [],
    });

    return NextResponse.json({
      rawKey: result.rawKey,
      apiKey: {
        id: result.apiKey.id,
        name: result.apiKey.name,
        keyPrefix: result.apiKey.keyPrefix,
        type: result.apiKey.type,
        role: result.apiKey.role,
        createdAt: result.apiKey.createdAt,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to create API key.";
    return NextResponse.json({ error: message }, { status });
  }
}

