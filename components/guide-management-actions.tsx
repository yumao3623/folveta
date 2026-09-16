"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, FieldMessage, Input } from "@/components/ui/field";
import { GUIDE_TITLE_MAX_LENGTH } from "@/lib/schemas/guide-management";
import { CartoonIcon } from "@/components/ui/cartoon-icon";
import { DialogFrame } from "@/components/ui/dialog-frame";

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
  const [dialogAction, setDialogAction] = useState<Action>("rename");
  const [draftTitle, setDraftTitle] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const firstControlRef = useRef<HTMLInputElement | HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  function open(nextAction: Action) {
    setDraftTitle(title);
    setError(null);
    setDialogAction(nextAction);
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
            <CartoonIcon name="edit" size={20} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`${archived ? "Restore" : "Archive"} ${title}`}
          title={archived ? "Restore Guide" : "Archive Guide"}
          onClick={() => open(archived ? "restore" : "archive")}
        >
          {archived ? <CartoonIcon name="history" size={20} /> : <CartoonIcon name="archive" size={20} />}
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${title}`} title="Delete Guide" onClick={() => open("delete")}>
          <CartoonIcon name="trash" size={20} />
        </Button>
      </div>

      <DialogFrame
        open={action !== null}
        onClose={() => setAction(null)}
        pending={pending}
        initialFocusRef={firstControlRef}
        role={dialogAction === "delete" ? "alertdialog" : "dialog"}
        labelledBy={titleId}
        describedBy={dialogAction === "rename" ? undefined : descriptionId}
      >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label-sm text-[var(--primary)]">Guide management</p>
                <h2 id={titleId} className="mt-1 font-headline-md text-[22px] font-semibold text-[var(--foreground)]">
                  {dialogAction === "rename" ? "Rename Guide" : dialogAction === "archive" ? "Archive Guide?" : dialogAction === "restore" ? "Restore Guide?" : "Delete Guide?"}
                </h2>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Close dialog" title="Close" onClick={() => setAction(null)} disabled={pending}>
                <X className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            </div>

            {dialogAction === "rename" ? (
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
              <p id={descriptionId} className="mt-4 text-[14px] leading-6 text-[var(--text-secondary)]">
                {dialogAction === "archive"
                  ? `"${title}" will leave My Guides and Recent Guides. You can restore it from Archived.`
                  : dialogAction === "restore"
                    ? `"${title}" will return to My Guides.`
                    : `"${title}" will become unavailable immediately. Its files and records become eligible for permanent cleanup after 30 days.`}
              </p>
            )}
            {dialogAction !== "rename" && error && <FieldMessage tone="error" className="mt-3">{error}</FieldMessage>}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setAction(null)} disabled={pending}>Cancel</Button>
              <Button
                ref={dialogAction === "rename" ? undefined : firstControlRef as React.Ref<HTMLButtonElement>}
                variant={dialogAction === "delete" ? "destructive" : "primary"}
                loading={pending}
                loadingLabel="Saving"
                onClick={() => void submit()}
              >
                {dialogAction === "rename" ? "Save title" : dialogAction === "archive" ? "Archive" : dialogAction === "restore" ? "Restore" : "Delete Guide"}
              </Button>
            </div>
      </DialogFrame>
    </>
  );
}
