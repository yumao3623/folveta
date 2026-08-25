export const MVP_LIMITS = {
  maxFiles: 5,
  maxFileBytes: 25 * 1024 * 1024,
  maxTotalUnits: 150,
  maxExtractedCharacters: 300_000,
  minReadableUnitCharacters: 20,
  chunkTargetCharacters: 1_800,
  maxTopics: 12,
  defaultQuickCheckQuestions: 5,
  maxQuickCheckQuestions: 10,
  quickCheckCandidateMultiplier: 2,
} as const;

export const SUPPORTED_FILES = {
  pdf: {
    extensions: ["pdf"],
    mimeTypes: ["application/pdf"],
    label: "text-based PDF",
  },
  pptx: {
    extensions: ["pptx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/zip",
      "application/octet-stream",
    ],
    label: "text-based PPTX",
  },
} as const;

export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ?? "course-materials";

export const SESSION_COOKIE = "sgm_session";

export function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
