import { QuickCheckRunner } from "@/components/quick-check-runner";
import { quickCheckGuideTopics } from "@/lib/ai/quick-check";
import { demoV2Guide } from "@/lib/fixtures/demo-guide-v2";
import { demoQuickCheck } from "@/lib/fixtures/demo-quick-check";
import { toTakingQuickCheck } from "@/lib/schemas";

export default function DemoQuickCheckPage() {
  return (
    <QuickCheckRunner
      sessionId="demo"
      initialQuickCheck={toTakingQuickCheck(demoQuickCheck)}
      demoQuickCheck={demoQuickCheck}
      topics={quickCheckGuideTopics(demoV2Guide).map((topic) => ({
        id: topic.id,
        title: topic.title,
        href: `/study/demo#${topic.anchor}`,
      }))}
    />
  );
}
