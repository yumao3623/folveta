# Folveta V2 发布基线

Status: **Current release baseline**  
Baseline date: 2026-09-11  
Branch: `main` working-tree release candidate

本文档是 V2 真实流程修复和 UI 重做前的范围基线，记录当前代码能力、V2 首发范围和明确延期事项。

## 产品边界

Folveta 的核心任务是：

`上传课程材料 → 解析 → 生成有来源依据的 Study Guide → 用 Quick Check 检查理解情况`

Study Guide 是主要产品结果，Quick Check 是 Guide 的后续复习工具。首要用户是需要整理课堂讲义、笔记和考试重点的大学生。

## 当前已实现能力

| 能力 | 当前范围 | 代码证据 |
| --- | --- | --- |
| 上传 | PDF、DOCX、XLSX、PPTX、部分旧 Office 格式和常见图片；多文件和限制检查 | `components/upload-panel.tsx`、`lib/server/parser.ts` |
| 解析 | 页面、幻灯片、段落、表格等来源边界；不可读内容产生 warning | `lib/server/parser.ts`、`tests/fixtures/` |
| Guide 生成 | V1 持久化路径；V2 多主题、来源引用、分区、缺口和原子终止 | `lib/ai/generation-v2.ts`、`lib/ai/generation-v2-runtime.ts` |
| V2 持久化 | 请求、artifact、Guide 快照、租约、重试和 billing reservation 结算 | `lib/ai/generation-v2-persistence.ts`、`supabase/migrations/` |
| Guide 阅读 | 学习地图、优先级、解释、定义、过程、易混淆点、练习和来源引用 | `components/v2-guide-workspace.tsx` |
| Quick Check | 五题选择题、服务端评分、结果和返回 Guide 主题 | `lib/ai/quick-check.ts`、`components/quick-check-runner.tsx` |
| 账户 | Supabase email/password Auth、匿名会话、Claim、密码恢复、My Guides、Library、Search、Profile | `app/auth/`、`lib/server/` |
| Demo | `/study/demo` 和 `/study/demo/quick-check`，无需真实凭据 | `lib/fixtures/demo-guide-v2.ts` |

代码存在不等于生产验收完成。真实 Supabase migration、真实 Provider、账号注册、上传和生成的端到端链路仍需在隔离环境验证。

## V2 首发范围

1. 用户可以注册、登录、退出并恢复密码。
2. 未登录用户可以创建临时会话，登录后可以 Claim。
3. 用户可以上传一份或多份课程材料，并看到清楚的上传、解析和错误状态。
4. 系统可以生成多主题 Study Guide，并显示优先级、来源引用和覆盖缺口。
5. 资料部分不可读时，Guide 使用 `complete_with_gaps` 并说明缺口。
6. 生成期间来源发生变化时，旧请求安全终止，不生成混合来源结果。
7. 用户可以从 Guide 开始五题 Quick Check，并查看结果和复习入口。
8. 所有新生成请求由 `GENERATION_V2_RUNTIME_ENABLED` 控制。

## 明确暂不做

- 多种题型、完整题库、间隔重复或排行榜；
- 通用聊天、知识图谱、多 Agent 编排或开放网络搜索；
- 音频、视频、URL、粘贴文本输入；
- 教师后台、协作、班级和 LMS 集成；
- 大规模程序化 SEO 页面、博客矩阵或外链自动化；
- 在产品流程验证前更换数据库、迁移框架或重建项目；
- 删除历史 V1 Guide 或重写历史数据库记录。

## 阶段 0 出口

后续开发必须能够回答：当前核心链路是什么；哪些功能有实现、哪些只是文档承诺；哪些属于 V2 首发、哪些延期；哪些测试只使用 fixture、哪些需要真实 Supabase/Provider；哪些修改属于已有工作树内容且不能覆盖。

当前答案以本文档、`docs/product/decisions.md`、`docs/product/product-context.md`、`docs/product/v5-master-roadmap.md` 和代码共同构成。历史审计及 archive 文档只作为背景。

## 阶段 1 入口

下一阶段任务名称：**V2 发布前真实用户流程修复与验收**。

阶段 1 只处理注册、登录、匿名 Claim、上传、解析、真实生成、Guide 读取、Quick Check、错误提示和重试。出口是：新的测试账号可以从注册开始完成完整流程，并在刷新后仍看到正确的 Guide 和结果。

## 当前发布阻塞项

- 待应用并验证的 V2 Supabase migrations；
- 隔离环境中的真实 Provider 检查；
- 真实账号注册和登录流程；
- 真实材料上传、解析、生成和 Quick Check 端到端验证；
- V2 开关启用前的错误、计费和恢复验证；
- 新图标和 UI 重做尚未进入本基线的实现范围。

## 工作树纪律

- 不覆盖当前已有未提交修改。
- 不读取、输出或修改 `.env.local` 的 Secret。
- 不在本阶段创建 commit、push、PR 或部署。
- 数据库 schema 只通过有序 Supabase migration 追加，不修改历史 migration。
- 新增功能先更新本基线或对应当前产品文档，再进入实现。
