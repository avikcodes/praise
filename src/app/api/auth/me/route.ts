import { NextResponse } from "next/server";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireAuth, AuthError } from "@/lib/auth/guards";

export async function GET() {
  try {
    await connection();
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
    } catch (membershipError) {
      unstable_rethrow(membershipError);
      return NextResponse.json({
        authenticated: true,
        user,
        workspaces: [],
      });
    }
  } catch (error: unknown) {
    unstable_rethrow(error);
    if (error instanceof AuthError) {
      return NextResponse.json(
        { authenticated: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "Failed to verify session." },
      { status: 500 }
    );
  }
}
