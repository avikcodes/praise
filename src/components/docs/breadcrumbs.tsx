import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-ink-500">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-brand-700 transition-colors"
        aria-label="Home"
      >
        <Home size={13} />
      </Link>
      <ChevronRight size={12} className="text-ink-400 shrink-0" aria-hidden="true" />
      <Link
        href="/docs"
        className="hover:text-brand-700 transition-colors"
      >
        Docs
      </Link>
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.label} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-ink-400 shrink-0" aria-hidden="true" />
            {isLast || !crumb.href ? (
              <span className="font-medium text-ink-900" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-brand-700 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

