"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Presentation,
  UploadCloud,
  X,
} from "lucide-react";
import { MVP_LIMITS } from "@/lib/config";

type FileState = {
  name: string;
  status:
    "queued" | "uploading" | "parsing" | "ready" | "ready_with_gaps" | "failed";
  message: string;
};

function errorMessage(value: unknown) {
  if (value && typeof value === "object" && "error" in value) {
    const error = (value as { error?: { message?: string } }).error;
    if (error?.message) return error.message;
  }
  return value instanceof Error
    ? value.message
    : "An unexpected error occurred.";
}

function fileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [states, setStates] = useState<FileState[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function selectFiles(list: FileList | null) {
    const selected = Array.from(list ?? []);
    setFormError(null);
    if (selected.length > MVP_LIMITS.maxFiles) {
      setFormError(`Choose at most ${MVP_LIMITS.maxFiles} files.`);
      return;
    }
    const invalid = selected.find(
      (file) =>
        !/\.(pdf|pptx)$/i.test(file.name) ||
        file.size > MVP_LIMITS.maxFileBytes,
    );
    if (invalid) {
      setFormError(
        `${invalid.name} is unsupported or exceeds the per-file limit.`,
      );
      return;
    }
    setFiles(selected);
    setStates(
      selected.map((file) => ({
        name: file.name,
        status: "queued",
        message: "Queued",
      })),
    );
  }

  function removeFile(index: number) {
    if (busy) return;
    setFiles((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
    setStates((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!busy) selectFiles(event.dataTransfer.files);
  }

  function onDropzoneKeyDown(event: KeyboardEvent<HTMLLabelElement>) {
    if (busy || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    inputRef.current?.click();
  }

  function update(index: number, status: FileState["status"], message: string) {
    setStates((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, status, message } : item,
      ),
    );
  }

  async function readJson(response: Response) {
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw json;
    return json;
  }

  async function submit() {
    if (!files.length) {
      setFormError("Choose at least one PDF or PPTX file.");
      return;
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      setFormError(
        "Real upload is not configured. Add the Supabase environment variables or open the example guide.",
      );
      return;
    }

    setBusy(true);
    setFormError(null);
    let sessionId: string | null = null;
    try {
      const sessionPayload = await readJson(
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: title.trim() || "My Study Guide" }),
        }),
      );
      sessionId = sessionPayload.session.id;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        let sourceId: string | null = null;
        let uploadCompleted = false;
        try {
          update(index, "uploading", "Uploading privately");
          const signed = await readJson(
            await fetch(`/api/sessions/${sessionId}/sources/upload-url`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                filename: file.name,
                mimeType: file.type || "application/octet-stream",
                size: file.size,
              }),
            }),
          );
          sourceId = signed.sourceId;
          const { error: uploadError } = await supabase.storage
            .from(
              process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ??
                "course-materials",
            )
            .uploadToSignedUrl(signed.path, signed.token, file, {
              contentType: file.type || undefined,
            });
          if (uploadError) throw new Error(uploadError.message);
          uploadCompleted = true;

          update(index, "parsing", "Extracting page/slide text");
          const parsed = await readJson(
            await fetch(`/api/sources/${sourceId}/parse`, { method: "POST" }),
          );
          update(
            index,
            parsed.source.status,
            parsed.source.status === "ready"
              ? `Ready · ${parsed.source.unitCount} pages/slides`
              : `Ready with ${parsed.source.warnings.length} warning(s)`,
          );
        } catch (error) {
          const message = errorMessage(error);
          update(index, "failed", message);
          if (sourceId && !uploadCompleted) {
            await fetch(`/api/sources/${sourceId}/upload-failed`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ message }),
            }).catch(() => undefined);
          }
        }
      }
      router.push(`/study/${sessionId}`);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid gap-2">
        <label
          className="text-[14px] font-semibold text-[var(--foreground)]"
          htmlFor="guide-title"
        >
          Guide title{" "}
          <span className="font-normal text-[var(--text-muted)]">
            (optional)
          </span>
        </label>
        <input
          id="guide-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={busy}
          placeholder="Biology midterm"
          className="h-12 w-full rounded-lg border border-[var(--line-soft)] bg-white px-4 text-[16px] text-[var(--foreground)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[var(--text-faint)] hover:border-[var(--line)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(21,128,61,0.1)] disabled:cursor-not-allowed disabled:bg-[var(--surface-container)] disabled:opacity-65"
        />
      </div>

      <label
        htmlFor="course-material-files"
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        className={`group mt-6 flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed p-8 text-center outline-none transition-[background-color,border-color,box-shadow] focus-visible:border-[var(--accent)] focus-visible:shadow-[0_0_0_4px_rgba(21,128,61,0.12)] ${dragging ? "border-[var(--accent-bright)] bg-[var(--accent-soft)] shadow-[0_0_0_4px_rgba(21,128,61,0.08)]" : "border-[var(--line)] bg-white/75 hover:border-[var(--accent-bright)] hover:bg-white"} ${busy ? "cursor-not-allowed opacity-65" : ""}`}
        onKeyDown={onDropzoneKeyDown}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setDragging(false);
        }}
        onDrop={onDrop}
      >
        <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-container-high)] text-[var(--text-secondary)] shadow-[0_3px_10px_rgba(24,29,24,0.07)] transition-[background-color,color,transform] group-hover:scale-105 group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]">
          <UploadCloud className="h-8 w-8" strokeWidth={1.7} />
        </span>
        <span className="font-headline-md text-[20px] font-semibold text-[var(--foreground)]">
          {dragging ? "Drop files to add them" : "Drag & drop files here"}
        </span>
        <span className="mt-2 block max-w-sm text-[14px] leading-6 text-[var(--text-muted)]">
          Text-based PDF and PPTX only. Image-only pages are reported as gaps.
        </span>
        <span className="mt-5 inline-flex h-10 items-center rounded-lg border border-[var(--line-soft)] bg-white px-4 text-[13px] font-semibold text-[var(--foreground)] shadow-[0_2px_7px_rgba(24,29,24,0.06)] transition-[border-color,box-shadow,transform] group-hover:border-[var(--accent)] group-hover:shadow-[0_4px_10px_rgba(24,29,24,0.08)] group-active:translate-y-px group-focus-visible:border-[var(--accent)]">
          Browse files
        </span>
        <input
          id="course-material-files"
          ref={inputRef}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          multiple
          disabled={busy}
          onChange={(event) => selectFiles(event.target.files)}
        />
      </label>

      {states.length > 0 && (
        <div className="mt-6" aria-live="polite">
          <p className="mb-3 pl-1 text-label-sm uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Processing queue
          </p>
          <ul className="space-y-3">
            {states.map((state, index) => (
              <QueueItem
                key={`${state.name}-${index}`}
                state={state}
                file={files[index]}
                busy={busy}
                onRemove={() => removeFile(index)}
              />
            ))}
          </ul>
        </div>
      )}
      {formError && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-[var(--danger-soft)] px-4 py-3 text-[14px] text-[var(--danger)]"
        >
          {formError}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={busy || files.length === 0}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-bright)] px-5 text-[14px] font-semibold text-white shadow-[0_3px_10px_rgba(0,109,48,0.16)] transition-[background-color,box-shadow,transform] enabled:hover:bg-[var(--accent)] enabled:hover:shadow-[0_5px_14px_rgba(0,101,44,0.2)] enabled:active:translate-y-px disabled:cursor-not-allowed disabled:bg-[#87b99b] disabled:shadow-none"
      >
        {busy ? (
          <LoaderCircle
            className="h-[18px] w-[18px] animate-spin"
            strokeWidth={1.8}
          />
        ) : (
          <UploadCloud className="h-[18px] w-[18px]" strokeWidth={1.8} />
        )}
        {busy ? "Uploading and parsing..." : "Upload materials"}
      </button>
    </div>
  );
}

function QueueItem({
  state,
  file,
  busy,
  onRemove,
}: {
  state: FileState;
  file?: File;
  busy: boolean;
  onRemove: () => void;
}) {
  const isPdf = /\.pdf$/i.test(state.name);
  const working = state.status === "uploading" || state.status === "parsing";
  const ready = state.status === "ready" || state.status === "ready_with_gaps";
  return (
    <li className="flex items-center gap-4 rounded-xl border border-[var(--line-soft)] bg-white p-3 shadow-[0_3px_12px_rgba(24,29,24,0.045)]">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isPdf ? "bg-red-50 text-red-600" : "bg-sky-50 text-sky-700"}`}
      >
        {isPdf ? (
          <FileText className="h-5 w-5" strokeWidth={1.8} />
        ) : (
          <Presentation className="h-5 w-5" strokeWidth={1.8} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-[13px] font-semibold text-[var(--foreground)]">
            {state.name}
          </span>
          <span
            className={`shrink-0 text-[11px] font-medium ${state.status === "failed" ? "text-[var(--danger)]" : ready ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
          >
            {state.message}
          </span>
        </div>
        {working ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-container-high)]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--accent-bright)]" />
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-[var(--text-faint)]">
            {file ? fileSize(file.size) : "Selected file"}
          </p>
        )}
      </div>
      {working ? (
        <LoaderCircle
          className="h-5 w-5 shrink-0 animate-spin text-[var(--accent)]"
          strokeWidth={1.8}
        />
      ) : ready ? (
        <CheckCircle2
          className="h-5 w-5 shrink-0 text-[var(--accent)]"
          strokeWidth={1.8}
        />
      ) : state.status === "failed" ? (
        <AlertCircle
          className="h-5 w-5 shrink-0 text-[var(--danger)]"
          strokeWidth={1.8}
        />
      ) : (
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${state.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-[background-color,color,transform] hover:bg-[var(--surface-container)] hover:text-[var(--foreground)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="h-[17px] w-[17px]" strokeWidth={1.8} />
        </button>
      )}
    </li>
  );
}
