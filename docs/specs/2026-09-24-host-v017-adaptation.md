# 宿主 0.1.7 适配：settings SettingsForms 迁移设计（#6）

日期：2026-09-24
状态：草稿
位置约定：active 位于 docs/specs/；实现并验收后移入 docs/archive/specs/ 并更新本行与 backlog 卡片引用路径

## 背景与目标

- **#6** dsh 宿主 0.1.7-rc.1（2026-09-23 发布）重构 settings 服务：移除 `ctx.settings.register(ns, schema)` 与 SettingsScope 句柄；keepalive 初始化即抛 TypeError，在 0.1.7 的"可选插件失败自禁用"新容错下表现为插件静默停摆、保活中断。
- 目标：keepalive 在 0.1.5-rc.2（现役生产）与 0.1.7-rc.1（升级目标）双宿主下均可加载、读写配置、完整保活；docker e2e 矩阵扩展后全绿。

## 已探测事实

（除标注外，探测日期均为 2026-09-24，手段：npm registry 拉取 @deepseek-ai/* 0.1.7-rc.1 tarball 解包，与本机 0.1.5-rc.2 全局安装逐文件比对类型声明与实现）

1. **settings 服务 API 更替**：0.1.7-rc.1 dsh-settings 主类 SettingsForms（d.ts 全文 118 行）仅暴露 configure/describe/update/replace/mutate 与 writable/documentPath/prepareDocument；实现中 `register` 仅存 2 处注释、`scope` 零命中。旧版 0.1.5-rc.2（d.ts 335 行）有 `register(`×4、`scope`×5。
2. **mutate 保留且向后兼容**：`mutate(ns, ops, expectedRevision?)` 第三参为可选新增；keepalive 的 remove-provider 路径签名仍匹配。
3. **settings.yaml 单向迁移**：SettingsForms.importLegacyDocument 注释明言首启把 settings.yaml 各节迁入活动 profile patch，随后改名原文件；被组合拒绝的节留在改名文件中。推论（待验证）：`dsh-keepalive` 节会迁移为本插件 profile 条目配置，经 cordis Config 导入 apply(ctx, config)。
4. **keepalive 依赖断点精确位置**：`lib/index.js` 中 `ctx.settings.register(NAMESPACE, Config, { base: config })`（:47）与 `scope.update(patch)`（:122）在 0.1.7 无对应 API；`ctx.settings.mutate`（:125）兼容。
5. **其余 API 面零变化**：webServer.register（kind 'exact'|'prefix'）、llm.listProviders()/listModels()/stream()、storageDomain 表 put()/entries()、`agent/status` 事件——0.1.7 类型声明与 0.1.5 逐字一致。
6. **依赖版本落位**：0.1.7 CLI 依赖 cordis ~4.0.4、cordis-plugin-timer ~1.1.6、schemastery ~3.18.4，均在 keepalive peer 范围（^4.0.1/^1.1.3/^3.18.1）内。peer 声明 `^0.1.1-rc.2 || ^0.1.2-alpha.5` 不满足 0.1.7-rc.1（semver 预发布元组规则），与现役 0.1.5-rc.2 同为非阻断告警。
7. **前端宿主面**：`window.__ModuleLoader__` 与 `@deepseek-ai/dsh-client-ui-primitives` 在 0.1.7 前端资源（dsh-web-frontend 4.8MB 解包 grep）命中；`@deepseek-ai/dsh-client-ui-settings` 字符串未命中。推论（待验证）：打包方式差异、模块 id 经注册表间接映射，上机实拍确认。
8. **0.1.7 宿主行为变化（利好）**：可选插件失败自禁用而不中止 Profile；Web 服务恢复后重注册模块路由；插件管理页支持安装/启停/运行时卸载与官方源/镜像源切换。

## 现状代码链路

- 配置读：apply(ctx, config) 收 cordis 注入 base → `ctx.settings.register(NAMESPACE, Config, { base })` → scope.get() 供引擎每周期读取（`src/index.ts` 对应 lib :47/:121）❌ 0.1.7 断裂
- 配置写：POST /config → routes.config 白名单组 patch → `deps.updateConfig = scope.update`（`src/routes.ts` + lib :122）❌ 0.1.7 断裂
- 移除 provider：action remove-provider → `ctx.settings.mutate(NAMESPACE, [unset])`（lib :125）✅ 兼容
- 其余：engine/keeper/history/storage-domain/CLIENT 轮询 ✅ 与宿主版本无关

## 分节设计

### 节 1 — 配置基线：从 register 迁到条目注入

##### 基线来源

- **方案**：apply(ctx, config) 入参 config 即 cordis 组合条目配置，作为 0.1.7 路径下的唯一基线；0.1.5 分支（节 3）仍走 register 叠加 settings.yaml。
- **取舍**：放弃"运行时注册合并两层"模型；代价是两宿主下配置文件位置不同（settings.yaml vs profile patch），README 需写明。
- **为什么**：0.1.7 的配置单一真相源就是 profile 条目，register 已不存在，强行抽象两层反而失真。

### 节 2 — 配置写入：SettingsForms.update

##### 写路径

- **方案**：deps.updateConfig 底层改为 `ctx.settings.update(ns, patch)`（语义=增量合并，与旧 scope.update 一致）；ns = 本插件 profile 条目 id，开工时用 describe() 枚举实拍确认取值。
- **取舍**：不动 HTTP 路由与 CLIENT，只换内部一行接线；首版不传 expectedRevision（乐观并发留后续）。
- **为什么**：改动面最小；路由/CLIENT 已有 e2e 覆盖，回归风险集中在一条线上。

### 节 3 — 双宿主特性探测

##### 分支策略

- **方案**：启动时探测 `typeof ctx.settings.register === 'function'`：真 → 0.1.5 旧路径；假 → 0.1.7 新路径。沿用 #4 双宿主兼容改造的运行时探测模式。
- **取舍**：多一条持久分支（至 0.1.5 退役）vs 硬切 0.1.7（现役环境立即不可用）；选兼容。
- **为什么**：生产环境仍在 0.1.5-rc.2，升级是渐进的。

### 节 4 — peer 与 devDeps

##### 依赖声明

- **方案**：peerDependencies 四个 @deepseek-ai/dsh-* 范围追加 `|| ^0.1.7-rc.1 || ^0.1.7`；devDependencies 升至 0.1.7-rc.1 支撑类型检查与 e2e。
- **取舍**：范围宽化 vs 精确锁定；选宽化，与既有多段范围风格一致。
- **为什么**：rc 预发布不满足旧范围，显式列入消除安装告警噪音。

### 节 5 — e2e 矩阵扩展

##### 三宿主轮次

- **方案**：docker e2e 由双宿主（0.1.1-rc.2 / 0.1.2-alpha.5）增至三轮，加 0.1.7-rc.1 镜像；断言加载成功、GUI 配置读写往返、停放/恢复链路。
- **取舍**：CI 时长 +1 轮，换宿主升级回归兜底。
- **为什么**：#4 先例证明 docker 双轮 8/8 是发版门禁的有效形态。

## 风险与回滚

| 风险 | 影响 | 回滚方式 |
|------|------|----------|
| profile 条目 id 取值与预期不符，update 写错条目 | 配置写丢/写错 | 开工先 describe() 枚举实拍；错则改 ns 常量重发 |
| 推论 3 不成立（条目配置不注入 apply） | 基线读不到 | 上机 dump 实测；降级为 describe() 直读结果 |
| 0.1.7 后续 rc 再变 settings API | 适配返工 | devDeps 锁定首个验证过的 rc；升级单列卡片 |
| 前端模块 id 未命中疑点坐实（事实 7） | 面板空白但保活不中断 | 上机 console 看注入失败日志；必要时换注入 id，独立小修 |

## 验证要点

- TEST（vitest）：双宿主路径单测（register 存在/不存在两个桩）
- BUILD + typecheck（0.1.7-rc.1 devDeps）
- docker e2e 三宿主全绿（0.1.1-rc.2 / 0.1.2-alpha.5 / 0.1.7-rc.1）
- 真机：0.1.7 宿主升级后插件加载、GUI 改配置→引擎下一周期生效、remove-provider 落 profile patch

## 变更记录

- 2026-09-24：初稿（登记自宿主 0.1.7-rc.1 升级评估会话，证据见"已探测事实"）
