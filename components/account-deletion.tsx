"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, FieldMessage, Input } from "@/components/ui/field";

export function AccountDeletion() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function close() {
    if (pending) return;
    setOpen(false);
    setConfirmation("");
    setError(null);
  }

  async function deleteAccount() {
    if (confirmation !== "DELETE") return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message ?? "Your account could not be deleted. Please retry.");
      }
      router.replace("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Your account could not be deleted. Please retry.");
      setPending(false);
    }
  }

  return (
    <>
      <section className="mt-7 border-t border-[var(--border-soft)] pt-6" aria-labelledby="delete-account-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="delete-account-heading" className="text-[18px] font-semibold text-[var(--foreground)]">Delete account</h2>
            <p className="mt-2 max-w-xl text-[14px] leading-6 text-[var(--muted)]">Permanently remove your Study Guides, source files, Quick Checks, and account access.</p>
          </div>
          <Button variant="destructive" onClick={() => {
            setOpen(true);
            window.requestAnimationFrame(() => inputRef.current?.focus());
          }}><Trash2 className="h-4 w-4" /> Delete account</Button>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 px-4" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) close();
        }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="account-delete-title" aria-describedby="account-delete-description" className="ui-surface ui-surface--elevated w-full max-w-md p-5 shadow-[var(--shadow-md)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3"><AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-[var(--destructive)]" /><div><p className="text-label-sm text-[var(--destructive)]">Irreversible action</p><h2 id="account-delete-title" className="mt-1 font-headline-md text-[22px] font-semibold">Delete your account?</h2></div></div>
              <Button variant="ghost" size="icon-sm" aria-label="Close dialog" title="Close" onClick={close} disabled={pending}><X className="h-4 w-4" /></Button>
            </div>
            <p id="account-delete-description" className="mt-4 text-[14px] leading-6 text-[var(--text-secondary)]">This permanently deletes your private files and study data. Billing transaction records required for audit may be retained by Paddle.</p>
            <div className="mt-5">
              <FieldLabel htmlFor="account-delete-confirmation">Type DELETE to confirm</FieldLabel>
              <Input ref={inputRef} id="account-delete-confirmation" className="mt-2" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} autoComplete="off" />
              {error && <FieldMessage tone="error" className="mt-2">{error}</FieldMessage>}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={close} disabled={pending}>Cancel</Button><Button variant="destructive" loading={pending} loadingLabel="Deleting" disabled={confirmation !== "DELETE"} onClick={() => void deleteAccount()}><Trash2 className="h-4 w-4" /> Delete account</Button></div>
          </section>
        </div>
      )}
    </>
  );
}
