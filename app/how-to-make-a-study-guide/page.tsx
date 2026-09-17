import Link from "next/link";
import { PublicPageLayout } from "@/components/public-page-layout";
import { StructuredData } from "@/components/structured-data";
import { buttonClassName } from "@/components/ui/styles";
import { publicPageMetadata, publicPageSchema } from "@/lib/seo";

const page = {
  title: "How to Make a Study Guide: Steps and Example",
  description: "Build a study guide from your course materials with a five-step method, a worked example, source checks, and a practical review checklist.",
  path: "/how-to-make-a-study-guide",
};

export const metadata = publicPageMetadata(page);

const steps = [
  {
    title: "Set the scope before you summarize",
    body: "Gather the syllabus, assigned readings, lecture notes, slides, and any review instructions your instructor provided. Write down the topics you need to cover and where each one appears. Mark missing material so an incomplete file set does not look like a complete course.",
    output: "A topic list with a source beside each topic.",
  },
  {
    title: "Group ideas by concept",
    body: "Combine related points from different lectures under one heading. For each concept, write a short explanation in your own words, define unfamiliar terms, and include a process, relationship, or worked example where the material supports one. Keep page or slide references beside important claims.",
    output: "Short sections you can navigate and check against the originals.",
  },
  {
    title: "Choose what to study first",
    body: "Use your course objectives, instructor guidance, and your own weak spots to set priorities. Start with concepts that other topics depend on, then add supporting detail. A priority label helps allocate your time; it is not a prediction of what will be on an exam.",
    output: "A reason for each priority, with uncertain areas left visible.",
  },
  {
    title: "Turn sections into questions",
    body: "Ask yourself to explain a relationship, compare two ideas, work through a problem, or describe what changes when a condition changes. Put the answer and its source below the prompt so you can try answering before looking. Use the question types your course actually requires.",
    output: "A few answerable prompts for each important topic.",
  },
  {
    title: "Check, use, and revise the guide",
    body: "Spot-check definitions and claims against the original files. Test yourself with the guide closed, then return to the exact section behind each mistake. Revisit weak sections in later study sessions. Add corrections and missing instructor material as you find them.",
    output: "A guide you keep using, with a clear next review task.",
  },
];

export default function HowToMakeAStudyGuidePage() {
  return (
    <>
      <StructuredData data={publicPageSchema(page)} />
      <PublicPageLayout
        label="Study method"
        breadcrumbLabel={page.title}
        pageClassName="method-page"
        title="How to make a study guide you can actually use"
        description="Start with the course material, organize it into concepts, and add questions that reveal what needs another look. You can follow this method by hand or use Folveta to help organize your files."
        asset="guide"
        actions={<><a href="#steps" className={buttonClassName({ size: "lg" })}>Follow the five steps</a><Link href="/study/demo" className={buttonClassName({ variant: "secondary", size: "lg" })}>Explore the example guide</Link></>}
      >
        <section className="method-intro" aria-labelledby="method-intro-heading">
          <div>
            <p className="method-kicker">The useful distinction</p>
            <h2 id="method-intro-heading">A summary tells you what was said. A study guide tells you what to do next.</h2>
          </div>
          <p>A study guide is a working map of material you need to understand and practise. Include the topic, a concise explanation, important terms, a source reference, a review question, and anything still unclear. Choose a format that suits the task: an outline for a sequence, a comparison table for similar ideas, or a worked problem for a calculation.</p>
        </section>

        <section id="steps" className="method-steps scroll-mt-6">
          <div className="method-section-heading">
            <p className="method-kicker">The method</p>
            <h2>Five steps from course files to a study guide</h2>
            <p>Keep the original material close. Each step should leave you with something you can check, use, or revisit.</p>
          </div>
          <ol className="method-steps__list">
            {steps.map((step, index) => (
              <li key={step.title} className="method-step">
                <span aria-hidden="true" className="method-step__number">{String(index + 1).padStart(2, "0")}</span>
                <div className="method-step__copy">
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <p className="method-step__output"><strong>Keep:</strong> {step.output}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="study-guide-template" className="method-example mb-8 scroll-mt-6" aria-labelledby="template-heading">
          <div className="method-example__intro">
            <p className="method-kicker">A reusable topic template</p>
            <h2 id="template-heading">Copy this study guide template into your notes</h2>
            <p>Fill in one set for each topic. Keep the checked answer below the question so you can cover it during review. Use your course objectives to decide which topics belong in the guide.</p>
            <a href="#worked-example" className="method-inline-link">See a completed topic example <span aria-hidden="true">↓</span></a>
          </div>
          <dl className="method-example__facts">
            <div><dt>Topic</dt><dd>[Name one concept, relationship, or problem type.]</dd></div>
            <div><dt>Source</dt><dd>[Record the file or reading, page or slide, and relevant section.]</dd></div>
            <div><dt>Explain it</dt><dd>[Write the idea in your own words, including important conditions.]</dd></div>
            <div><dt>Review question</dt><dd>[Ask something you should be able to answer with the guide closed.]</dd></div>
            <div><dt>Checked answer</dt><dd>[Answer the question and verify the reasoning against the source.]</dd></div>
            <div><dt>Still unclear</dt><dd>[List missing evidence, confusing steps, or a question for your instructor.]</dd></div>
            <div><dt>Next review</dt><dd>[Choose what to practise next and when to try it again.]</dd></div>
          </dl>
        </section>

        <section id="worked-example" className="method-example scroll-mt-6" aria-labelledby="example-heading">
          <div className="method-example__intro">
            <p className="method-kicker">Worked example</p>
            <h2 id="example-heading">Turn a topic into a review task</h2>
            <p>This illustrative excerpt comes from Folveta&apos;s synthetic Biology demo. The file names and references are sample material, not a real student&apos;s uploads.</p>
            <Link href="/study/demo" className="method-inline-link">Open the full example Study Guide <span aria-hidden="true">↗</span></Link>
          </div>
          <dl className="method-example__facts">
            <div><dt>Topic</dt><dd>Cellular respiration and chemiosmosis</dd></div>
            <div><dt>Relationship to explain</dt><dd>Electron transport builds a proton gradient. Proton flow through ATP synthase helps drive ATP production.</dd></div>
            <div><dt>Source to check</dt><dd>Demo Lecture 3, slide 18; Demo Lecture 4 Notes, page 7.</dd></div>
            <div><dt>Question to try with the guide closed</dt><dd>What would happen to ATP production if the proton gradient collapsed?</dd></div>
            <div><dt>Next action</dt><dd>Explain the roles of the transport chain and ATP synthase separately, then check the source passages.</dd></div>
          </dl>
        </section>

        <section id="review-checklist" className="method-checklist scroll-mt-6" aria-labelledby="checklist-heading">
          <div className="method-checklist__list">
            <p className="method-kicker">A quick check</p>
            <h2 id="checklist-heading">Before you call it ready</h2>
            <ul>
              <li>Every important topic has a source you can return to.</li>
              <li>Definitions and relationships are checked, not just copied.</li>
              <li>Missing pages, unclear diagrams, and unanswered questions are marked.</li>
              <li>You have tried answering review prompts without looking.</li>
              <li>Your next study session starts with a specific weak area.</li>
            </ul>
          </div>
          <aside className="method-boundary">
            <p className="method-kicker">Use the tool with judgment</p>
            <h2>AI can organize the material. You still verify it.</h2>
            <p>Folveta&apos;s <Link href="/" className="method-inline-link">Study Guide Maker</Link> creates source-linked sections and review priorities from uploaded files. Check important claims, fill gaps, and use the original course material as the authority.</p>
            <p>Working from a handout or reading? Follow the <Link href="/study-guide-maker-from-pdf" className="method-inline-link">PDF to Study Guide workflow</Link>, including how to handle unreadable pages.</p>
          </aside>
        </section>

        <section className="method-cta">
          <div>
            <p className="method-kicker">Ready to try it?</p>
            <h2>Start with one readable set of course files.</h2>
            <p>Review <Link href="/pricing" className="method-inline-link">Free and Pro limits</Link> and <Link href="/about" className="method-inline-link">what Folveta can and cannot do</Link>, then check the result against the originals.</p>
          </div>
          <div className="method-cta__actions">
            <Link href="/#upload" className={buttonClassName({ size: "lg" })}>Make a guide from my files</Link>
            <p>For more on self-testing and spacing your study sessions, read <a href="https://learningcenter.unc.edu/tips-and-tools/studying-101-study-smarter-not-harder/" className="method-inline-link">UNC Learning Center&apos;s Studying 101</a>.</p>
          </div>
        </section>
      </PublicPageLayout>
    </>
  );
}
