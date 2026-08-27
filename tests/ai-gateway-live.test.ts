import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ModelGateway } from "@/lib/ai/gateway";

describe.skipIf(process.env.RUN_LIVE_GATEWAY_TEST !== "1")("live configured gateway probe", () => {
  it("returns a schema-valid Responses result for a non-sensitive prompt", async () => {
    const gateway = new ModelGateway();
    const result = await gateway.generateStructured({
      task: "topic_extract",
      schema: z.object({ value: z.literal("ok") }).strict(),
      schemaName: "gateway_probe",
      instructions: "Return the required object exactly.",
      evidence: "Return value ok.",
    });
    expect(result.data).toEqual({ value: "ok" });
    expect(["parsed", "text_fallback"]).toContain(result.parseMode);
    console.info("[live-gateway-probe]", JSON.stringify({
      provider: result.provider,
      configuredModel: result.configuredModel,
      actualModel: result.actualModel,
      retryCount: result.retryCount,
      parseMode: result.parseMode,
    }));
  }, 240_000);
});
