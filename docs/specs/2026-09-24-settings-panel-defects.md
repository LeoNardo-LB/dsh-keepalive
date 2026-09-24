# 设置面板双缺陷：保存丢弃 autoPause 与轮询回显覆盖设计（#7 #8）

日期：2026-09-24
状态：草稿
位置约定：active 位于 docs/specs/；实现并验收后移入 docs/archive/specs/ 并更新本行与 backlog 卡片引用路径

## 背景与目标

- **#7** 保存按钮与"自动停放"开关发出的 autoPause 补丁被 POST /config 路由静默丢弃：HTTP 200 + "已保存配置" toast，配置从未落盘——停放阈值与自动停放开关在 GUI 上完全改不动（手写 settings.yaml 是唯一绕过）。
- **#8** 未保存的配置输入（基准间隔/抖动%/停放阈值）在 ≤5 秒内被轮询回显打回原值，三字段皆然；用户须与 5 秒定时器赛跑才能保存。
- 目标：两缺陷修复 + 回归用例；GUI 与 settings.yaml 两条路径行为一致；#6 适配在其上 rebase。

## 已探测事实

（探测日期均为 2026-09-24）

1. **路由白名单缺 autoPause**：src/routes.ts 的 config 处理器逐键挑拣 enabled/intervalMinutes/jitterPercent/providers 四键，无 autoPause 分支；未识别键静默忽略并返回 200。（手段：读代码）
2. **路由级复现**（手段：node 直调路由处理器，mock req/res/deps）：
   - CASE1 保存按钮实际 payload `{intervalMinutes:20, jitterPercent:30, autoPause:{enabled:true, threshold:3}}` → 进入 settings 的 patch 仅 `{intervalMinutes:20, jitterPercent:30}`
   - CASE2 自动停放开关 payload `{autoPause:{enabled:false, threshold:5}}` → patch 为 `{}`（纯空操作）
   - CASE3 对照 `{intervalMinutes:45}` → patch 完整透传
3. **旁证**：用户 settings.yaml 存在 `jitterPercent: 30`（GUI 改抖动成功落盘）但无 autoPause 键——标量键写路径正常，嵌套键从未到达 settings 层。（手段：读配置文件）
4. **回显覆盖链路**：CLIENT store 每 5000ms pollStatus fetch /plugins/dsh-keepalive/status → response.json() 产生全新对象 → set({status: body})；SettingsTab 以 status.config 渲染 ConfigForm（lib/client.js:688）；ConfigForm 的 useEffect(…, [config]) 按引用触发、无条件重置三输入框。（手段：读代码；症状与用户报告"修改后几秒内恢复原值、三字段皆然"吻合）
5. **配置消费端就绪**：Config schema（src/config.ts）本就声明 autoPause{enabled, threshold min(1) default(5)}，引擎按 cfg.autoPause 判定停放——仅 HTTP 面断链。（手段：读代码）

## 现状代码链路

- 保存：ConfigForm 保存按钮 → store.updateConfig(payload) → POST /config → routes.config 白名单组 patch（src/routes.ts）❌ autoPause 分支缺失（#7）
- 回显：store 轮询（5s）→ status.config（新引用）→ ConfigForm useEffect([config]) 回填三输入框（src/client/ConfigForm.tsx）❌ 无 dirty 守卫（#8）
- 自动停放开关：ConfigForm cfg-autopark 按钮 → 同一 POST 路径 ❌ 同被丢弃（#7）
- 引擎消费：cfg.autoPause.enabled/threshold 判定连败停放（src/engine.ts）✅ 无需改动

## 分节设计

### 节 1 — (#7) 路由补 autoPause 分支

##### 校验与透传

- **方案**：raw.autoPause !== undefined 时校验 {enabled: boolean, threshold: 有限数 ≥1}，通过则 `patch.autoPause = { enabled, threshold: Math.floor(threshold) }`；非法返回 400 带错误文案。vitest 三用例：合法 / 非法 / 缺省不传。
- **取舍**：与既有四键同等的手写校验风格，不引入 schema 库复用。
- **为什么**：白名单补齐即恢复写路径；严格校验避免 NaN/0 混入撞引擎停放判定。

### 节 2 — (#8) ConfigForm dirty 守卫

##### 回填条件

- **方案**：派生 dirty = 三输入框任一 String 值 ≠ config 对应值；useEffect 回填前 if (dirty) return。保存成功后 pollStatus 拉回新 config，本地值与其一致自然对齐。
- **取舍**：放弃"深度比较跳过相同引用"方案（外部真实变更仍会覆盖用户编辑，治标）；放弃"输入聚焦时停轮询"方案（侵入 store 生命周期）。
- **为什么**：dirty 守卫语义即"用户未保存的修改不可覆盖"，一处判断覆盖全部三字段。

### 节 3 — 输入合法性顺手加固（建议并入）

- **方案**：修复 #7 后 Number("")=0 会撞 threshold min(1) 的 400，错误从"静默"变"显式"；保存按钮在任一字段空/非数时禁用并行内提示。
- **取舍**：并入本批（同文件同测）vs 独立小卡；建议并入。
- **为什么**：行内预防优于事后错误 toast。

## 风险与回滚

| 风险 | 影响 | 回滚方式 |
|------|------|----------|
| dirty 守卫掩盖服务端真实变更（两处同时改配置） | 后保存者覆盖先保存者 | 单用户单面板场景可接受；revert 单 commit 即回旧回填行为 |
| autoPause 校验过严拒绝历史手写值 | 保存被 400 卡住 | 手写 settings.yaml 的 autoPause 均为合法整数；如遇异常放宽为取整+告警 |

## 验证要点

- TEST（vitest）：路由 autoPause 三用例；ConfigForm dirty 行为组件测试
- 真机：改阈值→保存→5s 后不回弹→重启后值保持；自动停放开关切换落 settings.yaml（0.1.5）/ profile patch（0.1.7）
- 顺序：本卡先行（独立于宿主版本），#6 适配 rebase 于其上

## 变更记录

- 2026-09-24：初稿（同日诊断两缺陷，证据见"已探测事实"）
