import { FatalError, getWorkflowMetadata, sleep } from "workflow";
import {
  acknowledgeGenerationStep,
  commitFinalGuideStep,
  finalizeOperationStep,
  guideOperationsStep,
  groundingOperationStep,
  mergeOperationStep,
  prepareTopicPlanStep,
  providerOperationStep,
} from "@/app/workflows/generation-steps";
import type { OperationOutcome, WorkflowDispatchInput } from "@/lib/ai/workflow-execution";

async function completeProviderOperation(generationRunId: string, operationKey: string, first?: OperationOutcome) {
  let outcome = first ?? await providerOperationStep(generationRunId, operationKey);
  while (outcome.status === "wait") {
    await sleep(new Date(outcome.nextEligibleAt));
    outcome = await providerOperationStep(generationRunId, operationKey);
  }
  if (outcome.status !== "completed") throw new FatalError("GENERATION_OPERATION_FAILED");
  return outcome;
}

export async function generateStudyGuideWorkflow(input: WorkflowDispatchInput) {
  "use workflow";
  const metadata = getWorkflowMetadata();
  const ack = await acknowledgeGenerationStep(input, metadata.workflowRunId);
  if (ack.status !== "acknowledged") return { status: "stale" };

  const preparation = await prepareTopicPlanStep(input.generationRunId);
  for (let offset = 0; offset < preparation.operations.length; offset += 4) {
    await Promise.all(preparation.operations.slice(offset, offset + 4).map((operation) => (
      completeProviderOperation(input.generationRunId, operation.operationKey)
    )));
  }
  let planOperationKey = preparation.operations[0].operationKey;
  if (preparation.mode === "batch") {
    const merge = await mergeOperationStep(input.generationRunId, preparation.operations);
    await completeProviderOperation(input.generationRunId, merge.operationKey);
    planOperationKey = merge.operationKey;
  }
  const groundings = [] as Array<{ operationId: string; operationKey: string }>;
  let offset = 0;
  while (true) {
    const plan = await guideOperationsStep(input.generationRunId, planOperationKey, offset, 4);
    if (plan.status !== "completed" || !("guideOperations" in plan)) throw new FatalError("TOPIC_PLANNING_FAILED");
    const wave = plan.guideOperations;
    if (!wave.length) break;
    const completed = await Promise.all(wave.map(async (guide) => {
      await completeProviderOperation(input.generationRunId, guide.operationKey);
      const grounding = await groundingOperationStep(input.generationRunId, guide.operationKey, guide.index);
      await completeProviderOperation(input.generationRunId, grounding.operationKey);
      return grounding;
    }));
    groundings.push(...completed);
    offset += wave.length;
    if (offset >= plan.totalTopics) break;
  }

  const finalizeKey = await finalizeOperationStep(input.generationRunId, groundings);
  const finalized = await commitFinalGuideStep(input.generationRunId, finalizeKey);
  if (finalized.status !== "completed") throw new FatalError("GENERATION_FINALIZE_FAILED");
  return { status: "succeeded", generationRunId: input.generationRunId };
}
