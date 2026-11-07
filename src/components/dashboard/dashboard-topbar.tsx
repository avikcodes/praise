"use client";

import { useState } from "react";
import {
  Bell,
  Menu,
  Search,
} from "lucide-react";
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";
import { UserProfileMenu } from "@/components/dashboard/user-profile-menu";
import { useToast } from "@/components/dashboard/toast-context";

type TopbarProps = {
  onToggleMobile: () => void;
};

export function DashboardTopbar({ onToggleMobile }: TopbarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "n-1",
      title: "Praise Core v1 Initialized",
      description: "Welcome to your new self-hosted Praise instance.",
      time: "Just now",
      unread: true,
    },
  ]);
  const toast = useToast();

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    toast.info("Notifications cleared", "All system notifications marked as read.");
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-warm-50/90 px-4 sm:px-6 backdrop-blur-xs">
      {/* Left: Mobile menu button + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobile}
          className="rounded-lg p-1.5 text-ink-600 hover:bg-warm-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        <DashboardBreadcrumbs />
      </div>

      {/* Right: Quick actions, notifications, user profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Search / Command Shortcut pill */}
        <button
          type="button"
          onClick={() =>
            toast.info("Search", "Global quick search (Cmd+K) ready.")
          }
          className="hidden sm:flex items-center gap-2 rounded-lg border border-line bg-white/70 px-2.5 py-1 text-xs text-ink-400 hover:border-brand-300 hover:text-ink-700 transition-colors"
          aria-label="Search"
        >
          <Search size={13} />
          <span>Search testimonials...</span>
          <kbd className="rounded bg-warm-100 px-1.5 py-0.5 text-[10px] font-mono text-ink-500 border border-line">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="relative rounded-lg p-1.5 text-ink-500 hover:bg-warm-100 hover:text-ink-800 transition-colors"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell size={17} />
            {notifications.some((n) => n.unread) && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-500" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-xl border border-line bg-white p-2 shadow-lg animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5">
                <span className="text-xs font-semibold text-ink-900">
                  Notifications
                </span>
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] text-brand-600 hover:underline"
                >
                  Mark all read
                </button>
              </div>

              <div className="divide-y divide-line/60">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-ink-900">
                        {n.title}
                      </span>
                      <span className="text-[10px] text-ink-400 shrink-0">
                        {n.time}
                      </span>
                    </div>
                    <p className="text-ink-600 text-[11px] mt-0.5 leading-relaxed">
                      {n.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User profile dropdown */}
        <UserProfileMenu />
      </div>
    </header>
  );
}
