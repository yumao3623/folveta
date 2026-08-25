import type { HTMLAttributes } from "react";
import { surfaceClassName } from "@/components/ui/styles";

type SurfaceVariant = Parameters<typeof surfaceClassName>[0];

export function Surface({
  className,
  variant = "base",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: SurfaceVariant }) {
  return <div className={surfaceClassName(variant, className)} {...props} />;
}
