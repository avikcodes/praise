"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  GitPullRequest,
  History,
  MessageSquare,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const communityTabs = [
  { label: "Community", href: "/community", icon: Users },
  { label: "Discussions", href: "/community/discussions", icon: MessageSquare },
  { label: "Contributing", href: "/community/contributing", icon: GitPullRequest },
  { label: "Roadmap", href: "/community/roadmap", icon: Compass },
  { label: "Changelog", href: "/community/changelog", icon: History },
];

export function CommunityNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Community navigation"
      className="flex items-center gap-1 overflow-x-auto py-2.5 scrollbar-none"
    >
      {communityTabs.map(({ label, href, icon: Icon }) => {
        const isActive =
          href === "/community"
            ? pathname === "/community"
            : pathname.startsWith(href);

        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-brand-500 text-white font-semibold"
                : "text-ink-600 hover:bg-warm-100 hover:text-ink-900",
            )}
          >
            <Icon size={13} className={isActive ? "text-white" : "text-ink-400"} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

