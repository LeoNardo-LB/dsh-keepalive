# <项目名> — 需求与问题总览

本文档是唯一的**未决工作项清单**：只保留尚未完结的需求与问题卡片。条目完结（用户验收）后**当场迁出**——记录连同证据移入 docs/journal/ 对应批次文件，本文件不保留完结记录；历史查询走 journal 与 git。

**卡片格式**：标题（含全局编号）+ Tag + 状态 checkbox + ≤3 行摘要 + 链接。需求全文、实现要点、验证证据一律写在链接目标（spec/journal）中，不内联。登记新批次用 new-batch.sh（自动建 journal 文件）；改动后跑 check.sh --deployed 校验机械不变量。

**编号**：全局递增，不回收。下一编号：**#5**。

**优先级定义**（P0-P3 唯一归宿：系统 workflows/requirements.md「优先级定义」节）：

| 等级 | 含义 |
|------|------|
| P0 | 影响主流程体验或核心业务场景的 bug |
| P1 | 主要业务流程的功能需求 |
| P2 | 优化与小 bug：不影响主流程的改进 |
| P3 | 观察项 / 依赖外部条件的低价值改进 |

**状态流转**（唯一归宿：系统 workflows/requirements.md「状态流转」节）：进行中 [ ] → 待验证 [~]（自动化过、待用户验收）→ 已完成 [x]（仅迁移瞬间存在，随即迁入 journal）。

**Tag 体系与卡片格式**：见系统 templates/backlog-entry.md。

---

## P0 — 主流程阻塞

- [ ] **#1 文档系统初始化** `refactor`
  - 部署本文档系统（init.sh）并完成首检（链接/占位符/门禁全绿）
  - → 详情：docs/journal/（本条为 init 首条示例，完结后迁移）

## P1 — 核心功能需求

- [~] **#4 双宿主兼容改造（0.1.1-rc.2 ⇄ 0.1.2-alpha.5）** `feat`
  - 已实施 0.1.0-dev.2（commit f9ff414）：全部自动化验证绿——typecheck + 58 单测 + build + **docker e2e 双宿主双轮 8/8 PASS**（rc.2 与 alpha.5 镜像）
  - 待用户验收后迁移 journal；→ 设计全文：workspace/2026-09-02-dsh插件矩阵统一改造-to-spec.md

## P2 — 优化与锦上添花

- [ ] **#3 GitHub 远程仓库占位 OWNER 替换** `chore`
  - AGENTS.md origin URL 中 OWNER 待用户建仓后替换并首次推送（推送由用户执行）
  - → 触发条件：用户创建 github 仓库时

## P3 — 观察与低价值改进
