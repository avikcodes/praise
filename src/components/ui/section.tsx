import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";

type SectionTone = "base" | "white" | "muted" | "lavender";

const toneClasses: Record<SectionTone, string> = {
  base: "bg-warm-50",
  white: "bg-white",
  muted: "bg-warm-100",
  lavender: "bg-brand-50",
};

type SectionProps = React.ComponentPropsWithoutRef<"section"> & {
  /** Background tone for the band. */
  tone?: SectionTone;
  /** Anchor id, also used as the scroll target from the navigation. */
  id?: string;
};

/**
 * Full-width colour band with shared vertical rhythm. Content inside should
 * be wrapped in `<Container>`.
 */
export function Section({
  tone = "base",
  id,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn("section", toneClasses[tone], className)}
      {...props}
    >
      <Container>{children}</Container>
    </section>
  );
}

type SectionHeadingProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
};

/**
 * Shared section heading: eyebrow label, title, supporting copy.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        centered ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2 className="heading-lg">{title}</h2>
      {description ? (
        <p className={cn("lead", centered ? "max-w-2xl" : "max-w-xl")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
