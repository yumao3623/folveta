import { guideSchema, type Guide, type SourceReference } from "@/lib/schemas";

const lecture3: SourceReference = {
  span_id: "span-lecture-3-slide-18",
  source_id: "11111111-1111-4111-8111-111111111111",
  source_name: "Lecture 3 — Cellular Respiration.pptx",
  locator: { kind: "slide", number: 18 },
  excerpt: "The electron transport chain uses energy from electron transfer to pump protons across the inner mitochondrial membrane.",
};

const lecture4: SourceReference = {
  span_id: "span-lecture-4-page-7",
  source_id: "22222222-2222-4222-8222-222222222222",
  source_name: "Lecture 4 Notes.pdf",
  locator: { kind: "page", number: 7 },
  excerpt: "ATP synthase couples proton flow down the electrochemical gradient to ATP production.",
};

const claim = (id: string, text: string, refs: SourceReference[] = [lecture3]) => ({
  id,
  text,
  support_status: "direct" as const,
  source_references: refs,
});

export const demoGuide: Guide = guideSchema.parse({
  schema_version: "1.0",
  id: "33333333-3333-4333-8333-333333333333",
  session_id: "44444444-4444-4444-8444-444444444444",
  title: "Biology Midterm Study Guide",
  based_on_uploaded_materials: true,
  source_count: 3,
  priority_method_summary: "Topics are grouped by repeated coverage, explicit learning objectives, and the amount of supported explanation in the uploaded materials. These bands are study suggestions, not exam probabilities.",
  generation_status: "ready_with_warnings",
  source_issues: [{
    source_id: "55555555-5555-4555-8555-555555555555",
    source_name: "Lecture 5 — Metabolism.pptx",
    code: "UNREADABLE_UNIT",
    message: "Slide 24 contained no reliable text. Its diagram was not interpreted because OCR and image understanding are outside this MVP.",
  }],
  topics: [
    {
      id: "cellular-respiration",
      title: "Cellular respiration and chemiosmosis",
      priority: "study_first",
      focus_reason: "Repeated across two lectures and used to connect electron transport, proton gradients, and ATP production.",
      explanation: [claim("cr-explain-1", "Oxidation of electron carriers supplies the energy used to build a proton gradient, which then powers ATP synthesis.", [lecture3, lecture4])],
      key_concepts: [{
        id: "chemiosmosis",
        name: "Chemiosmosis",
        explanation: [claim("cr-concept-1", "Chemiosmosis is the coupling of ion movement down an electrochemical gradient to cellular work such as ATP production.", [lecture4])],
      }],
      definitions: [{
        id: "proton-motive-force",
        term: "Proton-motive force",
        definition: [claim("cr-definition-1", "The stored potential energy created by a proton concentration and charge difference across a membrane.")],
      }],
      processes_relationships: [claim("cr-process-1", "Electron transfer through the transport chain drives proton pumping; proton return through ATP synthase drives phosphorylation of ADP.", [lecture3, lecture4])],
      common_confusions: [{
        id: "oxygen-role",
        confusion: [claim("cr-confusion-1", "Oxygen directly produces ATP in oxidative phosphorylation.")],
        clarification: [claim("cr-clarification-1", "Oxygen is the final electron acceptor; ATP synthase produces ATP by using the proton gradient.", [lecture3, lecture4])],
      }],
      gaps: [{
        id: "cr-gap-1",
        text: "The uploaded materials do not establish a numerical ATP yield that applies to every cell type.",
        support_status: "unsupported_gap",
        source_references: [],
      }],
      source_references: [lecture3, lecture4],
    },
    {
      id: "enzyme-regulation",
      title: "Enzyme regulation",
      priority: "study_next",
      focus_reason: "Supported by the lecture notes and needed to explain how metabolic pathways respond to changing conditions.",
      explanation: [claim("enzyme-explain-1", "Regulatory molecules can change enzyme activity by binding outside the active site and altering protein conformation.", [lecture4])],
      key_concepts: [],
      definitions: [],
      processes_relationships: [],
      common_confusions: [],
      gaps: [],
      source_references: [lecture4],
    },
    {
      id: "fermentation",
      title: "Fermentation pathways",
      priority: "review_if_time",
      focus_reason: "The materials provide a concise comparison, but the topic receives less supported coverage than the higher-priority sections.",
      explanation: [claim("ferm-explain-1", "Fermentation regenerates NAD+ so glycolysis can continue when the electron transport chain is unavailable.")],
      key_concepts: [],
      definitions: [],
      processes_relationships: [],
      common_confusions: [],
      gaps: [],
      source_references: [lecture3],
    },
  ],
  overall_gaps: [{
    id: "overall-gap-1",
    text: "One diagram-heavy slide was unreadable, so the guide may omit relationships shown only in that diagram.",
    support_status: "unsupported_gap",
    source_references: [],
  }],
  generated_at: "2026-08-24T08:00:00.000Z",
});
