import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const workflow = read("app/workflows/generation.ts");
const steps = read("app/workflows/generation-steps.ts");
const execution = read("lib/ai/workflow-execution.ts");
const gateway = read("lib/ai/gateway.ts");
const envExample = read(".env.example");
const reconcile = read("app/api/internal/generation-reconcile/route.ts");
const generateRoute = read("app/api/sessions/[sessionId]/generate/route.ts");

describe("generation Workflow execution boundary", () => {
  it("keeps private Node, Supabase, provider, and content modules behind dynamic step imports", () => {
    expect(workflow).not.toMatch(/from ["'](?:openai|node:|@\/lib\/server|@\/lib\/ai\/(?:gateway|pipeline|prompts|schemas))/);
    expect(steps).not.toMatch(/^import (?!type).*@\/lib\/ai\/workflow-execution/m);
    expect(steps.match(/await import\("@\/lib\/ai\/workflow-execution"\)/g)?.length).toBe(8);
    expect(execution).not.toContain('"use step"');
  });

  it("persists only opaque Workflow inputs and outputs", () => {
    expect(execution).toContain("WorkflowDispatchInput = { generationRunId: string; dispatchToken: string }");
    expect(workflow).not.toMatch(/source material|prompt|guide_json|span\.text|response body/i);
    expect(steps).not.toMatch(/source material|prompt|guide_json|span\.text|response body/i);
  });

  it("has exactly one provider retry authority", () => {
    expect(gateway).toContain("maxRetries: 0");
    expect(gateway).not.toContain("withBoundedModelRetry");
    expect(gateway).not.toMatch(/for \(let attempt|while \(attempt/);
    expect(execution).toContain('rpc("claim_generation_operation"');
    expect(execution).toContain('rpc("settle_generation_operation_retry_or_fail"');
  });

  it("creates only the guide operations in the currently executing wave", () => {
    expect(workflow).toContain("guideOperationsStep(input.generationRunId, planOperationKey, offset, 4)");
    expect(workflow).toContain("offset += wave.length");
    expect(execution).toContain("topics.slice(start, start + waveSize).entries()");
    expect(execution).not.toContain("Promise.all(result.data.topics.slice(0, 12)");
  });

  it("keeps the new execution path safely disabled by default", () => {
    expect(envExample).toContain("AI_GENERATION_WORKFLOW_ENABLED=false");
    expect(envExample).toContain("GENERATION_V2_PRODUCT_ENABLED=false");
    expect(generateRoute).toContain("if (env.AI_GENERATION_WORKFLOW_ENABLED)");
    expect(generateRoute).toContain("env.GENERATION_V2_RUNTIME_ENABLED && env.GENERATION_V2_PRODUCT_ENABLED");
    expect(generateRoute).toContain("generateGuideStep(sessionId, session.title)");
    expect(reconcile).toContain("if (!getServerEnv().AI_GENERATION_WORKFLOW_ENABLED)");
  });

});
