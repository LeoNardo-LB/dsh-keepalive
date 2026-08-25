# 发版（Release）

> 发版唯一权威：版本规则、构建纪律、签名、CHANGELOG 与回滚。任何版本号变更、tag、Release 操作前先读。
> 手动发版步骤（发版脚本不可用时）已外链为 [release-runbook.md](../templates/release-runbook.md) 逐项执行清单。

## Use when

- 任何发版、版本号变更、tag、Release 操作前（必读）
- 不确定发预发布还是正式版时（默认预发布，§2）
- 发版后验证与回滚决策时

## 1. 总览：脚本 + 手动双轨

| 轨道 | 覆盖范围 |
|------|----------|
| 版本脚本 scripts/release-version.sh | **只管版本相位**：init / next --bump / dev / beta / stable / validate——阶梯强制、非法转移拒绝、VERSION_CODE 递增、格式校验 |
| 手动流程（[release-runbook.md](../templates/release-runbook.md)） | 其余全部步骤：递进判据判断、Release Notes 草稿、CHANGELOG 更新（仅正式版）、commit/tag/push、构建与发布、发版后验证——逐项执行并核对红线清单 |

分工原理：递进字段（major/minor/patch）由人按 §2.1 语义判断并以 `--bump` 告知脚本；脚本强制阶梯与格式（人不能跳级、不能手改号）；产物构建在本地或 CI 完成，密钥只经 CI Secrets 注入。任何一步出问题都可独立重跑。

违反后果：绕过脚本手工改号 → 版本号/tag/Release 不一致、非法相位流出。

## 2. 版本规则

### 2.1 格式与相位阶梯

```
<MAJOR>.<MINOR>.<PATCH>[-dev.<n>|-beta]
```

| 相位 | 后缀 | 含义 |
|------|------|------|
| 开发版 | -dev.n | 开发迭代预览；n 从 1 起，同版本内递增 |
| 测试版 | -beta | 测试验证预览；无序号 |
| 正式版 | 无后缀 | 稳定发布 |

递进字段语义（SemVer 适配）：MAJOR = 不兼容架构变更/完整重写（BREAKING CHANGE / feat!）· MINOR = 新功能（feat）· PATCH = 修复/性能/UI 调整（fix / perf / refactor）。

**相位阶梯（强制，不可跳级）**：每个新版本必须从上一正式版 bump 出 dev.1，依次走过 开发版 → 测试版 → 正式版：

```
1.0.1（上一正式版） --next --bump patch--> 1.0.2-dev.1 → 1.0.2-dev.2 → 1.0.2-beta → 1.0.2
```

| # | 规则 | 违反后果 |
|---|------|----------|
| 1 | 新版本唯一入口：从正式版 `next --bump <major|minor|patch>` → 下一版本 dev.1 | 跳级发布未验证版本 |
| 2 | dev.n 可继续迭代（`dev` → n+1）；自验通过升 `beta`；测试通过转正 `stable`（去后缀） | 相位混乱，用户分不清产物成熟度 |
| 3 | beta 发现缺陷：退回同版本 dev（`dev`，n 续增）修复，再走 beta → stable | 缺陷带病转正 |
| 4 | 版本操作一律走 scripts/release-version.sh——非法转移（stable→beta、dev→stable 等）直接拒绝 | 手工改号产生非法版本 |
| 5 | 每次相位推进 VERSION_CODE +1，只增不减 | 已安装用户无法覆盖升级 |

### 2.2 版本号单一真相源

版本文件为 KEY=VALUE 文本，由脚本管理：VERSION_NAME（相位版本号）· VERSION_CODE（整数递增）· DEV_CYCLE（当前版本已用过的最大 dev 序号，beta 退回修复时靠它续增 n；禁止手改）。

| 规则 | 违反后果 |
|------|----------|
| 版本号只存于版本文件（路径按栈在 [stack-profile.md](../stack/stack-profile.md) §6 声明）；构建文件从它读取，禁止硬编码 | 多处维护 → 改一处漏一处，产物与 tag 不一致 |
| 版本变更一律走 scripts/release-version.sh；发版前跑其 validate 子命令 | 手改绕过阶梯校验 |
| CI 提取不改格式 | CI 解析失败 → 发版中断 |
| 严禁版本号修改前构建 | 产物内嵌版本与 tag/Release 不一致 |

### 2.3 相位默认策略

日常迭代发开发版（dev.n）；dev 自验（构建/测试/静态检查）通过后升 beta（真机与人工验证）；用户明确说「正式发版/发 stable」才转正。违反后果：未就绪版本被用户当稳定版升级。

## 3. 构建纪律

| 规则 | 违反后果 |
|------|----------|
| 单任务产出单包：每次构建只跑对应目标的单个构建任务 | 一版多包 → 分担混淆 |
| 构建命令必须带超时（命令与超时真相源：[stack-profile.md](../stack/stack-profile.md) §5） | 无超时裸跑 → 挂死无反馈 |
| 版本号更新在构建之前 | 内嵌版本错误 |

## 4. 产物命名与历史

- 一版一包，命名「项目名-版本.扩展名」；每个 Release 只附一个包
- 不删历史 Release/Tag：用户可下载所有历史版本；删除须有明确的用户决策记录
- 违反后果：用户无法回退

## 5. 签名与密钥

| 规则 | 违反后果 |
|------|----------|
| 密钥不入库：release keystore 及密码不进版本库 | 密钥泄露 → 产物可被伪造 |
| CI 用 Secrets 注入 | 密钥明文进配置/日志 |
| Secrets 未配置时构建回退 debug 签名，且全新 runner 每次生成不同 debug keystore → 每次发版签名不同 → 用户升级报「签名冲突」；发版前必须核对 Secrets 齐全 | 用户被迫卸载重装，数据丢失 |
| 发版后验证产物签名（release 证书而非默认 debug 证书；验证命令见 [stack-profile.md](../stack/stack-profile.md) §6 发布验证行） | 签名错误到用户端才发现 |

## 6. CHANGELOG 与 Release Notes 分工

| 项 | CHANGELOG（[changelog.md](../templates/changelog.md)） | Release Notes（[release-notes.md](../templates/release-notes.md)） |
|----|-----------|---------------|
| 更新时机 | 仅正式版 | 每次发版（含预发布） |
| 范围 | last stable → HEAD | last tag → HEAD |
| 篇幅 | 完整运行记录 | 更短更聚焦的用户公告 |

违反后果：预发布就更新 CHANGELOG → 中间产物噪音污染用户升级决策。

## 7. 安全与合规检查

发版前逐项核对；具体命令/配置按栈见 android-kotlin-example.md：

| # | 检查项 | 违反后果 |
|---|--------|----------|
| 1 | 权限最小化：清单无死权限，运行时权限有对应使用点 | 商店拒审/隐私受损 |
| 2 | 凭据加密存储，不落明文存储/日志 | 凭据泄露 |
| 3 | 备份配置排除敏感数据，或禁用备份 | 敏感数据随备份外泄 |
| 4 | 网络安全配置未全局允许明文流量，仅必要域名白名单 | 中间人截获 |
| 5 | 目标 SDK 版本满足商店/平台当期政策期限 | 商店拒审 |
| 6 | 混淆保留规则完整（序列化注解/网络库/反射类/渲染器状态模型） | 发布包运行时反射失效崩溃 |

## 8. 回滚方案

- 回滚 = 发新的修复版（PATCH bump），**不删除**已发布 Release/Tag
- 严重问题：在既有 Release 说明中标注 deprecated/警告，引导用户安装修复版
- 违反后果：试图删 Release 回滚 → 历史丢失 + 已安装用户无升级路径

## 9. 红线清单（发版前逐条核对）

| # | 红线 | 违反后果 |
|---|------|----------|
| 1 | 已读本文档 | 版本操作无权威依据 |
| 2 | 版本号只改版本文件且格式未变 | tag/产物版本不一致 |
| 3 | 版本号更新后才构建 | 内嵌版本错误 |
| 4 | 每版一个包，命名规范 | 多包分发混淆 |
| 5 | 不删历史 Release/Tag | 用户无法回退 |
| 6 | CI Secrets 已配置（无 debug 回退） | 签名冲突，用户无法升级 |
| 7 | 产物签名验证通过（release 证书） | 用户升级失败 |
| 8 | 默认预发布（用户未明说正式） | 未就绪版本被当稳定版 |
| 9 | 发版后验证清单全部通过；文档链接门禁（check.sh）通过 | 带病发版 |

## 10. 发版后验证清单

- [ ] Release 存在且类型正确（stable 非 prerelease；beta/dev 为 prerelease）
- [ ] 恰好 1 个包，命名规范
- [ ] Release 说明非空且含版本摘要（非仅 changelog 链接）
- [ ] 包元数据与版本文件一致
- [ ] 产物签名验证通过（§5）
- [ ] CHANGELOG 已更新（仅 stable）
- [ ] 历史 Release/Tag 未被删除

## Related

- 手动发版步骤：[../templates/release-runbook.md](../templates/release-runbook.md)
- 回归验证（发版前）：[regression.md](./regression.md)
- CHANGELOG 模板：[../templates/changelog.md](../templates/changelog.md)
- Release Notes 模板：[../templates/release-notes.md](../templates/release-notes.md)
- 栈档案（构建/签名命令真相源）：[../stack/stack-profile.md](../stack/stack-profile.md)