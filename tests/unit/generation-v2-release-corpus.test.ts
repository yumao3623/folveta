import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSourceSnapshot,
  detectV2Language,
  partitionV2Snapshot,
  runGenerationV2,
  type V2Artifact,
  type V2Partition,
  type V2Span,
} from "@/lib/ai/generation-v2";
import { parseMaterial, type ParsedMaterial } from "@/lib/server/parser";

function parsed(texts: string[], kind: "page" | "slide" = "page", warning = false): ParsedMaterial {
  return {
    units: texts.map((text, index) => ({
      locatorKind: kind,
      locatorNumber: index + 1,
      title: null,
      rawText: text,
      normalizedText: text,
      readable: text.length > 20,
      warnings: text.length > 20 ? [] : [{ code: "UNREADABLE_UNIT", message: "No reliable text was found.", locator: index + 1 }],
      contentHash: `release-${kind}-${index}-${text.length}-123456789`,
      blocks: text.length > 20 ? [text] : [],
    })),
    warnings: warning ? [{ code: "UNREADABLE_UNIT", message: "No reliable text was found.", locator: texts.length }] : [],
  };
}

function topicBundle(partition: V2Partition, spans: V2Span[], language: "en" | "zh"): V2Artifact {
  return {
    sections: spans.map((span, index) => ({
      title: language === "zh" ? `重点主题 ${partition.index + 1}.${index + 1}` : `Focused topic ${partition.index + 1}.${index + 1}`,
      priority: index === 0 ? "study_first" : index === 1 ? "study_next" : "review_if_time",
      focus_reason: language === "zh" ? "该主题由上传材料直接支持。" : "This topic is directly supported by the uploaded material.",
      explanation: [{ id: `claim-${index}`, text: language === "zh" ? "这是材料支持的核心解释。" : "This is the core explanation supported by the material.", span_ids: [span.id], support_status: "direct" }],
      review_targets: [language === "zh" ? "能够解释核心关系。" : "Explain the core relationship."],
      gaps: [],
      key_concepts: [language === "zh" ? "核心概念" : "Core concept"],
      definitions: [language === "zh" ? "定义 — 材料中的关键术语。" : "Definition — a key term from the material."],
      processes_relationships: [language === "zh" ? "说明过程之间的关系。" : "Describe the relationship between the processes."],
      common_confusions: [language === "zh" ? "不要混淆原因和结果。" : "Do not confuse the cause with the result."],
      practice_prompts: [language === "zh" ? "用自己的话解释这个主题。" : "Explain this topic in your own words."],
    })),
  };
}

describe("Generation v2 release corpus", () => {
  it("parses real PDF and PPTX fixtures into one coherent multi-topic, multi-source guide", async () => {
    const [pdf, pptx] = await Promise.all([
      parseMaterial(await readFile(resolve("tests/fixtures/sample-course.pdf")), "pdf"),
      parseMaterial(await readFile(resolve("tests/fixtures/sample-course.pptx")), "pptx"),
    ]);
    const snapshot = buildSourceSnapshot({
      sessionId: "release-multifile",
      ownerScope: "release-owner",
      title: "Cellular respiration",
      sources: [
        { id: "release-pdf", displayName: "sample-course.pdf", parsed: pdf },
        { id: "release-pptx", displayName: "sample-course.pptx", parsed: pptx },
      ],
    });
    let calls = 0;
    const guide = await runGenerationV2(snapshot, async ({ partition, spans, output_language }) => {
      calls += 1;
      return topicBundle(partition, spans, output_language === "zh" ? "zh" : "en");
    });

    expect(calls).toBe(1);
    expect(guide.generation_status).toBe("complete");
    expect(guide.sections.length).toBeGreaterThanOrEqual(3);
    expect(new Set(guide.sections.flatMap((section) => section.source_refs.map((reference) => reference.source_name)))).toEqual(new Set(["sample-course.pdf", "sample-course.pptx"]));
    expect(new Set(guide.sections.flatMap((section) => section.source_refs.map((reference) => reference.locator.kind)))).toEqual(new Set(["page", "slide"]));
    expect(guide.sections.every((section) => section.key_concepts?.length && section.definitions?.length && section.practice_prompts?.length)).toBe(true);
  }, 60_000);

  it("preserves English, Simplified Chinese, and mixed-language policy", async () => {
    const cases = [
      { id: "en", text: "The electron transport chain creates a proton gradient for ATP synthesis.", expected: "en" as const },
      { id: "zh", text: "电子传递链建立质子梯度，并由 ATP 合酶利用该梯度生成 ATP。", expected: "zh" as const },
      { id: "mixed", text: "ATP synthase 通过 proton gradient 产生 ATP for cellular work.", expected: "en" as const },
    ];
    for (const item of cases) {
      const snapshot = buildSourceSnapshot({ sessionId: `release-${item.id}`, ownerScope: "release-owner", title: item.id, sources: [{ id: `source-${item.id}`, displayName: `${item.id}.pdf`, parsed: parsed([item.text]) }] });
      expect(detectV2Language(item.text)).toBe(item.expected);
      const guide = await runGenerationV2(snapshot, async ({ partition, spans, output_language }) => topicBundle(partition, spans, output_language === "zh" ? "zh" : "en"));
      expect(guide.sections[0].title).toMatch(item.expected === "zh" ? /重点主题/ : /Focused topic/);
    }
  });

  it("covers late partitions in long and multi-file input without retrying siblings", async () => {
    const snapshot = buildSourceSnapshot({
      sessionId: "release-long",
      ownerScope: "release-owner",
      title: "Long course pack",
      sources: [
        { id: "long-one", displayName: "long-one.pdf", parsed: parsed(["A".repeat(30_000), "B".repeat(30_000)]) },
        { id: "long-two", displayName: "long-two.pptx", parsed: parsed(["C".repeat(30_000)], "slide") },
      ],
    });
    const calls: string[] = [];
    const guide = await runGenerationV2(snapshot, async ({ partition, spans, output_language }) => {
      calls.push(partition.id);
      return topicBundle(partition, spans, output_language === "zh" ? "zh" : "en");
    });
    expect(calls).toEqual(partitionV2Snapshot(snapshot).map((partition) => partition.id));
    expect(guide.generation_status).toBe("complete");
    expect(new Set(guide.sections.flatMap((section) => section.source_refs.map((reference) => reference.source_id)))).toEqual(new Set(["long-one", "long-two"]));
  });

  it("delivers readable content as complete_with_gaps when a source unit is unreadable", async () => {
    const source = parsed(["Readable material explains the relationship in enough detail.", "x"], "page", true);
    const snapshot = buildSourceSnapshot({ sessionId: "release-gap", ownerScope: "release-owner", title: "Gap fixture", sources: [{ id: "gap-source", displayName: "scan.pdf", parsed: source }] });
    const guide = await runGenerationV2(snapshot, async ({ partition, spans, output_language }) => topicBundle(partition, spans, output_language === "zh" ? "zh" : "en"));
    expect(guide.generation_status).toBe("complete_with_gaps");
    expect(guide.coverage.gaps).toEqual([expect.objectContaining({ code: "UNREADABLE_UNIT", source_id: "gap-source" })]);
    expect(guide.sections).toHaveLength(1);
  });
});
