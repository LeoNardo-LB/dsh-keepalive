# 实施计划模板（Plan Template）

> 把已批准的 spec 拆成可逐个验证、可独立提交的实施步骤；agent 按 Task 逐个实施，用 checkbox（`- [ ]`）跟踪，每完成一个 Task 勾选其全部 checkbox 再进入下一个。

## Use when

- spec 已批准、准备动手实现前（先读本模板再拆步骤）
- 执行计划的每个 Task 前（按 Steps 逐步验证）
- 实现跨文件 / 跨模块、需要明确接口边界时

## 模板本体

新建 `docs/specs/YYYY-MM-DD-<kebab>-plan.md`（与对应 spec 同目录、同命名规约）时复制以下各节，逐节填写；占位符一律用尖括号 <...>。

### 头部与总览

```markdown
# <功能/改进名> 实施计划（#<backlog 编号>）

**Goal:** <一段话，本计划要达成的结果>

**Architecture:** <改动分布一段话：改在哪些层/哪些模块，数据怎么流>

**Tech Stack:** <语言> + <UI 框架> + <DI 框架> + <网络库> + <测试框架>（版本与命令以 [../stack/stack-profile.md](../stack/stack-profile.md) 为准）
```

### Global Constraints

本计划所有 Task 共同遵守的约束，复制时保留全部条目：

- 构建 / 测试 / 打包命令与超时：`<构建命令>`（<构建超时> 超时）、`<测试命令>`（<测试超时> 超时）、`<打包命令>`（<打包超时> 超时）——命令真相源为 [../stack/stack-profile.md](../stack/stack-profile.md)，具体平台示例见 ../stack/android-kotlin-example.md
- 编辑协议：涉及承重文件 / 跨层文件时先读 AGENTS.md 对应协议；代码规范见 [../standards/code-style.md](../standards/code-style.md)
- 文案：新增/修改文案按 [../standards/ui-conventions.md](../standards/ui-conventions.md) §7 本地化纪律执行（改源 → 翻译 → 跑检查脚本 <i18n 检查命令>）
- 日志：新日志用项目统一日志入口（见 [../standards/code-style.md](../standards/code-style.md)），不用裸 print / Log
- 范围：不重构无关代码；不碰 <无关模块>；不改服务器端 / 外部依赖行为
- 提交：`git add` 只加本任务文件；工作区存在无关未提交文件时不加入它们

### Task 结构

一个 Task = 一个可独立验证、可独立提交的最小交付。每个 Task 按下列结构与 Steps 填写：

#### Task N: <任务标题>

**Files:**
- Modify: `<path/to/file.ext>`
- Create: `<path/to/new/file.ext>`
- Test: `<path/to/test.ext>`

**Interfaces:**
- Consumes: <依赖的既有签名，精确到函数/字段>
- Produces: <本任务产出/修改的签名，精确到参数与返回>

- [ ] **Step 1: 写失败测试** — <测试代码或断言描述>
- [ ] **Step 2: 运行测试确认失败** — Run: `<单测命令>`；Expected: FAIL（<失败原因>）
- [ ] **Step 3: 实现** — <实现要点>
- [ ] **Step 4: 编译验证 / 运行测试确认通过** — Run: `<编译命令>` / `<单测命令>`；Expected: 通过（含既有测试，无回归）
- [ ] **Step 5: 提交** — `git add <本任务文件>`；`git commit -m "<type>: <描述>"`

### 最终验证 gate

全部 Task 完成后，按 [../workflows/verify.md](../workflows/verify.md) 五维框架跑最终验证，分档通过：

1. 全量单测：`<全量测试命令>` → 全部通过、无回归
2. 构建：`<打包命令>` → 产物产出
3. UI 验证：按 spec「验证要点」列出的本设计特有验证点逐项确认（时间性现象必须人工验证，见 [../workflows/verify.md](../workflows/verify.md)）
4. 回写 backlog：更新对应条目的 checkbox 状态（见 [../workflows/requirements.md](../workflows/requirements.md) §5 完结迁移）

### 计划变更

实现中偏离 spec 或 plan 时（接口签名变化 / 新增 Task / 删除范围），先更新本 plan 与 [spec](./spec.md) 对应节并记录原因，再继续执行；变更后重跑受影响 Task 的验证 Steps。

## 填写指引

| # | 指引 | 违反后果 |
|---|------|----------|
| 1 | Task 粒度：一个 Task = 可独立验证、可独立提交的最小交付 | 粒度太粗无法验证、太细徒增噪音 → 计划失去可执行性 |
| 2 | 每个 Step 以「可检查的 Expected」结尾（FAIL / PASS / BUILD SUCCESSFUL） | 「完成实现」类表述不可判定 → 无法确认 Step 是否完成 |
| 3 | Interfaces 写精确签名（函数名、参数、返回类型），让 Task 可独立于上下文执行 | 签名模糊 → 执行者需自行反推接口，出错率上升 |
| 4 | TDD 顺序：先写失败测试（红）→ 实现（绿）→ 编译/回归（稳），不跳步 | 跳步 → 实现未受测试约束，回归风险上升 |
| 5 | Files 三类（Modify / Create / Test）按需齐全，路径精确到文件 | Files 缺失 → 改动范围不清，提交纪律失效 |

## 填写规则

| # | 规则 | 违反后果 |
|---|------|----------|
| 1 | Global Constraints 全程遵守；命令以 stack-profile 为真相源 | 各自为政的命令 → 构建/测试环境不一致 |
| 2 | 编辑承重 / 跨层文件前先读 AGENTS.md 对应协议 | 违反编辑协议 → 编辑冲突、编译断裂 |
| 3 | 文案改动走本地化纪律，改后跑检查脚本 | 翻译缺失 / 占位符不一致 → 发版时 UI 文案错乱 |
| 4 | 新日志走统一日志入口，不用裸 print / Log | 日志不可观测 → 排查成本上升 |
| 5 | 只改本次范围，不重构无关代码 | 范围蔓延 → 回归面失控 |
| 6 | 每完成一个 Task 勾选其全部 checkbox 再进入下一个 | 完成状态不可追溯 → agent 重复或遗漏工作 |
| 7 | 最终 gate 全部通过才声称完成；未过项不得回写 backlog | 提前声称完成 → 验证框架失效 |
| 8 | 计划变更先更新本 plan 与 spec 对应节并记录原因，再继续执行 | 计划与实现脱节 → 验证与验收失去依据 |

## Related

- 设计文档模板（先写 spec 再拆 plan）：[./spec.md](./spec.md)
- 日常开发循环与编辑协议：[../workflows/dev.md](../workflows/dev.md)
- 完成验证总纲：[../workflows/verify.md](../workflows/verify.md)
- 栈档案与命令真相源：[../stack/stack-profile.md](../stack/stack-profile.md)
- 需求生命周期与验收闭环：[../workflows/requirements.md](../workflows/requirements.md)
