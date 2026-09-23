# Folveta 仓库维护规则

这些规则适用于进入本仓库的每个 Codex 对话。它们是长期项目流程，不随聊天、模型、compaction、版本或部署状态失效。

## 开始任何任务前

按以下顺序读取并核对：

1. `README.md`
2. 本文件
3. `docs/项目状态.md`：当前版本、生产证据、产品/SEO/部署事实与问题分类
4. `docs/路线图.md`：未来里程碑、范围和完成标准
5. `docs/HANDOFF.md`：上一轮最短交接和下一步
6. `docs/版本基线.md` 及本次任务涉及的其他文档

同时检查 `git status`、当前分支、最近提交和必要的生产事实。若聊天内容与代码、Git、状态文档或生产事实冲突，以后者为准。先接续已有工作，不重复提交目录、平台或已经完成的改动。

## 版本与事实来源

- `1.0.0` 是冻结历史；正式版本遵循 `docs/版本基线.md` 的 MAJOR.MINOR.PATCH 规则，不按聊天、任务或外部审核次数递增。
- `docs/项目状态.md` 是当前事实来源；`docs/路线图.md` 只维护未来 2–4 个有依据的里程碑；`docs/HANDOFF.md` 是跨对话最短接力；`CHANGELOG.md` 只记录已完成并验证的交付。
- 产品开发、Patch 修复、SEO/Growth、运维和外部等待必须分开记录。文档、平台操作和纯等待不单独升级软件版本。
- 只有软件交付完成、验证通过并上线后才同步 package/lock、建立不可移动的 `vX.Y.Z` 标签。
- 代码中的 `generation-v2`、数据库迁移编号和数据结构版本不是网站版本号。

## 修改与验证

- 说明文档使用简洁中文；面向用户的英文、代码标识、协议字段和第三方许可原文按原用途保留。
- 修改功能前阅读本机 `node_modules/next/dist/docs/` 对应指南；按范围运行测试，提交前运行 `npm run check`。
- 保留有序迁移、有效测试/夹具、素材源文件和许可证；删除前确认静态与动态引用。
- 不把本地测试或旧验收记录写成当前生产验证；不输出真实密钥。ChatGPT 浏览器扩展升级已明确忽略，不得列为阻塞。

## 每次任务结束前

1. 更新 `docs/项目状态.md` 和 `docs/HANDOFF.md`；若范围或完成标准改变，再更新 `docs/路线图.md`。
2. 只有本轮真正完成并验证的交付才写入 `CHANGELOG.md`。
3. 核对 Git 工作区、提交/部署证据和验证范围。
4. 最终回复必须包含以下固定部分：

   - **当前版本**：Production、Development / Current work
   - **本次完成**：区分代码、线上、平台、本地验证、外部等待
   - **当前状态**：涉及模块的当前事实
   - **尚未完成**：可以立即继续、外部等待、真正阻塞、暂时不值得
   - **当前版本状态**：明确 `X.Y.Z 已完成` 或尚未完成及剩余核心事项
   - **下一步**：下一项最合理工作及所属版本
   - **对话建议**：二选一“建议：继续当前对话”或“建议：新建 Codex 对话”，并说明原因
   - **下一条指令**：无论选哪项，都给出可直接复制的完整提示词

建议新建对话前，必须先完成上述状态、路线图（如需）、交接和 Changelog 更新；不得擅自创建新任务。建议继续时也必须给出下一条可复制指令。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file; in monorepos the `next` package may not be visible from the repo root) before writing code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
