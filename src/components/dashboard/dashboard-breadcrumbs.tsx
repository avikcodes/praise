"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const routeNames: Record<string, string> = {
  dashboard: "Overview",
  projects: "Projects",
  testimonials: "Testimonials",
  forms: "Forms",
  customers: "Customers",
  widgets: "Widgets",
  settings: "Settings",
};

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // If just /dashboard, show "Overview"
  if (segments.length <= 1) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-800">
        <Home size={13} className="text-ink-400" />
        <span>Overview</span>
      </div>
    );
  }

  return (
    <nav aria-label="Dashboard Breadcrumbs" className="flex items-center gap-1.5 text-xs text-ink-500">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-ink-900 transition-colors"
      >
        <Home size={13} className="text-ink-400" />
        <span>Overview</span>
      </Link>

      {segments.slice(1).map((seg, idx, arr) => {
        const isLast = idx === arr.length - 1;
        const href = "/dashboard/" + arr.slice(0, idx + 1).join("/");
        const title = routeNames[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);

        return (
          <span key={seg} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-ink-300 shrink-0" aria-hidden="true" />
            {isLast ? (
              <span className="font-semibold text-ink-900" aria-current="page">
                {title}
              </span>
            ) : (
              <Link href={href} className="hover:text-ink-900 transition-colors">
                {title}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

