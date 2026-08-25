import { QuickCheckRunner } from "@/components/quick-check-runner";
import { demoGuide } from "@/lib/fixtures/demo-guide";
import { demoQuickCheck } from "@/lib/fixtures/demo-quick-check";
import { guideSectionAnchor, toTakingQuickCheck } from "@/lib/schemas";

export default function DemoQuickCheckPage() {
  return (
    <QuickCheckRunner
      sessionId="demo"
      initialQuickCheck={toTakingQuickCheck(demoQuickCheck)}
      demoQuickCheck={demoQuickCheck}
      topics={demoGuide.topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        href: `/study/demo#${guideSectionAnchor(topic.id)}`,
      }))}
    />
  );
}
