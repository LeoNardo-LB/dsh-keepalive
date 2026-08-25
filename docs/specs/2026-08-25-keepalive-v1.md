# dsh-keepalive v1 设计（#2）

日期：2026-08-25
状态：已批准（21 问 grill 共识，见对话记录；本文为实现锚点）
位置约定：active 位于 docs/specs/；实现并验收后移入 docs/archive/specs/ 并更新本行与 backlog 卡片引用路径

## 背景与目标

- **#2** 提供商账号长期闲置可能被降权/回收；需要在 dsh web 启动期间按「基准间隔 ± 抖动」自动发送拟人保活消息，并在 Web GUI 可视/可控/可配置。
- 目标：装好插件 → 面板确认 → 各 provider 独立随机周期静默发送；历史/统计持久化；失败可观测；零上游修改。

## 已探测事实

1. **插件契约**：插件 = export { name, inject, apply, Config }；apply() 是唯一启动钩子；配置行经 cordis.patch.yml insert 挂载，watchUserPatches 热重载（2026-08-23，研究报告 + 源码）。
2. **llm 服务**：ctx.llm.stream(GenerateOptions): AsyncIterable&lt;StreamChunk&gt; 仅流式；listProviders()/listModels()/resolveModelInfo() 可枚举（2026-08-25，安装树 d.ts）。
3. **webserver**：ctx.webServer.register(route) 可注册任意路径路由（node:http，loopback 信任栅栏，无 TLS）（2026-08-25，安装树 README）。
4. **settings**：ctx.settings.register(ns, schema, {base}) → $DSH_HOME/settings.yaml，watch 热生效、revision 乐观锁、mutate 路径写（2026-08-25，安装树 d.ts）。
5. **storageDomain**：ctx.storageDomain.open(domain) KV JSON 落 $DSH_HOME/storages（2026-08-25，安装树 README）。
6. **client 半**：package.json dsh.client + exports["./client"]（lazy-CJS factory bundle）经 dsh-client-modules 扫描进 window.__DSH_BOOT__，slots 系统注册 UI；无自由页面路由，只能用既定座位（composer.dock / shell.overlay 等）（2026-08-23，.research/notes/client-plugins.md）。
7. **本机环境**：dsh web 后台运行于 profile web（127.0.0.1:3080），~/.dsh/profiles/web/cordis.patch.yml 已有 MCP insert 先例；node v26.7.0 / pnpm 11.21.0 / docker 27.5.1 可用（2026-08-25，实机探测）。
8. **参考实现**：用户自写 dsh-llm-failover 是 host+client 双半边插件的成熟同构模板（2026-08-23，.research）。
9. **负向事实**：DSH 无 daemon；无跨重启调度器；ctx.llm 无非流式 API；host 事件到浏览器仅 11 个白名单（自定义事件需 patch 上游）（2026-08-25，架构调查报告）。

## 分节设计

### 节 1 — 调度引擎（HOST）

##### 每 provider 独立定时器链

- **方案**：src/engine.ts：scheduleNext(providerId) 用 ctx.timeout(delay, fire)（经 ctx.effect 自动回卷）；fire 后执行一发再重排；delay = nextDelayMs(base, jitter, rand) 纯函数（src/interval.ts），从发送完成时刻起算（Q16）。
- **取舍**：放弃全局单定时器同打所有家——错峰不自然且一家失败拖累全部。
- **为什么**：Q3 共识独立错峰；ctx.timeout 保证 dispose 回卷（AGENTS 红线 4）。

##### 补发（catch-up）

- **方案**：引擎启动时从 storageDomain 读各 provider 上次持久化的 nextFireAt；若已过期 → 延迟 5s 立即补一发再正常重排；未过期 → 按剩余时间排。
- **取舍**：放弃「错过就跳过」——长时间闲置违背保活目的。
- **为什么**：Q15 共识补发一次；5s 缓冲避免进程刚起就齐射。

##### 自动停放（parked）

- **方案**：引擎内存态记 consecutiveFailures；成功清零；失败 +1 且 ≥ threshold（默认 5，可配 0=off）→ parked=true，停排定时器；路由 resume 动作清除并重排。
- **取舍**：不提供自动恢复——key 失效的自动重试是打爆提供商的路径。
- **为什么**：Q8/Q17 共识。

### 节 2 — 保活调用（HOST）

##### 消息构造

- **方案**：src/message.ts：buildKeepaliveMessage(phrase, now, rand) → "phrase + ISO8601 时区时间戳 + 8 位 hex"；短语从 src/phrases.ts 100 条常量里不重复随机取（洗牌队列）。
- **取舍**：时间戳用带本地时区偏移的 ISO8601 而非 Unix 秒——对 tokenizer 友好且人类可读。
- **为什么**：Q6/Q9 共识。

##### 发送

- **方案**：ctx.llm.stream({ provider, model, messages:[user], maxTokens: 1, purpose: 'keepalive' }) 读完整个流（不 abort）；成功 = 迭代无错完成；延迟 = 发起到流尾总时长；记录首 20 字符响应文本。
- **取舍**：放弃中途 abort 省 token——规避连接清理问题，maxTokens=1 已把成本压到最低。
- **为什么**：Q5/Q21 共识；流式是唯一 API（事实 9）。

##### 静默

- **方案**：不建 session、不发 session/event、不写 systemPrompt；唯一痕迹 = storageDomain 历史 + ctx.logger（d 级）。
- **取舍**：放弃面板之外的一切可见性。
- **为什么**：Q11 共识「Model-visible means logged」公理。

### 节 3 — 配置（HOST）

- **方案**：ctx.settings.register('dsh-keepalive', Config)；schema：enabled/intervalMinutes/jitterPercent/autoPause{enabled,threshold}/providers dict{enabled,model?}；首次注册时若 providers 为空 → 用 listProviders() 预填 active 家（enabled=false 总开关，Q20）；watch() 重排引擎。
- **取舍**：放弃 Config 行 config 作为用户配置入口——settings 有热生效+Web 可达，行 config 只做不可变默认。
- **为什么**：Q2 复用 DSH providers + 事实 4。

### 节 4 — 持久化（HOST）

- **方案**：storageDomain 域 dsh-keepalive：history（最近 500 条：provider/model/status/latencyMs/content/preview/at）+ nextFireAt map（补发依据）+ dailyStats（按天聚合，保留 90 天）。
- **取舍**：放弃 SQLite/独立文件——storageDomain 是官方 KV 且已有 watch 语义。
- **为什么**：Q14 共识 + 事实 5。

### 节 5 — HTTP 面（HOST）

- **方案**：ctx.webServer.register 四条：
  - GET /plugins/dsh-keepalive/status → { enabled, config, providers:[{id, model, nextFireAt, parked, consecutiveFailures, lastResult}], now }
  - GET /plugins/dsh-keepalive/history?limit=&provider= → { items, dailyStats }
  - POST /plugins/dsh-keepalive/config → body 局部合并（schema 校验 + intervalMinutes 钳制）
  - POST /plugins/dsh-keepalive/action → { type: 'pause'|'resume'|'fire-now'|'resume-provider', provider? }
- **取舍**：放弃 patch 上游事件转发——轮询 5s + 客户端本地倒计时已够；升级免疫。
- **为什么**：Q18b 共识 + 事实 3。

### 节 6 — CLIENT 半

- **方案**：client/（构建到 dist-client/client.js）：dsh.client 声明 inject ['slots']；composer.dock 摘要条（总开关态 + 下一家倒计时 + 最近结果）；shell.overlay 全页面板（provider 卡片含倒计时/停放/手动按钮、历史表、按天统计、配置编辑表单提交 config 端点）；5s 轮询 status，倒计时 = nextFireAt - 本地钟（每秒重算，无漂移累积）。
- **取舍**：放弃 Settings→Plugins 原生卡片（v1 范围外，Q21）。
- **为什么**：Q7c/Q13a 共识 + 事实 6（slots 是唯一 UI 缝）。

### 节 7 — 安装形态

- **方案**：dev = ~/.dsh/profiles/web/cordis.patch.yml insert 指向本目录（file 路径，免打包）；生产 = dsh.bundle + cordis.patch.yml + dsh plugin add github:OWNER/dsh-keepalive；dist-client 产物提交进仓库。
- **取舍**：放弃 npm publish（用户未要求）。
- **为什么**：Q10/Q21 共识。

## 风险与回滚

| 风险 | 影响 | 回滚方式 |
|------|------|----------|
| stream API 形状与假设不符（chunk 类型/字段名） | 发送全失败 | engine 隔离层一函数；回滚 = revert 该 commit；Docker 验证第一轮即暴露 |
| webServer.register 路由冲突/前缀规则不符 | 面板 404 | 路由前缀固定 /plugins/dsh-keepalive/；验证脚本 curl 断言 |
| dsh.client bundle 格式（lazy-CJS factory）不匹配 | 浏览器半加载失败 | 以 failover 产物为模板对齐格式；Docker 浏览器人工清单把关 |
| settings schema 与 Schemastery 版本不兼容 | 启动 fail-loud | Config 最小化（object/number/boolean/dict）；探针先行 |
| storageDomain 域名冲突/结构不符 | 历史不持久 | 域名唯一 dsh-keepalive；结构 JSON 纯类型 |
| Docker 内无真实 API key | 实机验证发不出 | mock provider（本地 OpenAI 兼容 stub）作为可路由 provider 注入 |

## 验证要点

1. Docker 容器内 dsh web 启动 → 插件行激活无 fail-loud（构建+运行时）。
2. 短间隔真实发到 mock provider → history 落库（遥测）。
3. status 路由返回的 nextFireAt 与实际发送时刻一致 ±5s（交叉：路由数据 vs mock server 收包时间戳）。
4. 面板操作 pause/fire-now 后路由状态变化 ≤5s（运行时+遥测）。
5. 重启容器 → catch-up 补发恰好 1 次（遥测）。
6. 停放阈值触发（mock 连续 5xx）→ parked=true 且不再发（遥测）。
7. 静默断言：sessions/ 目录无新增会话文件（遥测）。
8. 时间性现象（倒计时跳动/面板刷新）→ 人工清单。

## 变更记录

- 2026-08-25：初版（21 问共识落地）。
