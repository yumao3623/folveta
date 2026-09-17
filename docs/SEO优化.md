# Folveta SEO 优化

当前网站及既有 SEO 属于 **1.0**；本文件的后续待办属于 **2.0 阶段**。内容更新直接维护本文，外链进展维护 [外链清单](外链清单.md)。

## 现有基础

正式域名为 `https://folveta.com`。当前公共页面共 9 个，具体清单由 [站点配置](../lib/site.ts) 和 [sitemap](../app/sitemap.ts) 维护。

| 页面 | 主要目的与关键词归属 |
| --- | --- |
| `/` | 使用工具；独立承接 `Study Guide Maker`，支持 `study guide generator`、`AI study guide maker` |
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

现有路径以首页上传入口 `/#upload` 为主要操作终点：

| 来源页面 | 适合的正文链接 |
| --- | --- |
| 首页 | PDF 任务页、制作方法、价格、示例指南 |
| PDF 页 | 制作方法、示例、价格、隐私、上传入口 |
| 制作方法页 | PDF 任务页、示例、上传入口 |
| 关于与价格页 | 对应任务页、方法页与上传入口 |
| 页尾 | 主要任务页、价格与信任页面 |

优先补充有上下文的正文链接，锚文字描述实际内容；页尾用于发现，不能代替正文中的任务路径。新增页面要有上游入口和下一步操作，避免孤立页面；不要为了数量给所有页面互相堆链。

2.0 首批改善保留现有 9 个公共页面，新增方法页的可引用段落：`#study-guide-template`（空白主题模板）、`#worked-example`（完成示例）、`#review-checklist`（复习清单）。PDF 页在核对来源的正文中链接模板与清单；首页明确标注演示指南入口，价格页的正文上传入口直达 `/#upload`。现有 About 正文链接已完整，不为数量添加重复链接。本地 HTTP 检查确认 9 个公共页面均可由首页到达，20 处站内片段引用均有对应锚点。

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

## 当前观测起点

2026-09-18 本次通过已登录的 Chrome 读取 GSC。以下区分当前读取、报表本身的数据时间和未复测的旧记录；这些数值不是本次优化带来的增长。

| 项目 | 上次记录与含义 |
| --- | --- |
| GSC sitemap | 本次读取：成功，最后读取 9 月 17 日，发现 9 页；未重复提交已有成功的 sitemap |
| 索引概况 | 本次概述仍显示 3 页已收录、38 页未收录；未逐项复查。旧记录截至 9 月 14 日且多数为旧电商地址，不能当作现有 9 页全部失败 |
| 首页 URL 检查 | 已收录；用户声明与 Google 选择的 canonical 均为 `https://folveta.com/`。Google 显示上次抓取 9 月 3 日 04:12:34，来源仍有旧电商 URL，因此不是当前页面内容的最新抓取证明 |
| PDF 页 URL 检查 | 已发现、尚未编入索引；发现自 sitemap 和首页，尚无抓取时间，Google canonical 不适用 |
| 方法页 URL 检查 | 已抓取、尚未编入索引；Googlebot 智能手机版于 9 月 17 日 23:30:18 抓取成功，允许抓取，Google canonical 不适用。该记录早于本次内容更新 |
| 搜索效果 | 本次读取默认近 3 个月：3 次点击、13 次曝光、CTR 23.1%、平均排名 15.6；图表显示数据范围 8 月 30 日至 9 月 15 日。样本太少，不能作为稳定排名结论 |
| 可见查询 | `voluta` 2 次曝光、`volixta` 1 次曝光，均 0 点击；未观察到足以指导改写页面的学习工具非品牌词，不围绕这些无关词优化 |
| 外部链接 | 本次报告提示“正在处理数据，请过 1 天左右再来查看”，导出不可用；这是暂无报告，不等于零反链 |
| 索引请求 | 旧记录：Terms、PDF、方法页于 9 月 17 日提交成功；本次未重复申请，提交成功不代表已经收录 |
| 人工处置与安全 | 旧记录未发现问题；本次未刷新这两份报告 |
| 实验室性能 | 旧记录：移动端性能 99、LCP 2.1 秒、CLS 0；桌面性能 100，本次未重跑。见 [PageSpeed 报告](https://pagespeed.web.dev/analysis/https-folveta-com/i8t7uw78vb?form_factor=mobile) |
| 真实用户性能 | 本次概况移动和桌面核心网页指标均显示无数据，不能认定通过或失败 |
| 线上响应 | 本次 `SEO_BASE_URL=https://folveta.com npm run test:seo:responses` 通过：9 个公共页、元数据、缓存隔离、私有 API、404、重定向、sitemap 与 robots |

本批页面改动在提交 `b2703d5` 发布，已核对远程 main、对应 Vercel 成功状态与线上新内容。`npm run check`（253 项单元测试、3 项 Workflow 测试）、33 项浏览器测试及独立公开构建 SEO 检查通过；11 项需额外环境的测试和 3 项按设备跳过的浏览器测试不计作通过。Chrome 实测 PDF 正文链接可到达模板片段；这些检查不代表已被 Google 重新抓取或收录。

入口：[GSC sitemap](https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2Ffolveta.com%2F)、[索引覆盖](https://search.google.com/search-console/index?resource_id=https%3A%2F%2Ffolveta.com%2F)。

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

响应检查覆盖 9 页元数据、公共缓存隔离、私有 API、404、重定向、sitemap 和 robots；浏览器检查覆盖真实渲染与既有演示交互。发布后可只读检查线上响应：

```bash
SEO_BASE_URL=https://folveta.com npm run test:seo:responses
```

公开构建与本地开发不要同时共用 `.next` 写入。检查完成后停止对应服务；实际收录、外链和转化仍需各自数据验证。
