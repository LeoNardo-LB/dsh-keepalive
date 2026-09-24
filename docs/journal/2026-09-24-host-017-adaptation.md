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

## 完结迁移区

<验收通过后：backlog 卡片原文逐字迁入此处（不压缩不删改），backlog 删除原卡片>

## 蒸馏（可选）

<待验收后评估：0.1.7 条目模型 volatile 写入链路可蒸馏 docs/research/>
