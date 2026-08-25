# 文档编辑卡（Edit Card）

> 部署面的文档修改五律——改任何文档或 AGENTS.md 规则前先过这张卡。完整规范在源仓 meta/（按需复制）。

## Use when

- 修改本项目任何文档、AGENTS.md 规则、backlog/journal/spec 条目前

## 编辑五律

| # | 律 | 判据 |
|---|----|------|
| 1 | 命题保全 | 删改段落前枚举事实子句（行为/条件/情态/否定保证/后果），每个子句必须存活；字数变少不是改进 |
| 2 | 单一真相源 | 一个含义只在一处定义；重复出现的表打 CANON 标记；命令用符号（BUILD/TEST/RUN，定义在 [stack-profile.md](../stack/stack-profile.md) §5） |
| 3 | 现在时态 | 规则正文写「是什么/要做什么」；变更历史入 journal/CHANGELOG，不写 used-to/no-longer |
| 4 | 指针三要素 | 引用任何文档必须带级别 + 用途 + Use when（首词 = 触发动词） |
| 5 | 同 commit 更新 | 改代码的同一 commit 更新文档；完结 backlog 卡片当场迁移入 journal（顶层零完结残留） |

## 登记三分离速记

- backlog = 未决索引（卡片 ≤3 行 + 链接；完结即迁移）
- journal = 批次证据（开工时 new-batch.sh 创建；append-only）
- spec = 设计决策（非显然取舍才写；验收后入 docs/archive/specs/）

## Related

- 需求工作流（迁移规则）：[../workflows/requirements.md](../workflows/requirements.md)
- 栈档案（命令符号定义）：[../stack/stack-profile.md](../stack/stack-profile.md)