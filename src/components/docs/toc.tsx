"use client";

import { useEffect, useState } from "react";
import { List } from "lucide-react";
import { cn } from "@/lib/utils";

export type TocItem = {
  id: string;
  title: string;
  level?: number;
};

type TocProps = {
  items: TocItem[];
};

export function TableOfContents({ items }: TocProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-80px 0% -60% 0%",
        threshold: 0,
      },
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-24 hidden max-h-[calc(100vh-8rem)] w-60 shrink-0 overflow-y-auto pl-4 xl:block"
    >
      <div className="flex items-center gap-2 pb-3 text-xs font-semibold uppercase tracking-wider text-ink-900 border-b border-line/60">
        <List size={14} className="text-brand-600" aria-hidden="true" />
        <span>On this page</span>
      </div>

      <ul className="mt-3 flex flex-col gap-2 text-xs leading-normal">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li
              key={item.id}
              className={cn(
                item.level === 3 ? "pl-3 text-[11px]" : "",
              )}
            >
              <a
                href={`#${item.id}`}
                className={cn(
                  "block py-0.5 transition-colors",
                  isActive
                    ? "font-semibold text-brand-700"
                    : "text-ink-500 hover:text-ink-900",
                )}
              >
                {item.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

