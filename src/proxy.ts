import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

/**
 * Next.js 16 Proxy Layer for Praise:
 * 1. Custom Domain Routing (migrated from legacy middleware.ts):
 *    - Detects custom domain requests via Host / X-Forwarded-Host headers.
 *    - Rewrites custom domain traffic to `/d/[domain]/:path*`.
 * 2. Neon Managed Auth Route Protection:
 *    - Verifies session on protected application routes (/dashboard/*).
 *    - Redirects unauthenticated visitors to `/auth/sign-in`.
 *    - Allows public marketing, public forms, public walls of love, and embed routes.
 */

// Custom domain exclusion check
function isCustomDomain(request: NextRequest): string | null {
  const { pathname } = request.nextUrl;

  // Skip static assets, internal paths, and API routes from custom domain rewrites
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/embed") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/d/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.includes(".")
  ) {
    return null;
  }

  const rawHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  const host = rawHost.split(":")[0].toLowerCase().trim();

  const defaultDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || "").toLowerCase().trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").toLowerCase().trim();
  const siteHost = siteUrl.replace(/^[a-z]+:\/\//, "").split("/")[0].split(":")[0];

  const isLocalOrSystem =
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (defaultDomain && host === defaultDomain) ||
    (siteHost && host === siteHost);

  if (isLocalOrSystem) {
    return null;
  }

  return host;
}

// Neon Auth Middleware instance
const neonMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
  publicRoutes: [
    "/",
    "/auth",
    "/auth/sign-in",
    "/auth/sign-up",
    "/auth/forgot-password",
    "/login",
    "/signup",
    "/api/auth",
    "/api/auth/*",
    "/p",
    "/p/*",
    "/w",
    "/w/*",
    "/b",
    "/b/*",
    "/d",
    "/d/*",
    "/embed",
    "/embed/*",
    "/api/forms",
    "/api/forms/*",
    "/api/wall",
    "/api/wall/*",
    "/api/brand",
    "/api/brand/*",
    "/api/v1/public",
    "/api/v1/public/*",
    "/api/rewards",
    "/api/rewards/*",
    "/api/invitations",
    "/api/invitations/*",
    "/api/sms",
    "/api/sms/*",
    "/api/cron",
    "/api/cron/*",
    "/api/health",
    "/privacy",
    "/terms",
    "/docs",
    "/docs/*",
    "/features",
    "/how-it-works",
    "/community",
    "/community/*",
    "/open-source",
    "/developers",
    "/self-host",
    "/security",
    "/faq",
    "/ai-integrations",
  ],
});

export async function proxy(request: NextRequest) {
  // 1. Custom Domain Resolution
  const customHost = isCustomDomain(request);
  if (customHost) {
    const { pathname } = request.nextUrl;
    const rewriteUrl = new URL(`/d/${customHost}${pathname === "/" ? "" : pathname}`, request.url);
    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set("x-praise-custom-domain", customHost);
    return response;
  }

  // 2. Neon Auth Route Protection & Session Refresh
  return neonMiddleware(request);
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
