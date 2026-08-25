import { notFound } from "next/navigation";
import Link from "next/link";
import { GenerationPanel } from "@/components/generation-panel";
import { GuideWorkspace } from "@/components/guide-workspace";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/feedback";
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
    admin.from("study_guides").select("guide_json").eq("session_id", sessionId).maybeSingle(),
  ]);
  if (sourcesError) throw sourcesError;
  if (guideError) throw guideError;
  if (guideRow) return <GuideWorkspace guide={guideSchema.parse(guideRow.guide_json)} quickCheckHref={`/study/${sessionId}/quick-check`} reviewQuestion={reviewQuestion} />;

  const sourceRows = sources ?? [];
  const usableCount = sourceRows.filter((source) => source.status === "ready" || source.status === "ready_with_gaps").length;
  const failedCount = sourceRows.filter((source) => source.status === "cannot_use").length;
  return <main className="min-h-screen">
    <header className="border-b border-[var(--line)] bg-white">
      <div className="editorial-page py-7">
        <Link href="/" className="font-display text-2xl font-extrabold text-[var(--accent)]">Folveta</Link>
        <p className="mt-8 text-label-sm uppercase text-[var(--muted)]">Preparation workspace</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">{session.title}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{sourceRows.length} source{sourceRows.length === 1 ? "" : "s"} · {usableCount} usable · {failedCount} excluded</p>
      </div>
    </header>
    <div className="editorial-page max-w-5xl space-y-7 py-8 sm:py-12">
      <section className="ui-surface ui-surface--elevated border-t-2 border-t-[var(--accent)] p-6 sm:p-8">
        <p className="text-label-sm text-[var(--muted)]">Materials</p>
        <h2 className="mt-3 text-2xl font-bold text-[var(--foreground)]">Parsing status</h2>
        <div className="mt-6 space-y-3">{sourceRows.map((source) => {
          const warnings = Array.isArray(source.warnings)
            ? source.warnings.filter((warning): warning is { code: string; message: string } => warning !== null && typeof warning === "object" && "code" in warning && "message" in warning)
            : [];
          const warningCount = warnings.length;
          const failed = source.status === "cannot_use";
          const tone = failed ? "destructive" : source.status === "ready_with_gaps" ? "warning" : "success";
          return <article key={source.id} className={`ui-surface p-5 ${failed ? "border-[#efc8c5] bg-[var(--danger-soft)]" : source.status === "ready_with_gaps" ? "border-[#ead695] bg-[var(--warning-soft)]" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold text-stone-950">{source.display_name}</h3><p className="mt-1 text-sm text-stone-600">{source.kind.toUpperCase()} · {source.unit_count} page{source.kind === "pptx" ? "/slide" : ""} records · {source.readable_unit_count} readable</p></div>
              <Badge tone={tone}>{statusLabels[source.status] ?? source.status}</Badge>
            </div>
            {failed && <p className="mt-3 text-sm leading-6 text-[var(--danger)]"><strong>{source.error_code}:</strong> {source.error_message}</p>}
            {warningCount > 0 && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-amber-900">Show {warningCount} parsing warning{warningCount === 1 ? "" : "s"}</summary><ul className="mt-2 space-y-1 text-sm leading-6 text-amber-900">{warnings.map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}</ul></details>}
          </article>;
        })}</div>
        {failedCount > 0 && usableCount > 0 && <Alert tone="warning" className="mt-5">The Guide can continue with partial sources. The {failedCount} excluded source{failedCount === 1 ? "" : "s"} will be listed as material gaps and will not be sent to the model.</Alert>}
      </section>
      <GenerationPanel sessionId={sessionId} canGenerate={usableCount > 0} initialState={session.state} initialError={session.error_message} />
    </div>
  </main>;
}
