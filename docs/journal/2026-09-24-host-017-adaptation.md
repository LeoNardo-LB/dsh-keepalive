# 2026-09-24 <批次：host-017-adaptation>

> 状态：进行中（代码完成 + 自动化绿，真机验收待做）
> 关联：backlog #6 #7 #8 · 2026-09-24-host-v017-adaptation.md · 2026-09-24-settings-panel-defects.md

## 目标

适配宿主 dsh 0.1.7-rc.1（settings 重构为 SettingsForms/条目模型），并修复设置面板双缺陷（autoPause 路由丢弃、轮询回显覆盖）。

## 过程与证据

- 实机勘查（2026-09-24，升级后）：
  - dsh 0.1.7-rc.1 就绪；`~/.dsh/settings.yaml` 被单向迁移为 `settings.yaml.imported`（dsh-keepalive 节被组合拒绝留在残留文件）；profile patch 出现 llm-pi-ai 迁移条目。
  - `curl /plugins/dsh-keepalive/status` → 404：旧版插件在 0.1.7 未激活（settings.register 已移除）。
  - 实机 dsh-settings 0.1.7-rc.1 实现 `register(` 零命中。
- 机制破译（读 0.1.7 源码）：
  - schemastery 3.18.4 链式 `.volatile()`（用例：dsh-agent-loop Config）。
  - SettingsForms.write 仅接受 volatile 字段；loader `updateVolatile` 把补丁变更原地写入插件活配置对象并按 fiber 限定发出 `loader/volatile-update` 事件（= 旧 scope.watch 的等价物）；volatile-only 差异不重载条目（loader equal()）。
- 实现（同日）：
  - config.ts：Config 根 `.volatile()`——全部字段可经 settings 服务在线改写。
  - index.ts：`buildSettingsPort` 运行时探测（register 存在→legacy SettingsScope；否则→SettingsForms.update/mutate，条目 id `dsh-keepalive`）；watch 换 `loader/volatile-update`；entry 路径 prefill 移至 watch 之后（避免错过首次 volatile 事件）。
  - routes.ts：config 处理器补 autoPause 校验分支（#7）。
  - ConfigForm.tsx：dirty 守卫 + 非法输入禁用保存（#8）。
  - package.json：四个 dsh peer 追加 `^0.1.7-rc.1 || ^0.1.7`；schemastery ^3.18.1 → ~3.18.4。
- 验证（2026-09-24 18:2x，本机）：
  - BUILD：`pnpm -s typecheck` 通过（tsc --noEmit 静默退出）。
  - TEST：`pnpm -s test` → 9 文件 65 用例全过（routes 14 = 原 10 + 新增 #7 用例 4）。
  - RUN：`pnpm -s build` → lib/client.js 40533 bytes，宿主半产物全部再生成。
- 待真机验收（后续追加）：
  - 0.1.7 实例加载、GUI 配置往返、volatile 写入不重载、补发链路、停放阈值保存后重启保持。

- 真机首验失败与根因（2026-09-24 18:31-19:0x）：
  - 重启后 `.plugins/dsh-keepalive/status` 404、web.log 零 keepalive 行。`--dump-config` 证明条目在树中；`--dump-config-schema` 证明包可导入。
  - 前台 `--patch` 端口偏移探针（3999）复现静默；对已装副本注入 console 探针后现形：
    `TypeError: Cannot convert undefined or null to object @ engine.js refreshModels`——
    0.1.7 loader 交给 apply() 的条目配置是**原始值**（volatile 字段不投影 schema 默认值，
    providers 到手为 undefined），legacy 路径由 scope.register 补默认值，V3 路径初版直接用裸对象 → 崩。
  - 附带发现：turn-notify 用 console.log 而 keepalive 用 ctx.logger，后者输出在 0.1.7
    不可见（启动器静默 cordis logger），放大了排障难度；建议后续把插件 fatal 级日志加 console 旁路（另登记）。
  - 修复：V3 端口 get() 逐字段防御性归一（默认值镜像 config.ts），保留活对象引用与 volatile 可见性。
    typecheck/test 65/65/build 复绿（2026-09-24 19:1x）。docker 0.1.7-rc.1 矩阵轮进行中。
- 第二层根因——volatile ref 协议（2026-09-24 19:2x，docker 容器内实证）：
  - 归一修复后容器内 /status 200 但仍读默认值；对照 0.1.7 原生 volatile 用户 dsh-agent-loop：
    `ctx.agentLoop.config.maxParallelToolCalls.get()`——volatile 字段到手是 **cosmokit volatile ref**
    （`{ get(): snapshot, [write](v) }`），root-volatile 时 config 参数整体即一个根 ref。
    直接按普通对象读字段 = undefined。
  - 另实证：e2e overlay 提供条目配置时 settings.update 被拒（"overridden by a home patch or
    command-line overlay"）→ prefill 已改为 try/catch 非致命（面板 opt-in 兜底）。
  - 终版修复：readRaw() ref 感知（isRef → .get()），逐字段归一；typecheck/65 单测/build 复绿。
  - 容器验证（dsh-keepalive-e2e:0.1.7-rc.1 + 同步宿主 lib）：/status 200，overlay 配置完整流入
    （enabled:true、intervalMinutes:1、providers=mock-primary+mock-backup），双 provider 引擎排程
    nextFireAt 正常，日志零报错。完整 driver+browser 套件重跑中。
- 第三层根因——客户端半四连环（2026-09-24 19:4x-20:1x，容器 + 截图/多模态取证）：
  - 设置窗口节名 0.1.7 改为 "Built-in plugins"（主侧栏 "Plugins" 是新插件管理页）——
    browser-check 旧正则点中的是主侧栏按钮，节从未进入；检查已改为优先精确匹配新节名。
  - tab 能注册（slots 服务与 settings.plugins.tab 契约不变），但面板渲染崩：React #130——
    0.1.7 primitives 图标改名（*14/*16 → *Regular/*Medium）、MessageText → MarkdownText。
  - pick 判定修正：0.1.7 的 DisclosureRow/MarkdownText 是 memo 对象（typeof 'object'），组件判定需
    额外接受 $$typeof；memo 组件不能直接调用，MessageText 适配器改 createElement 并补必填 labels。
  - e2e 装配修正：--patch overlay 提供的条目配置会让 settings 持久写全部被拒（500），
    保活节奏配置从 overlay 挪进 profile 用户层（两代宿主语义一致）。
  - 终局：0.1.7-rc.1 容器 browser-check 15/15 ALL PASS（含 opt-in 写入→引擎重排、
    模型保存、历史回复渲染、移除确认链路）。
- 矩阵终局（2026-09-24 20:5x-21:2x）：
  - **0.1.7-rc.1 正式轮全绿**：driver 7/7 + browser 15/15，exit=0。
  - **legacy 两轮（0.1.1-rc.2 / 0.1.2-alpha.5）受阻于 npm registry 不可逆漂移，非插件回归**：
    1) dsh 固定版本但其 ~180 个 @deepseek-ai/* 传递依赖按 ^0.1.x 浮动解析——今日重建的
       "0.1.1-rc.2" 镜像实装 cordis 4.0.4 / hmr 1.0.19（#4 时代为 4.0.2 / 1.0.17），
       新 hmr 与旧宿主的 boot watch 存在服务注册竞态（"user patch-layer watching requires
       the Cordis HMR service"，确定性复现）；
    2) 决定性对照：#4 时代构建的原始镜像（原代码原环境）今日复跑同样失败——环境漂移坐实；
    3) node:26 基镜 26.7→26.10 漂移已用 FROM node:26.7 锁定；传递依赖改 npm overrides
       全树锁后，0.1.1-rc.2 轮进一步暴露 dsh-agent-presets（浮动解析到的新版）依赖
       cosmokit createVolatile——锁死 1.8.3 即断链；0.1.2-alpha.5 轮直接 ETARGET
       （dsh-experimental-agent-team@^0.1.2-alpha.5 已从 registry 消失）。
  - 结论：legacy 矩阵的"时代精确"环境已不可由今日 registry 组装（需当时的完整锁集或
    私有镜像沉淀）；登记 backlog #9。legacy 兼容性以单测 legacy 路径用例
    （register/SettingsScope 分支）+ #4 历史全绿背书。

- 真机验收追记（2026-09-25 12:0x）：
  - 用户报告"25 号只发了一条"。勘查：服务 04:52:07 重启，04:52:55 补发一枪（ok 1598ms）后调度链清空——
    /status 显示 enabled=false、storage nextFireAt={}、用户层行无 enabled 键（autoPause.threshold=100
    已持久化，#7 生效；providers 含 deepseek-official: false）。
  - 判定：某次配置保存走了 replace 语义（原生插件配置表单"reset live fields→base"，与默认同值字段
    不落盘）把 enabled=true 洗掉；我们自己的面板全部走 update 合并，不可能丢该键。
  - 处置：POST /config {enabled:true} 复活，链条武装（nextFireAt 12:36:10）；登记 #10。

## 完结迁移区

<验收通过后：backlog 卡片原文逐字迁入此处（不压缩不删改），backlog 删除原卡片>

## 蒸馏（可选）

<待验收后评估：0.1.7 条目模型 volatile 写入链路可蒸馏 docs/research/>
