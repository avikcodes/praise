"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  Code2,
  HardDrive,
  LayoutGrid,
  Menu,
  Rocket,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  href: string;
  badge?: string;
  icon: typeof BookOpen;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const docNav: NavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Introduction",
        href: "/docs",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Getting Started",
    items: [
      {
        title: "Quickstart Guide",
        href: "/docs/getting-started",
        badge: "Essential",
        icon: Rocket,
      },
      {
        title: "Self-Host Deployment",
        href: "/docs/deployment",
        icon: HardDrive,
      },
    ],
  },
  {
    title: "Integration & Development",
    items: [
      {
        title: "Widgets & Embeds",
        href: "/docs/widgets",
        icon: LayoutGrid,
      },
      {
        title: "REST API Reference",
        href: "/docs/api-reference",
        badge: "Spec",
        icon: Code2,
      },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const closeMobile = () => setMobileOpen(false);

  const filteredGroups = docNav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile Drawer Toggle Button */}
      <div className="flex items-center justify-between border-b border-line bg-warm-100 px-4 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="btn btn-secondary btn-sm gap-2"
          aria-expanded={mobileOpen}
          aria-controls="docs-sidebar"
        >
          {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          <span>Documentation Menu</span>
        </button>

        <span className="text-xs font-medium text-ink-500">
          {docNav
            .flatMap((g) => g.items)
            .find((i) => i.href === pathname)?.title ?? "Docs"}
        </span>
      </div>

      {/* Sidebar Container */}
      <aside
        id="docs-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-line bg-warm-50 p-5 transition-transform duration-200 lg:static lg:z-0 lg:block lg:w-64 lg:shrink-0 lg:border-r lg:bg-transparent lg:p-0 lg:translate-x-0",
          mobileOpen ? "translate-x-0 top-16" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col gap-5 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
          {/* Search Filter Box */}
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-line bg-white py-1.5 pl-8 pr-3 text-xs text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Navigation Groups */}
          <nav aria-label="Documentation sections" className="flex flex-col gap-6">
            {filteredGroups.map((group) => (
              <div key={group.title} className="flex flex-col gap-1.5">
                <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  {group.title}
                </span>

                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={closeMobile}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                            isActive
                              ? "bg-brand-50 text-brand-700 font-semibold"
                              : "text-ink-700 hover:bg-warm-100 hover:text-ink-900",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Icon
                              size={14}
                              className={
                                isActive ? "text-brand-600" : "text-ink-400"
                              }
                            />
                            <span>{item.title}</span>
                          </span>

                          {item.badge ? (
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.2 text-[10px] font-medium",
                                item.badge === "Essential"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-brand-50 text-brand-700 border border-brand-200",
                              )}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 z-30 bg-ink-900/20 backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}
    </>
  );
}
