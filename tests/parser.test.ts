import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { createSpanRows, normalizeText, parseMaterial } from "@/lib/server/parser";

describe("material parsing", () => {
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
});
