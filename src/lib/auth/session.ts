import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { cache } from "react";
import { prisma } from "../db/client.ts";
import { auth } from "./server.ts";
import { syncNeonUser } from "./sync.ts";

export const SESSION_COOKIE_NAME = "praise_session";
export const SESSION_DURATION_DAYS = 14;

/**
 * Creates a new session for a user in the database (legacy support).
 */
export async function createSession(userId: string): Promise<string> {
  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expiresAt,
    },
  });

  return sessionToken;
}

/**
 * Sets the secure HttpOnly session cookie on the client response (legacy support).
 */
export async function setSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Clears session cookies and destroys session state.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      await prisma.session.delete({
        where: { sessionToken: token },
      });
    } catch {
      // Session might already be gone
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Validates the session from the incoming request.
 * 1. Checks Neon Managed Better Auth session first.
 * 2. Idempotently syncs Neon Auth user to application schema if authenticated.
 * 3. Falls back to legacy session cookie if present.
 * Uses React cache() to deduplicate lookups across the same request render tree.
 */
export const getSessionUser = cache(async () => {
  // 1. Check Neon Auth session
  let neonSessionUser = null;
  try {
    const { data: sessionData } = await auth.getSession();
    if (sessionData?.user) {
      neonSessionUser = sessionData.user;
    }
  } catch {
    // If Neon Auth session check fails or is unconfigured, proceed to legacy check
  }

  if (neonSessionUser) {
    try {
      const user = await syncNeonUser(neonSessionUser);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      };
    } catch (syncError) {
      console.error("[auth] Critical error synchronizing authenticated Neon user:", syncError);
      throw syncError;
    }
  }

  // 2. Legacy session cookie fallback
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
});
