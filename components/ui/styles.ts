export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "soft"
  | "destructive";

export type ButtonSize =
  | "sm"
  | "md"
  | "lg"
  | "icon-sm"
  | "icon"
  | "icon-lg";

export type Tone =
  | "neutral"
  | "primary"
  | "source"
  | "success"
  | "warning"
  | "destructive";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "ui-button",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    className,
  );
}

export function badgeClassName(
  tone: Tone = "neutral",
  className?: string,
) {
  return cn("ui-badge", `ui-badge--${tone}`, className);
}

export function iconFrameClassName({
  tone = "neutral",
  size = "md",
  active = false,
  className,
}: {
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  className?: string;
} = {}) {
  return cn(
    "ui-icon-frame",
    size !== "md" && `ui-icon-frame--${size}`,
    active ? "ui-icon-frame--active" : `ui-icon-frame--${tone}`,
    className,
  );
}

export function surfaceClassName(
  variant:
    | "base"
    | "subtle"
    | "elevated"
    | "interactive"
    | "callout"
    | "info"
    | "warning"
    | "source" = "base",
  className?: string,
) {
  return cn(
    "ui-surface",
    variant !== "base" && `ui-surface--${variant}`,
    className,
  );
}
