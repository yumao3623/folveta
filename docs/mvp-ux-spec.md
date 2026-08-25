# Study Guide Maker MVP UX Specification

> Status: **Superseded v3 UX plan; historical baseline only.** Current product context and delivery scope are in `docs/product-context.md` and `docs/v5-master-roadmap.md`. This file contains planned capabilities that were not all implemented and must not authorize v5 work.  
> Product direction: **Study Guide Maker + optional Quick Check**  
> Core SEO keyword: `study guide maker`  
> Audience: US college students in lecture-heavy, exam-based courses  
> Scope: product UX specification only; no frontend implementation, technical architecture, database, domain, analytics, or new market research

## 1. Product UX thesis

The first complete value must be a **high-quality Study Guide**. The student should not need to configure or complete an assessment before the product fulfills the `study guide maker` promise.

The MVP loop is:

`Upload materials → Generate Study Guide → Review priority sections → Optional Quick Check → Review weak sections`

Quick Check supports the Study Guide. It is not a Mock Exam Simulator, exam predictor, AI Tutor, AI Oral Examiner, mastery system, or standalone quiz product.

### 1.1 User promise

> Upload your course materials, get a clear Study Guide, and quickly check what you still need to review.

### 1.2 Four MVP capabilities

1. Course-material input — Table Stake.
2. Structured priority Study Guide — primary product and first result.
3. Optional 5–10 minute Quick Check — secondary validation.
4. Wrong-answer-to-guide-section return loop — next study action.

### 1.3 Product principles

1. **Study Guide first.** The guide is the main page, main artifact, primary CTA outcome, and reason to use the product.
2. **Multi-source input is infrastructure.** It must be reliable, bounded, and transparent, but it is not differentiated positioning.
3. **Structure must help learning.** The result is not a generic prose summary. Every guide follows a consistent topic and concept structure.
4. **Priority must be explainable.** The guide says what to focus on first and why, without claiming to predict the real exam.
5. **Uploaded materials are the evidence boundary.** Unsupported gaps and source conflicts remain visible instead of being silently filled from the open web.
6. **Source references are available when useful.** They support spot-checking but do not dominate the reading experience or imply complete coverage.
7. **Quick Check is optional and lightweight.** The guide retains full value when the student skips testing.
8. **Mistakes return to learning.** Every wrong answer maps to a specific guide topic or subsection and offers a direct return action.
9. **Sparse testing does not equal mastery.** A 5–10 question sample can identify review candidates, not certify complete readiness.
10. **Limits are disclosed before generation.** Free allowances, file limits, output restrictions, and login requirements are visible before the student invests effort.

### 1.4 Prohibited claims

Do not use:

- “Predict what will be on your exam.”
- “Complete course coverage.”
- “Guaranteed exam readiness.”
- “Realistic professor exam simulation.”
- “Mastered” or “safe to skip” based on a Quick Check.
- A percentage that implies a topic's probability of appearing on the real exam.

Use:

- “Based on your uploaded materials.”
- “Study first because these uploaded signals emphasize this topic.”
- “Quick Check results reflect the sampled questions, not complete mastery.”
- “Return to this section to review the concept behind your mistake.”

## 2. MVP information architecture

The MVP uses one preparation session and one Study Guide surface. It does not create notebooks, classes, decks, an assessment dashboard, or a general learning workspace.

```text
Public
└── Landing: Study Guide Maker
    └── Make my study guide

Preparation session
├── 1. Materials
│   ├── Add files / paste text
│   ├── Assign or correct source roles
│   └── Review parsing gaps
├── 2. Generate
│   └── Processing, warnings, and recovery
└── 3. Study Guide — primary product surface
    ├── Guide overview and study priorities
    ├── Structured topic sections
    ├── Source references and uncertainty
    └── Optional Test Yourself / Quick Check

Quick Check — secondary loop
├── Ready summary
├── 5–10 questions
└── Result
    ├── Score and wrong questions
    ├── Weak Study Guide topics
    └── Return directly to relevant sections
```

### 2.1 Core UX objects

| Object | User-visible meaning | Product role |
| --- | --- | --- |
| Preparation session | One set of course materials for one study need | Container only |
| Source | Uploaded file or pasted text with role and parse status | Table Stake / evidence boundary |
| Study Guide | Structured, priority-aware learning artifact grounded in the materials | Primary product |
| Topic section | One learnable guide unit containing concepts, definitions, relationships, explanations, and confusions | Primary study object |
| Quick Check | Optional short check based on the current guide and sources | Secondary validation |
| Check result | Score, mistakes, weak topic links, and return actions | Bridge back to guide |

### 2.2 Navigation

Before generation:

`Materials → Study Guide`

On the guide page:

`Overview | Study priorities | Topic sections | Sources & gaps`

Quick Check opens as a contained secondary flow. After completion, the main action always returns to the guide.

There is no top-level `Exams`, `Assessments`, `Performance`, or `Dashboard` navigation in the MVP.

## 3. Core user flow

### Step 0 — Landing: satisfy Study Guide Maker intent

**Purpose:** Make the category and first value understandable within five seconds.

**Above-the-fold direction**

- SEO title: `AI Study Guide Maker from Notes, PDFs, and Slides`
- H1: `Turn Your Course Materials Into a Clear Study Guide`
- Subhead: `Get organized topics, key concepts, definitions, relationships, common confusions, and what to focus on first—then optionally test yourself in a few minutes.`
- Primary CTA: `Make My Study Guide`
- Secondary link: `See an Example Guide`
- Compact flow: `Upload → Study Guide → Optional Quick Check → Review weak sections`
- Trust line: `Based on the materials you provide. Source gaps and uncertainty stay visible.`
- Before-CTA disclosure: supported inputs, current file/page limits, free allowance, login requirement if any, and result/export restrictions.

Do not lead with “Mock Exam,” “Exam Simulator,” duration setup, question mix, or grading.

### Step 1 — Add course materials

**Purpose:** Establish a reliable evidence boundary with minimal setup cost.

**MVP inputs**

- Text-based PDF.
- PPTX.
- Pasted text.
- Several sources within a clearly disclosed limit.

**Optional source roles**

- Lecture slides / course notes.
- Reading / textbook excerpt.
- Learning objectives / review sheet.
- Syllabus / course outline.
- Sample or past questions.

**Role guidance**

- Lecture materials normally provide the content foundation.
- Review sheets/objectives can narrow focus but may be incomplete.
- A syllabus may be broad or administrative and is not automatically highest weight.
- Past/sample questions may calibrate depth or common confusion but do not define complete scope or predict future questions.

**Information shown for each source**

- Filename or pasted-text label.
- Role.
- Detected pages/slides.
- Parse state: `Ready`, `Ready with gaps`, or `Cannot use`.
- Unreadable ranges, suspected duplicates, or source conflict warning.

**User actions**

- Add, remove, replace, or retry a source.
- Correct a source role.
- Inspect a short extraction preview.
- Continue with acknowledged gaps or replace affected material.

At least one usable course-content source is required. A review sheet or sample exam alone cannot support a complete guide.

### Step 2 — Generate the Study Guide

**Purpose:** Produce the promised primary artifact without inserting an exam-configuration step.

**Optional inputs before generation**

- Guide title/course name.
- Scope: all usable material or selected files/topics/page ranges.
- Short note describing explicit professor emphasis, clearly labeled as student-provided context.

No duration, exam length, point distribution, question-format allocation, or full exam blueprint is requested.

**Processing states**

1. `Reading your course materials`
2. `Organizing topics and concepts`
3. `Building study priorities`
4. `Writing and checking your Study Guide`
5. `Linking useful source references`

**Required behavior**

- Show any skipped or unreadable source and why.
- Allow a failed stage to be retried without re-uploading successful sources.
- Preserve visible warnings in the completed guide.
- Do not silently add open-web facts.

### Step 3 — Study Guide: primary result and main UX surface

The page opens directly to a useful guide, not a blueprint, setup form, or test-ready screen.

#### 3.1 Guide overview

Show:

- Guide title and included scope.
- Detected topic structure.
- `Study first`, `Study next`, and `Review if time allows` groups.
- A short explanation of how priority was determined.
- Visible source gaps, unreadable ranges, conflicting definitions, and low-confidence areas.
- Primary action: `Start with the first priority section`.
- Secondary action: `Test Yourself — 5–10 min`.

The Quick Check action must not visually outrank starting or continuing the guide.

#### 3.2 Priority explanation

Each priority item contains:

- Topic name.
- Priority band, not a false-precision probability.
- Plain-language reason.
- Evidence chips such as `Learning objective`, `Repeated across lectures`, `Explicit emphasis supplied by you`, `Sample-question depth`, `Source conflict`, or `Limited evidence`.
- Link to the relevant guide section.
- Optional page/slide references.

Use `Higher study priority based on uploaded signals`, not `likely to be on the exam`.

#### 3.3 Required topic-section structure

Every in-scope topic section should contain only fields that have useful supported content:

1. **Why this topic matters / what to focus on**
2. **Key concepts**
3. **Important definitions**
4. **Relationships, processes, formulas, or steps**
5. **Concise explanations**
6. **Comparisons, exceptions, and common confusions**
7. **What the uploaded materials do not establish**
8. **Useful source references**

Topic structure and section order are consistent across the guide. The guide does not become a collection of unrelated AI paragraphs.

#### 3.4 Guide reading interactions

The student can:

- Move between topics from a persistent outline.
- Expand or collapse lower-priority subsections.
- Mark their current reading position locally within the session.
- Open a cited page/slide when they want to spot-check a claim.
- See why a section received its priority.
- Start Quick Check from the overview or after a topic, without leaving the guide context permanently.

The MVP does not include a full note editor, AI chat, flashcard creation, spaced repetition, mastery tracking, or social sharing.

### Step 4 — Optional Quick Check ready state

**Purpose:** Explain the narrow role and keep the commitment lightweight.

Show:

- `5–10 questions`.
- `About 5–10 minutes`.
- `Mostly multiple choice; a small number of short answers may be included when reliable`.
- Scope: current Study Guide.
- Notice: `This checks a sample of concepts. It does not certify mastery or predict your exam score.`
- Primary action: `Start Quick Check`.
- Secondary action: `Back to Study Guide`.

There is no exam name, duration configuration, points allocation, question mix control, readiness checklist, or claim of realistic professor simulation.

### Step 5 — Complete Quick Check

**Question behavior**

- 5–10 total questions.
- MCQ is the default and majority format.
- At most a small number of short-answer questions when answer support and grading are reliable.
- Questions are derived from the current guide and uploaded source evidence.
- One question at a time or a simple short list; no complex question navigator.
- Progress indicator such as `4 of 8`.
- Optional lightweight elapsed-time indicator only if useful; no high-stakes countdown or auto-submit model.
- No hints or answer reveal before the user completes the check.
- User may leave and return to the guide; abandoning the check does not damage the guide session.

**Actions**

- Choose or enter an answer.
- Move to the next/previous question.
- Submit the complete Quick Check.
- Exit back to the guide.

### Step 6 — Quick Check result and return loop

The result prioritizes corrective study, not assessment analytics.

**Result overview**

- Score: correct out of confidently gradeable questions.
- Number of wrong and unscored questions.
- Notice: `This result reflects a small sample and does not prove complete readiness.`
- List of guide topics to review.

**Each wrong-question row**

- Question.
- Student answer.
- Correct answer or supported answer elements.
- Concise explanation grounded in uploaded material.
- Related Study Guide topic and exact subsection.
- Useful source page/slide reference.
- Primary action: `Review this Guide section`.

**Weak-topic summary**

- Group mistakes by Study Guide topic.
- Show the number of sampled questions behind the label.
- Use `Review this topic` or `One gap found`, not `Weak`, when evidence is sparse.
- Never label an untested topic as mastered or safe to skip.
- Do not globally reorder every guide section using a sophisticated ranking formula.

**Return behavior**

Selecting `Review this Guide section`:

1. Returns to the existing Study Guide.
2. Opens the exact relevant subsection.
3. Displays a small context banner such as `Reviewing because of Quick Check question 4`.
4. Highlights the misconception, definition, relationship, or process involved.
5. Lets the student continue normal guide reading.

The result is not a persistent assessment dashboard. Repeated-attempt history, progress charts, mastery trends, and retake programs are outside the MVP.

## 4. Study Guide quality contract

The UX must make quality inspectable rather than equating polished formatting with correctness.

### 4.1 Required result states

| State | Meaning | User treatment |
| --- | --- | --- |
| Strong support | Content is directly supported by clear uploaded material | Show normally; source link available |
| Partial support | Sources are incomplete, indirect, or conflicting | Show caveat and lower confidence |
| Unsupported gap | An objective/topic is named but content evidence is missing | Show as a gap; do not invent an explanation |
| Unreadable | Relevant file range could not be parsed reliably | Show affected range and replacement action |

### 4.2 Coverage language

Source references help verify specific claims but do not prove that every page or course objective was covered. The guide must state:

- included files and ranges;
- excluded/unreadable ranges;
- detected topics with partial or missing support;
- conflicts that could not be resolved from the uploaded materials.

### 4.3 Priority language

Priority is a study suggestion based on visible signals, not exam probability. When signals are close, use grouped bands or ties instead of false numeric precision.

## 5. Quick Check rules and states

### 5.1 State model

```text
NOT_STARTED
    │ Start Quick Check
    ▼
ACTIVE ── Exit ──► ABANDONED / return to guide
    │ Submit complete check
    ▼
CHECKING
    │ unsupported or unreliable item
    ├── mark item UNSCORED
    ▼
RESULT
    │ Review section
    ▼
STUDY_GUIDE_SECTION
```

No immutable exam attempt, fixed deadline, interruption recovery, auto-submission, or provisional score range is required.

### 5.2 Scoring rules

1. MCQ grading uses one verified answer key.
2. An ambiguous or unsupported item is unscored and removed from the denominator.
3. Short-answer scoring uses only source-supported required elements.
4. If a short answer cannot be graded reliably, mark it `Needs review` or unscored rather than fabricate certainty.
5. Only wrong, confidently graded items contribute to the weak-topic return list.
6. A single wrong answer can trigger `Review one gap`; it should not create a strong global weakness claim.
7. Correct answers on a small sample do not justify `Mastered`.

## 6. Low-fidelity hierarchy

These frameworks define content hierarchy, not visual design.

### 6.1 Landing

```text
┌─────────────────────────────────────────────────────────────┐
│ Study Guide Maker                                           │
│ Turn your course materials into a clear Study Guide.        │
│ Topics • concepts • definitions • relationships • priorities│
│                                                             │
│ [ Make My Study Guide ]  [ See Example Guide ]               │
│ PDF • PPTX • text | limits shown before generation           │
│ Upload → Study Guide → Optional Quick Check → Review gaps    │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Materials

```text
┌─────────────────────────────────────────────────────────────┐
│ MATERIALS ─────────────────────────────── STUDY GUIDE       │
├─────────────────────────────────────────────────────────────┤
│ Add course materials                                        │
│ [ Drop PDF/PPTX files ]  [ Paste text ]                      │
│                                                             │
│ ✓ Lecture 01.pptx   42 slides   [Lecture slides ▼]          │
│ ! Review.pdf          8 pages    [Review sheet ▼]  Page 6 gap│
│                                                             │
│ Readiness: Ready with gaps  [Review issue]                   │
│                                      [ Generate Study Guide ]│
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Primary Study Guide page

```text
┌─────────────────────────────────────────────────────────────┐
│ Biology Midterm Study Guide                [Test Yourself]   │
│ Based on 4 sources • 1 parsing gap                           │
├──────────────────────┬──────────────────────────────────────┤
│ STUDY PRIORITIES     │ STUDY FIRST: CELL RESPIRATION        │
│ 1 Cell respiration  │ Why focus here                        │
│ 2 Genetics          │ Key concepts                          │
│ 3 Cell signaling    │ Important definitions                 │
│                     │ Processes and relationships            │
│ TOPIC OUTLINE       │ Common confusions                     │
│ • ...               │ What sources do not establish         │
│                     │ References: Lecture 4, slides 12–18   │
└──────────────────────┴──────────────────────────────────────┘
```

### 6.4 Quick Check

```text
┌─────────────────────────────────────────────────────────────┐
│ Quick Check • Question 4 of 8 • about 5–10 minutes          │
├─────────────────────────────────────────────────────────────┤
│ [Question based on the current Study Guide]                  │
│ ○ Option A  ○ Option B  ○ Option C  ○ Option D              │
│                                                             │
│ [Back to Guide]                          [Previous] [Next]    │
└─────────────────────────────────────────────────────────────┘
```

### 6.5 Result and return

```text
┌─────────────────────────────────────────────────────────────┐
│ Quick Check: 6 / 8                                           │
│ Small sample—use this to choose what to review next.         │
├─────────────────────────────────────────────────────────────┤
│ REVIEW: Genetics — 2 questions missed                        │
│ Gap: Mendelian exceptions                                    │
│ [ Review this Guide section ]                                │
│                                                             │
│ QUESTION 4                                                   │
│ Your answer / correct answer / concise explanation           │
│ Source: Lecture 6, slides 18–22                              │
│ [ Return to related section ]                                │
└─────────────────────────────────────────────────────────────┘
```

## 7. Errors, empty states, and uncertainty

### 7.1 Materials and guide generation

| Situation | Message | Required behavior |
| --- | --- | --- |
| No materials | `Add course slides, notes, or readings to make your Study Guide.` | Upload/paste action |
| Only review sheet/sample questions | `Add at least one course-content source.` | Block generation until content exists |
| Unsupported file | `This file type is not supported in the MVP.` | Replace/remove |
| Password-protected file | `This file is locked and cannot be processed.` | Replace/remove |
| Partial parse | `Ready with gaps: 6 of 42 slides could not be read.` | Inspect, replace, or continue with persistent warning |
| Suspected duplicate | `This may duplicate another source and overstate repetition.` | Remove or confirm intentional distinction |
| Conflicting sources | `Two sources disagree on this definition.` | Show both; lower confidence; do not silently choose |
| Generation partial failure | `Your guide is available, but one section could not be supported.` | Show gap and regenerate only affected section |
| Limits exceeded | Show the exact limit before processing | Reduce materials/scope or use disclosed access option |

### 7.2 Study Guide

| Situation | Message | Required behavior |
| --- | --- | --- |
| Tied priorities | `These topics have similar support. Their order is a study suggestion.` | Group/tie rather than false rank precision |
| Unsupported objective | `This objective is named, but supporting course content was not found.` | Show gap; do not generate claims/questions from it |
| Low source support | `This section is based on limited uploaded evidence.` | Caveat and reference |
| No reliable priority signal | `We organized the guide by course structure because no stronger focus signal was found.` | Honest fallback |

### 7.3 Quick Check

| Situation | Message | Required behavior |
| --- | --- | --- |
| No valid question for a topic | `We could not create a supported check question for this section.` | Omit it rather than fabricate |
| Ambiguous answer key | `This question was excluded from your score.` | Remove from denominator and weak-topic mapping |
| Short-answer uncertainty | `This response could not be graded reliably.` | Unscored/needs review; no weak claim |
| Too few valid questions | `This Quick Check samples only part of the guide.` | Allow a shorter check with explicit limitation |
| All correct | `No gap appeared in these sampled questions.` | Suggest continuing priorities; do not claim mastery |
| Check abandoned | `Your Study Guide is unchanged.` | Return to the prior guide position |

## 8. Scope guardrails

### Included

1. Bounded course-material input and parsing readiness.
2. One structured, priority-aware Study Guide as the primary result.
3. One optional 5–10 question Quick Check, mostly MCQ.
4. Compact results with direct weak-section return links.

### Explicitly excluded

- Full Mock Exam Simulator.
- 30/60-minute exam sessions.
- Full exam blueprint or sophisticated question-format allocation.
- Realistic professor-style simulation claims.
- Complex countdown, pause, expiry, auto-submit, immutable-attempt, or session-integrity logic.
- Provisional score ranges.
- Psychometric calibration and mock-realism claims.
- NDCG-based reprioritization.
- Full assessment dashboard, progress history, mastery tracking, or retake program.
- AI Tutor, AI Oral Examiner, voice input/output, or oral examination.
- Essay generation/grading, broad long-answer grading, or high-stakes assessment.
- Full note-taking system, flashcard deck management, spaced repetition, social/community, LMS, native mobile, or general AI chat.
- Open-web supplementation, product development, technical architecture, database, payments, analytics, or domain work.

## 9. UX success criteria

The v3 UX is successful only if a student can:

1. Understand within five seconds that the product makes a Study Guide.
2. Reach a complete Study Guide without configuring or taking a test.
3. Identify what to study first and understand the reason.
4. Learn from consistent topic sections rather than a generic summary.
5. Treat source references as optional verification aids, not reading clutter.
6. Understand that Quick Check is optional, short, and not a real-exam prediction.
7. Complete a Quick Check and return from each mistake to the exact relevant guide section.
8. See uncertainty, source gaps, and unscored questions instead of false certainty.

## 10. Decision alignment

This specification implemented the historical `decisions.md` v3 direction.

- **v1 retained:** priority remains a core Study Guide layer.
- **v2 retained as history:** active recall and source-grounded question quality remain useful, but the full Mock Exam Simulator is deferred.
- **v3 current:** Study Guide quality, clarity, learning structure, and focus are primary; Quick Check is secondary and returns the user to the guide.
- Multi-file input remains a Table Stake.
- Citation/source links remain a trust aid, not the primary positioning.
- Syllabus/review-sheet/past-question inputs remain contextual signals, not universal truth sources.
- No UI implementation or product development is authorized by this document.
