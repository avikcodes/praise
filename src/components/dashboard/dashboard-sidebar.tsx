"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  FolderKanban,
  HardDrive,
  Inbox,
  LayoutGrid,
  LifeBuoy,
  MessageSquareQuote,
  Settings,
  Users2,
  X,
} from "lucide-react";
import { PraiseLogo } from "@/components/brand";
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof BarChart3;
  badge?: string;
  badgeVariant?: "default" | "brand";
};

const navigationItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: BarChart3 },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Testimonials", href: "/dashboard/testimonials", icon: MessageSquareQuote },
  { label: "Forms", href: "/dashboard/forms", icon: Inbox },
  { label: "Customers", href: "/dashboard/customers", icon: Users2 },
  { label: "Widgets", href: "/dashboard/widgets", icon: LayoutGrid },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export function DashboardSidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const isCurrent = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-4">
        {/* Logo and Brand */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg"
            onClick={onCloseMobile}
            aria-label="Praise Dashboard"
          >
            <PraiseLogo size="sm" decorative />
          </Link>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 border border-brand-200">
            Core v1
          </span>
        </div>

        {/* Workspace & Project Switchers */}
        <div className="pt-1">
          <WorkspaceSwitcher />
          <ProjectSwitcher />
        </div>

        {/* Navigation list */}
        <nav aria-label="Dashboard Sidebar" className="space-y-1 pt-2">
          {navigationItems.map((item) => {
            const active = isCurrent(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-brand-500 text-white font-semibold shadow-xs"
                    : "text-ink-700 hover:bg-warm-100/80 hover:text-ink-900",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={16}
                    className={cn(
                      active ? "text-white" : "text-ink-400 group-hover:text-ink-700",
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-medium",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-warm-200 text-ink-600",
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Self-Host Status */}
      <div className="space-y-3 pt-4 border-t border-line">
        {/* Storage status pill */}
        <div className="rounded-lg border border-line bg-warm-100/50 p-2.5 text-xs">
          <div className="flex items-center justify-between text-[11px] font-medium text-ink-700">
            <span className="flex items-center gap-1.5">
              <HardDrive size={13} className="text-ink-400" />
              <span>Local Storage</span>
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Healthy
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-warm-200 overflow-hidden">
            <div className="h-full bg-brand-500 w-[12%]" />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-ink-400">
            <span>Disk Volume</span>
            <span>12% used</span>
          </div>
        </div>

        {/* External Docs Link */}
        <Link
          href="/docs"
          target="_blank"
          className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-ink-500 hover:bg-warm-100 hover:text-ink-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            <LifeBuoy size={14} />
            <span>Documentation</span>
          </span>
          <ExternalLink size={12} className="text-ink-400" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 border-r border-line bg-warm-50/80 backdrop-blur-xs">
        {navContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 bg-warm-50 shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <div className="absolute right-3 top-3">
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-warm-200 hover:text-ink-900 transition-colors"
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
