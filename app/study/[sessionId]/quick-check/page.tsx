import { notFound, redirect } from "next/navigation";
import { QuickCheckRunner } from "@/components/quick-check-runner";
import { checksumGuide } from "@/lib/ai/quick-check";
import { guideSchema, guideSectionAnchor, quickCheckSchema, toTakingQuickCheck } from "@/lib/schemas";
import { requireOwnedSession } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export default async function QuickCheckPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await requireOwnedSession(sessionId);
  if (!session) notFound();
  const admin = getSupabaseAdmin();
  const { data: guideRow, error: guideError } = await admin
    .from("study_guides")
    .select("guide_json")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (guideError) throw guideError;
  if (!guideRow) redirect(`/study/${sessionId}`);

  const guide = guideSchema.parse(guideRow.guide_json);
  const { data: quickCheckRow, error: quickCheckError } = await admin
    .from("quick_checks")
    .select("quick_check_json")
    .eq("session_id", sessionId)
    .eq("guide_checksum", checksumGuide(guide))
    .eq("requested_question_count", 5)
    .maybeSingle();
  if (quickCheckError) throw quickCheckError;
  const quickCheck = quickCheckRow
    ? toTakingQuickCheck(quickCheckSchema.parse(quickCheckRow.quick_check_json))
    : null;
  return (
    <QuickCheckRunner
      sessionId={sessionId}
      initialQuickCheck={quickCheck}
      topics={guide.topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        href: `/study/${sessionId}#${guideSectionAnchor(topic.id)}`,
      }))}
    />
  );
}
