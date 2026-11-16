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

// Paths that belong strictly to the Praise core application platform
// and MUST NEVER be rewritten to a customer custom domain route.
const PLATFORM_PATH_PREFIXES = [
  "/_next",
  "/api",
  "/dashboard",
  "/auth",
  "/login",
  "/signup",
  "/logout",
  "/embed",
  "/brand",
  "/d/",
  "/p/",
  "/w/",
  "/b/",
];

const PLATFORM_EXACT_PATHS = new Set([
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/icon.svg",
  "/apple-icon.png",
]);

// Custom domain exclusion check
function isCustomDomain(request: NextRequest): string | null {
  const { pathname } = request.nextUrl;

  // 1. Skip all static assets with file extensions
  if (pathname.includes(".")) {
    return null;
  }

  // 2. Skip all platform path prefixes (dashboard, auth, login, signup, api, embed, etc.)
  for (const prefix of PLATFORM_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return null;
    }
  }

  // 3. Skip exact platform file paths
  if (PLATFORM_EXACT_PATHS.has(pathname)) {
    return null;
  }

  const rawHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  const host = rawHost.split(":")[0].toLowerCase().trim();

  // Known application / system domains that MUST NEVER be rewritten as customer custom domains:
  const defaultDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || "").toLowerCase().trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").toLowerCase().trim();
  const siteHost = siteUrl.replace(/^[a-z]+:\/\//, "").split("/")[0].split(":")[0];
  const vercelUrl = (process.env.VERCEL_URL || "").toLowerCase().trim().replace(/^[a-z]+:\/\//, "").split(":")[0];
  const vercelProdUrl = (process.env.VERCEL_PROJECT_PRODUCTION_URL || "").toLowerCase().trim().replace(/^[a-z]+:\/\//, "").split(":")[0];

  const isLocalOrSystem =
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "praise.aviklabs.xyz" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".test") ||
    host.endsWith(".vercel.app") || // All Vercel preview, branch, and deployment hosts
    (defaultDomain && host === defaultDomain) ||
    (siteHost && host === siteHost) ||
    (vercelUrl && host === vercelUrl) ||
    (vercelProdUrl && host === vercelProdUrl);

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
    "/api/v1",
    "/api/v1/*",
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
