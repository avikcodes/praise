"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Shell component that renders the marketing header and footer on public
 * marketing, documentation, community, and legal pages, while allowing
 * the `/dashboard`, `/login`, `/signup`, and customer form `/p/[slug]` routes
 * to render their own dedicated, distraction-free application layouts.
 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isApplicationRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/p/");

  if (isApplicationRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-16">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

