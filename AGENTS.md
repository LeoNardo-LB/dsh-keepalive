# AGENTS.md — dsh-keepalive

DSH（DeepSeek Harness）的提供商保活插件：HOST 半为每个提供商维护独立抖动定时器，经 ctx.llm.stream 发送拟人保活消息；CLIENT 半在 Web GUI 显示状态/历史并可控制与改配置。核心栈 TypeScript + Cordis 插件框架 + React（经 DSH client slots 消费）。

## 文档索引（先查这里）

> ⚠️ **修改任何文档或规则前，先读 [ai-dev-guide/meta/edit-card.md](ai-dev-guide/meta/edit-card.md) 编辑五律**（命题保全/单一真相源/现在时态/指针三要素/同 commit 更新）。
> 级别语义：🔴 MUST = 该场景下先读再行动 · 🟡 SHOULD = 推荐，跳过需理解后果 · 🟢 MAY = 可选背景。MUST 数量受控，避免「都重要 = 都不重要」。

<!-- GEN:agents-index:start -->
| 级别 | 文档 | 用途 | Use when |
|------|------|------|----------|
| 🔴 MUST | [ai-dev-guide/meta/edit-card.md](ai-dev-guide/meta/edit-card.md) | 文档与 AGENTS 规则编辑卡（核心五律 + 指回源仓） | 修改任何文档或 AGENTS.md 规则前 |
| 🔴 MUST | [ai-dev-guide/standards/architecture.md](ai-dev-guide/standards/architecture.md) | 架构规范：分层、承重规则、深度模块、不过度设计 | 跨层改动、设计/修改模块接口前 |
| 🔴 MUST | [ai-dev-guide/workflows/bug.md](ai-dev-guide/workflows/bug.md) | Bug 分析：根治优先、补丁协议、反模式、模式审计 | 诊断或修复任何 bug 前 |
| 🔴 MUST | [ai-dev-guide/workflows/dev.md](ai-dev-guide/workflows/dev.md) | 开发循环六步、编辑协议、提交规范、并行纪律 | 任何代码编辑任务开始前 |
| 🔴 MUST | [ai-dev-guide/workflows/release.md](ai-dev-guide/workflows/release.md) | 发版权威：版本/构建/签名/CHANGELOG/回滚 | 任何发版、版本号、tag、Release 操作前 |
| 🔴 MUST | [ai-dev-guide/workflows/verify.md](ai-dev-guide/workflows/verify.md) | 完成验证：五维证据、交叉验证、人工门禁 | 声称任何任务完成前 |
| 🟡 SHOULD | [ai-dev-guide/stack/stack-profile.md](ai-dev-guide/stack/stack-profile.md) | 栈档案：构建命令/版本真相源/平台约束唯一真相源 | 不确定构建命令、依赖版本、目录约定时 |
| 🟡 SHOULD | [ai-dev-guide/standards/code-style.md](ai-dev-guide/standards/code-style.md) | 代码风格、注释覆盖矩阵、AI 友好编码 | 编写新代码、评审风格前 |
| 🟡 SHOULD | [ai-dev-guide/standards/reliability.md](ai-dev-guide/standards/reliability.md) | 可靠性：错误处理/并发/资源/日志/幂等 | 涉及错误处理、并发、日志、边界时 |
| 🟡 SHOULD | [ai-dev-guide/standards/test-strategy.md](ai-dev-guide/standards/test-strategy.md) | 测试策略、各层覆盖、Mock 纪律 | 编写测试、决定层级与范围时 |
| 🟡 SHOULD | [ai-dev-guide/standards/ui-conventions.md](ai-dev-guide/standards/ui-conventions.md) | UI 统一性：框架忠诚/设计令牌/状态展示/本地化 | 编写/修改 UI 前 |
| 🟡 SHOULD | [ai-dev-guide/templates/ability-domains.md](ai-dev-guide/templates/ability-domains.md) | 能力域清单骨架（四件套 + 维护规则） | 建立/维护能力域清单时 |
| 🟡 SHOULD | [ai-dev-guide/templates/backlog-entry.md](ai-dev-guide/templates/backlog-entry.md) | 待办卡片格式（≤3 行索引卡 + 机械不变量） | 登记待办前 |
| 🟡 SHOULD | [ai-dev-guide/templates/bug-record.md](ai-dev-guide/templates/bug-record.md) | Bug 修复记录（三层分类 + 判定三问结论） | 修复完成随 commit 附记录时 |
| 🟡 SHOULD | [ai-dev-guide/templates/context.md](ai-dev-guide/templates/context.md) | 项目领域术语表骨架（CONTEXT.md，定义+Avoid） | 初始化项目术语表、统一领域用语时 |
| 🟡 SHOULD | [ai-dev-guide/templates/debt-entry.md](ai-dev-guide/templates/debt-entry.md) | 债务条目格式（状态词表唯一归宿） | 登记债务时 |
| 🟡 SHOULD | [ai-dev-guide/templates/e2e-plan.md](ai-dev-guide/templates/e2e-plan.md) | E2E 期望文档（测什么/期望什么） | 大型 E2E 测试设计时 |
| 🟡 SHOULD | [ai-dev-guide/templates/e2e-runbook.md](ai-dev-guide/templates/e2e-runbook.md) | E2E 实操记录（逐轮追加/差异归属） | 执行 E2E 测试时 |
| 🟡 SHOULD | [ai-dev-guide/templates/journal-entry.md](ai-dev-guide/templates/journal-entry.md) | 批次日志骨架（开工时创建；证据 append-only 归宿） | 开启新工作批次时 |
| 🟡 SHOULD | [ai-dev-guide/templates/manual-ui-checklist.md](ai-dev-guide/templates/manual-ui-checklist.md) | 人工验证清单（时间性现象） | UI 涉及动画/闪烁/计时类现象时 |
| 🟡 SHOULD | [ai-dev-guide/templates/plan.md](ai-dev-guide/templates/plan.md) | 实施计划骨架（Task/Steps/精确签名/TDD） | 大改动实施前 |
| 🟡 SHOULD | [ai-dev-guide/templates/release-notes.md](ai-dev-guide/templates/release-notes.md) | 发版说明骨架（面向用户公告） | 撰写发版说明时 |
| 🟡 SHOULD | [ai-dev-guide/templates/requirement.md](ai-dev-guide/templates/requirement.md) | 需求澄清卡（验收标准先行） | 澄清需求、展开规格时 |
| 🟡 SHOULD | [ai-dev-guide/templates/research-report.md](ai-dev-guide/templates/research-report.md) | 调查报告 A / 回归报告 B | bug 深挖、回归走查输出时 |
| 🟡 SHOULD | [ai-dev-guide/templates/spec.md](ai-dev-guide/templates/spec.md) | 设计文档骨架（事实/推论分离防幻觉；active→archive 生命周期） | 大改动设计前 |
| 🟡 SHOULD | [ai-dev-guide/workflows/debt.md](ai-dev-guide/workflows/debt.md) | 技术债务登记纪律、偿还流程、grep 检查 | 登记/偿还技术债时 |
| 🟡 SHOULD | [ai-dev-guide/workflows/evidence.md](ai-dev-guide/workflows/evidence.md) | 观测与取证：日志/数据直查/网络/UI dump/证据链 | 调试、取证、验证运行时行为前 |
| 🟡 SHOULD | [ai-dev-guide/workflows/regression.md](ai-dev-guide/workflows/regression.md) | 回归验证：变更分类、性能基线、能力域、定性三问 | 涉及已有能力的变更后 |
| 🟡 SHOULD | [ai-dev-guide/workflows/requirements.md](ai-dev-guide/workflows/requirements.md) | 需求全生命周期（优先级与状态机唯一归宿） | 接收新需求、澄清拆解、验收前 |
| 🟢 MAY | [ai-dev-guide/bootstrap/onboarding.md](ai-dev-guide/bootstrap/onboarding.md) | 新项目接入说明（init.sh 的人话版） | 新项目初始化时 |
| 🟢 MAY | [ai-dev-guide/templates/adr.md](ai-dev-guide/templates/adr.md) | 架构决策记录骨架 | 记录架构决策时 |
| 🟢 MAY | [ai-dev-guide/templates/changelog.md](ai-dev-guide/templates/changelog.md) | CHANGELOG 骨架（Keep a Changelog） | 更新 CHANGELOG 时 |
| 🟢 MAY | [ai-dev-guide/templates/release-runbook.md](ai-dev-guide/templates/release-runbook.md) | 手动发版步骤（发版脚本不可用时逐项执行） | 手动发版时 |
| 🟢 MAY | [ai-dev-guide/templates/verification-node.md](ai-dev-guide/templates/verification-node.md) | 验证节点（环境/步骤/断言/证据可复现清单） | 组织多步验证证据时 |
<!-- GEN:agents-index:end -->

## Build & Run

> 精确命令（含 flags、超时）的唯一真相源是 [ai-dev-guide/stack/stack-profile.md](ai-dev-guide/stack/stack-profile.md) §5。此处只放符号：BUILD（编译检查）/ TEST（单元测试，强制重跑）/ RUN（完整构建），全带超时。

## 架构概览

双半边 Cordis 插件：HOST 半承载领域与数据（调度引擎 → llm 调用 → 持久化 → HTTP 路由），CLIENT 半只做展示（slots 注册组件，同源 fetch 轮询只读快照）。依赖方向单向：CLIENT → HTTP 路由 → 引擎；引擎不感知 UI。栈与目录约定见 [ai-dev-guide/stack/stack-profile.md](ai-dev-guide/stack/stack-profile.md)。

**承重架构规则**（违反会引入回归，详见 docs/specs/2026-08-25-keepalive-v1.md）：

- 调度状态单一真相源：每 provider 的 nextFireAt/连续失败数/停放标志只存在于引擎内存态；HTTP 路由与 CLIENT 只读快照；持久层只存配置与历史。
- 配置单一真相源：settings namespace `dsh-keepalive` 是用户可调配置唯一入口，引擎只经 SettingsScope 消费；禁止旁路直改 YAML。
- 静默铁律：保活调用不产生任何会话/模型可见事件——不建 session、不发 session/event、不进 systemPrompt；违反 = 污染会话上下文。
- 定时器只经 ctx.effect 登记的 ctx.timeout/interval 创建（fiber dispose 自动回卷）；禁止裸 setInterval/setTimeout。
- 间隔下限 60s：任何路径计算下次发射时间必须经 clampInterval；违反 = 可配置成打爆提供商。

## 关键约束

- **编辑协议**：大文件/承重文件的编辑纪律见 [ai-dev-guide/workflows/dev.md](ai-dev-guide/workflows/dev.md) §2（先读后编辑/编译后提交/失败回滚/禁止并行编辑）。
- **验证铁律**：没有新鲜的验证证据不能声称完成——[ai-dev-guide/workflows/verify.md](ai-dev-guide/workflows/verify.md)。时间性现象（闪烁/动画/计时）必须人工验证。
- **登记三分离**：待办进 backlog（卡片 ≤3 行）；批次证据进 docs/journal/（开工即建 new-batch.sh）；完结即迁移。规则见 [ai-dev-guide/workflows/requirements.md](ai-dev-guide/workflows/requirements.md)。
- **版本相位阶梯**：新版本必经 开发版 dev.n → 测试版 beta → 正式版，不可跳级；版本操作一律走 ai-dev-guide/scripts/release-version.sh（规则见 [ai-dev-guide/workflows/release.md](ai-dev-guide/workflows/release.md) §2.1）。

## 需求与待办

backlog.md 是未决工作索引：用户说「以后做」/顺带发现的无关问题 → 立即登记卡片，不现场实现；开始新任务前先扫 backlog 防重复。

## 分支与远程仓库

| Remote | URL | 角色 |
|--------|-----|------|
| origin | https://github.com/OWNER/dsh-keepalive（尚未创建；首次推送前替换 OWNER，见 backlog #3） | 上游发布仓库（推送由用户执行） |

## 其他

- **国际化**：文案改动是全语言事务，纪律见 [ai-dev-guide/standards/ui-conventions.md](ai-dev-guide/standards/ui-conventions.md) §7。
- **签名与密钥**：密码不入 git；CI 用 Secrets；发版后验证产物签名，见 [ai-dev-guide/workflows/release.md](ai-dev-guide/workflows/release.md)。
- **SDK/依赖版本**：以构建文件为单一真相源，不在此重复。

<!-- 由 ai-dev-guide 生成；修改索引请改源仓 manifest.yaml 并重新生成 -->