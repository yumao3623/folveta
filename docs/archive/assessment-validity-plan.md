# Assessment Validity Validation Plan

> Document status: **Archived historical v2 validation plan.** It is not a v5 launch gate. Current Quick Check boundaries remain governed by `docs/product/decisions.md`; current roadmap work is in `docs/product/v5-master-roadmap.md`.

> **Historical v3 status note: Full Mock Exam validation was deferred.**  
> The implemented baseline is a **Study Guide Maker with an optional lightweight Quick Check**, not a Mock Exam Simulator. The body of this document is retained as the historical v2 validation plan and as future reference if full exam simulation is reconsidered. Its long-form timing model, exam blueprint, mixed-format allocation, provisional score ranges, psychometric gates, short-answer response-bank program, weak-topic NDCG reprioritization, mock-realism pilot, and full assessment-dashboard implications are **not v5 launch gates**.

### Current v3 validation scope

The current MVP requires only lightweight question-quality validation for Quick Check:

1. **Study Guide quality remains upstream and primary:** topic structure, critical-claim grounding, important-definition/process/relationship coverage, priority explanations, common-confusion accuracy, source gaps, and useful page/slide references must be evaluated independently of Quick Check.
2. **Question grounding:** every scored Quick Check item must be answerable from the current Study Guide and uploaded source evidence; unsupported items are rejected or unscored.
3. **Answer-key quality:** MCQ must have one clearly supported best answer and non-ambiguous options. Known ambiguous or contradicted keys have zero tolerance in a scored check.
4. **Question mix and length:** 5–10 questions, primarily MCQ, designed for approximately 5–10 minutes. A small number of short answers may be used only when the required answer elements and grading are reliable.
5. **Guide-section mapping:** every scored wrong answer must map to the correct topic and exact Study Guide subsection so the user can return directly to relevant material.
6. **Conservative result language:** the result may identify `Review this topic` or `One gap found`; it must not claim mastery, exam readiness, psychometric diagnosis, or complete weak-topic coverage from a small sample.
7. **No complex reprioritization gate:** Quick Check does not require NDCG-based global ranking. Wrong answers create direct return links; untested topics retain their existing guide priority and remain unknown.

Current v3 quality gates should focus on: final-item grounding, verified MCQ keys, zero known ambiguity in scored items, deterministic MCQ scoring, reliable mapping from item to Guide section, supported explanations, and correct abstention for unsupported/ungradeable items. Exact thresholds should be frozen in a smaller Quick Check evaluation protocol before development; the full v2 thresholds below must not be presented as requirements for the current MVP.

---

> 历史 v2 产品方向：**Study Guide Maker + Mock Exam Simulator**  
> 本文目的：在正式 MVP 开发前，验证从课程材料到评分、弱项判断和下一轮复习优先级的整条链路是否足够可靠。  
> 本文不授权完整产品开发、视觉 UI、账号、数据库、支付、SEO、移动端或 production architecture。

## 0. 结论先行

Assessment validity 是当前方向最大的成立条件。技术上可以很快做出“上传文件后生成题目并给分”的 demo，但 demo 能运行不等于 assessment 有效。真正需要证明的是：

1. 每道计分题及其答案都由上传材料充分支持；
2. 题目能按蓝图覆盖主要主题，并包含 recall、understanding、application 和混合难度；
3. short-answer 评分与课程合格人工评分者高度一致，且不会被关键词堆砌等表面特征欺骗；
4. 只有足够、可靠的表现证据才会触发 weak-topic 判断和复习顺序变化；
5. 上游任何不确定性不会被下游包装成确定分数或确定优先级。

建议现在 **GO 到一个内部、无产品化要求的 assessment-validation prototype**，但 **NO-GO 到正式 MVP 开发**，直到本文的全部 critical gates 在预先冻结的 holdout 材料上通过。

第一轮应主动缩窄范围到：

- 数字原生、以文本为主的 PDF/PPTX；
- 以概念理解为主、确实使用 MCQ + short answer 的 lecture-heavy 课程；
- 每个实验包最多 4–6 个主要主题；
- 不含 essay、手写、音频、复杂图表识别、证明题、长计算题和开放式论述。

这不是永久产品边界，而是为了先隔离 assessment generation 和 grading 的核心风险。

---

## 1. AI Pipeline

### 1.1 总体链路与质量闸门

```text
课程文件
  ↓ A. Source parsing                 [parse readiness gate]
结构化 source chunks + page/slide anchors
  ↓ B. Topic extraction              [topic/evidence gate]
课程 topic map + evidence map
  ↓ C. Priority Study Guide          [claim-grounding gate]
初始 guide + initial priorities + exam blueprint
  ↓ D. Question generation           [item-quality gate]
候选 MCQ / short-answer items
  ↓ E. Answer-key / rubric generation[answer-grounding gate]
可评分题目 + source-grounded key/rubric
  ↓ F/G. MCQ / short-answer grading  [grading-confidence gate]
逐题得分、理由、置信度、unscored/provisional 状态
  ↓ H. Weak-topic diagnosis          [sampling sufficiency gate]
仅由可靠表现证据支持的 weak-topic / reasoning-gap 判断
  ↓ I. Reprioritization              [decision-safety gate]
下一轮复习优先级 + 变化原因 + 未测试/不确定状态
```

原则：每个阶段必须保存输入、输出、证据与置信状态。下游只能消费通过上游 gate 的对象；不能靠最后一次 LLM 调用“整体自我检查”。

### 1.2 分步设计

| 步骤 | 输入 | 输出 | 最容易出错的地方 | 是否传播 | 第一版最简单可靠的实现 |
| --- | --- | --- | --- | --- | --- |
| **A. Source parsing** | text-based PDF/PPTX、文件角色、范围 | 按页/slide 的文本块、标题、列表、表格文本、source ID、anchor、parse warnings | PDF 阅读顺序错；PPTX 文本框顺序错；页眉页脚污染；公式/表格丢失；扫描页被当作空白；重复文件被重复计权 | **强传播**：漏读会造成 topic/coverage 偏差；错 anchor 会让后续 grounding 看似存在但不可核验 | PDF 用 PyMuPDF，PPTX 用 python-pptx；逐页/slide 保存原文和位置；明确拒绝 image-only/复杂公式页；不做 OCR 猜测；显示 unreadable ranges；文件 hash 去重 |
| **B. Topic extraction** | parsed chunks、source role、用户选定 scope | 稳定 topic taxonomy、major/subtopic、别名、每个 topic 的 evidence spans、冲突/缺口 | 同义主题被拆开；不同主题被合并；例子被当主主题；review sheet 的标题被当成已有课程内容；重复 deck 被误判成“高频重点” | **强传播**：影响 guide、coverage、question allocation、错题映射与 reprioritization | 先从 content sources 提取 topic，再把 objectives/review sheet/past questions 作为 signal 映射；每个 topic 必须有 content evidence；用固定 JSON schema；人工冻结本次实验的 gold taxonomy |
| **C. Priority Study Guide** | topic map、source evidence、source roles、冲突、exam setup | 每个 topic 的 study section、初始 priority band、理由、证据、uncertainty、blueprint | 把材料重复次数当考试概率；补入常识/网络知识；遗漏 exception；把 syllabus/review sheet 当 complete scope；优先级过度精确 | **中强传播**：直接影响学生先学什么，并影响 mock allocation 的先验 | guide 用固定字段，不写自由长文；每个可核验 claim 绑定 source span；优先级只用 bands；显式展示冲突和缺口；不输出“会考概率” |
| **D. Question generation** | blueprint、指定 topic、认知层级、难度、允许的 evidence bundle | 候选题 stem、选项/回答要求、topic ID、cognitive level、difficulty、预计时间、source refs | unsupported question；题干暗含外部知识；只会问定义；application 题情境无法由材料推导；MCQ distractor 荒谬；跨 topic 拼接产生伪关系 | **强传播**：无效题会污染 score、weakness 和 priority | 先分配 blueprint slot，再逐 slot 生成；每题只给有限 evidence bundle；生成 2–3 倍候选后过滤；禁止无 anchor 题进入 exam；无法达到指定深度时减少题量而非硬生成 |
| **E. Answer-key / rubric generation** | 题目、同一 evidence bundle、source refs | MCQ 单一正确选项、每个选项解释；short-answer point rubric、accepted variants、disqualifying misconceptions、source spans | hallucinated key；来源能支持主题但不能支持该答案；两个 MCQ 选项都可成立；rubric 要求材料未给出的细节；rubric 与 stem 不一致 | **最强传播**：错误 key 会让正确学生被判错，并制造虚假 weak topic | **先从 source 写出可评分事实/要素，再据此定题和 key**；key/rubric 独立复核；MCQ 必须证明一个且仅一个 best answer；每个 rubric point 绑定 source span；不通过则 reject/unscore |
| **F. MCQ grading** | immutable student option、validated key | correct/incorrect、points、item validity state | option 顺序变化后 key ID 错位；无效题仍计分；多选/空白边界处理不一致 | **低风险但会传播** | 使用稳定 option ID 做纯确定性比较；无 LLM；invalid/unscored item 从分母和诊断中排除；保存原始题目版本 hash |
| **G. Short-answer grading** | immutable answer、point rubric、accepted variants、misconceptions、source evidence | rubric-element 逐项分、总分、rationale、confidence、provisional/unscored | 与人工评分不一致；正确 paraphrase 被漏判；关键词堆砌得高分；“先对后自我否定”被判对；部分正确边界漂移；同答案多次评分不同 | **最强传播**：同时影响总分、reasoning gap、weak topic 和 reprioritization | 使用 0/1 或小整数的解析 rubric；逐 element 判定并引用学生答案片段；temperature 0；同一答案双次独立评分，分歧超阈值则 provisional；低置信项不进入 priority 更新 |
| **H. Weak-topic diagnosis** | 通过质量 gate 的逐题得分、冻结的 item→topic 映射、sampling breadth、format、confidence | topic-level evidence、weak/not weak/insufficient evidence、reasoning-gap 标签 | 单题错就判弱；题目 topic 误标；short-answer 评分误差被当真实弱项；未测试被当掌握；一个通用失误被复制到多个 topic | **直接决策风险**：会改变学生有限复习时间 | item 的 topic mapping 在生成时冻结并由人工抽验；默认要求同 topic 至少 2 个有效 items 或足够 points，且最好跨格式；低置信/无效题零权重；不够证据只输出 `Not sufficiently tested` |
| **I. Reprioritization** | initial priority、weak-topic evidence、coverage、sampling、grading confidence | 下一轮 top priorities、rank change、原因、保留的不确定性 | 噪声导致大幅跳级；好成绩覆盖强 source signal；初始 ranking 反过来压制真实弱项；显示伪精确 1–N 排名 | **最终产品伤害** | 用可解释的保守规则，不让 LLM自由排序：初始 evidence band + performance deficit × reliability × sampling；只允许可靠证据移动；低差异项并列；每次变化显示贡献项 |

### 1.3 必须保存的 evidence contract

每道题至少保存以下字段：

```json
{
  "item_id": "pack01-q07",
  "format": "mcq | short_answer",
  "topic_id": "T3",
  "cognitive_level": "recall | understanding | application",
  "difficulty_target": "easy | medium | hard",
  "stem": "...",
  "options": [],
  "answer_key_or_rubric": {},
  "source_refs": [
    {
      "source_id": "lecture-04",
      "page_or_slide": 18,
      "span_text": "...",
      "span_hash": "..."
    }
  ],
  "expected_minutes": 2.5,
  "validation": {
    "question_grounded": true,
    "answer_grounded": true,
    "single_best_answer": true,
    "confidence": "high"
  }
}
```

只保存页码而不保存支持 span 不足以证明 grounding；只保存一个相似段落也不足以证明题目可回答。人工 reviewer 必须判断 entailment，而不是 citation presence。

### 1.4 误差传播优先级

| 上游错误 | 最可能污染的下游结果 | 传播严重度 | 必须的 containment |
| --- | --- | ---: | --- |
| 某页未解析 | topic coverage、guide、question coverage | High | readiness gap；该范围不得声称已覆盖 |
| topic 合并/拆分错误 | blueprint、item mapping、weak-topic 聚合 | High | 冻结 taxonomy；major topic 人工 gold review |
| unsupported question | key、score、weak topic、priority | Critical | 在 exam 前 reject；考后发现则 unscore 并重算 |
| wrong/ambiguous key | MCQ score、false weakness | Critical | single-best-answer review；发现即 unscore |
| unstable short-answer grade | score、reasoning gap、priority | Critical | provisional；不参与自动 reprioritization |
| item→topic 误分类 | false weak-topic diagnosis | Critical | generation-time mapping + independent audit |
| sampling 不足 | false mastery / false weakness | Critical | `Not sufficiently tested`；禁止下结论 |

---

## 2. Risk Map

### 2.1 按 pipeline 分类

| Risk | 等级 | 原因 |
| --- | --- | --- |
| F. MCQ deterministic grading | **Low** | 在 key 和 option ID 正确的前提下只是确定性比较；风险主要来自 E，而非 F 本身 |
| A. text-based PDF/PPTX parsing | **Medium** | 限定数字文本后可控，但阅读顺序、重复、表格/公式和 anchor 仍会系统性影响 coverage |
| B. topic extraction | **Medium** | 可以人工建立 gold taxonomy 并测 precision/recall；错误会传播，必须 gate |
| C. priority study guide | **Medium** | grounding 可审计，但“重要性”没有唯一真值；应只做 evidence-based suggestion 和 uncertainty |
| D. question generation | **High** | 同时涉及 grounding、认知层级、难度、歧义、distractor 和 coverage |
| E. answer-key / rubric generation | **High / Critical** | 一个错误 key 就会把正确答案判错，并制造伪弱项；citation 无法自动消除此风险 |
| G. short-answer grading | **High / Critical** | 正确答案表达多样、partial credit 边界不稳定，且容易受表面关键词影响 |
| H. weak-topic diagnosis | **High / Critical** | 它是多项 noisy evidence 的聚合；“没有证据”很容易被错误解释成“掌握”或“弱” |
| I. reprioritization | **High** | 最终直接分配用户时间；任何上游噪声都可能被放大成错误行动建议 |

### 2.2 指定危险场景

| 场景 | 等级 | 具体危险 | 如何发现 | 第一版处理 |
| --- | --- | --- | --- | --- |
| **Unsupported questions** | High | 题目与材料主题相关，但正确回答需要外部知识、常识或模型补全 | 两名 reviewer 独立判断“仅凭上传材料是否可作答”，并标出必要 source span | exam 前 reject；考后发现则 unscore、移出分母和 diagnosis |
| **Hallucinated answer keys** | Critical | key 看似专业且有 citation，但 citation 不蕴含答案，或与材料冲突 | reviewer 反向从 key 查 source；检查每个 rubric point；MCQ 检查每个 option | 0 个已知错误 key 可进入正式 form；冲突时 unscore |
| **Ambiguous MCQ** | Critical | 两个选项合理、题干缺限定、不同 source 使用不同定义 | reviewer 选择答案并写理由；两人答案不同即 ambiguity candidate；检查 source conflict | 改写或 reject，不靠“选最佳答案”掩盖歧义 |
| **Overly easy questions** | Medium-High | 大量题只复制定义、正确答案措辞与 slide 完全相同、distractor 荒谬 | reviewer 标 Bloom level；学生 pilot 看 item facility 和完成时间；检查 lexical overlap | blueprint 限额；要求理解/应用 slot；候选不足则承认 calibration 失败 |
| **Short-answer grading disagreement** | Critical | 人工可接受的 paraphrase 被扣分，或 partial credit 分歧大 | 双人工 gold + AI 双次评分；算 weighted kappa、exact agreement、MAE、bias | 解析 rubric；低 confidence / model disagreement 设 provisional |
| **Question coverage** | High | 15 题集中在容易生成的少数 topic，长尾/高 priority topic 未被采样 | gold topic weights 对比 actual valid-item distribution；按 topic、format、depth 报告 | blueprint 先分配后生成；每个可诊断 topic 设最低 sampling |
| **Topic misclassification** | High | 一道题被映射到错误 topic，导致正确评分但错误 weakness | 人工 gold item→topic；计算 macro-F1；允许 primary + secondary，但 diagnosis 只用 primary | 冻结 mapping；不在答题后让模型临时猜 topic |
| **False weak-topic diagnosis** | Critical | 因坏题、偶然失误、评分误差或采样稀疏而把 topic 推到最高优先级 | 控制型 simulated profiles + expert gold；测 precision、false-positive rate、abstention | 可靠性加权；最小证据要求；单题错误通常只标 `Review one gap` |

### 2.3 三个最大技术风险

1. **题目与答案的联合有效性。** 问题 grounded 不代表 key grounded；有 citation 不代表 single-best-answer，也不代表难度真实。
2. **Short-answer rubric 与评分稳定性。** 这一步必须同时处理 paraphrase、partial credit、misconception、自相矛盾和 keyword stuffing。
3. **从 noisy item evidence 推断 weak topic 并重排。** 这是上游所有误差的聚合点，也是最可能错误改变用户复习时间的地方。

---

## 3. Evaluation Metrics

### 3.1 评估数据与标注规则

#### 决策级最小数据集

- **10 个 course packs**；每包 2–5 个合法、去标识的 text-based PDF/PPTX，总计约 80–250 pages/slides。
- 第一轮只选一个明确课程类型；建议从 introductory psychology、business concepts 或相近的 concept-heavy lecture course 中选定一个 primary stratum，不把数学、essay 和 image-heavy course 混进主结果。
- 每包冻结：exam scope、4–6 个 major topics、topic weights、学习目标、明确 source conflicts、人工 reference study guide outline。
- 每包生成 **10 MCQ + 5 short answer**，总计 **150 items**。
- 预先指定其中 2 个 course packs 做学生 timing/difficulty pilot，不能生成后只挑“看起来最好”的 form。

150 items 对发现明显 viability 问题足够，但不是最终 psychometric validation。所有比例同时报告 pooled result、每 pack result 和 95% confidence interval，避免一个容易的课程包掩盖另一个失败包。

#### Reviewer protocol

- 每个 item 由 **2 名具备课程能力的 reviewer 独立标注**；至少一人应是 instructor、TA、优秀高年级学生或同等 subject-matter reviewer。
- reviewer 不能看到模型自报的 confidence，避免锚定。
- 分歧由第 3 名 reviewer adjudicate；同时保留 adjudication 前 agreement。
- 所有 label 定义和 threshold 在首次运行前冻结。
- prompt/model/version 固定；holdout packs 在 prompt 调优期间不可见。

#### Grounding label

- `2 = Fully grounded`：仅凭指定 source spans 可清楚回答，且引用蕴含题干/答案要求。
- `1 = Partially grounded`：主题相关，但需要未提供推断、外部事实或 citation 不完整。
- `0 = Unsupported/contradicted`：材料不支持、冲突或无法回答。

只有 `2` 计入 grounded pass；`1` 不能作为“差不多正确”。

### 3.2 Question Grounding

**问题：题目是否能仅从上传材料中找到充分依据？**

指标：

```text
Question Grounding Rate
= Fully grounded generated items / all generated items
```

同时记录：

- exact source page/slide 是否存在；
- supporting span 是否真正蕴含题目；
- 是否需要 outside knowledge；
- application scenario 的求解规则是否来自 source；
- 跨 source 组合是否建立了材料中不存在的关系；
- reviewer grounding agreement（Cohen's kappa）。

失败的题即使最终被过滤，也要计入 **candidate rejection rate**。高 rejection rate 会暴露系统只能靠大量抽样碰运气。

### 3.3 Answer Grounding

**问题：正确答案或每个 rubric point 是否有明确材料依据？**

对 MCQ 检查：

- key option 被 source 支持；
- 其余 option 在题干限定下确实不正确；
- 恰好一个 best answer；
- key 与 stem 的 scope、时间、定义和例外一致。

对 short answer 检查：

- 每个得分点都有 source span；
- rubric 没有要求 source 未提供的术语或推理步骤；
- accepted variants 不改变核心含义；
- misconception/contradiction rule 与 source 一致。

指标：

```text
MCQ Key Verification Rate
= items with one fully supported key / all MCQ items

Rubric Element Grounding Rate
= fully supported rubric points / all rubric points
```

另外单独报告 `critical key error count`。错误 key 不能只被一个高平均值掩盖。

### 3.4 Question Quality

每道题由 reviewer 按以下 schema 标注：

| 维度 | Pass 定义 |
| --- | --- |
| Clarity | 一个合格学生能理解问题在问什么；必要限定齐全 |
| Ambiguity | reviewer 在不猜出题意图的情况下选择同一 best answer / 同一回答范围 |
| Distractor plausibility | 每个 distractor 对未掌握者合理，代表常见混淆或可解释错误，而非笑话选项 |
| Distractor incorrectness | 对掌握材料者清楚错误，且不因另一合理解释而成立 |
| Cognitive level | 与 blueprint 的 recall / understanding / application slot 一致 |
| Difficulty | 不能只靠文字匹配；medium/hard 需要概念区分、关系或新情境应用 |
| Independence | 不由其他题泄露答案；题干不显示 topic/source label 作为提示 |
| Closed answer | 存在有限、可重复评分的正确空间，不是开放讨论题 |

核心指标：

- Ambiguous item rate；
- All-distractors-valid rate；
- Cognitive-level match rate；
- Difficulty-target match rate；
- Pure-copy / trivial recall rate；
- Duplicate/near-duplicate rate；
- expert overall item acceptance rate。

学生 pilot 额外记录：

- MCQ item facility（答对比例）；
- point-biserial discrimination，仅作小样本方向性信号；
- short-answer 平均得分分布；
- 每题与整份 form 的实际用时；
- 题目被学生报告为 unclear 的比例。

小样本 psychometric 数值不能证明真实考试等价，但可以快速发现“所有人秒答”或“所有人都看不懂”。

### 3.5 Coverage

先由专家冻结 gold topic map 与相对权重，再生成问题。不能让生成系统同时定义“主要主题”和证明自己已经覆盖它们。

```text
Weighted Major-topic Coverage
= Σ(weight of major topic sampled at intended depth by ≥1 valid item)
  / Σ(all in-scope major-topic weights)

Diagnostic Coverage
= topics meeting minimum reliable sampling
  / topics the result attempts to diagnose
```

还要报告：

- 每 topic 的 valid question count、points、format、depth；
- blueprint planned share vs actual valid share；
- high-priority topic 是否至少有 2 个有效 item；
- 是否存在 `mentioned in guide but never tested`；
- 未测试 topic 是否正确显示为 `Not sufficiently tested`。

Coverage 不等于每页都出题。目标是主要课程主题和计划认知层级得到合理 sampling，同时对未采样内容诚实。

### 3.6 Short-answer Grading

#### Response bank

为 50 道 short-answer item 每题建立至少 6 个 responses，总计至少 300 个：

1. fully correct paraphrase；
2. correct but terse；
3. partial answer；
4. common misconception；
5. keyword-stuffed but logically wrong；
6. blank/irrelevant/self-contradictory answer。

优先使用真实学生答案；没有时可先由人工编写/编辑模拟答案，但不能只让同一个模型生成再评分。两位 human raters 按冻结 rubric 盲评；human gold 为 adjudicated score。

AI 对同一答案在随机顺序下评分两次，以测稳定性。

指标：

- quadratic weighted Cohen's kappa（AI vs adjudicated human）；
- exact score agreement；
- within-one-point agreement；
- mean absolute error（统一换算到 0–4 分）；
- mean signed error，检查系统性宽松/严格；
- repeated-grade stability；
- 各 response type 的 false positive / false negative，尤其 keyword stuffing 和 correct paraphrase；
- AI confidence 是否校准：low-confidence 是否真的有更高错误率。

### 3.7 Weakness Diagnosis

建立至少 **40 个 controlled student profiles**：

- 10 个 single-topic weakness；
- 10 个 multi-topic weakness；
- 10 个 sparse evidence / only-one-error / untested-topic；
- 10 个含 invalid item、ambiguous answer 或 provisional short-answer grade 的 adversarial profiles。

每个 profile 的题目答案预先控制，专家独立给出：

- 真正有充分证据的 weak topics；
- 只有一个 gap 但不足以判 weak 的 topics；
- insufficiently tested topics；
- 建议 top-3 复习顺序及理由。

指标：

```text
Weak-topic Precision = correctly diagnosed weak topics / all diagnosed weak topics
Weak-topic Recall    = correctly diagnosed weak topics / all gold weak topics
False Weak-topic Rate= non-weak topics incorrectly labeled weak / all non-weak topics
```

另算：

- item→topic mapping macro-F1；
- insufficient-evidence abstention accuracy；
- top-1 priority agreement；
- NDCG@3（系统 top-3 vs expert top-3）；
- full-order Spearman correlation，作为辅助指标；
- invalid/provisional item 对 priority 的影响应严格为 0。

### 3.8 Mock Exam 与普通 Quiz 的区别

一个 form 只有同时满足以下条件才计为合格 Mock Exam：

| 要求 | 最小实验中的操作定义 |
| --- | --- |
| Blueprint first | 生成前冻结 topic × format × cognitive level × difficulty × points allocation |
| Mixed difficulty | 约 20–30% easy、40–60% medium、20–30% hard；最终以 reviewer/pilot 校准，不以模型自报为准 |
| Recall + understanding + application | recall 不超过 30%；understanding 至少 35%；application 至少 25%，且至少 3 道有效 application items |
| Realistic distractors | 至少 85% MCQ 的全部 distractors 同时满足 plausible + clearly incorrect |
| Multi-topic coverage | 覆盖冻结 blueprint 中至少 90% 的 weighted major topics；可诊断 topic 满足最低 sampling |
| Reasonable timing | 10 MCQ + 5 short answer 初始设 30 分钟；pilot 中位完成时间应为限时的 70–90%，至少 80% 学生能完成，且不能普遍在一半时间内完成 |
| Closed-answer assessment | 每题有有限、可复现的 key/rubric；不使用 essay 或开放讨论题 |
| Exam integrity | 作答中不展示答案、正确性、topic label、citation、rubric、hint 或 tutor feedback；只在 final submit 后评分 |
| Session-level result | 最后统一提交、统一评分，并报告 unscored/provisional/untested；不是逐题答完立即反馈 |

禁止把大量 `According to the PDF, what is X?` 换一种措辞后称为 application。Application item 必须提供新但封闭的情境，解题所需规则完全来自 source，且 reviewer 能说明它为什么不是原句检索。

---

## 4. GO / NO-GO Thresholds

### 4.1 正式 MVP 开发前的 gates

以下门槛适用于 holdout 数据。所有 **Critical** 项必须同时通过；不能用一个维度的高分抵消另一个维度的失败。

| 维度 | GO threshold | 类型 | 原因 |
| --- | ---: | --- | --- |
| Parse completeness（可读文本块） | **≥98%**；page/slide anchor accuracy **≥99%** | Supporting | 第一版已排除 OCR/复杂材料，文本读取应接近确定性；否则 coverage 无法解释 |
| Major-topic extraction | precision、recall、macro-F1 均 **≥0.90**；每 pack recall ≥0.85 | Critical upstream | topic map 同时驱动 guide、coverage 和 diagnosis |
| Study-guide claim grounding | **≥95%**；所有公式、定义、例外等 critical claims **100% supported** | Critical | guide 会影响初始复习，不能只约束考题 |
| Question grounding | pooled **≥95%**，且每 pack **≥90%** | **Critical** | 允许实验候选有少量失败，但进入 final form 的 unsupported item 必须被过滤 |
| Answer/key grounding | MCQ key verification **≥98%**；rubric-element grounding **≥98%**；**0 个已知 contradicted key** | **Critical** | key 错误会直接制造错误分数与伪弱项，因此门槛高于普通生成质量 |
| Ambiguous MCQ | pooled **≤5%**，每 pack **≤10%**；final scored form 中已知 ambiguity 必须为 0 | **Critical** | 5% 是 prototype 筛选容忍度，不是允许歧义题计分 |
| Distractor quality | **≥85%** MCQ 的全部 distractors 合格；单个 distractor 合格率 ≥90% | Required | 低质量 distractor 会让 mock 退化成简单 recognition quiz |
| Cognitive-level match | **≥90%**；recall ≤30%，application ≥25% | Required | 直接验证不是普通定义问答 |
| Weighted major-topic coverage | **≥90%**；所有 top-priority topics 至少 2 个有效 items 或明确标为不足以诊断 | **Critical** | 防止容易生成的 topic 垄断试卷 |
| Overly easy items | pilot 中 facility >0.90 的 items **≤20%**；不得全部集中在 non-recall slots | Required | 少量 easy item 合理，但不能让高分产生虚假安全感 |
| Short-answer AI-human agreement | quadratic weighted kappa **≥0.80**；exact agreement **≥80%**；within 1 point **≥95%**；MAE ≤0.35/4 | **Critical** | 0.80 是可信自动评分的务实下限；同时要求易懂的 exact/within-one 指标 |
| Short-answer stability/bias | 重复评分 exact match **≥95%**；mean signed error 绝对值 ≤0.20/4；keyword-stuffing false pass **≤5%** | **Critical** | 平均 agreement 不能掩盖漂移或可被游戏化 |
| Item→topic mapping | macro-F1 **≥0.90** | **Critical** | 分数正确但 topic 错同样会造成错误复习建议 |
| Weak-topic diagnosis | precision **≥0.90**、recall **≥0.80**、false weak-topic rate **≤10%** | **Critical** | false positive 比暂时漏报更伤害有限复习时间，因此 precision 门槛更高 |
| Insufficient-evidence abstention | **≥95%** sparse/untested profiles 不输出确定 weakness/mastery | **Critical** | 产品必须会说“不知道” |
| Reprioritization | NDCG@3 **≥0.85**、top-1 agreement **≥80%**；invalid/provisional items 的影响为 **0** | **Critical** | top-3 是用户实际下一步，必须与专家判断高度一致 |
| Timing | pilot median 使用限时的 **70–90%**；≥80% 完成；≤10% 在一半限时内完成 | Required | 同时识别过长和过于简单的 form |

### 4.2 为什么不是全部要求 100%

- 生成候选中的少量失败可以由 pre-exam validation gate 拦截；因此候选 grounding 用 95%，但 **已知 invalid item 进入计分 form 的容忍度为 0**。
- short-answer 存在人类评分者本身的边界分歧，要求模型逐题 100% 等同人工不现实；更重要的是高 kappa、低 bias、稳定，并让不确定项 provisional。
- weakness diagnosis 在 15 题的小考试中天然有 sampling 限制。因此 precision 和 abstention 比强行提高 recall 更重要。

### 4.3 NO-GO 与迭代区间

直接 **NO-GO 到正式 MVP**，只保留内部迭代，如果出现任一情况：

- question grounding <90%；
- answer/key grounding <95%，或有已知错误 key 仍被计分；
- ambiguous MCQ >10%；
- short-answer weighted kappa <0.70；
- weak-topic precision <0.85 或 false weak-topic rate >15%；
- invalid/provisional item 会改变 priority；
- 未测试 topic 被描述为 mastered、safe 或 low priority；
- 无法在 source-heavy 与 assessment-signal 文件之间防止内容污染。

介于 GO threshold 和上述 hard NO-GO 之间为 **iterate**，不是“平均分差不多就上线”。连续两次使用冻结 holdout 的调优会导致 holdout 泄漏；第二次后必须换新 holdout packs。

### 4.4 通过后的产品边界

即使所有门槛通过，也只代表：在已验证的 course type、文件类型、题型和长度内，值得做 limited MVP。不能外推到 scanned PDFs、复杂 STEM calculation、essay、law/medicine high-stakes grading 或真实教授风格等价。

---

## 5. Minimal Experiment

### 5.1 实验目标

用最少技术验证以下闭环，而不是开发产品：

```text
少量 PDF/PPTX
→ parse + source anchors
→ topic map + priority study guide + blueprint
→ 10 MCQ + 5 short answer
→ source-backed key/rubric
→ simulated/real student answers
→ grading
→ weak topics
→ reprioritized top-3
→ evaluation report
```

### 5.2 最小实现形态

优先做一个 CLI script；如 reviewer 不方便看 JSON，再加一个只读 static HTML report。不要做上传产品页。

建议技术形态：

- Python；
- PyMuPDF 解析 PDF；python-pptx 解析 PPTX；
- Pydantic/JSON Schema 约束所有中间对象；
- 本地文件保存 artifacts；不使用数据库；
- 一个模型负责生成，另一个独立 validation pass 或同模型隔离上下文负责审查；
- MCQ grading 为纯函数；
- short-answer grading temperature 0，并双次运行；
- pandas/简单脚本计算 metrics；
- 生成 Markdown/CSV 报告，不做 dashboard。

没有可靠 API key、模型版本锁定或课程 expert 时，不应先写漂亮页面；这些是实验前置条件。

### 5.3 建议目录，仅限实验区

如果后续实现，只放在：

```text
experiments/assessment-validation/
├── README.md
├── requirements.txt
├── run_experiment.py
├── schemas/
├── prompts/
├── fixtures/                 # only licensed/de-identified packs
├── artifacts/                # gitignored if materials are private
│   └── <run_id>/
│       ├── source_manifest.json
│       ├── chunks.jsonl
│       ├── topics.json
│       ├── blueprint.json
│       ├── study_guide.json
│       ├── candidate_items.jsonl
│       ├── final_items.jsonl
│       ├── answer_keys_rubrics.jsonl
│       ├── student_responses.jsonl
│       ├── grades.jsonl
│       ├── diagnoses.jsonl
│       └── evaluation.json
└── reports/
    ├── reviewer-sheet.csv
    └── assessment-validity-report.md
```

本计划本身不创建实验代码，因为在冻结 course type、gold labels 和 reviewer protocol 前实现生成页面会混淆“能跑”与“有效”。

### 5.4 实验步骤

#### Phase 0 — Pre-register

1. 选定 primary course type 和 10 个 course packs。
2. 冻结 8 个 development packs、2 个 holdout packs；更稳妥时使用 7/3。
3. 专家为每 pack 建立 gold scope、major topics、topic weights、conflicts、必需 source spans。
4. 冻结 metrics、threshold、prompts version、model version、random seed、adjudication rules。

#### Phase 1 — Parsing validation

1. 解析所有文件并保留 page/slide anchor。
2. 每包随机抽 20% pages/slides，加上所有 warning pages 做人工核对。
3. 检查 reading order、遗漏、重复、页码/slide 号和 source role。
4. 不合格文件直接标 out-of-scope，不让后续模型静默补齐。

#### Phase 2 — Topic / guide / blueprint

1. 从 content sources 建 topic map。
2. 将 objectives/review sheet/sample questions 映射为 calibration signals。
3. 生成固定 schema 的 priority study guide 与 exam blueprint。
4. 专家评估 topic precision/recall、claim grounding、priority reasons 和 coverage gaps。

#### Phase 3 — Item generation and filtering

1. 每个 blueprint slot 生成约 2 倍候选，例如 20 MCQ + 10 short answer。
2. 对 question grounding、answer grounding、single-best-answer、difficulty/depth 和 duplication 做独立 validation。
3. 选出 10 MCQ + 5 short answer；保留所有 rejection reason。
4. 若某 slot 没有合格题，输出 shortfall，不能用低质量题填满数量。

重要指标：最终 form 质量之外，还要报告 `accepted candidates / generated candidates`、每类失败原因和 token/cost/time。若要生成 10 倍候选才能勉强过门槛，产品仍可能不可行。

#### Phase 4 — Grading validation

1. MCQ 用 stable option ID 确定性评分。
2. 建立至少 300 条 short-answer response bank。
3. 两名人工 reviewer 独立评分并 adjudicate。
4. AI 以随机顺序评分两遍；保存 element-level decision、引用的学生答案片段、confidence。
5. 计算 agreement、bias、stability 和 adversarial error。

#### Phase 5 — Weakness / reprioritization validation

1. 用 40 个 controlled profiles 跑完整 scoring→diagnosis→priority 链路。
2. 包含单题偶然错误、blank answer、ambiguous item、wrong-key-after-the-fact、低置信 short answer、未测试 topic。
3. 检查 unscored/provisional item 移除前后 priority 是否严格按设计变化。
4. 与专家 top-3 和 diagnosis gold 比较。

#### Phase 6 — Mock realism pilot

1. 预先选定 2 份 final forms。
2. 每份由至少 20 名具备相应先修知识的学生完成；若资源有限，最低 12 人只用于发现明显 timing/clarity 问题，不能据此宣称 psychometric validity。
3. closed-answer、统一限时、无 hint/citation/feedback；完成后收集每题 clarity 和整体“像 mock 还是像 AI quiz”的简短反馈。
4. 报告 difficulty、completion、timing、unclear-item rate 和 topic coverage，不声称与真实教授考试等价。

#### Phase 7 — Decision

输出单一 decision table：每个 gate 的 numerator、denominator、pooled value、per-pack minimum、95% CI、pass/fail、已知限制。任何 Critical gate fail 即不能进入正式 MVP。

### 5.5 必做的 ablation

为了知道复杂步骤是否真的带来价值，至少比较：

1. **Direct prompt baseline**：整包材料直接要求生成 15 题；
2. **Blueprint + evidence-bundle pipeline**：本文建议流程；
3. **Diagnosis without safety gates** vs **with sampling/confidence gates**。

对比 grounding、ambiguity、coverage、grading agreement、false weak-topic rate 和生成成本。如果复杂 pipeline 没有显著优于 direct prompt，说明架构增加了成本但没有降低核心风险。

### 5.6 实验不做什么

- 登录、账号、session persistence；
- 数据库、云存储、支付、SEO；
- 视觉 UI、响应式/mobile；
- production auth/security/observability；
- OCR、手写、audio、video；
- essay、oral exam、开放式 tutor；
- 真实 exam prediction；
- repeated-attempt mastery system。

---

## 6. Expected Failure Modes

| Failure mode | 可见症状 | 检测 | Containment / 实验动作 |
| --- | --- | --- | --- |
| PDF/PPTX reading order 错 | 定义和例子拼错，列表层级丢失 | 抽页人工对照；anchor audit | 标 unreadable/low-confidence；不允许该 span 出题 |
| Duplicate lecture over-weighting | 重复上传让 topic priority 虚高 | 文件 hash、near-duplicate chunks | 去重或只作一个 signal |
| Source-role contamination | past question 的答案被当 course fact；review sheet objective 被当已教内容 | source role audit；content evidence requirement | assessment signals 只能校准，不能单独支持答案 |
| Topic over-merge | 两个概念被同一 weak topic 吞并 | gold taxonomy、confusion matrix | 稳定 major/subtopic schema；重跑 mapping |
| Topic over-split | 同义名分成多个 topic，coverage 看似高 | alias review、evidence overlap | merge aliases；保存 canonical topic ID |
| Unsupported application scenario | 情境引入 source 未提供规则 | reviewer 仅凭 source 作答测试 | reject；缩回 understanding level |
| Surface citation | 引用谈到相同主题但不蕴含题/答案 | entailment label，不只检查引用存在 | reject/unscore |
| Ambiguous MCQ | reviewer 选择不同 option | independent answer selection | 改写或 reject；不投票选 key |
| Trivial distractors | 正确项长度/措辞明显，其他项荒谬 | option-level review、pilot facility | 从真实 misconception 生成；不足则 reject |
| Difficulty collapse | “hard” 仍是 slide 原句检索 | cognitive-level audit、lexical overlap、timing | blueprint quotas + human validation |
| Rubric over-specification | 正确短答因没说 source 外细节被扣分 | rubric point grounding | 删除 unsupported points；重标满分条件 |
| Paraphrase false negative | 意思正确但措辞不同被判错 | correct-paraphrase bank | accepted concept variants；人工 review low confidence |
| Keyword-stuffing false positive | 堆术语但逻辑错误仍高分 | adversarial response bank | rubric 要求关系/因果；contradiction override |
| Self-contradictory answer pass | 前半正确、后半否定仍得满分 | contradiction test cases | 明确 disqualifying misconception rule |
| Grade instability | 同答案两次分数不同 | repeated-grade stability | provisional；不用于 reprioritization |
| Wrong item→topic mapping | 错题被计入无关 topic | gold mapping、macro-F1 | generation-time frozen mapping；人工抽验 |
| Single-error overdiagnosis | 一道失误让 topic 跳到 #1 | controlled sparse profiles | minimum sampling；输出 `Review one gap` |
| Untested = mastered | 未出题 topic 被降级 | untested profile | 保留 initial priority；标 insufficiently tested |
| Initial prior dominates | 明显表现弱项不移动 | expert reprioritization profiles | 分开显示 source evidence 与 performance evidence |
| Performance noise dominates | 低置信答案让 priority 巨变 | remove/recompute test | reliability weight；provisional effect = 0 |
| Leakage during mock | topic label/citation 暗示答案 | exam artifact review | active form 只显示 stem/options/response area |
| Timing unrealistic | 大多数人过早完成或无法完成 | pilot timing distribution | 调整 form length/points，不把 UI timer 当 realism |
| Candidate cherry-picking | 只展示最好 course/form | pre-registered packs + all-run report | 报告 per-pack minimum 和所有 rejected candidates |
| Prompt/holdout overfitting | 调到某批材料过门槛，换材料即失败 | fresh holdout | 两轮后更换 holdout；锁 prompt/model version |

---

## 7. Recommendation

### 7.1 当前建议

**值得继续，但只值得继续到内部 assessment-validation prototype。** 用户痛点与产品闭环有充分理由继续验证；竞争分析也表明普通 quiz 已商品化，完整的模拟考试到 reprioritization 仍有差异化空间。但 assessment validity 未通过前，开发正式上传流、漂亮 UI、账户和支付只会把最大风险藏在产品表面之下。

建议的顺序：

1. 先验证 question/key grounding 和 MCQ quality；
2. 再验证 short-answer grading agreement；
3. 最后验证 weak-topic diagnosis 与 reprioritization；
4. 只有全部 critical thresholds 通过，才进入 narrow MVP；
5. 如果 MCQ 通过而 short answer 不通过，可考虑 **MCQ-only limited prototype**，但它不满足当前已定义的 mixed-format Mock Exam MVP，必须作为产品范围变更重新决策；
6. 如果 grounding 通过但 weakness diagnosis 不通过，可以保留 post-exam question review，却不能自动输出确定 weak topics 或改写 study priority。

### 7.2 最难验证的一步

**H → I：Weak-topic diagnosis 与 reprioritization 最难验证。** 原因不是实现代码最复杂，而是它没有像 MCQ key 那样简单的单点真值，并且同时依赖题目有效性、topic mapping、sampling breadth、short-answer grading 与初始 priority。它必须通过 controlled profiles、专家 gold、abstention test 和 top-3 ranking agreement 联合验证。

G（short-answer grading）是最难做稳定的单个模型能力，但它至少可以通过大量 response bank 和人工评分 agreement 直接测量。

### 7.3 最重要的质量阈值摘要

- generated question grounding：**≥95% pooled，且每 course pack ≥90%**；
- answer/key/rubric grounding：**≥98%，0 个已知错误/冲突 key 进入计分**；
- ambiguous MCQ：**≤5% candidates，0 个已知 ambiguity 进入 final scored form**；
- weighted major-topic coverage：**≥90%**；
- short-answer AI-human quadratic weighted kappa：**≥0.80**，exact agreement **≥80%**，within-one **≥95%**；
- weak-topic precision：**≥0.90**，false weak-topic rate **≤10%**；
- reprioritization NDCG@3：**≥0.85**，invalid/provisional items 对 priority 的影响必须为 **0**。

### 7.4 最终决策语句

> **GO：** 建立内部 prototype 和 evaluation harness。  
> **NO-GO：** 在 critical thresholds 通过前启动正式 MVP 开发或对用户声称能够可靠诊断弱项。  
> **Conditional product GO：** 只有 holdout course packs、short-answer response bank、controlled weakness profiles 和小规模真实学生 timing pilot 全部达到本文门槛，才值得进入受限 course type 的正式 MVP。
