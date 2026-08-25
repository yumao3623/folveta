import type { HTMLAttributes } from "react";
import {
  iconFrameClassName,
  type Tone,
} from "@/components/ui/styles";

export function IconFrame({
  active,
  children,
  className,
  size = "md",
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  active?: boolean;
  size?: "sm" | "md" | "lg";
  tone?: Tone;
}) {
  return (
    <span
      className={iconFrameClassName({ tone, size, active, className })}
      {...props}
    >
      {children}
    </span>
  );
}
