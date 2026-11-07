import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

type PagerLink = {
  title: string;
  href: string;
};

type PagerProps = {
  prev?: PagerLink;
  next?: PagerLink;
};

export function DocsPager({ prev, next }: PagerProps) {
  if (!prev && !next) return null;

  return (
    <div className="mt-12 flex flex-col gap-4 border-t border-line/80 pt-8 sm:flex-row sm:items-center sm:justify-between">
      {prev ? (
        <Link
          href={prev.href}
          className="card group flex flex-1 flex-col gap-1 p-4 transition-colors hover:border-brand-200"
        >
          <span className="flex items-center gap-1.5 text-xs text-ink-400 group-hover:text-brand-600">
            <ArrowLeft size={13} />
            <span>Previous</span>
          </span>
          <span className="text-sm font-semibold text-ink-900 group-hover:text-brand-700">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div className="hidden flex-1 sm:block" />
      )}

      {next ? (
        <Link
          href={next.href}
          className="card group flex flex-1 flex-col gap-1 p-4 text-right transition-colors hover:border-brand-200"
        >
          <span className="flex items-center justify-end gap-1.5 text-xs text-ink-400 group-hover:text-brand-600">
            <span>Next</span>
            <ArrowRight size={13} />
          </span>
          <span className="text-sm font-semibold text-ink-900 group-hover:text-brand-700">
            {next.title}
          </span>
        </Link>
      ) : (
        <div className="hidden flex-1 sm:block" />
      )}
    </div>
  );
}

