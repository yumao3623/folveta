import { v2GuideSchema, type V2Guide } from "@/lib/ai/generation-v2";

const lecture3 = {
  span_id: "span-lecture-3-slide-18",
  source_id: "11111111-1111-4111-8111-111111111111",
  source_name: "Lecture 3 — Cellular Respiration.pptx",
  locator: { kind: "slide" as const, number: 18 },
  excerpt: "The electron transport chain uses energy from electron transfer to pump protons across the inner mitochondrial membrane.",
};

const lecture4 = {
  span_id: "span-lecture-4-page-7",
  source_id: "22222222-2222-4222-8222-222222222222",
  source_name: "Lecture 4 Notes.pdf",
  locator: { kind: "page" as const, number: 7 },
  excerpt: "ATP synthase couples proton flow down the electrochemical gradient to ATP production.",
};

const sections: V2Guide["sections"] = [
  {
    id: "cellular-respiration",
    title: "Cellular respiration and chemiosmosis",
    priority: "study_first",
    focus_reason: "This relationship connects electron transport, proton gradients, and ATP production across two supplied lectures.",
    explanation: [{
      id: "cellular-respiration:claim:1",
      text: "Electron transfer supplies the energy used to build a proton gradient, and proton flow through ATP synthase couples that stored energy to ATP production.",
      support_status: "direct",
      source_refs: [lecture3, lecture4],
    }],
    review_targets: ["Trace the energy path from electron transfer to ATP production.", "Explain the distinct roles of the transport chain and ATP synthase."],
    key_concepts: ["Electron transport chain", "Proton gradient", "Chemiosmosis", "ATP synthase"],
    definitions: ["Proton-motive force — stored potential energy created by a proton concentration and charge difference across a membrane."],
    processes_relationships: ["Electron transfer drives proton pumping; proton return through ATP synthase drives phosphorylation of ADP."],
    common_confusions: ["Oxygen accepts electrons at the end of the chain; ATP synthase, not oxygen itself, produces ATP from the proton gradient."],
    practice_prompts: ["Describe what would happen to ATP production if the proton gradient collapsed."],
    source_refs: [lecture3, lecture4],
    gaps: [],
  },
  {
    id: "enzyme-regulation",
    title: "Enzyme regulation",
    priority: "study_next",
    focus_reason: "Regulation explains how metabolic pathways respond to changing cellular conditions.",
    explanation: [{
      id: "enzyme-regulation:claim:1",
      text: "Regulatory molecules can change enzyme activity by binding outside the active site and altering protein conformation.",
      support_status: "direct",
      source_refs: [lecture4],
    }],
    review_targets: ["Compare active-site and allosteric regulation."],
    key_concepts: ["Allosteric regulation", "Feedback inhibition"],
    definitions: ["Allosteric site — a regulatory binding site separate from an enzyme's active site."],
    processes_relationships: ["A pathway product can inhibit an earlier enzyme and reduce further product formation."],
    common_confusions: ["Allosteric binding changes enzyme activity without necessarily blocking the active site directly."],
    practice_prompts: ["Explain why feedback inhibition can stabilize a metabolic pathway."],
    source_refs: [lecture4],
    gaps: [],
  },
  {
    id: "fermentation",
    title: "Fermentation pathways",
    priority: "review_if_time",
    focus_reason: "The supplied material gives a concise comparison, with less detail than the higher-priority topics.",
    explanation: [{
      id: "fermentation:claim:1",
      text: "Fermentation regenerates NAD+ so glycolysis can continue when the electron transport chain is unavailable.",
      support_status: "direct",
      source_refs: [lecture3],
    }],
    review_targets: ["State why NAD+ regeneration matters to glycolysis."],
    key_concepts: ["NAD+ regeneration", "Anaerobic metabolism"],
    practice_prompts: ["Contrast the immediate purpose of fermentation with oxidative phosphorylation."],
    source_refs: [lecture3],
    gaps: [],
  },
];

export const demoV2Guide: V2Guide = v2GuideSchema.parse({
  schema_version: "2.0",
  id: "v2-demo-guide",
  session_id: "44444444-4444-4444-8444-444444444444",
  title: "Biology Midterm Study Guide",
  source_snapshot_hash: "demo-source-snapshot-1234567890",
  generation_status: "complete_with_gaps",
  coverage: {
    readable_units: 24,
    covered_units: 23,
    total_units: 25,
    gaps: [{
      code: "UNREADABLE_UNIT",
      message: "One visual-only slide did not contain reliable text, so relationships shown only in that diagram are not included.",
      source_id: "55555555-5555-4555-8555-555555555555",
      locator: { kind: "slide", number: 24 },
      partition_id: null,
    }],
  },
  study_map: sections.map((section) => ({
    section_id: section.id,
    priority: section.priority,
    why_this_matters: section.focus_reason,
    source_refs: section.source_refs,
  })),
  sections,
  generated_at: "2026-09-10T00:00:00.000Z",
});
