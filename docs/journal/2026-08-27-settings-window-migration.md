# 2026-08-27 <批次：settings-window-migration>

> 状态：进行中
> 关联：用户需求（口头，非 backlog 编号）：①配置入口迁入原生设置界面 ②保活模型改可选列表 ③可查看保活时模型回复

## 目标

把 dsh-keepalive 的 CLIENT 半从对话流两座位（composer.dock 摘要条 + shell.overlay 面板）整体迁入 DSH 原生设置窗口（settings.plugins.tab 页签）；模型选择从手填改为下拉；历史记录增加模型回复查看。

## 过程与证据

- 调研（两个并行子代理 + 主线程 grep 复核，DSH checkout 只读）：
  - 原生设置窗口扩展点：`settings.plugins.tab` 为官方 additive 插槽，先例 `ui-settings-plugins/src/client/index.ts`（register 必须裹 `ctx.slots.inject`）；slot 目录生成物在 `cordis-client-runner/src/client/slot-catalog.ts`。
  - HOST 模型列表：`ctx.llm.listProviders()` + `await ctx.llm.listModels(id)` 组映射（packages/llm/llm/src/index.ts:419/581）；自注册 webServer 路由无 fence，同源 fetch 天然通过。
  - 不存在编程打开指定设置子页的通道 → 全功能进设置页后不再需要外部入口，对话流座位可整体移除。
- feat(host) 0b0eb1a：keeper 捕获完整回复（REPLY_CHARS=4000 封顶），HistoryEntry.reply 可选字段（storage version:1 不变，旧记录兼容——version bump 会在 open 时 reject 旧单元）。测试 46/46 绿。
- feat(host) 7168d6b：新增 GET /plugins/dsh-keepalive/models 路由。测试 49/49 绿。
- feat(client) 9cc3899：store 增 models 快照与 loadModels()，补 store 单测 3 例。52/52 绿。
- feat(client) 982aff8：SettingsTab 注册进 settings.plugins.tab；删除 Dock/Panel 与 panelOpen 状态；类型依赖 devDeps 加 @deepseek-ai/dsh-client-ui-settings（SlotMap merge 类型来源，构建 externals 不含它）。vitest 52/52、双 tsconfig typecheck、esbuild bundle 全绿后提交。
- E2E 适配：browser-check v4 重写为「设置→插件→提供商保活页签」导航路径；Dockerfile 固化 chromium + fonts-noto-cjk 使 UI 走查可复现；driver.mjs 本就是 HTTP 层无需改动。
- 实机走查三轮排障：①puppeteer handle 与 React 5s 轮询竞争导致点击失联 → 改页面内原子 evaluate 点击；②「参与保活」按钮多卡同文案点错 → 按卡片内定点点击；③deepseek-official 首启预填竞态属正常现象，截图存证。browser 10/10 ALL PASS，截图在 e2e/evidence/browser-*.png。
- feat(keeper) 7620581：消息追加 SHORT_REPLY_SUFFIX「请用不超过10个字回复」，maxTokens 1 → MAX_REPLY_TOKENS=32（导出常量，约 10 汉字硬预算）；driver S2 断言同步。vitest 54/54；docker E2E 8/8 PASS（S2 msgShape=true 实证新消息形状）。
- 验证输出（节选，当前会话内新鲜执行）：
  - `pnpm vitest run` → Test Files 9 passed (9), Tests 52 passed (52)
  - `pnpm typecheck` → tsc 双工程 --noEmit 0 错误
  - `pnpm build` → built lib/client.js (28226 bytes)

## 完结迁移区

<验收通过后：backlog 卡片原文逐字迁入此处（不压缩不删改），backlog 删除原卡片>

## 蒸馏（可选）

<可复用的结论提炼到 docs/research/ 后在此写文件名>
