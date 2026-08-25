import { demoGuide } from "@/lib/fixtures/demo-guide";
import { quickCheckSchema, type MCQOption, type OptionId } from "@/lib/schemas";

const refs = new Map(
  demoGuide.topics.flatMap((topic) => topic.source_references).map((reference) => [reference.span_id, reference]),
);
const lecture3 = refs.get("span-lecture-3-slide-18")!;
const lecture4 = refs.get("span-lecture-4-page-7")!;

const validation = {
  status: "validated" as const,
  single_best_answer: true as const,
  question_grounded: true as const,
  answer_grounded: true as const,
  explanation_grounded: true as const,
};

function options(a: string, b: string, c: string, d: string): MCQOption[] {
  return [
    { id: "A", text: a },
    { id: "B", text: b },
    { id: "C", text: c },
    { id: "D", text: d },
  ];
}

function question({
  id,
  topicId,
  stem,
  answer,
  choices,
  explanation,
  sourceRefs,
  sectionType,
  sectionItemId,
  anchor,
}: {
  id: string;
  topicId: string;
  stem: string;
  answer: OptionId;
  choices: MCQOption[];
  explanation: string;
  sourceRefs: typeof demoGuide.topics[number]["source_references"];
  sectionType: "concise_explanation" | "key_concept" | "definition" | "process_relationship" | "common_confusion";
  sectionItemId: string;
  anchor: string;
}) {
  return {
    id,
    topic_id: topicId,
    stem,
    options: choices,
    correct_option_id: answer,
    explanation: [{
      id: `${id}-explanation`,
      text: explanation,
      support_status: "direct" as const,
      source_references: sourceRefs,
    }],
    source_refs: sourceRefs,
    related_section: {
      section_type: sectionType,
      section_item_id: sectionItemId,
      anchor,
    },
    validation,
  };
}

export const demoQuickCheck = quickCheckSchema.parse({
  schema_version: "1.0",
  id: "66666666-6666-4666-8666-666666666666",
  guide_id: demoGuide.id,
  guide_checksum: "d".repeat(64),
  requested_question_count: 5,
  question_count: 5,
  format: "mcq_only",
  disclaimer: "This checks a sample of concepts from the current Study Guide. It does not certify mastery or predict an exam score.",
  limited_sample: false,
  questions: [
    question({
      id: "demo-q1",
      topicId: "cellular-respiration",
      stem: "Which sequence best describes the relationship between electron transport and ATP production?",
      choices: options(
        "ATP synthase pumps electrons to create oxygen.",
        "Electron transfer drives proton pumping, and proton return through ATP synthase drives ATP production.",
        "Oxygen pumps protons directly through ATP synthase.",
        "ADP oxidation creates the electron gradient used by the transport chain.",
      ),
      answer: "B",
      explanation: "Electron transfer supplies energy for proton pumping; the resulting gradient powers ATP synthase when protons flow back across the membrane.",
      sourceRefs: [lecture3, lecture4],
      sectionType: "process_relationship",
      sectionItemId: "cr-process-1",
      anchor: "topic-cellular-respiration-process-cr-process-1",
    }),
    question({
      id: "demo-q2",
      topicId: "cellular-respiration",
      stem: "What role does oxygen play in the Study Guide's explanation of oxidative phosphorylation?",
      choices: options(
        "It is the final electron acceptor.",
        "It directly phosphorylates ADP.",
        "It carries protons through ATP synthase.",
        "It inhibits the electron transport chain.",
      ),
      answer: "A",
      explanation: "The materials identify oxygen as the final electron acceptor; ATP synthase, powered by the proton gradient, produces ATP.",
      sourceRefs: [lecture3, lecture4],
      sectionType: "common_confusion",
      sectionItemId: "oxygen-role",
      anchor: "topic-cellular-respiration-confusion-oxygen-role",
    }),
    question({
      id: "demo-q3",
      topicId: "enzyme-regulation",
      stem: "A regulatory molecule binds away from an enzyme's active site. What effect is supported by the uploaded notes?",
      choices: options(
        "It must permanently destroy the enzyme.",
        "It replaces the enzyme's substrate.",
        "It can alter protein conformation and change enzyme activity.",
        "It always increases reaction temperature.",
      ),
      answer: "C",
      explanation: "The notes support that binding outside the active site can alter enzyme conformation and therefore its activity.",
      sourceRefs: [lecture4],
      sectionType: "concise_explanation",
      sectionItemId: "enzyme-regulation",
      anchor: "topic-enzyme-regulation-explanation",
    }),
    question({
      id: "demo-q4",
      topicId: "fermentation",
      stem: "Why can fermentation help glycolysis continue when the electron transport chain is unavailable?",
      choices: options(
        "It regenerates NAD+.",
        "It creates oxygen.",
        "It eliminates the need for ADP.",
        "It pumps protons through ATP synthase.",
      ),
      answer: "A",
      explanation: "The Guide states that fermentation regenerates NAD+, allowing glycolysis to continue.",
      sourceRefs: [lecture3],
      sectionType: "concise_explanation",
      sectionItemId: "fermentation",
      anchor: "topic-fermentation-explanation",
    }),
    question({
      id: "demo-q5",
      topicId: "cellular-respiration",
      stem: "Which description best matches chemiosmosis in the uploaded material?",
      choices: options(
        "Coupling proton flow down an electrochemical gradient to work such as ATP production.",
        "Using oxygen to phosphorylate ADP directly.",
        "Moving electrons through ATP synthase to regenerate NAD+.",
        "Producing the same numerical ATP yield in every cell type.",
      ),
      answer: "A",
      explanation: "The notes link proton flow down the electrochemical gradient through ATP synthase to ATP production.",
      sourceRefs: [lecture4],
      sectionType: "key_concept",
      sectionItemId: "chemiosmosis",
      anchor: "topic-cellular-respiration-concept-chemiosmosis",
    }),
  ],
  generated_at: "2026-08-24T08:05:00.000Z",
});
