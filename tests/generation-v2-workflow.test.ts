import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  run: vi.fn(),
  sleep: vi.fn(),
}));

vi.mock("workflow", () => ({ sleep: mocked.sleep }));
vi.mock("@/lib/ai/generation-v2-runtime", () => ({ runV2Request: mocked.run }));

import { generateStudyGuideV2Workflow } from "@/app/workflows/generation-v2";

describe("Generation v2 Workflow wakeup shell", () => {
  beforeEach(() => {
    mocked.run.mockReset();
    mocked.sleep.mockReset();
  });

  it("re-enters the database-backed runner after its persisted retry time", async () => {
    mocked.run
      .mockResolvedValueOnce({ requestId: "request-safe-id", status: "working", guide: null, nextRetryAt: "2026-09-03T00:00:05.000Z", metrics: [] })
      .mockResolvedValueOnce({ requestId: "request-safe-id", status: "complete", guide: null, nextRetryAt: null, metrics: [] });
    mocked.sleep.mockResolvedValue(undefined);

    await expect(generateStudyGuideV2Workflow("request-safe-id")).resolves.toMatchObject({ status: "complete" });
    expect(mocked.sleep).toHaveBeenCalledWith(new Date("2026-09-03T00:00:05.000Z"));
    expect(mocked.run).toHaveBeenCalledTimes(2);
  });
});
