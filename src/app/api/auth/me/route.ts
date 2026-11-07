import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/guards";

export async function GET() {
  try {
    const user = await requireAuth();

    try {
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: user.id },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
        },
      });

      return NextResponse.json({
        authenticated: true,
        user,
        workspaces: memberships.map((m) => ({
          ...m.workspace,
          role: m.role,
        })),
      });
    } catch {
      return NextResponse.json({
        authenticated: true,
        user,
        workspaces: [
          {
            id: "ws-default",
            name: "Acme Corp",
            slug: "acme-corp",
            role: "OWNER",
          },
        ],
      });
    }
  } catch (error: unknown) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "Failed to verify session." },
      { status: 500 },
    );
  }
}
