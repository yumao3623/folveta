# Folveta 设计规范

适用于当前 1.0 网站及后续优化。视觉参数以 [全局样式](app/globals.css) 为准，组件以 [通用组件目录](components/ui/) 为准。

## 整体方向

界面应像清楚、安静的学习工作区：有阅读层次、纸面感、细分隔线、适度圆角和明确的下一步操作。采用森林绿作为主要操作色，来源蓝表达证据，插画体现整理材料、阅读、核对和复习等真实学习动作。

版式曾参考 Notion 的克制层次与留白；Folveta 保持自己的颜色、字体、品牌和插画。页面用真实产品内容说明功能，避免没有依据的成绩、用户数量、评价或能力承诺。

## 字体与颜色

- 全站使用 Source Sans 3，由 `next/font` 加载；常用字重 400、500、600、700。
- 正文以 16px 为基础，较长学习内容可使用 17–18px 与 1.6–1.7 行高。
- 页面标题与操作标签保持清楚的层次，避免全局修改字间距。
- 使用语义变量表达颜色与状态，不在页面中重复维护一套颜色值。

| 变量 | 用途 |
| --- | --- |
| `--background` / `--foreground` | 页面底色与主要文字 |
| `--text-secondary` | 说明性文字 |
| `--primary` / `--primary-active` | 主要按钮与选中状态 |
| `--primary-soft` / `--surface-subtle` | 轻强调与次级阅读区 |
| `--source-blue` | 来源提示与证据状态 |
| `--border-soft` | 细分隔线 |

普通文字与按钮文字在实际背景上保持至少 4.5:1 对比度。优先用留白、细线和浅底分组；普通控件圆角 6–10px，大面板不超过 16px，避免多层卡片嵌套。

## 页面与交互

- 公共页面使用共享页头、页尾与约 1140px 内容区；首屏说明产品、适用对象和下一步。
- 学习指南先显示标题、覆盖范围、Quick Check 操作和首要学习内容，再展开细节与来源。
- Quick Check 聚焦题目；在 390×844 视口，题目与至少一个完整选项应在底部操作栏上方可见。
- 上传、解析、生成是不同状态，界面不能把上传成功表现为生成已完成。
- 工作区从 1024px 起使用约 15rem 侧栏，更小屏幕使用紧凑导航；固定工具栏不能遮住内容。
- 按钮、表单、提示、进度、空状态和对话框优先复用现有组件，保留键盘焦点与真实状态反馈。

## 图标与插画

产品语义图标统一通过 [StudyIcon](components/ui/study-icon.tsx) 映射 Lucide；箭头、关闭等简单控制可直接使用 Lucide。图标采用 `currentColor`、2px 描边和一致尺寸，独立功能图标不超过 32px。图标按钮至少提供 44×44px 点击区域与可访问名称。

品牌源文件是 [页面标志](public/brand/folveta-mark.svg) 和 [应用图标](app/icon.svg)；PNG 与 ICO 是供浏览器使用的派生文件。文字标志由组件渲染。

学生插画来自 MIT 授权的 [IRA Design](https://github.com/ira-design/ira-illustrations) 组件与 Folveta 自有图形组合，使用 [AssetIllustration](components/ui/asset-illustration.tsx)。

| 素材 | 用途 |
| --- | --- |
| `folveta-material-student.svg` | 课程材料与上传入口 |
| `folveta-guide-student.svg` | 指南与阅读 |
| `folveta-quick-check-student.svg` | 测验与复习 |
| `folveta-source-student.svg` | 核对来源 |
| `folveta-progress-student.svg` | 进度与计划 |
| `folveta-locked-student.svg` | 私有、空白与受限状态 |
| `folveta-heart-student.svg` | 重试与支持性反馈 |

素材均位于 `public/illustrations/`。保留 [来源清单](public/illustrations/student-illustrations.json)、[第三方说明](public/illustrations/third-party/ira/README.md)、[许可原文](public/illustrations/third-party/ira/LICENSE.md) 和 `scripts/assets/vendor/ira/` 源组件。新增素材需明确来源、授权与替代文本；装饰图避免重复朗读附近内容。

重新生成素材：

```bash
node scripts/assets/build-brand-icons.mjs
node scripts/assets/build-student-illustrations.mjs
node scripts/assets/export-study-icons.mjs
```

## 动效与验收

当前动效由 CSS 实现，用于进入、按压、加载和结果反馈；除加载外不使用无限循环，遵守 `prefers-reduced-motion`。首屏主插画立即可见并预加载，不能用透明度入场延迟显示；其他场景按需懒加载并预留尺寸。

修改页面后检查 390px、768px、1100px 和宽屏：真实文字换行、键盘操作、对比度、横向溢出、固定栏遮挡及完整学习路径。运行相应自动检查，并在桌面和移动视口实际查看结果。无需为日常维护新增视觉验收报告。
