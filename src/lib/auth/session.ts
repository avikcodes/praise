import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/client";

export const SESSION_COOKIE_NAME = "praise_session";
export const SESSION_DURATION_DAYS = 14;

/**
 * Creates a new session for a user in the database and returns the session token.
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
 * Sets the secure HttpOnly session cookie on the client response.
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
 * Clears the session cookie and deletes the session row from the database.
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
 * Validates the session from the incoming request cookie.
 * Returns the authenticated user or null.
 */
export async function getSessionUser() {
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
}

