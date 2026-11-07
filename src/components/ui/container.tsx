import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ContainerProps = HTMLAttributes<HTMLDivElement>;

/**
 * Page gutter + max width. Sections line up because every section wraps its
 * content in this.
 */
export function Container({ className, ...props }: ContainerProps) {
  return <div className={cn("container-page", className)} {...props} />;
}
