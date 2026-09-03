# 2026-09-04 <批次：ui-rewrite-dsh-primitives>

> 状态：进行中
> 关联：backlog #5 · docs/specs/2026-09-04-ui-rewrite-dsh-primitives.md

## 目标

按已确认共识把 CLIENT 展示层推倒重写为宿主原生视觉（dsh-client-ui-primitives + --dsw-alias-* 令牌 + 运行时注入 CSS），HOST 半与 store 契约零改动；验收含 Docker 端到端。

## 过程与证据

### 2026-09-04 06:00 前置事实（grilling 两轮 + 子代理审计）

- 病根实证：宿主令牌是 --dsw-alias-*（dsh-client-ui-theme 注入），旧 UI 引用的 --dsh-bg/-fg/-border 宿主未定义 → 回退 hex 恒生效（审计报告，全文见会话记录；关键事实入 spec F1-F5）。
- primitives 仅经运行时模块表供应（dsh 0.1.2-rc.1 boot 表 8 id 之一）；npm 原包 @deepseek-ai/dsh-client-ui-primitives@0.0.1-rc.1 带 .d.ts，作为 API 事实源核对（比宿主供应版略旧，图标名以宿主 bundle 实证为准：*Outline14/16 后缀）。
- schema-form 对插件不可用（死符号链接 + 不在模块表）→ 配置表单必须 primitives 自建。

### 2026-09-04 06:04 重写落地（commit ba4fce6）

- 新文件：src/client/{primitives.ts,styles.ts,keepalive-tab.css,ConfigForm.tsx,ProviderCard.tsx,HistorySection.tsx,globals.d.ts}；重写 SettingsTab.tsx；scripts/build-client.mjs 加 css→string loader。
- 构建：pnpm -s typecheck 0 错误；pnpm -s test 58/58（9 文件全绿）；pnpm -s build 产出 lib/client.js 40018 字节。
- 产物体检：data-plugin-css 注入 ✓；旧回退色（#98c379/#e06c75/#2a2a2a 家族）0 残留 ✓；primitives require 就位（try/catch 仅 primitives.ts 边界一处）✓。

### 2026-09-04 06:06 e2e 适配（commit ff22b19）

- e2e/browser-check.mjs 重写 v5：data-ka 钩子 + ka-类选择器 + portal menu 断言；新覆盖点：样式注入门检、primitives 门检、模型 Menu 选择→保存、历史就地展开、统计区块、RiskConfirmation 移除流（取消路径）、配置表单在场。
- e2e/run-e2e.sh 编入浏览器阶段（[4/6] driver + [5/6] browser 双门禁）；puppeteer-core ^24.0.0 入 devDeps。

### 2026-09-04 06:07 Docker e2e 运行中

- 命令：DSH_VERSION=0.1.2-rc.1 bash e2e/run-docker.sh；结果待追加。

## 完结迁移区

<验收通过后：backlog 卡片原文逐字迁入此处（不压缩不删改），backlog 删除原卡片>

## 蒸馏（可选）

<可复用的结论提炼到 docs/research/ 后在此写文件名>

<!--
本文件由 scripts/new-batch.sh 实例化（自动替换：日期与批次名）。
模板纪律（实例化后保留本注释或删除均可）：
  1. 开工时创建，过程实时写入；不事后补写——证据失真、遗漏
  2. 只追加不改写：历史轮次记录保持原样——差异分析失真
  3. 完结条目原文迁入（不压缩不删改）——历史信息丢失
  4. journal 只记执行与证据；可复用结论蒸馏进 docs/research/——蒸馏结论埋没
  5. 命名 YYYY-MM-DD-<kebab>.md——排序与检索失效（check.sh 门禁 10）
  6. 本文件不写相对 md 链接（从 docs/journal/ 出发易断链）；引用文档用纯文本路径
配套：workflows/requirements.md（迁移规则）、templates/backlog-entry.md、templates/verification-node.md
-->
