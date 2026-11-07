import { CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

type PlannedChipProps = {
  /** Status wording — "Planned", "Not implemented yet". */
  label?: string;
  className?: string;
};

/**
 * Marks a capability that is designed but not implemented yet, so planned
 * work is never presented as something shipping today.
 */
export function PlannedChip({ label = "Planned", className }: PlannedChipProps) {
  return (
    <span
      className={cn(
        "chip border-dashed border-brand-300 bg-brand-50 text-brand-700",
        className,
      )}
    >
      <CircleDashed size={12} aria-hidden="true" />
      {label}
    </span>
  );
}
