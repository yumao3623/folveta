import { notFound, redirect } from "next/navigation";
import { QuickCheckRunner } from "@/components/quick-check-runner";
import { checksumGuide, quickCheckGuideTopics } from "@/lib/ai/quick-check";
import { quickCheckSchema, toTakingQuickCheck } from "@/lib/schemas";
import { requireOwnedSession } from "@/lib/server/auth";
import { readLatestQuickCheckGuide } from "@/lib/server/quick-check-guide";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export default async function QuickCheckPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await requireOwnedSession(sessionId);
  if (!session) notFound();
  const admin = getSupabaseAdmin();
  const guideRecord = await readLatestQuickCheckGuide(sessionId);
  if (!guideRecord) redirect(`/study/${sessionId}`);
  const guide = guideRecord.guide;
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
      topics={quickCheckGuideTopics(guide).map((topic) => ({
        id: topic.id,
        title: topic.title,
        href: `/study/${sessionId}#${topic.anchor}`,
      }))}
    />
  );
}
