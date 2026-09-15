import { notFound } from "next/navigation";
import { z } from "zod";
import { QuickCheckResultView } from "@/components/quick-check-result";
import {
  quickCheckResultSchema,
  quickCheckSchema,
  selectedAnswerSchema,
} from "@/lib/schemas";
import { quickCheckGuideTopics } from "@/lib/ai/quick-check";
import { requireOwnedSession } from "@/lib/server/auth";
import { readQuickCheckGuide } from "@/lib/server/quick-check-guide";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export default async function QuickCheckResultPage({
  params,
}: {
  params: Promise<{ sessionId: string; attemptId: string }>;
}) {
  const { sessionId, attemptId } = await params;
  const session = await requireOwnedSession(sessionId);
  if (!session) notFound();

  const admin = getSupabaseAdmin();
  const { data: attemptRow, error: attemptError } = await admin
    .from("quick_check_attempts")
    .select("quick_check_id, selected_answers, result_json, submitted_at")
    .eq("id", attemptId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (attemptError) throw attemptError;
  if (!attemptRow) notFound();

  const { data: quickCheckRow, error: quickCheckError } = await admin
    .from("quick_checks")
    .select("guide_id, generation_v2_guide_id, quick_check_json")
    .eq("id", attemptRow.quick_check_id)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (quickCheckError) throw quickCheckError;
  if (!quickCheckRow) notFound();

  const guideRecord = await readQuickCheckGuide(sessionId, {
    guideId: quickCheckRow.guide_id,
    generationV2GuideId: quickCheckRow.generation_v2_guide_id,
  });
  if (!guideRecord) notFound();

  const quickCheck = quickCheckSchema.parse(quickCheckRow.quick_check_json);
  const guide = guideRecord.guide;
  const result = quickCheckResultSchema.parse(attemptRow.result_json);
  const selectedAnswers = z.array(selectedAnswerSchema).parse(attemptRow.selected_answers);
  const answers = Object.fromEntries(
    selectedAnswers.map((answer) => [answer.question_id, answer.selected_option_id]),
  );
  const guideTopics = quickCheckGuideTopics(guide);
  const topicNames = Object.fromEntries(guideTopics.map((topic) => [topic.id, topic.title]));
  const guidePath = `/study/${sessionId}`;

  return (
    <QuickCheckResultView
      quickCheck={quickCheck}
      result={result}
      answers={answers}
      topicNames={topicNames}
      topics={guideTopics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        href: `${guidePath}#${topic.anchor}`,
      }))}
      guidePath={guidePath}
    />
  );
}
