import { getServerEnv } from "@/lib/env";
import { ModelGateway, SafeProviderError } from "@/lib/ai/gateway";
import { z } from "zod";

export const maxDuration = 60;

const probeSchema = z.object({ value: z.literal("ok") }).strict();

function authorized(request: Request) {
  const secret = getServerEnv().CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function responseHeaders() {
  return { "Cache-Control": "no-store" };
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401, headers: responseHeaders() });
  }

  const startedAt = Date.now();
  try {
    const result = await new ModelGateway().generateStructured({
      task: "topic_extract",
      schema: probeSchema,
      schemaName: "gateway_probe",
      instructions: "Return the required object exactly.",
      evidence: "Return value ok.",
    });

    return Response.json({
      ok: true,
      provider: result.provider,
      model: result.actualModel,
      durationMs: result.durationMs,
      providerStatus: result.providerStatus,
      providerRequestId: result.providerRequestId,
      responseContractValid: true,
      parsedAvailable: result.parseMode === "parsed",
      outputTextAvailable: true,
      errorCategory: null,
    }, { headers: responseHeaders() });
  } catch (error) {
    const safe = error instanceof SafeProviderError ? error : null;
    return Response.json({
      ok: false,
      provider: "openai",
      model: getServerEnv().MODEL_TOPIC_EXTRACT,
      durationMs: Date.now() - startedAt,
      providerStatus: safe?.providerStatus ?? null,
      providerRequestId: safe?.providerRequestId ?? null,
      responseContractValid: false,
      parsedAvailable: false,
      outputTextAvailable: false,
      errorCategory: safe?.category ?? "unknown",
    }, { status: 502, headers: responseHeaders() });
  }
}
