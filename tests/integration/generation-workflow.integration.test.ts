import { getRun, start } from "workflow/api";
import { waitForSleep } from "@workflow/vitest";
import { describe, expect, it } from "vitest";
import { replayFixtureWorkflow } from "@/tests/fixtures/replay-workflow";

describe("Workflow runtime failure and replay", () => {
  it("runs an opaque-ID workflow to completion", async () => {
    const run = await start(replayFixtureWorkflow, [{
      generationRunId: "run-safe-id",
      mode: "complete",
    }]);

    await expect(run.returnValue).resolves.toEqual({
      status: "succeeded",
      generationRunId: "run-safe-id",
    });
    await expect(run.status).resolves.toBe("completed");
  });

  it("resumes after a durable sleep", async () => {
    const run = await start(replayFixtureWorkflow, [{
      generationRunId: "run-replay-id",
      mode: "wait_once",
    }]);

    const sleepId = await waitForSleep(run);
    await getRun(run.runId).wakeUp({ correlationIds: [sleepId] });

    await expect(run.returnValue).resolves.toEqual({
      status: "succeeded",
      generationRunId: "run-replay-id",
    });
  });

  it("persists a fatal workflow failure", async () => {
    const run = await start(replayFixtureWorkflow, [{
      generationRunId: "run-fatal-id",
      mode: "fatal",
    }]);

    await expect(run.returnValue).rejects.toThrow("GENERATION_OPERATION_FAILED");
    await expect(run.status).resolves.toBe("failed");
  });
});
