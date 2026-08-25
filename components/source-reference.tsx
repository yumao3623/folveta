import type { SourceReference as SourceReferenceType } from "@/lib/schemas";
import { ChevronDown, FileText } from "lucide-react";
import { IconFrame } from "@/components/ui/icon-frame";

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
    <details className="ui-surface ui-surface--source group px-3 py-2.5 transition-[background-color,border-color,box-shadow] hover:border-[#a9cae7] hover:bg-[#dcecff] hover:shadow-[var(--shadow-xs)]">
      <summary className="flex list-none items-center gap-2 text-sm font-semibold text-[var(--source-blue-strong)] transition-colors hover:text-[#19476c]">
        <IconFrame tone="source" size="sm">
          <FileText
            aria-hidden="true"
            className="h-4 w-4"
            strokeWidth={1.8}
          />
        </IconFrame>
        <span className="min-w-0 flex-1">
          {reference.source_name} · {locator}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
          strokeWidth={1.8}
        />
      </summary>
      <p className="mt-3 border-l-2 border-[#9fc3e3] pl-3 text-sm leading-6 text-[#173d5b]">
        &ldquo;{reference.excerpt}&rdquo;
      </p>
    </details>
  );
}
