# SEO Audit

> Status: **Historical snapshot from 2026-08-24.** Many MISSING items in this report were implemented on 2026-08-25. Use `docs/current-state-audit.md` and `docs/seo-architecture.md` for current v5 state; retain this file as audit history.

审查对象：`study-guide-maker` 当前项目工作区。

审查依据：当前代码、Next.js 生产构建产物、`127.0.0.1:3010` 实际响应、浏览器渲染结果，以及项目内的 SEO/产品规范文档。本文不是通用 SEO checklist，而是本次对当前项目的实际审查记录。

审查日期：2026-08-24

## Status Legend

- `VERIFIED`：已在当前代码或实际运行结果中确认。
- `PARTIAL`：已有部分实现，但未满足目标或仍缺关键验证。
- `MISSING`：当前代码中未发现实现，或实际端点确认不存在。
- `PRODUCTION-ONLY`：本地无法确认，必须使用生产域名、HTTPS、真实搜索流量或部署环境验证。

## Executive Summary

当前项目的产品结构和工程基础稳定，但尚未达到完整 SEO 上线标准。

- 首页已经是明确的 Study Guide Maker 工具/落地页，核心关键词和产品方向与项目规范一致。
- 基础页面语义、唯一 H1、上传 CTA、示例入口、静态首页渲染已实现。
- `npm run build`、`npm run lint`、`npm run typecheck` 和 `npm test` 均通过。
- 375px 移动端检查没有横向溢出，浏览器控制台没有 warning/error。
- SEO 基建仍缺少 `robots.txt`、`sitemap.xml`、canonical、Open Graph/Twitter metadata、structured data 和站点监测。
- 首页内容偏薄，缺少完整的信任页面、FAQ、功能解释、隐私/保留策略和更丰富的内部链接。
- 生产域名、HTTPS、www 规范、真实 Core Web Vitals、Google 抓取和实际排名尚未验证。

## VERIFIED

### Project and Build Health

- `next build` 成功，当前 Next.js 路由包括 `/`、`/study/demo`、动态 `/study/[sessionId]` 以及 API 路由。
- `npm run lint` 成功，无 ESLint 输出错误。
- `npm run typecheck` 成功，无 TypeScript 错误。
- `npm test` 成功：2 个测试文件、8 个测试全部通过。
- 首页和示例页在本地生产服务器返回 `200 text/html`。
- 不存在的会话路径 `/study/nonexistent` 返回 `404`。

### Landing Page Structure

文件：[app/page.tsx](../../app/page.tsx)

- 首页有一个唯一 H1：`Turn course materials into a clear study guide.`（第 15 行）。
- 首页有 H2：`Add your materials`（第 25 行）。
- 首页明确说明输入类型：text-based PDF 和 PowerPoint/PPTX（第 16、31 行）。
- 首页有主 CTA `Make my study guide` 和次级入口 `See example guide`（第 18-19 行）。
- 首页有 `Upload → Parse → Structured Study Guide` 流程和 source-grounded 信任文案（第 21 行）。
- 首页展示文件数量、单文件大小、总页数/幻灯片数限制（第 27-31 行）。
- 首页有一个 `<nav>`，并链接到 `/study/demo`（第 8-10 行）。
- 页面未使用图片，因此本次首页图片 Alt 检查没有发现缺失 Alt 的图片。

### Responsive and Runtime Checks

- 在本地 `375x812` 视口检查：首页 `document.documentElement.scrollWidth` 小于视口宽度，没有横向溢出。
- 移动端首页 H1 和上传区域均在视口内，没有检测到结构性遮挡。
- 浏览器控制台没有 warning/error。

## PARTIAL

### SEO Intent and Product Fit

文件：[docs/product-context.md](../product-context.md)、[docs/archive/mvp-ux-spec.md](mvp-ux-spec.md)、[app/page.tsx](../../app/page.tsx)

- `study guide maker` 已被确定为核心关键词，见 `docs/product-context.md` 第 3-5 行。
- 首页页面形态正确：用户可以直接上传课程资料并生成学习指南，属于工具/交易型落地页。
- H1 和 CTA 基本符合产品意图，但没有完整落实 UX 规范中指定的 SEO title、H1 文案、subhead 和完整流程文案。规范见 `docs/archive/mvp-ux-spec.md` 第 125-132 行。
- 当前首页正文约 95 个英文词，包含品牌、短说明、CTA、上传限制和流程提示；对于竞争性 `study guide maker` SERP，内容深度不足。
- 首页已有 source-grounded 价值主张，但缺少可验证的产品信任信息、隐私/数据保留说明、About、Terms、Privacy、Contact 等页面。

### On-page SEO

已实现：

- 唯一 H1。
- H2 页面骨架。
- 关键词相关的产品名称和页面价值说明。
- 清晰的首屏 CTA 和支持格式说明。

尚不完整：

- H1 当前为 `Turn course materials into a clear study guide.`，与规范建议的 `Turn Your Course Materials Into a Clear Study Guide` 接近但不完全一致。
- 页面缺少完整的 H2/H3 内容模块，例如 How it works、输出内容、适用场景、FAQ、隐私与来源边界。
- 首段没有充分覆盖核心关键词的自然变体，例如 AI study guide maker、study guide from notes/PDFs/slides。
- 现有内部链接很少，仅有首页到示例页的链接和页面内 `#upload` CTA。
- 没有 footer 导航或信任页入口。

### Index / Noindex Control

- 访问不存在会话时，Next.js `404` 页面实际包含 `<meta name="robots" content="noindex"/>`，这对错误页面是正确行为。
- 有效的 `/study/demo` 页面没有显式 `noindex`，只继承根布局 metadata；当前没有确认它应作为公开 SEO 页面参与排名。
- 有效的 `/study/[sessionId]` 页面没有显式 `noindex`。虽然页面通过 `requireOwnedSession` 限制访问，未授权访问会走 `notFound()`，但有效私人会话仍应显式设置 `noindex, nofollow`。
- 因此 index/noindex 控制属于 `PARTIAL`：错误页表现正确，公开/私人页面策略没有被代码明确表达。

### Production Metadata Baseline

根布局文件：[app/layout.tsx](../../app/layout.tsx)

- 当前 title：`Study Guide Maker`，17 个字符（第 16 行）。
- 当前 description：`Turn text-based PDFs and PowerPoint slides into a clear, source-grounded study guide.`，约 85 个字符（第 17-18 行）。
- `<html lang="en">` 已设置（第 23-25 行）。
- metadata 使用 Next.js `Metadata` 类型，基础实现正确。
- 但当前 title 没有使用项目规范建议的 `AI Study Guide Maker from Notes, PDFs, and Slides`。
- 当前 description 过短，尚未充分表达用户任务、支持输入、结果收益和 CTA。

## MISSING

### SEO Infrastructure

本地生产服务器实际检查结果：

| Endpoint | Result |
| --- | --- |
| `/robots.txt` | `404` |
| `/sitemap.xml` | `404` |
| `/` | `200 text/html` |
| `/study/demo` | `200 text/html` |
| `/study/nonexistent` | `404 text/html` |

当前 `app/` 目录没有发现 `robots.ts`、`robots.js`、`robots.txt`、`sitemap.ts`、`sitemap.js` 或 `sitemap.xml`。

### Canonical

- 首页实际 DOM 没有 `<link rel="canonical">`。
- `/study/demo` 实际 DOM 没有 canonical。
- 根 metadata 没有 `metadataBase` 或 `alternates.canonical`。
- 生产域名尚未配置，因此 canonical 不能在当前本地环境中推导。

### Social Metadata

- 首页实际没有 `og:*` metadata。
- 首页实际没有 `twitter:*` metadata。
- 没有发现 Open Graph 图片或社交分享卡片配置。

### Structured Data

- 首页和 `/study/demo` 实际 DOM 中 JSON-LD 数量均为 0。
- 当前没有 `WebApplication`、`SoftwareApplication`、`BreadcrumbList`、`FAQPage` 或 `Article` JSON-LD。
- 不应在没有真实 FAQ 内容时虚构 FAQ Schema；首页若补充真实 FAQ，可再添加对应结构化数据。

### Trust Pages and E-E-A-T Signals

当前项目中没有发现用于公开 SEO 的：

- About 页面。
- Privacy 页面。
- Terms 页面。
- Contact/Support 页面。
- 产品团队/公司/作者信息。
- 文件处理、数据保留和删除策略的公开页面。
- 可验证的示例、用户证明或产品使用边界页面。

### Monitoring

当前代码和环境配置中没有发现：

- Google Search Console 验证或 sitemap 提交配置。
- GA4 或其他访问分析配置。
- 上传、上传完成、指南生成等转化事件。
- Core Web Vitals 真实用户监测。
- 抓取错误或 Googlebot 日志监测。

## PRODUCTION-ONLY

以下事项不能由当前本地项目可靠确认，必须部署到真实生产域名后检查：

- HTTPS 是否有效，以及 HTTP 是否全部 301 到 HTTPS。
- `www` 与非 `www` 是否只保留一个规范主机名。
- 尾斜杠策略是否统一。
- canonical 是否指向生产绝对 URL，是否存在 canonical loop 或指向错误域名。
- 生产 `robots.txt` 是否允许公开页面、禁止私人会话/API，并包含正确 sitemap 地址。
- 生产 `sitemap.xml` 是否只包含公开、可索引、返回 200 的 canonical URL。
- Googlebot/Bingbot 的实际抓取、服务器错误、4xx/5xx 比例和 crawl budget。
- PageSpeed Insights 的移动端/桌面端 Lighthouse 数据。
- 真实用户 Core Web Vitals：LCP、CLS、INP、TTFB。
- Google Search Console 的索引覆盖、URL Inspection、搜索查询、展示、点击、CTR 和平均排名。
- 页面是否真正进入 Google 索引，以及 title/description 是否被 Google 改写。
- GA4/Clarity 真实用户行为、上传漏斗、滚动深度和流失位置。

## Audit Against 2.1 / 2.2 / 2.3 / 3.2

### 2.1 SEO 基建

- `PARTIAL`：metadata 基础、英文 lang、页面状态码和静态首页已存在。
- `MISSING`：robots、sitemap、canonical、structured data、GSC、GA4、公开 trust pages。
- `PRODUCTION-ONLY`：HTTPS、生产主机规范、真实 crawl logs、真实 CWV。

### 2.2 On-page SEO 执行逻辑

- `PARTIAL`：页面类型和工具型搜索意图匹配；已有主关键词方向、H1、H2、CTA 和基本页面骨架。
- `MISSING`：按 SERP 逐页对比后的完整内容模块、足够的信息增量、丰富内链、FAQ、发布后检查内容。
- `PARTIAL`：TDK 已有基础值，但没有按项目规范完成关键词和收益导向的 title/description。

### 2.3 Technical SEO 自查

- `VERIFIED`：生产构建成功、lint/typecheck/test 通过；首页/示例页 200；不存在会话 404；移动端无横向溢出；控制台无错误。
- `PARTIAL`：访问控制使无效私人会话返回 404，但有效私人会话没有显式 noindex；URL 结构简单，但生产规范未配置。
- `MISSING`：robots、sitemap、canonical、Schema、hreflang、多语言路由、GSC 抓取监控。
- `PRODUCTION-ONLY`：真实性能、状态码分布、重定向、CDN 缓存、Googlebot 抓取和 CWV。

### 3.2 SEO 内容创作

- `PARTIAL`：首页正确匹配“用户上传资料并生成学习指南”的产品/交易意图。
- `PARTIAL`：页面已经解释支持的文件、生成结果和上传流程，但内容量明显不足以覆盖竞争 SERP 常见的流程、功能、信任和 FAQ 模块。
- `MISSING`：以搜索意图为依据的公开内容集群、独立功能/用例落地页、FAQ 内容、作者/经验/来源说明。

## Recommended Next Actions

按风险和收益排序：

1. 确定唯一生产域名，并增加 `SITE_URL`/`metadataBase` 方案。
2. 完成首页 title、description、canonical、Open Graph/Twitter metadata。
3. 添加 `app/robots.ts` 和 `app/sitemap.ts`，只收录公开规范页面。
4. 对有效 `/study/[sessionId]` 明确设置 `noindex, nofollow`；决定 `/study/demo` 是公开 SEO 页面还是 `noindex` 示例页。
5. 扩充首页内容：How it works、支持格式、结果结构、source-grounded 说明、隐私、FAQ、适用人群和真实示例。
6. 添加 About、Privacy、Terms、Contact/Support 等信任页面并从 footer 链接。
7. 添加真实的 `WebApplication`/`SoftwareApplication` JSON-LD；只有页面存在真实 FAQ 时才添加 FAQ Schema。
8. 接入 GSC、GA4 事件和真实用户性能监测。
9. 部署后运行 PageSpeed Insights、Rich Results Test、Schema Markup Validator 和 Screaming Frog，再提交 sitemap。

## SEO Tools and Websites

当前项目规模的最小工具组合：

- [Google Search Console](https://search.google.com/search-console/)：sitemap、URL Inspection、索引覆盖、查询、展示、点击、CTR、排名。
- [PageSpeed Insights](https://pagespeed.web.dev/)：移动端/桌面端 Lighthouse 和 Core Web Vitals。
- [Rich Results Test](https://search.google.com/test/rich-results)：Google 结构化数据测试。
- [Schema Markup Validator](https://validator.schema.org/)：通用 Schema 语法验证。
- [Google Analytics 4](https://analytics.google.com/)：访问来源、上传漏斗和生成转化。
- [Screaming Frog SEO Spider](https://www.screamingfrog.co.uk/seo-spider/)：状态码、标题、描述、canonical、robots、重复页和断链；免费版单次 500 URL。
- [Google Search](https://www.google.com/)：逐个关键词检查前十名页面类型、结构和内容模块。

关键词研究可选：

- [Google Keyword Planner](https://ads.google.com/home/tools/keyword-planner/)：关键词建议、搜索量估算和地区数据。
- [Google Trends](https://trends.google.com/trends/)：趋势和季节性。
- Ahrefs 或 Semrush 二选一：关键词难度、SERP、竞品、外链和排名跟踪。

行为和补充监测可选：

- [Bing Webmaster Tools](https://www.bing.com/webmasters/about)：Bing 收录、关键词和 Site Scan。
- [Microsoft Clarity](https://clarity.microsoft.com/)：热图、滚动深度和会话录像。
- Vercel Speed Insights：部署到 Vercel 后辅助观察真实页面性能。

## Verification Commands Used

本次审查执行并通过：

```text
npm run build
npm run lint
npm run typecheck
npm test
```

本地生产服务器端点检查：

```text
http://127.0.0.1:3010/
http://127.0.0.1:3010/study/demo
http://127.0.0.1:3010/study/nonexistent
http://127.0.0.1:3010/robots.txt
http://127.0.0.1:3010/sitemap.xml
```
