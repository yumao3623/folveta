# Folveta 仓库结构治理

Status: **Current repository structure policy**  
Baseline date: 2026-09-11

## 结构原则

Folveta 使用单一 Next.js App Router 应用，不拆分成多个前端、独立 Express 服务或重复的 AI 子项目。产品代码按职责放在 `app`、`components`、`lib`、`supabase` 和 `tests`；产品决策、架构说明和历史材料放在 `docs`。

## 根目录允许保留的文件

这些文件是工具的默认入口，不应为了“看起来更整齐”搬进自定义目录：

| 文件 | 责任 |
| --- | --- |
| `package.json`、`package-lock.json` | npm 脚本和依赖锁定 |
| `next.config.ts`、`tsconfig.json`、`postcss.config.mjs` | Next.js、TypeScript、Tailwind 构建入口 |
| `eslint.config.mjs` | ESLint 入口 |
| `vitest.config.mts`、`vitest.workflow.config.mts` | 普通测试和 Workflow 测试入口 |
| `playwright.config.ts` | 浏览器测试入口；Playwright 默认从项目根目录发现它 |
| `vercel.json` | Vercel Cron 配置 |
| `supabase/config.toml` | Supabase CLI 配置 |
| `AGENTS.md`、`CLAUDE.md` | 编码代理约束；`CLAUDE.md` 是兼容指针 |
| `README.md`、`.env.example`、`.gitignore` | 开发入口、环境模板和 Git 规则 |

## 源码目录职责

```text
app/          页面、布局、Route Handler、Workflow 入口
components/   页面展示和浏览器交互组件
lib/          领域逻辑；按 ai、billing、schemas、server、fixtures 分组
public/       浏览器公开资源、品牌资源和 Search Console 验证文件
scripts/      明确命名的 E2E、fixture、数据库辅助脚本
supabase/     有序 migration 和 Supabase CLI 配置
tests/        unit、contract、integration、live、browser 和 fixtures
types/        第三方包缺失的 TypeScript 声明
docs/         current 产品/架构/运维文档、research 和 archive
```

## 已完成的归并和保留规则

- V2 生成逻辑集中在 `lib/ai/generation-v2*.ts`；不要再新建第二套 V2 provider、schema 或 runtime。
- V2 Guide 阅读集中在 `components/v2-guide-workspace.tsx`；V1 阅读保留在 `components/guide-workspace.tsx`，用于历史 Guide 兼容，不视为重复实现。
- Quick Check 领域逻辑集中在 `lib/ai/quick-check.ts` 和 `lib/server/quick-check-guide.ts`；页面只负责组合展示。
- 真实 Demo fixture 位于 `lib/fixtures/`；测试输入文件位于 `tests/fixtures/`，两者不合并。
- `docs/product/` 只放当前产品边界、决策、路线图和发布基线；`docs/architecture/` 只放当前系统契约；旧审计、旧方案和旧实现报告保留在 `docs/archive/` 或标记为 historical snapshot。
- `scripts/e2e/` 中需要 `.env.local` 的脚本只允许在隔离环境执行，不把 Secret 写入脚本、日志或文档。

## 不做的结构重构

- 不引入 monorepo、第二个应用或独立后端服务。
- 不把 Next.js 约定配置移入 `config/`，避免破坏工具默认发现和构建行为。
- 不删除仍被页面、测试、迁移或文档引用的 fixture、兼容组件或历史记录。
- 不修改历史 migration；数据库变更只追加新 migration。

## 可再生文件

`.next/`、`.swc/`、`.workflow-data/`、`.workflow-vitest/`、`test-results/` 和 `tsconfig.tsbuildinfo` 都是本地构建或测试产物，必须保持 Git ignored。它们可以安全删除并由对应命令重新生成，不属于发布源码。
