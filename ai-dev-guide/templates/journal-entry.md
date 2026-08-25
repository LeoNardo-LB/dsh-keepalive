# <YYYY-MM-DD> <批次名>

> 状态：<进行中 / 部分完结 / 已完结>
> 关联：<backlog #编号> · <spec 文件名（如有）>

## 目标

<本批次要完成什么，一两句>

## 过程与证据

<按时间追加：做了什么、观测到什么、证据文件路径（截图/日志/dump 落盘路径）>
<验证输出直接粘贴（含执行时间与结果）>

## 完结迁移区

<验收通过后：backlog 卡片原文逐字迁入此处（不压缩不删改），backlog 删除原卡片>

## 蒸馏（可选）

<可复用的结论提炼到 docs/research/ 后在此写文件名>

<!--
本文件由 scripts/new-batch.sh 实例化（自动替换：日期与批次名）。
模板纪律（实例化后保留本注释或删除均可）：
  1. 开工时创建，过程实时写入；不事后补写——证据失真、遗漏
  2. 只追加不改写：历史轮次记录保持原样——差异分析失真
  3. 完结条目原文迁入（不压缩不删改）——历史信息丢失
  4. journal 只记执行与证据；可复用结论蒸馏进 docs/research/——蒸馏结论埋没
  5. 命名 YYYY-MM-DD-<kebab>.md——排序与检索失效（check.sh 门禁 10）
  6. 本文件不写相对 md 链接（从 docs/journal/ 出发易断链）；引用文档用纯文本路径
配套：workflows/requirements.md（迁移规则）、templates/backlog-entry.md、templates/verification-node.md
-->
