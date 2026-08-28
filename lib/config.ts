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
    label: "PDF",
  },
  docx: {
    extensions: ["docx"],
    mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"],
    label: "Word document",
  },
  doc: {
    extensions: ["doc"],
    mimeTypes: ["application/msword", "application/octet-stream"],
    label: "legacy Word document",
  },
  xlsx: {
    extensions: ["xlsx"],
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "application/octet-stream"],
    label: "Excel workbook",
  },
  xls: {
    extensions: ["xls"],
    mimeTypes: ["application/vnd.ms-excel", "application/octet-stream"],
    label: "legacy Excel workbook",
  },
  pptx: {
    extensions: ["pptx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/zip",
      "application/octet-stream",
    ],
    label: "PowerPoint presentation",
  },
  ppt: {
    extensions: ["ppt"],
    mimeTypes: ["application/vnd.ms-powerpoint", "application/octet-stream"],
    label: "legacy PowerPoint",
  },
  image: {
    extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff"],
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/tiff"],
    label: "image",
  },
} as const;

export type SupportedSourceKind = keyof typeof SUPPORTED_FILES;

export const SUPPORTED_SOURCE_EXTENSIONS = Object.values(SUPPORTED_FILES).flatMap((item) => item.extensions);

export const SUPPORTED_FILE_ACCEPT = [
  ...SUPPORTED_SOURCE_EXTENSIONS.map((extension) => `.${extension}`),
  ...Object.values(SUPPORTED_FILES).flatMap((item) => item.mimeTypes),
].join(",");

export function sourceKindFromFilename(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension) return null;
  const entry = Object.entries(SUPPORTED_FILES).find(([, value]) => (value.extensions as readonly string[]).includes(extension));
  return entry ? entry[0] as SupportedSourceKind : null;
}

export function isSupportedSourceMimeType(kind: SupportedSourceKind, mimeType: string) {
  return (SUPPORTED_FILES[kind].mimeTypes as readonly string[]).includes(mimeType.trim().toLowerCase());
}

export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ?? "course-materials";

export const SESSION_COOKIE = "sgm_session";

export function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
