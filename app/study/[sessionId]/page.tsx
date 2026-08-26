import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileCheck2, FileText, Presentation } from "lucide-react";
import { GenerationPanel } from "@/components/generation-panel";
import { GuideWorkspace } from "@/components/guide-workspace";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/feedback";
import { IconFrame } from "@/components/ui/icon-frame";
import { buttonClassName } from "@/components/ui/styles";
import { guideSchema } from "@/lib/schemas";
import { requireOwnedSession } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const statusLabels: Record<string, string> = {
  uploading: "Uploading",
  uploaded: "Uploaded",
  parsing: "Parsing",
  ready: "Ready",
  ready_with_gaps: "Ready with gaps",
  cannot_use: "Cannot use",
};

export default async function StudyWorkspacePage({ params, searchParams }: PageProps<"/study/[sessionId]">) {
  const { sessionId } = await params;
  const query = await searchParams;
  const reviewQuestion = typeof query.reviewQuestion === "string" ? query.reviewQuestion : undefined;
  const session = await requireOwnedSession(sessionId);
  if (!session) notFound();
  const admin = getSupabaseAdmin();
  const [{ data: sources, error: sourcesError }, { data: guideRow, error: guideError }] = await Promise.all([
    admin.from("sources").select("id, display_name, kind, status, unit_count, readable_unit_count, warnings, error_code, error_message").eq("session_id", sessionId).order("created_at"),
    admin.from("study_guides").select("guide_json, title").eq("session_id", sessionId).is("deleted_at", null).maybeSingle(),
  ]);
  if (sourcesError) throw sourcesError;
  if (guideError) throw guideError;
  if (guideRow) {
    const accessedAt = new Date().toISOString();
    await Promise.all([
      admin.from("study_guides").update({ last_accessed_at: accessedAt }).eq("session_id", sessionId),
      admin.from("preparation_sessions").update({ last_accessed_at: accessedAt }).eq("id", sessionId),
    ]);
    return <GuideWorkspace guide={guideSchema.parse(guideRow.guide_json)} displayTitle={guideRow.title} quickCheckHref={`/study/${sessionId}/quick-check`} reviewQuestion={reviewQuestion} />;
  }

  const sourceRows = sources ?? [];
  const usableCount = sourceRows.filter((source) => source.status === "ready" || source.status === "ready_with_gaps").length;
  const failedCount = sourceRows.filter((source) => source.status === "cannot_use").length;
  return <main className="min-h-screen bg-[var(--background)]">
    <header className="border-b border-[var(--border-soft)] bg-white/90 backdrop-blur-xl">
      <div className="editorial-page flex h-20 items-center justify-between gap-4">
        <Link href="/" className="font-headline-md text-[22px] font-semibold text-[var(--primary)]">Folveta</Link>
        <Link href="/" className={buttonClassName({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" />New upload</Link>
      </div>
    </header>
    <div className="editorial-page max-w-5xl py-9 sm:py-12">
      <section className="border-b border-[var(--border)] pb-8">
        <Badge tone="primary">Preparation workspace</Badge>
        <h1 className="mt-4 text-4xl font-bold text-[var(--foreground)] sm:text-5xl">{session.title}</h1>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
          <span><strong className="text-[var(--foreground)]">{sourceRows.length}</strong> source{sourceRows.length === 1 ? "" : "s"}</span>
          <span><strong className="text-[var(--primary)]">{usableCount}</strong> usable</span>
          {failedCount > 0 && <span><strong className="text-[var(--destructive)]">{failedCount}</strong> excluded</span>}
        </div>
      </section>
      <section className="py-9 sm:py-10">
        <div className="flex items-center gap-3">
          <IconFrame tone="source"><FileCheck2 className="h-5 w-5" strokeWidth={1.8} /></IconFrame>
          <div><p className="text-label-sm text-[var(--source-blue-strong)]">Materials</p><h2 className="font-headline-md text-2xl font-semibold text-[var(--foreground)]">Parsing status</h2></div>
        </div>
        <div className="mt-6 space-y-3">{sourceRows.map((source) => {
          const warnings = Array.isArray(source.warnings)
            ? source.warnings.filter((warning): warning is { code: string; message: string } => warning !== null && typeof warning === "object" && "code" in warning && "message" in warning)
            : [];
          const warningCount = warnings.length;
          const failed = source.status === "cannot_use";
          const tone = failed ? "destructive" : source.status === "ready_with_gaps" ? "warning" : "success";
          return <article key={source.id} className={`ui-surface flex gap-4 p-4 sm:p-5 ${failed ? "border-[#efc8c5] bg-[var(--danger-soft)]" : source.status === "ready_with_gaps" ? "border-[#ead695] bg-[var(--warning-soft)]" : ""}`}>
            <IconFrame size="lg" tone={failed ? "destructive" : source.kind === "pptx" ? "source" : "neutral"}>{source.kind === "pptx" ? <Presentation className="h-5 w-5" strokeWidth={1.8} /> : <FileText className="h-5 w-5" strokeWidth={1.8} />}</IconFrame>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><h3 className="truncate font-semibold text-[var(--foreground)]">{source.display_name}</h3><p className="mt-1 text-sm text-[var(--muted)]">{source.kind.toUpperCase()} · {source.unit_count} page{source.kind === "pptx" ? "/slide" : ""} records · {source.readable_unit_count} readable</p></div>
              <Badge tone={tone}>{statusLabels[source.status] ?? source.status}</Badge>
            </div>
            {failed && <p className="mt-3 text-sm leading-6 text-[var(--danger)]"><strong>{source.error_code}:</strong> {source.error_message}</p>}
            {warningCount > 0 && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-amber-900">Show {warningCount} parsing warning{warningCount === 1 ? "" : "s"}</summary><ul className="mt-2 space-y-1 text-sm leading-6 text-amber-900">{warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}</ul></details>}
            </div>
          </article>;
        })}</div>
        {failedCount > 0 && usableCount > 0 && <Alert tone="warning" className="mt-5">The Guide can continue with partial sources. The {failedCount} excluded source{failedCount === 1 ? "" : "s"} will be listed as material gaps and will not be sent to the model.</Alert>}
      </section>
      <GenerationPanel sessionId={sessionId} canGenerate={usableCount > 0} initialState={session.state} initialError={session.error_message} />
    </div>
  </main>;
}
