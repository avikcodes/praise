import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureListProps = {
  items: string[];
  className?: string;
};

/**
 * Capability bullets used by the product explanation sections.
 */
export function FeatureList({ items, className }: FeatureListProps) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 text-sm leading-relaxed text-ink-700"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-600"
          >
            <Check size={12} strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
