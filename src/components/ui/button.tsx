import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

type ButtonBaseProps = ButtonStyleProps & {
  children: ReactNode;
};

/**
 * Shared class recipe so `<button>` and `<ButtonLink>` stay visually identical.
 */
function classesFor({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleProps) {
  return cn("btn", variantClasses[variant], sizeClasses[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonBaseProps & Omit<ComponentProps<"button">, "type"> & {
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button type={type} className={classesFor({ variant, size, className })} {...props} />
  );
}

/**
 * Same visuals, renders a Next.js `<Link>` — use for any navigation,
 * in-page anchor or external URL.
 */
export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ButtonBaseProps & ComponentProps<typeof Link>) {
  return <Link className={classesFor({ variant, size, className })} {...props} />;
}
