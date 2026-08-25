import type { SourceReference as SourceReferenceType } from "@/lib/schemas";
import { ChevronDown, FileText } from "lucide-react";

export function SourceReference({
  reference,
}: {
  reference: SourceReferenceType;
}) {
  const locator =
    reference.locator.kind === "page"
      ? `Page ${reference.locator.number}`
      : `Slide ${reference.locator.number}`;

  return (
    <details className="group rounded-lg border border-sky-200/70 bg-[var(--source-blue)]/55 px-4 py-3 transition-[background-color,border-color,box-shadow] hover:border-sky-300 hover:bg-[var(--source-blue)]/75 hover:shadow-[0_3px_12px_rgba(14,116,144,0.06)]">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sky-900 transition-colors hover:text-sky-950 active:translate-y-px">
        <FileText
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
          strokeWidth={1.8}
        />
        <span className="min-w-0 flex-1">
          {reference.source_name} · {locator}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
          strokeWidth={1.8}
        />
      </summary>
      <p className="mt-3 border-l-2 border-sky-300 pl-3 text-sm leading-6 text-sky-950">
        “{reference.excerpt}”
      </p>
    </details>
  );
}
