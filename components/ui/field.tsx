import {
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/components/ui/styles";

export function FieldLabel({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("ui-field-label", className)} {...props} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & {
  state?: "default" | "error" | "success";
}>(function Input({
  className,
  state,
  "aria-invalid": ariaInvalid,
  ...props
}, ref) {
  return (
    <input
      className={cn(
        "ui-field-control",
        state && state !== "default" && `ui-field-control--${state}`,
        className,
      )}
      ref={ref}
      {...props}
      aria-invalid={state === "error" || ariaInvalid || undefined}
    />
  );
});

export function Textarea({
  className,
  state,
  "aria-invalid": ariaInvalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  state?: "default" | "error" | "success";
}) {
  return (
    <textarea
      className={cn(
        "ui-field-control min-h-28 resize-y",
        state && state !== "default" && `ui-field-control--${state}`,
        className,
      )}
      {...props}
      aria-invalid={state === "error" || ariaInvalid || undefined}
    />
  );
}

export function FieldMessage({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLParagraphElement> & {
  tone?: "default" | "error" | "success";
}) {
  return (
    <p
      className={cn(
        "ui-field-message",
        tone !== "default" && `ui-field-message--${tone}`,
        className,
      )}
      {...props}
    />
  );
}
