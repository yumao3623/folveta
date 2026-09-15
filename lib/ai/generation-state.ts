const continuableGenerationStates = [
  "ready",
  "ready_with_gaps",
  "failed_retryable",
  "extracting_topics",
  "merging_topics",
  "generating_guide",
  "verifying_guide",
];

export function isGenerationClaimable(state: string) {
  return continuableGenerationStates.includes(state);
}
