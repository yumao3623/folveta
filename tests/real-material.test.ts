import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseMaterial, validateFileSignature } from "@/lib/server/parser";

const regressionPdf = process.env.REAL_REGRESSION_PDF;
const regressionLegacyPpt = process.env.REAL_REGRESSION_PPT;

describe.skipIf(!regressionPdf)("real material regression", () => {
  it("parses the supplied production-failure PDF without content logging", async () => {
    const parsed = await parseMaterial(await readFile(regressionPdf!), "pdf");
    const readable = parsed.units.filter((unit) => unit.readable);
    const characters = readable.reduce((total, unit) => total + unit.normalizedText.length, 0);
    expect(parsed.units).toHaveLength(9);
    expect(readable).toHaveLength(9);
    expect(characters).toBeGreaterThan(3_000);
    expect(parsed.warnings).toHaveLength(0);
  }, 60_000);
});

describe.skipIf(!regressionLegacyPpt)("real legacy presentation regression", () => {
  it("rejects binary .ppt safely because the MVP accepts OOXML .pptx only", async () => {
    await expect(validateFileSignature(await readFile(regressionLegacyPpt!), "pptx"))
      .rejects.toMatchObject({ code: "INVALID_FILE_SIGNATURE" });
  });
});
