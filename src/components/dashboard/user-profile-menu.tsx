"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  LogOut,
  Settings,
} from "lucide-react";
import { useToast } from "@/components/dashboard/toast-context";

export function UserProfileMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-warm-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        aria-expanded={open}
        aria-label="User account menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-xs border border-brand-200">
          A
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-line bg-white p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          {/* User info header */}
          <div className="px-3 py-2 border-b border-line mb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">
                Administrator
              </span>
              <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 border border-brand-200">
                Owner
              </span>
            </div>
            <span className="block text-[11px] text-ink-500 truncate mt-0.5">
              admin@praise.local
            </span>
          </div>

          <div className="space-y-0.5 text-xs text-ink-700">
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-warm-50 hover:text-ink-900 transition-colors"
            >
              <Settings size={14} className="text-ink-400" />
              <span>Workspace Settings</span>
            </Link>

            <Link
              href="/docs"
              target="_blank"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-warm-50 hover:text-ink-900 transition-colors"
            >
              <BookOpen size={14} className="text-ink-400" />
              <span>Documentation</span>
            </Link>
          </div>

          <div className="my-1 border-t border-line" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              toast.info("Signed out", "You have been logged out of your session.");
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
