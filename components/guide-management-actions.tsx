"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, FieldMessage, Input } from "@/components/ui/field";
import { GUIDE_TITLE_MAX_LENGTH } from "@/lib/schemas/guide-management";

type Action = "rename" | "archive" | "restore" | "delete";

async function readApiError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return body?.error?.message ?? "This change could not be saved. Please retry.";
}

export function GuideManagementActions({
  archived,
  guideId,
  title,
}: {
  archived: boolean;
  guideId: string;
  title: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [draftTitle, setDraftTitle] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const firstControlRef = useRef<HTMLInputElement | HTMLButtonElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!action) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => firstControlRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setAction(null);
      if (event.key === "Tab") {
        const controls = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", closeOnEscape);
      previousFocusRef.current?.focus();
    };
  }, [action, pending]);

  function open(nextAction: Action) {
    setDraftTitle(title);
    setError(null);
    setAction(nextAction);
  }

  async function submit() {
    if (!action) return;
    const normalizedTitle = draftTitle.trim();
    if (action === "rename" && !normalizedTitle) {
      setError("Enter a title for this Guide.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/guides/${guideId}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: action === "delete" ? undefined : { "Content-Type": "application/json" },
        body: action === "delete"
          ? undefined
          : JSON.stringify(action === "rename" ? { action, title: normalizedTitle } : { action }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      setAction(null);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "This change could not be saved. Please retry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1" aria-label={`Manage ${title}`}>
        {!archived && (
          <Button variant="ghost" size="icon-sm" aria-label={`Rename ${title}`} title="Rename Guide" onClick={() => open("rename")}>
            <Pencil className="h-4 w-4" strokeWidth={1.8} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${archived ? "Restore" : "Archive"} ${title}`}
          title={archived ? "Restore Guide" : "Archive Guide"}
          onClick={() => open(archived ? "restore" : "archive")}
        >
          {archived ? <RotateCcw className="h-4 w-4" strokeWidth={1.8} /> : <Archive className="h-4 w-4" strokeWidth={1.8} />}
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${title}`} title="Delete Guide" onClick={() => open("delete")}>
          <Trash2 className="h-4 w-4 text-[var(--destructive)]" strokeWidth={1.8} />
        </Button>
      </div>

      {action && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 px-4" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target && !pending) setAction(null);
        }}>
          <section
            ref={modalRef}
            role={action === "delete" ? "alertdialog" : "dialog"}
            aria-modal="true"
            aria-labelledby="guide-action-title"
            aria-describedby={action === "rename" ? undefined : "guide-action-description"}
            className="ui-surface ui-surface--elevated w-full max-w-md p-5 shadow-[var(--shadow-md)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label-sm text-[var(--primary)]">Guide management</p>
                <h2 id="guide-action-title" className="mt-1 font-headline-md text-[22px] font-semibold text-[var(--foreground)]">
                  {action === "rename" ? "Rename Guide" : action === "archive" ? "Archive Guide?" : action === "restore" ? "Restore Guide?" : "Delete Guide?"}
                </h2>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Close dialog" title="Close" onClick={() => setAction(null)} disabled={pending}>
                <X className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            </div>

            {action === "rename" ? (
              <div className="mt-5">
                <FieldLabel htmlFor={`guide-title-${guideId}`}>Guide title</FieldLabel>
                <Input
                  ref={firstControlRef as React.Ref<HTMLInputElement>}
                  id={`guide-title-${guideId}`}
                  className="mt-2"
                  value={draftTitle}
                  maxLength={GUIDE_TITLE_MAX_LENGTH}
                  state={error ? "error" : "default"}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void submit();
                  }}
                />
                <FieldMessage tone={error ? "error" : "default"}>
                  {error ?? `${draftTitle.length}/${GUIDE_TITLE_MAX_LENGTH} characters`}
                </FieldMessage>
              </div>
            ) : (
              <p id="guide-action-description" className="mt-4 text-[14px] leading-6 text-[var(--text-secondary)]">
                {action === "archive"
                  ? `"${title}" will leave My Guides and Recent Guides. You can restore it from Archived.`
                  : action === "restore"
                    ? `"${title}" will return to My Guides.`
                    : `"${title}" will become unavailable immediately. Its files and records are scheduled for permanent cleanup after 30 days.`}
              </p>
            )}
            {action !== "rename" && error && <FieldMessage tone="error" className="mt-3">{error}</FieldMessage>}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setAction(null)} disabled={pending}>Cancel</Button>
              <Button
                ref={action === "rename" ? undefined : firstControlRef as React.Ref<HTMLButtonElement>}
                variant={action === "delete" ? "destructive" : "primary"}
                loading={pending}
                loadingLabel="Saving"
                onClick={() => void submit()}
              >
                {action === "rename" ? "Save title" : action === "archive" ? "Archive" : action === "restore" ? "Restore" : "Delete Guide"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
