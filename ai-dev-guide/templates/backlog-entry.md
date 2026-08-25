# 待办卡片模板（Backlog Entry）

> backlog 登记簿的卡片格式与机械不变量。backlog 是**未决工作索引**：卡片 ≤3 行摘要 + 链接，完结即迁移。
> 生命周期与流转规则见 [requirements.md](../workflows/requirements.md)。

## Use when

- 登记新待办、新需求、顺带发现的问题时
- 完结迁移（卡片 → journal）时

## 卡片格式

```markdown
- [ ] **#<编号> <标题>** `tag1` `tag2`
  - <≤3 行摘要：现象/需求 + 关键事实；不含实现细节>
  - → 详情与证据：`docs/specs/<设计>.md` / `docs/journal/<批次>.md`
```

## 不变量（强制方式如实标注）

| # | 不变量 | 强制方式 |
|---|--------|----------|
| 1 | 卡片 ≤3 行摘要 + 链接；需求全文/实现要点/验证证据一律写在链接目标 | 纪律（无机械检查，评审把关） |
| 2 | 编号全局递增永不回收；头部维护「下一编号：**#N**」，N 大于全库（backlog+journal+specs）最大编号 | 门禁 9 强制 |
| 3 | 顶层完结 [x] 残留为零——验收通过后当场迁入 journal | 门禁 9 强制 |
| 4 | 卡片内 docs/ 开头的链接目标必须存在；不引用 docs/archive/（归档引用只允许在 journal/spec） | 门禁 9 强制（仅校验 docs/ 链接） |
| 5 | P0-P3 四节标题各恰好一次且按序 | 门禁 9 强制 |
| 6 | 登记簿 ≤250 行——超了说明有完结内容未迁移 | 门禁 9 警告（提示迁移，不阻断） |

## Tag 体系

标记相关领域便于批量排查；现有 Tag 不足以描述则新增（同步登记说明表）；单卡片 ≤3 个。

| Tag | 说明 |
|-----|------|
| crash | 崩溃/闪退 |
| ui | 界面显示、组件缺失、布局 |
| data | 数据展示不准确、数据源疑问 |
| network | 网络连接、请求/推送链路 |
| state | 状态管理、生命周期、并发 |
| refactor | 重构、死代码清理、分层修复 |
| security | 安全与隐私 |
| permission | 权限请求、审批 |

## 优先级与状态

优先级 P0-P3 定义与 [ ]/[~]/[x] 状态流转的**唯一归宿**：[requirements.md](../workflows/requirements.md) §3/§4（CANON 标记锁定）。

## Related

- 需求工作流：[../workflows/requirements.md](../workflows/requirements.md)
- 批次日志模板：[journal-entry.md](./journal-entry.md)
- 需求澄清卡：[requirement.md](./requirement.md)