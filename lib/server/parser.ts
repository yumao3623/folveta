import { fileTypeFromBuffer } from "file-type";
import type { OfficeContentNode } from "officeparser";
import { MVP_LIMITS } from "@/lib/config";
import type { SourceWarning } from "@/lib/schemas";
import { AppError } from "@/lib/server/http";
import { stableId } from "@/lib/server/crypto";

export type ParsedUnit = {
  locatorKind: "page" | "slide";
  locatorNumber: number;
  title: string | null;
  rawText: string;
  normalizedText: string;
  readable: boolean;
  warnings: SourceWarning[];
  contentHash: string;
  blocks: string[];
};

export type ParsedMaterial = {
  units: ParsedUnit[];
  warnings: SourceWarning[];
};

export function normalizeText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(text: string) {
  const paragraphs = text.split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/).map(normalizeText).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (paragraph.length > MVP_LIMITS.chunkTargetCharacters) {
      if (current) chunks.push(current);
      for (let index = 0; index < paragraph.length; index += MVP_LIMITS.chunkTargetCharacters) {
        chunks.push(paragraph.slice(index, index + MVP_LIMITS.chunkTargetCharacters));
      }
      current = "";
      continue;
    }
    const candidate = current ? `${current}\n${paragraph}` : paragraph;
    if (candidate.length > MVP_LIMITS.chunkTargetCharacters && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function unreadableWarning(kind: "page" | "slide", number: number): SourceWarning {
  return {
    code: "UNREADABLE_UNIT",
    message: `${kind === "page" ? "Page" : "Slide"} ${number} did not contain enough reliable text. OCR and image interpretation are disabled.`,
    locator: number,
  };
}

export async function validateFileSignature(buffer: Buffer, kind: "pdf" | "pptx") {
  const detected = await fileTypeFromBuffer(buffer);
  if (kind === "pdf" && detected?.mime !== "application/pdf") {
    throw new AppError("INVALID_FILE_SIGNATURE", "The selected PDF does not have a valid PDF signature.", 415);
  }
  if (kind === "pptx") {
    const allowed = new Set([
      "application/zip",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ]);
    if (detected && !allowed.has(detected.mime)) {
      throw new AppError("INVALID_FILE_SIGNATURE", "The selected PPTX is not a valid Office Open XML container.", 415);
    }
  }
}

async function parsePdf(buffer: Buffer): Promise<ParsedMaterial> {
  const { getDocumentProxy } = await import("unpdf");
  let document: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    document = await getDocumentProxy(new Uint8Array(buffer), { maxImageSize: 16_777_216 });
    if (document.numPages > MVP_LIMITS.maxTotalUnits) {
      throw new AppError("UNIT_LIMIT_EXCEEDED", `This PDF has ${document.numPages} pages; the MVP limit is ${MVP_LIMITS.maxTotalUnits} combined pages/slides.`, 413);
    }

    const units: ParsedUnit[] = [];
    const allWarnings: SourceWarning[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const rawText = content.items.map((item) => {
        if (!("str" in item)) return "";
        return `${item.str}${"hasEOL" in item && item.hasEOL ? "\n" : " "}`;
      }).join("");
      const normalizedText = normalizeText(rawText);
      const readable = normalizedText.length >= MVP_LIMITS.minReadableUnitCharacters;
      const warnings = readable ? [] : [unreadableWarning("page", pageNumber)];
      allWarnings.push(...warnings);
      units.push({
        locatorKind: "page",
        locatorNumber: pageNumber,
        title: null,
        rawText,
        normalizedText,
        readable,
        warnings,
        contentHash: stableId(normalizedText || `empty-page-${pageNumber}`),
        blocks: readable ? chunkText(normalizedText) : [],
      });
      page.cleanup();
    }
    return { units, warnings: allWarnings };
  } catch (error) {
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "Unknown PDF parser error";
    const locked = /password|encrypted/i.test(message);
    throw new AppError(
      locked ? "PASSWORD_PROTECTED_FILE" : "PDF_PARSE_FAILED",
      locked ? "This PDF is locked and cannot be processed." : "The PDF could not be parsed as a text-based document.",
      422,
    );
  } finally {
    await document?.cleanup();
  }
}

function containsVisualNode(node: OfficeContentNode): boolean {
  if (["image", "chart", "drawing"].includes(node.type)) return true;
  return node.children?.some(containsVisualNode) ?? false;
}

function slideBlocks(slide: OfficeContentNode) {
  const blocks = (slide.children ?? [])
    .map((node) => normalizeText(node.text ?? ""))
    .filter(Boolean);
  const notes = (slide.notes ?? [])
    .map((note) => normalizeText(note.text ?? ""))
    .filter(Boolean)
    .map((note) => `[Speaker notes] ${note}`);
  const unique = [...new Set([...blocks, ...notes])];
  if (unique.length === 0 && slide.text) unique.push(normalizeText(slide.text));
  return unique.filter(Boolean);
}

async function parsePptx(buffer: Buffer): Promise<ParsedMaterial> {
  try {
    const { OfficeParser } = await import("officeparser");
    const ast = await OfficeParser.parseOffice(new Uint8Array(buffer), {
      fileType: "pptx",
      ocr: false,
      extractAttachments: false,
      ignoreSlideMasters: true,
      includeRawContent: false,
    });
    const slides = ast.content.filter((node) => node.type === "slide");
    if (slides.length === 0) {
      throw new AppError("PPTX_NO_SLIDES", "The PPTX did not contain readable slide records.", 422);
    }
    if (slides.length > MVP_LIMITS.maxTotalUnits) {
      throw new AppError("UNIT_LIMIT_EXCEEDED", `This PPTX has ${slides.length} slides; the MVP limit is ${MVP_LIMITS.maxTotalUnits} combined pages/slides.`, 413);
    }

    const allWarnings: SourceWarning[] = (ast.warnings ?? []).map((warning) => ({
      code: String(warning.code ?? "PPTX_WARNING"),
      message: warning.message,
      locator: null,
    }));
    const units = slides.map((slide, index): ParsedUnit => {
      const slideNumber = slide.metadata?.slideNumber ?? index + 1;
      const blocks = slideBlocks(slide);
      const normalizedText = normalizeText(blocks.join("\n\n"));
      const readable = normalizedText.length >= MVP_LIMITS.minReadableUnitCharacters;
      const warnings: SourceWarning[] = [];
      if (!readable) warnings.push(unreadableWarning("slide", slideNumber));
      if (containsVisualNode(slide)) {
        warnings.push({
          code: "VISUAL_CONTENT_NOT_INTERPRETED",
          message: `Slide ${slideNumber} contains image, chart, or drawing content that was not interpreted.`,
          locator: slideNumber,
        });
      }
      allWarnings.push(...warnings);
      return {
        locatorKind: "slide",
        locatorNumber: slideNumber,
        title: blocks[0]?.slice(0, 160) ?? null,
        rawText: blocks.join("\n\n"),
        normalizedText,
        readable,
        warnings,
        contentHash: stableId(normalizedText || `empty-slide-${slideNumber}`),
        blocks: readable ? chunkText(normalizedText) : [],
      };
    });
    return { units, warnings: allWarnings };
  } catch (error) {
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "Unknown PPTX parser error";
    const locked = /password|encrypted/i.test(message);
    throw new AppError(
      locked ? "PASSWORD_PROTECTED_FILE" : "PPTX_PARSE_FAILED",
      locked ? "This PPTX is locked and cannot be processed." : "The PPTX container or slide text could not be parsed.",
      422,
    );
  }
}

export async function parseMaterial(buffer: Buffer, kind: "pdf" | "pptx") {
  await validateFileSignature(buffer, kind);
  return kind === "pdf" ? parsePdf(buffer) : parsePptx(buffer);
}

export function createSpanRows(sourceId: string, sessionId: string, units: ParsedUnit[]) {
  return units.flatMap((unit) => unit.blocks.map((text, ordinal) => {
    const contentHash = stableId(text);
    return {
      id: `span_${stableId(sourceId, unit.locatorKind, unit.locatorNumber, ordinal, contentHash).slice(0, 32)}`,
      session_id: sessionId,
      source_id: sourceId,
      locator_kind: unit.locatorKind,
      locator_number: unit.locatorNumber,
      ordinal,
      text,
      excerpt: text.slice(0, 360),
      content_hash: contentHash,
    };
  }));
}
