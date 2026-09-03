# Changelog

本文件记录 dsh-keepalive 的显著变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循语义化版本。

## [Unreleased]

### 变更

- **V1/V2 双宿主兼容（0.1.1-rc.2 ⇄ 0.1.2-alpha.5）**：host 半命名空间解析改 `in` 能力探测（V2 移除了 `settingsNamespace` 工厂）；client 半 `ClientContext` 类型源改 cordis 直取（rc.2 中它本就是 cordis `Context` 别名）；构建脚本 EXTERNALS 清除死条目；peerDependencies 声明联合区间。产物运行时行为零变化（详见 workspace/2026-09-02-dsh插件矩阵统一改造-to-spec.md 节 1-3）。

- 配置界面整体迁入 DSH 原生设置窗口：新增 `settings.plugins.tab` 页签「提供商保活」；移除对话流 composer.dock 摘要条与 shell.overlay 面板。
- 保活模型改为下拉选择（数据源 `GET /plugins/dsh-keepalive/models`），不再手填。
- 历史记录可查看模型回复：keeper 捕获回复文本（头部 4000 字符）随 `HistoryEntry.reply` 持久化下发。
- 保活消息追加「请用不超过10个字回复」指令，`maxTokens` 由 1 提至 32（约 10 个汉字的硬成本预算），模型可给出简短回复。

### 新增

- 操作反馈：所有变更类按钮带 pending 态（禁用 + 「…中」文案），结算后经 DSH 原生 Toast（`ui-primitives`，缺失时内联横幅降级）弹出成功/失败横幅。

- HTTP 面：`GET /plugins/dsh-keepalive/models`（逐提供商模型列表；单路由枚举失败不拖垮整体）。

## [0.1.0-dev.1] - 2026-08-25

### 新增

- 抖动调度引擎：每提供商独立定时器、60s 下限钳制、重启补发、连续失败自动停放、手动暂停/恢复/立即发送。
- 静默保活发送：`ctx.llm.stream` + `maxTokens: 1` 读完整个流；100 条中文短语洗牌队列 + ISO8601 时间戳 + 8 位 hex。
- 持久化：storageDomain 域 `dsh-keepalive`（历史环 500 条 + 按天统计 90 天 + nextFireAt 补发映射）。
- HTTP 面：`/plugins/dsh-keepalive/{status,history,config,action}`。
- Web 面板：composer.dock 摘要条 + shell.overlay 全页面板（提供商/历史/统计/配置）。
- 设置 namespace `dsh-keepalive`（热生效）+ 首次预填 active 提供商。
- Docker E2E：真实 web profile + 双 mock provider + 7 场景 driver。
