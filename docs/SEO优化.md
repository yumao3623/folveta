# Folveta SEO 优化

当前网站及既有 SEO 属于 **1.0**；本文件的后续待办属于 **2.0 阶段**。内容更新直接维护本文，外链进展维护 [外链清单](外链清单.md)。

## 现有基础

正式域名为 `https://folveta.com`。当前公共页面共 9 个，具体清单由 [站点配置](../lib/site.ts) 和 [sitemap](../app/sitemap.ts) 维护。

| 页面 | 主要目的与关键词归属 |
| --- | --- |
| `/` | 使用工具；独立承接 `Study Guide Maker`，承接同意图的 `study guide generator`、`study guide creator`；主词保持 `Study Guide Maker` |
| `/study-guide-maker-from-pdf` | PDF 任务页；`PDF to study guide`、`study guide maker from PDF` |
| `/how-to-make-a-study-guide` | 方法页；`how to make a study guide`、示例与复习清单 |
| `/pricing` | Folveta 价格、Free/Pro 功能与限额 |
| `/about` | 产品用途、来源核对与能力边界 |
| `/contact` | 支持与联系 |
| `/privacy` | 资料、账户与数据处理说明 |
| `/terms` | 服务条款 |
| `/refunds` | 退款说明 |

首页、PDF 页和方法页有不同搜索意图，不为近义词重复建页。当前 PDF 页与方法页已经存在，不再作为待建设页面。

## 技术规则

- 生产域名配置必须为 `https://folveta.com`；HTTP 与 `www` 的重定向需要在实际部署侧核对。
- 公共索引由 `PRELAUNCH` 控制：默认关闭索引；正式发布使用 `false`。Vercel 非 Production 环境始终按预发布处理。
- 可索引页面提供唯一标题、说明、H1、自指 canonical 和对应社交元数据。共享实现见 [lib/seo.ts](../lib/seo.ts)。
- 9 个公共页进入 sitemap；账户、搜索、学习指南、测验、结果、支付返回和 API 保持 noindex，私人内容同时依靠权限检查保护。
- 公共 HTML 保持可缓存；用户身份与额度单独请求私有接口，不进入共享 HTML。
- 404 返回真实 404 与 noindex。旧商品等无相关替代内容的地址不统一跳到首页。
- 结构化数据只表达页面真实可见内容；当前使用 WebSite/WebApplication、WebPage/AboutPage 和 BreadcrumbList 等，不编造评价或评分。
- 站点验证文件 [google14a276efa04bb12e.html](../public/google14a276efa04bb12e.html) 保留；素材、canonical 或 sitemap 改动后检查相应 URL。
- 保持首屏插画及时显示、图片尺寸预留和移动端可读性。实验室性能分数与真实用户 Core Web Vitals 分开判断。

## 内链组织

首页使用 `/#upload`；PDF 页已接入同一真实上传组件，以本页 `#upload` 为操作终点：

| 来源页面 | 适合的正文链接 |
| --- | --- |
| 首页 | PDF 任务页、制作方法、价格、示例指南 |
| PDF 页 | 制作方法、示例、价格、隐私、上传入口 |
| 制作方法页 | PDF 任务页、示例、上传入口 |
| 关于与价格页 | 对应任务页、方法页与上传入口 |
| 页尾 | 主要任务页、价格与信任页面 |

优先补充有上下文的正文链接，锚文字描述实际内容；页尾用于发现，不能代替正文中的任务路径。新增页面要有上游入口和下一步操作，避免孤立页面；不要为了数量给所有页面互相堆链。

2.0 首批改善保留现有 9 个公共页面，新增方法页的可引用段落：`#study-guide-template`（空白主题模板）、`#worked-example`（完成示例）、`#review-checklist`（复习清单）。PDF 页在核对来源的正文中链接模板与清单；首页明确标注演示指南入口，价格页的正文上传入口直达 `/#upload`。现有 About 正文链接已完整，不为数量添加重复链接。本地 HTTP 检查确认 9 个公共页面均可由首页到达，23 处站内片段引用均有对应锚点。

执行依据是 [Google 链接指南](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)：使用可抓取的真实链接、描述性锚文字与有帮助的上下文。GitHub 调研采用 [marketingskills 的站点组织指南](https://github.com/coreyhaines31/marketingskills/blob/main/skills/site-architecture/SKILL.md) 检查重要页面与孤页；外链与推广项目的筛选结果见 [外链清单](外链清单.md)。不采用固定链接密度、堆关键词或以第三方 DR 分数代替实际排名与访问数据的做法。

## 2.0 待办

- [x] 读取 GSC 当前可见 sitemap、概况、搜索效果与链接报告，保留报表延迟和样本量限制。
- [x] 检查首页、PDF 页和方法页的 Google 收录及 canonical 状态；结果见当前观测起点。
- [ ] 继续核对其余公共页与旧电商遗留地址；链接报告处理完成后读取引用域名。
- [x] 检查三类主要页面的关键词归属与正文内链，确认“方法 → PDF → 示例/上传”路径；补充可引用模板及相关正文入口。
- [ ] 根据真实查询改进标题、说明、FAQ 和有用的示例，不仅替换关键词。
- [ ] 核验并推进 [外链清单](外链清单.md) 中相关机会，记录实际提交和落地 URL。
- [ ] 若需要转化归因，先确定统计方案与隐私说明，再添加统计工具；当前不能声称已有完整访问到生成的归因数据。
- [ ] 有独立搜索意图与产品内容支撑后，再决定是否增加 PowerPoint 等页面；博客矩阵、模板库和批量程序化页面不是默认任务。

每周比较相同长度时间窗口的非品牌曝光、点击、主要页面表现、收录与实际引用域名。工作结果直接更新待办与必要基线，不建立逐日验收流水账。

## 当前观测（2026-09-22）

本次恢复 Git 记录和 Chrome 登录状态后重新检查；报表截止时间早于检查日，不能把四天内变化归因于 SEO 修改。

| 项目 | 9 月 18 日记录 | 9 月 22 日读取 |
| --- | --- | --- |
| GSC 索引 | 3 收录 / 38 未收录 | 7 收录 / 35 未收录；已收录首页、About、Terms、Pricing、Privacy、Refunds、方法页 |
| PDF 页 | 已发现未收录 | URL 检查仍为已发现未收录，尚无历史抓取时间；来源为 sitemap、首页、Privacy；本次实时测试可索引、检测到有效 Breadcrumb，已成功请求编入索引 |
| 未收录原因 | 多数旧电商 URL | noindex 1、404 1、已抓取未收录 31、已发现未收录 2；不能等同于现有 9 页全部失败 |
| sitemap | 成功，9 页 | 仍成功，最后读取 9 月 17 日、发现 9 页 |
| 近 3 个月效果 | 3 点击 / 13 曝光 / 15.6 平均排名，图表至 9 月 15 日 | 3 点击 / 17 曝光 / CTR 17.6% / 18.8 平均排名，图表至 9 月 19 日 |
| 最近 7 天 | 未记录 | 9 月 13–19 日：1 点击 / 5 曝光 / CTR 20% / 平均排名 23.6；不是完整最近四天窗口 |
| 可见查询 | voluta、volixta | volixta 2、voluta 2、wolfeta 1 次曝光，均无点击；没有可确认的目标学习词曝光 |
| Links | 数据处理中 | 仍处理中，导出不可用；不能据此声称零外链 |
| 人工处置 / 安全 | 旧记录正常 | 两份报告重新打开，均未检测到问题 |
| 真实用户 CWV | 无数据 | 移动、桌面仍无数据，INP 无法下结论 |
| Bing | 无已验证配置证据 | 当前账户首次添加并验证 Folveta；sitemap 已提交、正在处理，首页/PDF/方法页三个 URL 已提交成功 |

## 搜索意图与竞争研究

9 月 22 日 Chrome 实际 Google 搜索主词，传入英文/美国参数但浏览器跳转 Google 香港站，因此仅作本次可见 SERP 样本，不声称稳定美国排名。可见 Flint、RemNote、Penseum、Atlas、Scribe、Quizlet、QuillBot、NoteGPT 等结果；Web 搜索结果与 Google 排序不混用。没有 Semrush/Keyword Planner 账户数据，不编造 Google 搜索量、DR 或竞品自然流量。Bing 验证后已取得关键词工具真实数据，见下。

| 关键词族 | 搜索任务 | Folveta 页面决策 |
| --- | --- | --- |
| Study Guide Maker / generator / creator / create study guide / AI study guide | 立即使用工具 | 首页承接，不再建 `/study-guide-maker` 近义重复页 |
| PDF to Study Guide / study guide from PDF | 从文件生成、有格式及来源限制 | 保留已存在路径 `/study-guide-maker-from-pdf`，本次直接嵌入可用上传器 |
| Notes to Study Guide / Lecture Notes to Study Guide | 从笔记或课件生成 | 首页增加格式 FAQ 与场景入口；目前只有文件输入，无粘贴输入，不创建假装支持粘贴的独立页 |
| exam study guide / test study guide / study guide for exam | 组织考前复习，也可能寻找具体考试资料 | 首页复习场景、方法页清单；不自动生成学科/考试模板页 |
| practice test generator / mock exam generator | 从材料生成试卷、作答、计时与评分 | 当前只有五题 Quick Check，尚不能满足完整模拟考试意图；不建立承诺未上线功能的落地页 |

产品方向仍为 **Study Guide + Mock Exam Simulator**。当前代码与线上交付仅 Study Guide + 可选五题单选 Quick Check，没有完整计时、混合题型或自动更新学习优先级。此处区分产品方向与已实现能力，不能用 SEO 文案代替产品实现。

成熟工具站的可借鉴结构是“真实工具入口 + 输出示例 + 输入限制 + 场景与 FAQ + 相邻任务链接”，通过任务页获得工具型搜索，通过方法/模板内容解决学习问题，再自然导向工具。不能从可见页面结构推断其流量一定由某个因素造成。

- [RemNote](https://www.remnote.com/feature/study-guide-maker)：Study Guide Maker 标题、实际上传 CTA、结果示例、FAQ，以及 PDF/quiz/flashcard 等相邻工具内链。Folveta 本次采用直接工具入口和场景链接；不复制其比较页矩阵。
- [QuillBot](https://quillbot.com/ai-writing-tools/ai-study-guide-maker)、[NoteGPT](https://notegpt.io/ai-study-guide-maker)：可操作工具与输入模式、用法、FAQ 同页。Folveta 只描述已支持的文件模式。
- [Penseum](https://www.penseum.com/)：当前首页实际 H1 与搜索摘要并不完全相同；不要只照抄 SERP 标题。其功能、受众与资源链接说明站点结构比重复关键词更重要。
- [Studrix](https://studrix.com/en/practice-test-generator)、[PDFQuiz](https://pdfquiz.com/practice-test-maker)：试卷任务与纯学习指南不同。没有完整考试体验时不争抢该意图。
- 未取得可靠竞品反链/域名权威数据，也未验证竞品用户生成内容是否普遍允许索引。Folveta 用户材料及生成结果继续私有/noindex，不为 SEO 公开。

### Bing 关键词工具实测

2026-09-22 查询 `study guide maker`，国家/语言/设备均为“全部”，时间为 2026-06-22 至 09-19。工具标记指标为“印象数”：主词约 **1.1K**（美国约 1K）；相关词 `ai study guide maker` 272、`free study guide maker` 68、`study guide creator` 37、`create a study guide` 48、`make a study guide` 56。它们是 Bing 三个月口径，不是 Folveta 自身曝光、Google 月搜索量或可直接相加的流量预测。该样本支持保留 Study Guide Maker 主词及免费额度说明，不支持将主词替换为 AI 前缀或批量创建近义页。

## 本次采用的成熟实现

- [Next.js Metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) 与 [sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)：保留原生 SSR 元数据，共用公共路径清单；添加真实内容变更日期，不使用每次构建时间，去掉 Google 不使用的 priority/changeFrequency。依据 [Google lastmod 说明](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)。
- [google/schema-dts](https://github.com/google/schema-dts)：采用 2.0.0 开发依赖，为共享 JSON-LD、首页 graph 和页面 schema 提供静态类型，不增加客户端运行时代码。9 月 22 日 GitHub 核验最近推送 9 月 1 日、未归档，公开 issue 主要为类型/文档问题。
- [WebApplication](https://schema.org/WebApplication) 是 SoftwareApplication 的更具体子类型，适合浏览器学习工具。本次补充浏览器要求与真实 Free Offer，不重复声明两个应用实体、不添加虚构评价。Google [软件应用富结果](https://developers.google.com/search/docs/appearance/structured-data/software-app) 的评价/评分资格与 schema 语义有效性不同；没有真实评价就不保证富结果。FAQ 保留可见内容，不添加只面向特定权威健康/政府网站的 FAQ 富结果标记。
- [Ahrefs SaaS SEO](https://ahrefs.com/blog/saas-seo/) 的工具任务意图、[Google 内链指南](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)：落地为 PDF 真正上传入口，首页 PDF/笔记/复习三条正文路径，以及 9 页可达、23 个锚点和图片 alt 的响应检查。
- GitHub 已检查 next-seo、next-sitemap、Lighthouse CI、lychee 及 programmatic SEO 示例；现有原生 Metadata/sitemap 与小型响应检查已覆盖需要，不重复装库。没有独立数据或足够差异支持程序化扩页，按 [Google 垃圾政策](https://developers.google.com/search/docs/essentials/spam-policies) 与 [Semrush pSEO](https://www.semrush.com/blog/programmatic-seo/) 的页面价值要求不批量生成。

最大缺口是目标查询曝光与可信推荐仍少、PDF 页尚未被抓取、完整 Mock Exam 体验尚未交付；不是 schema 数量不足。优先改善真实入口和可引用示例，等待实际查询和反馈决定下一批页面。

## 本次验证与发布

功能提交 `e4cfa3a` 已推送 main，对应 [Vercel 部署](https://vercel.com/creen-ai/folveta/CWu934bLpuUNbV4Z5o2g6yudq4Qv) 成功；生产响应确认新首页、PDF 上传入口、Bing meta 和 sitemap 的真实 lastmod 已生效。

- `npm run check`：lint、typecheck、253 项单元测试、3 项 Workflow 测试与 production build 通过；11 项环境依赖测试跳过。
- 浏览器：35 项通过、3 项按设备跳过；包括首页/PDF 上传器身份请求失败后的恢复。Chrome 生产 390px 视口宽度与文档宽度同为 390，控件启用、无横向溢出；修正 PDF 上传锚点滚动间距，避免固定导航遮挡标题。
- 本地和线上 `test:seo:responses` 通过：9 页 SSR HTML 元数据、canonical、OG/Twitter、私有响应隔离、404、尾斜杠、robots、sitemap、9 页可达、23 个锚点、图片 alt、推广参数 canonical。
- HTTP→HTTPS、www→非 www 均为 308；HTTP www 经两跳到正式域名；社交图像端点均 200 image/png。RSC 不影响这些公共页直接返回的可见标题/正文与 JSON-LD；未发现 hydration 错误。
- Schema Validator 实际抓取新首页，WebPage 嵌套 WebSite/WebApplication/Free Offer，**0 错误、0 警告**；不据此声称具备 Google 软件应用评分富结果资格。
- [PageSpeed 本次报告](https://pagespeed.web.dev/analysis/https-folveta-com/oulsnkhzzp?form_factor=mobile)：9 月 22 日 16:20，移动性能 **97** / LCP **2.3s** / CLS **0** / TBT **10ms**；桌面性能 **92** / LCP **0.4s** / CLS **0** / TBT **0ms**；两端无障碍、最佳实践、SEO 均 **100**。桌面 Speed Index 3.3s 拉低实验室分数；不是 CWV 失败，真实用户 INP/CWV 仍无数据。不追逐单次满分而改动稳定产品逻辑。
- Bing sitemap 进入处理队列，三个 URL 有实际提交记录；Bing 搜索性能提示准备数据、48 小时后查看；GSC PDF 页实时测试通过；首页和 PDF 页的重新索引请求均成功进入优先队列，收录/更新尚待 Google 决定。

## 修改后的检查

先运行 `npm run check`。检查公开索引模式时，使用以下独立本地构建；变量仅作用于当前命令，不修改环境文件，也不会发布网站。

```bash
PRELAUNCH=false VERCEL_ENV=production NEXT_PUBLIC_SITE_URL=https://folveta.com npm run build
PRELAUNCH=false VERCEL_ENV=production NEXT_PUBLIC_SITE_URL=https://folveta.com npm run start -- --hostname 127.0.0.1 --port 3122
```

在另一个终端执行：

```bash
npm run test:seo:responses
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3122 npm run test:browser
```

响应检查覆盖 9 页元数据、公共缓存隔离、私有 API、404、重定向、sitemap、robots、内链可达性、锚点、图片 alt 与推广参数 canonical；浏览器检查覆盖真实渲染与既有演示交互。发布后可只读检查线上响应：

```bash
SEO_BASE_URL=https://folveta.com npm run test:seo:responses
```

公开构建与本地开发不要同时共用 `.next` 写入。检查完成后停止对应服务；实际收录、外链和转化仍需各自数据验证。
