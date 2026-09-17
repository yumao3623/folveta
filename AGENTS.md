# 仓库维护约定

- 先读 `README.md` 和本次任务相关的 `docs/` 文档。
- 当前网站基线为 1.0；后续内链、外链、内容和 SEO 优化归入 2.0 阶段。旧阶段编号不再指挥开发。
- 仓库说明使用简洁中文；网站面向用户的英文、代码标识、协议字段和第三方许可原文按原用途保留。
- 直接更新当前文档，避免新增逐次验收报告、历史归档、重复计划或清理日志。历史通过 Git 查询。
- `generation-v2` 等内部名称、数据库迁移文件名及数据结构版本不是网站版本号，不因整理文档而改写。
- 保留有序数据库迁移、有效测试与夹具、素材源文件及许可证；删除文件前核实静态和动态引用。
- 不把本地测试、旧验收记录或版本命名当作当前线上服务验证。发布状态需对应实际提交和检查结果。
- 配置说明见 `.env.example`；不要提交或输出真实密钥。应用、数据库、支付和部署行为的变更按具体任务范围处理。
- 修改功能前阅读本机 `node_modules/next/dist/docs/` 对应指南；按改动范围执行测试，提交前运行 `npm run check`。

以下 Next.js 英文说明由框架维护，保留原文以避免启动时重复生成差异。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
