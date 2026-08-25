import type { HTMLAttributes, ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleAlert,
  Info,
} from "lucide-react";
import { cn } from "@/components/ui/styles";

type FeedbackTone = "info" | "success" | "warning" | "destructive";

const alertIcons = {
  info: Info,
  success: CheckCircle2,
  warning: CircleAlert,
  destructive: AlertCircle,
};

export function Alert({
  children,
  className,
  icon = true,
  role,
  tone = "info",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  icon?: boolean;
  tone?: FeedbackTone;
}) {
  const AlertIcon = alertIcons[tone];
  return (
    <div
      className={cn("ui-alert", `ui-alert--${tone}`, className)}
      {...props}
      role={tone === "destructive" ? "alert" : role}
    >
      {icon && (
        <AlertIcon
          aria-hidden="true"
          className="mt-0.5 h-[18px] w-[18px] shrink-0"
          strokeWidth={1.9}
        />
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Progress({
  label,
  value,
}: {
  label: string;
  value?: number;
}) {
  const determinate = typeof value === "number";
  const normalized = determinate ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <div
      className="ui-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={determinate ? normalized : undefined}
    >
      <div
        className={cn(
          "ui-progress__bar",
          !determinate && "ui-progress__bar--indeterminate",
        )}
        style={determinate ? { width: `${normalized}%` } : undefined}
      />
    </div>
  );
}

export function EmptyState({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="ui-surface ui-surface--subtle px-6 py-10 text-center">
      <span className="ui-icon-frame ui-icon-frame--lg ui-icon-frame--primary mx-auto">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
