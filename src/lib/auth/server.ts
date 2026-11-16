import { createNeonAuth } from "@neon/auth/next/server";

/**
 * Server-side Neon Auth client singleton.
 * Uses Neon Managed Better Auth to handle authentication credentials,
 * sessions, API route proxying, and route protection middleware.
 */
const baseUrl =
  process.env.NEON_AUTH_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://auth.neon.tech"
    : "http://localhost:3000/api/auth");

const secret =
  process.env.NEON_AUTH_COOKIE_SECRET ||
  "neon_auth_fallback_cookie_secret_minimum_32_characters_for_security";

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret,
    sessionDataTtl: 300, // 5 minutes cache TTL
  },
});

export type AuthServer = typeof auth;
