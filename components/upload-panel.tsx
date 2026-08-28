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
import { MVP_LIMITS, sourceKindFromFilename, SUPPORTED_FILE_ACCEPT } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/field";
import { Alert, Progress } from "@/components/ui/feedback";
import { IconFrame } from "@/components/ui/icon-frame";
import { Badge } from "@/components/ui/badge";

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
        !sourceKindFromFilename(file.name) ||
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
      setFormError("Choose at least one PDF, Word, Excel, PowerPoint, or image file.");
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

          update(index, "parsing", "Extracting source text");
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
    <div className="ui-surface ui-surface--elevated p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-headline-md text-[18px] font-semibold text-[var(--foreground)]">Create your Guide</p>
          <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">Name it, then add up to {MVP_LIMITS.maxFiles} course files.</p>
        </div>
        <Badge tone={files.length > 0 ? "success" : "neutral"}>{files.length}/{MVP_LIMITS.maxFiles} files</Badge>
      </div>
      <div className="mt-5 grid gap-2">
        <FieldLabel htmlFor="guide-title">
          Guide title{" "}
          <span className="font-normal text-[var(--text-muted)]">
            (optional)
          </span>
        </FieldLabel>
        <Input
          id="guide-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={busy}
          placeholder="Biology midterm"
          className="text-[16px]"
        />
      </div>

      <label
        htmlFor="course-material-files"
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        className={`group mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center outline-none transition-[background-color,border-color,box-shadow,transform] ${files.length > 0 ? "min-h-[190px]" : "min-h-[250px]"} focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_4px_rgb(60_149_99_/_0.16)] ${dragging ? "border-[var(--primary)] bg-[var(--primary-soft)] shadow-[var(--shadow-sm)]" : "border-[var(--border)] bg-[var(--surface-subtle)] hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-white hover:shadow-[var(--shadow-sm)]"} ${busy ? "cursor-not-allowed opacity-60" : ""}`}
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
        <IconFrame
          size="lg"
          tone={dragging ? "primary" : "neutral"}
          className="mb-5 transition-transform group-hover:-translate-y-0.5 group-hover:bg-[var(--primary-soft)] group-hover:text-[var(--primary-hover)]"
        >
          <UploadCloud className="h-8 w-8" strokeWidth={1.7} />
        </IconFrame>
        <span className="font-headline-md text-[20px] font-semibold text-[var(--foreground)]">
          {dragging ? "Drop files to add them" : files.length > 0 ? "Add different files" : "Drop course files here"}
        </span>
        <span className="mt-2 block max-w-sm text-[14px] leading-6 text-[var(--text-muted)]">
          PDF, Word, Excel, PowerPoint, and common image files. Visual-only content is reported as a gap.
        </span>
        <span className="ui-button ui-button--secondary ui-button--sm mt-5 group-hover:border-[var(--border-strong)] group-hover:bg-[var(--secondary)]">
          Browse files
        </span>
        <input
          id="course-material-files"
          ref={inputRef}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          type="file"
          accept={SUPPORTED_FILE_ACCEPT}
          multiple
          disabled={busy}
          onChange={(event) => selectFiles(event.target.files)}
        />
      </label>

      {states.length > 0 && (
        <div className="mt-6" aria-live="polite">
          <p className="mb-3 pl-1 text-label-sm text-[var(--text-muted)]">
            File queue
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
        <Alert tone="destructive" className="mt-4">
          {formError}
        </Alert>
      )}
      <Button
        onClick={submit}
        disabled={busy || files.length === 0}
        loading={busy}
        loadingLabel="Uploading and parsing..."
        size="lg"
        className="mt-5 w-full"
      >
        <UploadCloud aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
        Upload and continue
      </Button>
      <p className="mt-3 text-center text-[12px] leading-5 text-[var(--faint)]">You will review parsing status before generating the Study Guide.</p>
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
  const isImage = /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(state.name);
  const working = state.status === "uploading" || state.status === "parsing";
  const ready = state.status === "ready" || state.status === "ready_with_gaps";
  return (
    <li className="ui-surface flex items-center gap-3 p-3 sm:gap-4">
      <IconFrame size="lg" tone={isPdf ? "destructive" : isImage ? "neutral" : "source"}>
        {isPdf ? (
          <FileText className="h-5 w-5" strokeWidth={1.8} />
        ) : isImage ? (
          <FileText className="h-5 w-5" strokeWidth={1.8} />
        ) : (
          <Presentation className="h-5 w-5" strokeWidth={1.8} />
        )}
      </IconFrame>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="truncate text-[13px] font-semibold text-[var(--foreground)]">
            {state.name}
          </span>
          <span
            className={`shrink-0 text-[11px] font-semibold ${state.status === "failed" ? "text-[var(--danger)]" : ready ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
          >
            {state.message}
          </span>
        </div>
        {working ? (
          <div className="mt-2">
            <Progress label={`${state.name}: ${state.message}`} />
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
        <Button
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${state.name}`}
          size="icon-sm"
          variant="ghost"
        >
          <X className="h-[17px] w-[17px]" strokeWidth={1.8} />
        </Button>
      )}
    </li>
  );
}
