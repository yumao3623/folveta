# 仓库维护约定

- 先读 `README.md`、`docs/项目状态.md`（含 Codex 交接）、`docs/路线图.md` 和本次任务相关文档。
- 1.0 是冻结历史；正式版本、开发目标与部署证据以 `docs/项目状态.md` 为准。遵循 `docs/版本基线.md` 的 MAJOR.MINOR.PATCH 规则，不按聊天、任务或外部审核次数升级。
- 仓库说明使用简洁中文；网站面向用户的英文、代码标识、协议字段和第三方许可原文按原用途保留。
- 直接更新当前文档，避免新增逐次验收报告、历史归档、重复计划或清理日志。历史通过 Git 查询。
- `generation-v2` 等内部名称、数据库迁移文件名及数据结构版本不是网站版本号，不因整理文档而改写。
- 保留有序数据库迁移、有效测试与夹具、素材源文件及许可证；删除文件前核实静态和动态引用。
- 不把本地测试、旧验收记录或版本命名当作当前线上服务验证。发布状态需对应实际提交和检查结果。
- 配置说明见 `.env.example`；不要提交或输出真实密钥。应用、数据库、支付和部署行为的变更按具体任务范围处理。
- 修改功能前阅读本机 `node_modules/next/dist/docs/` 对应指南；按改动范围执行测试，提交前运行 `npm run check`。

## 长期维护与每次任务结束报告

- 开始时核对 Git 工作区、当前交接和任务范围；先接续已做的工作，不重新提交已有目录，不把旧分支当作新的产品阶段。
- 分开记录产品开发、修复、SEO/Growth、运维、外部等待；只将已完成并验证的交付写入 `CHANGELOG.md`。计划维护在路线图，当前进度只维护在项目状态。
- 结束前更新当前状态与简短交接；范围或完成标准改变时更新路线图。软件发布同步 package/lock 版本，生产验证成功后建立不可移动的 `vX.Y.Z` 标签；文档、平台操作及纯等待不单独升级软件版本。
- 每次最终回复必须包含：①稳定/开发版本；②实际完成内容，区分代码、线上、平台、本地验证、外部等待；③剩余可做/等待/真正阻塞/暂不值得；④明确当前里程碑完成或剩余核心事项；⑤下一版本或同版本的具体下一项；⑥明确建议继续当前对话或新建对话并说明原因；⑦给出可以直接复制的下一条完整指令。
- 同一问题、版本内连续操作或浏览器链继续当前对话；已完成里程碑、独立目标或上下文过长时建议新建。建议新建前必须完成仓库交接；不要擅自创建任务。
- 路线图只保留未来 2～4 个有根据的里程碑，可随真实反馈调整；不为填满版本号制造任务。
- 用户已要求忽略 ChatGPT 浏览器扩展升级；不要反复排查或把升级列为阻塞。真正遇到某项操作能力限制时先尝试现有可用方式。

以下 Next.js 英文说明由框架维护，保留原文以避免启动时重复生成差异。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
