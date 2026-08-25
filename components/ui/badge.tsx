import type { HTMLAttributes } from "react";
import { badgeClassName, type Tone } from "@/components/ui/styles";

export function Badge({
  children,
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span className={badgeClassName(tone, className)} {...props}>
      {children}
    </span>
  );
}
