import { sleep } from "workflow";
import { runV2Request } from "@/lib/ai/generation-v2-runtime";

async function runV2RequestStep(requestId: string) {
  "use step";
  return runV2Request(requestId);
}

export async function generateStudyGuideV2Workflow(requestId: string) {
  "use workflow";
  for (;;) {
    const result = await runV2RequestStep(requestId);
    if (["complete", "complete_with_gaps", "failed_no_guide"].includes(result.status)) return result;
    if (!result.nextRetryAt) return result;
    await sleep(new Date(result.nextRetryAt));
  }
}
