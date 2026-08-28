import { FatalError, sleep } from "workflow";

type ReplayInput = {
  generationRunId: string;
  mode: "complete" | "wait_once" | "fatal";
};

async function replayableOperationStep(input: ReplayInput & { resumed: boolean }) {
  "use step";
  if (input.mode === "fatal") return { status: "terminal" as const };
  if (input.mode === "wait_once" && !input.resumed) {
    return {
      status: "wait" as const,
      nextEligibleAt: new Date(Date.now() + 60_000).toISOString(),
    };
  }
  return { status: "completed" as const };
}

export async function replayFixtureWorkflow(input: ReplayInput) {
  "use workflow";
  let outcome = await replayableOperationStep({ ...input, resumed: false });
  if (outcome.status === "wait") {
    await sleep(new Date(outcome.nextEligibleAt));
    outcome = await replayableOperationStep({ ...input, resumed: true });
  }
  if (outcome.status !== "completed") throw new FatalError("GENERATION_OPERATION_FAILED");
  return { status: "succeeded", generationRunId: input.generationRunId };
}
