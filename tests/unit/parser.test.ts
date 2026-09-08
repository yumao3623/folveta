import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createSpanRows, normalizeText, parseMaterial, validateFileSignature } from "@/lib/server/parser";
import { isSupportedSourceMimeType, sourceKindFromFilename, SUPPORTED_FILE_ACCEPT } from "@/lib/config";
import { ModelGateway } from "@/lib/ai/gateway";

describe("material parsing", () => {
  it("uses one filename contract for modern, legacy, and image inputs", () => {
    expect(sourceKindFromFilename("notes.PDF")).toBe("pdf");
    expect(sourceKindFromFilename("slides.ppt")).toBe("ppt");
    expect(sourceKindFromFilename("workbook.xls")).toBe("xls");
    expect(sourceKindFromFilename("photo.TIFF")).toBe("image");
    expect(sourceKindFromFilename("archive.zip")).toBeNull();
    expect(SUPPORTED_FILE_ACCEPT).toContain(".ppt");
    expect(SUPPORTED_FILE_ACCEPT).toContain(".xls");
    expect(isSupportedSourceMimeType("ppt", "application/vnd.ms-powerpoint")).toBe(true);
    expect(isSupportedSourceMimeType("ppt", "application/pdf")).toBe(false);
  });

  beforeAll(async () => {
    const pdf = resolve("tests/fixtures/sample-course.pdf");
    const pptx = resolve("tests/fixtures/sample-course.pptx");
    await Promise.all([readFile(pdf), readFile(pptx)]);
  });

  it("normalizes whitespace without losing paragraph boundaries", () => {
    expect(normalizeText("Alpha   beta\r\n\r\n\r\nGamma")).toBe("Alpha beta\n\nGamma");
  });

  it("extracts PDF text page by page with stable page anchors", async () => {
    const buffer = await readFile(resolve("tests/fixtures/sample-course.pdf"));
    const parsed = await parseMaterial(buffer, "pdf");
    expect(parsed.units).toHaveLength(2);
    expect(parsed.units[0].locatorKind).toBe("page");
    expect(parsed.units[0].locatorNumber).toBe(1);
    expect(parsed.units[1].normalizedText).toContain("ATP synthase");
  }, 30_000);

  it("extracts PPTX text slide by slide with stable slide anchors", async () => {
    const buffer = await readFile(resolve("tests/fixtures/sample-course.pptx"));
    const parsed = await parseMaterial(buffer, "pptx");
    expect(parsed.units).toHaveLength(2);
    expect(parsed.units[0].locatorKind).toBe("slide");
    expect(parsed.units[0].locatorNumber).toBe(1);
    expect(parsed.units[1].normalizedText).toContain("ATP Synthase");
  }, 30_000);

  it("keeps the PPTX fixture as a complete PowerPoint package", async () => {
    const buffer = await readFile(resolve("tests/fixtures/sample-course.pptx"));
    const archive = await JSZip.loadAsync(buffer);

    expect(archive.file("ppt/slideMasters/slideMaster1.xml")).not.toBeNull();
    expect(archive.file("ppt/slideLayouts/slideLayout1.xml")).not.toBeNull();
    expect(archive.file("ppt/theme/theme1.xml")).not.toBeNull();
  });

  it("creates deterministic span IDs tied to source and locator", () => {
    const unit = {
      locatorKind: "page" as const,
      locatorNumber: 2,
      title: null,
      rawText: "Evidence text",
      normalizedText: "Evidence text",
      readable: true,
      warnings: [],
      contentHash: "hash",
      blocks: ["Evidence text"],
    };
    const first = createSpanRows("11111111-1111-4111-8111-111111111111", "44444444-4444-4444-8444-444444444444", [unit]);
    const second = createSpanRows("11111111-1111-4111-8111-111111111111", "44444444-4444-4444-8444-444444444444", [unit]);
    expect(first[0].id).toBe(second[0].id);
    expect(first[0].locator_number).toBe(2);
  });

  it("accepts common image signatures and records a safe OCR gap", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    await expect(validateFileSignature(png, "image")).resolves.toBeUndefined();
    const extraction = vi.spyOn(ModelGateway.prototype, "generateStructured").mockResolvedValue({
      data: { text: "" },
      provider: "openai",
      configuredModel: "test-model",
      actualModel: "test-model",
      usage: null,
      providerRequestId: null,
      providerStatus: 200,
      durationMs: 1,
      retryCount: 0,
      parseMode: "parsed",
    });
    const parsed = await parseMaterial(png, "image");
    extraction.mockRestore();
    expect(parsed.units[0].locatorKind).toBe("image");
    expect(parsed.units[0].readable).toBe(false);
    expect(parsed.warnings[0].code).toBe("IMAGE_OCR_REQUIRED");
  });

  it("accepts legacy binary Office signatures for file-input extraction", async () => {
    const legacyHeader = Buffer.from("d0cf11e0a1b11ae1", "hex");
    await expect(validateFileSignature(legacyHeader, "ppt")).resolves.toBeUndefined();
  });
});
