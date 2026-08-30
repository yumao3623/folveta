import type { OperationOutcome, WorkflowDispatchInput } from "@/lib/ai/workflow-execution";

export async function acknowledgeGenerationStep(input: WorkflowDispatchInput, workflowRunId: string) {
  "use step";
  const { acknowledgeWorkflow } = await import("@/lib/ai/workflow-execution");
  return acknowledgeWorkflow(input, workflowRunId);
}

export async function prepareTopicPlanStep(generationRunId: string) {
  "use step";
  const { prepareTopicPlan } = await import("@/lib/ai/workflow-execution");
  return prepareTopicPlan(generationRunId);
}

export async function providerOperationStep(generationRunId: string, operationKey: string): Promise<OperationOutcome> {
  "use step";
  const { executeProviderOperation } = await import("@/lib/ai/workflow-execution");
  return executeProviderOperation(generationRunId, operationKey);
}

export async function mergeOperationStep(generationRunId: string, extractions: Array<{ operationId: string; operationKey: string }>) {
  "use step";
  const { createMergeOperation } = await import("@/lib/ai/workflow-execution");
  return createMergeOperation(generationRunId, extractions);
}

export async function guideOperationsStep(generationRunId: string, planOperationKey: string, offset: number, limit: number) {
  "use step";
  const { createGuideOperations } = await import("@/lib/ai/workflow-execution");
  return createGuideOperations(generationRunId, planOperationKey, offset, limit);
}

export async function groundingOperationStep(generationRunId: string, guideKey: string, index: number) {
  "use step";
  const { createGroundingOperation } = await import("@/lib/ai/workflow-execution");
  return createGroundingOperation(generationRunId, guideKey, index);
}

export async function finalizeOperationStep(generationRunId: string, groundings: Array<{ operationId: string; operationKey: string }>) {
  "use step";
  const { createFinalizeOperation } = await import("@/lib/ai/workflow-execution");
  return createFinalizeOperation(generationRunId, groundings);
}

export async function commitFinalGuideStep(generationRunId: string, operationKey: string) {
  "use step";
  const { finalizeOperation } = await import("@/lib/ai/workflow-execution");
  return finalizeOperation(generationRunId, operationKey);
}
