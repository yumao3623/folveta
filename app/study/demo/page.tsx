import { GuideWorkspace } from "@/components/guide-workspace";
import { demoGuide } from "@/lib/fixtures/demo-guide";

export default async function DemoGuidePage({ searchParams }: PageProps<"/study/demo">) {
  const query = await searchParams;
  const reviewQuestion = typeof query.reviewQuestion === "string" ? query.reviewQuestion : undefined;
  return <GuideWorkspace guide={demoGuide} isDemo quickCheckHref="/study/demo/quick-check" reviewQuestion={reviewQuestion} />;
}
