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

## 2.0 待办

- [ ] 复查 GSC 的最新 sitemap、覆盖率、Google 选择的 canonical、非品牌词和页面曝光，区分旧域名遗留地址与现有内容。
- [ ] 检查三类主要页面的关键词归属与正文内链，确认“方法 → PDF → 示例/上传”的完整路径。
- [ ] 根据真实查询改进标题、说明、FAQ 和有用的示例，不仅替换关键词。
- [ ] 核验并推进 [外链清单](外链清单.md) 中相关机会，记录实际提交和落地 URL。
- [ ] 若需要转化归因，先确定统计方案与隐私说明，再添加统计工具；当前不能声称已有完整访问到生成的归因数据。
- [ ] 有独立搜索意图与产品内容支撑后，再决定是否增加 PowerPoint 等页面；博客矩阵、模板库和批量程序化页面不是默认任务。

每周比较相同长度时间窗口的非品牌曝光、点击、主要页面表现、收录与实际引用域名。工作结果直接更新待办与必要基线，不建立逐日验收流水账。

## 接手时的观测起点

以下仅从整理前仓库的 2026-09-17/18 记录压缩保留，**本次清理未登录 GSC 或复测线上性能**。下次开展 SEO 时刷新这组数据，不把它当作实时状态。

| 项目 | 上次记录与含义 |
| --- | --- |
| GSC sitemap | 9 月 18 日查看成功，最后读取为 9 月 17 日，发现 9 页 |
| 索引覆盖 | 报表仍截至 9 月 14 日：3 页已收录、38 个排除项，大部分为旧电商地址；不是现有 9 页全部的失败数 |
| 索引请求 | Terms、PDF、方法页于 9 月 17 日提交成功；提交成功不代表已经收录 |
| 人工处置与安全 | 上次查看没有发现问题 |
| 实验室性能 | 9 月 18 日记录：移动端性能 99、LCP 2.1 秒、CLS 0；桌面性能 100。见 [PageSpeed 报告](https://pagespeed.web.dev/analysis/https-folveta-com/i8t7uw78vb?form_factor=mobile) |
| 真实用户性能 | 当时 GSC/CrUX 数据不足，不能认定通过或失败 |

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
