# 新项目接入（Onboarding）

> init.sh 的人话版说明。自动化流程见脚本；本文回答「脚本做了什么、什么需要人做」。

## Use when

- 新建项目 / 为存量项目接入本系统时
- 上游文档系统更新、需要重新同步时（upgrade.sh）

## 1. 三步接入

| # | 步骤 | 命令 | 脚本做什么 |
|---|------|------|-----------|
| 1 | 部署 | ./scripts/init.sh 目标项目根（在本源仓运行；目标项目内只有 check/new-batch/release-version/scan-secrets 四个运行时脚本） | 按裁剪组复制部署平面 → 生成 AGENTS.md（索引实例化）→ 实例化 backlog/CONTEXT/能力域/债务登记簿 → 跑部署门禁 → 报告待补占位符 |
| 2 | 补填 | 人工 | AGENTS.md 的项目占位符 + stack-profile.md 栈事实 + CONTEXT.md 首批术语 + 3-5 条承重红线 |
| 3 | 提交 | git | AGENTS.md + 系统目录 + backlog.md + CONTEXT.md + docs/ 同 commit（可先跑 系统目录/scripts/scan-secrets.sh）；backlog 首条登记「文档系统初始化」 |

init.sh 选项：--dir 系统目录名（默认 ai-dev-guide）· --no-ui（无 UI 项目）· --no-example（非参考栈）。

## 2. 裁剪组（manifest 驱动，本表由 gen-index.py 生成）

<!-- GEN:trim-table:start -->
| 裁剪组 | 文档 | 何时可删 |
|--------|------|----------|
| core | `bootstrap/onboarding.md`、`meta/edit-card.md`、`stack/stack-profile.md`、`standards/architecture.md`、`standards/code-style.md`、`standards/reliability.md`、`standards/test-strategy.md`、`templates/ability-domains.md`、`templates/adr.md`、`templates/backlog-entry.md`、`templates/bug-record.md`、`templates/changelog.md`、`templates/context.md`、`templates/debt-entry.md`、`templates/e2e-plan.md`、`templates/e2e-runbook.md`、`templates/journal-entry.md`、`templates/plan.md`、`templates/release-notes.md`、`templates/release-runbook.md`、`templates/requirement.md`、`templates/research-report.md`、`templates/spec.md`、`templates/verification-node.md`、`workflows/bug.md`、`workflows/debt.md`、`workflows/dev.md`、`workflows/evidence.md`、`workflows/regression.md`、`workflows/release.md`、`workflows/requirements.md`、`workflows/verify.md` | 永不（系统核心） |
| registry | `registries/ability-domains.md`、`registries/architecture-debt.md`、`registries/backlog.md` | 永不（init 实例化源） |
| stack-example | `stack/android-kotlin-example.md` | 非对应栈的项目 |
| ui | `standards/ui-conventions.md`、`templates/manual-ui-checklist.md` | 无 UI 的项目（库/CLI） |
<!-- GEN:trim-table:end -->

## 3. 首检清单（init.sh 自动执行；人工复核）

| # | 检查 | 方式 |
|---|------|------|
| 1 | 链接全部可解析（含前缀替换后） | check.sh --deployed 门禁 1 |
| 2 | backlog 不变量（计数器/节序/零完结残留） | check.sh --deployed 门禁 9 |
| 3 | journal/specs 命名合规 | check.sh --deployed 门禁 10 |
| 4 | 占位符残留清单已知（补填后归零） | init.sh 输出报告 |
| 5 | AGENTS.md 行数 ≤200、MUST ≤7 | 人工扫一眼 |

## 4. 上游升级

```
./scripts/upgrade.sh 本仓库根 目标项目根 系统目录名   # 在本源仓运行
```

输出逐文件漂移分类（一致/可直接覆盖/本地化修改/上游有-部署缺/本地新增）+ 建议动作；比对基准是部署时写下的 `.deploy-baseline.txt`（区分「用户本地化修改」与「上游更新」）；只报告不自动覆盖——本地化修改需人工合并。

## 5. FAQ

| 问题 | 回答 |
|------|------|
| 文件夹必须叫 ai-dev-guide？ | 不必；init.sh --dir 改名后索引前缀自动一致 |
| 我的栈不是 Android/Kotlin？ | init.sh --no-example 裁掉范例；按 stack-profile 替换指南重写绑定栈的示例 |
| 完整写作规范在哪？ | 部署面只带 edit-card.md（编辑卡）；完整规范在源仓 meta/ 三份，按需复制 |
| 某条规则总不被遵守？ | 检查指针措辞（Use when 首词 = 触发动词）与级别；虚高的 MUST 会被整体忽视 |

## Related

- 系统设计与术语表：../meta/system-design.md
- 文档编辑卡（部署面）：[../meta/edit-card.md](../meta/edit-card.md)
- 栈档案模板：[../stack/stack-profile.md](../stack/stack-profile.md)