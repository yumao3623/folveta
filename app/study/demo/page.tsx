import { V2GuideWorkspace } from "@/components/v2-guide-workspace";
import { demoV2Guide } from "@/lib/fixtures/demo-guide-v2";

export default function DemoGuidePage() {
  return <V2GuideWorkspace guide={demoV2Guide} displayTitle={demoV2Guide.title} quickCheckHref="/study/demo/quick-check" isDemo />;
}
