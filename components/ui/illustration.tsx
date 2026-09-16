import type { SVGProps } from "react";
import { cn } from "@/components/ui/styles";

export type IllustrationKind = "material" | "guide" | "check" | "source";

/**
 * Folveta's filled study illustrations. Utility actions can stay icon-sized;
 * these are intentionally larger, friendlier shapes for product moments.
 */
export function StudyIllustration({
  kind,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { kind: IllustrationKind }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("study-illustration", `study-illustration--${kind}`, className)}
      fill="none"
      {...props}
    >
      {kind === "material" ? (
        <>
          <path d="M16 9h23l10 10v34H16a5 5 0 0 1-5-5V14a5 5 0 0 1 5-5Z" fill="currentColor" opacity=".18" />
          <path d="M39 9v12h12" fill="currentColor" opacity=".38" />
          <path d="M20 31h23M20 39h17M20 47h13" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M41 41c4-7 8-9 13-5-2 7-6 11-13 12-2-2-2-4 0-7Z" fill="#ff8b6b" />
        </>
      ) : null}
      {kind === "guide" ? (
        <>
          <path d="M10 14c8-4 15-3 22 2v37c-7-5-14-6-22-2V14Z" fill="currentColor" opacity=".22" />
          <path d="M54 14c-8-4-15-3-22 2v37c7-5 14-6 22-2V14Z" fill="currentColor" opacity=".38" />
          <path d="M32 16v36M17 24h9M17 32h9M38 24h9M38 32h9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="47" cy="16" r="6" fill="#ffdb55" />
          <path d="m44.5 16 2 2 3.5-4" stroke="#755c00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {kind === "check" ? (
        <>
          <circle cx="32" cy="32" r="22" fill="currentColor" opacity=".18" />
          <path d="M19 32.5 27 40l18-19" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="49" cy="14" r="8" fill="#ff8b6b" />
          <path d="m45.5 14 2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {kind === "source" ? (
        <>
          <path d="M11 22c7-4 14-4 21 0v28c-7-4-14-4-21 0V22Z" fill="currentColor" opacity=".18" />
          <path d="M53 22c-7-4-14-4-21 0v28c7-4 14-4 21 0V22Z" fill="currentColor" opacity=".38" />
          <path d="M18 29h8M18 36h8M38 29h8M38 36h8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M31 11c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z" fill="#5d9cf5" />
        </>
      ) : null}
    </svg>
  );
}
