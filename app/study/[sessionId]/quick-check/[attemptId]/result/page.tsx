import { notFound } from "next/navigation";
import { z } from "zod";
import { QuickCheckResultView } from "@/components/quick-check-result";
import {
  guideSchema,
  guideSectionAnchor,
  quickCheckResultSchema,
  quickCheckSchema,
  selectedAnswerSchema,
} from "@/lib/schemas";
import { requireOwnedSession } from "@/lib/server/auth";
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

  const [{ data: quickCheckRow, error: quickCheckError }, { data: guideRow, error: guideError }] =
    await Promise.all([
      admin
        .from("quick_checks")
        .select("quick_check_json")
        .eq("id", attemptRow.quick_check_id)
        .eq("session_id", sessionId)
        .maybeSingle(),
      admin.from("study_guides").select("guide_json").eq("session_id", sessionId).maybeSingle(),
    ]);
  if (quickCheckError) throw quickCheckError;
  if (guideError) throw guideError;
  if (!quickCheckRow || !guideRow) notFound();

  const quickCheck = quickCheckSchema.parse(quickCheckRow.quick_check_json);
  const guide = guideSchema.parse(guideRow.guide_json);
  const result = quickCheckResultSchema.parse(attemptRow.result_json);
  const selectedAnswers = z.array(selectedAnswerSchema).parse(attemptRow.selected_answers);
  const answers = Object.fromEntries(
    selectedAnswers.map((answer) => [answer.question_id, answer.selected_option_id]),
  );
  const topicNames = Object.fromEntries(guide.topics.map((topic) => [topic.id, topic.title]));
  const guidePath = `/study/${sessionId}`;

  return (
    <QuickCheckResultView
      quickCheck={quickCheck}
      result={result}
      answers={answers}
      topicNames={topicNames}
      topics={guide.topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        href: `${guidePath}#${guideSectionAnchor(topic.id)}`,
      }))}
      guidePath={guidePath}
    />
  );
}
