const activeGenerationStates = new Set([
  "extracting_topics",
  "merging_topics",
  "generating_guide",
  "verifying_guide",
]);

export const GENERATION_STALE_AFTER_MS = 6 * 60_000;

export function isStaleGeneration(state: string, updatedAt: string, now = Date.now()) {
  const lastProgressAt = new Date(updatedAt).getTime();
  return activeGenerationStates.has(state)
    && Number.isFinite(lastProgressAt)
    && now - lastProgressAt > GENERATION_STALE_AFTER_MS;
}
