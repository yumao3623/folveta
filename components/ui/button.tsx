import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import {
  buttonClassName,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/styles";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
};

export function Button({
  children,
  className,
  disabled,
  "aria-busy": ariaBusy,
  loading = false,
  loadingLabel,
  size = "md",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
      aria-busy={loading || ariaBusy || undefined}
    >
      {loading && (
        <LoaderCircle
          aria-hidden="true"
          className="ui-button__spinner h-[1.15em] w-[1.15em]"
          strokeWidth={1.9}
        />
      )}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
