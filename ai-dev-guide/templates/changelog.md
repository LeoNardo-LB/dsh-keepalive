# CHANGELOG 模板（Keep a Changelog）

> 项目完整变更运行记录的格式：每个正式版对用户可见变化的完整清单，遵循 Keep a Changelog 风格。
> **仅正式版更新**，最新版本置顶，版本号遵循语义化版本；发版流程见 [../workflows/release.md](../workflows/release.md)。

## Use when

- 正式版发布时更新 CHANGELOG
- 新增 / 修改 CHANGELOG 条目时

## 模板本体

````markdown
# Changelog

本项目遵循 [语义化版本](https://semver.org/) 与 [Keep a Changelog](https://keepachangelog.com/)。
**CHANGELOG 仅在正式版（stable）发布时更新**；预发布（beta/dev）的变更在正式版发布时统一汇总。
发版流程见 [../workflows/release.md](../workflows/release.md)。

## [<版本号>] - <YYYY-MM-DD>

### Added

- <新增的用户可见功能>

### Changed

- <已有功能的行为变化 / 优化>

### Deprecated

- <已弃用功能的预告与替代方案>

### Removed

- <已移除功能；破坏性变更需说明>

### Fixed

- <修复的 bug>

### Security

- <安全修复>
````

## 六分类说明表

| 分类 | 何时用 | 正例 | 反例 |
|------|--------|------|------|
| Added | 新增用户可见功能 | 会话未读红点：turn 完全结束后显示 | 新增内部工具类 |
| Changed | 已有功能行为变化 / 优化 | 文件查看器加载动画统一为跳动点风格 | 重构列表状态切片（内部实现） |
| Deprecated | 预告将移除的功能及替代方案 | 旧 API 将于下版本移除，请迁移到新 API | 已删除的功能（应放 Removed） |
| Removed | 已移除的功能 | **BREAKING:** 移除自更新，升级需手动安装 | 删除无用代码（非用户可见） |
| Fixed | 修复的 bug | 修复杀进程后未读红点丢失 | 修复 null 崩溃（未描述用户影响） |
| Security | 安全修复 | 修复 XX 漏洞（CVE-YYYY-XXXX） | 依赖升级到 1.2.3（无安全含义） |

## 条目写法示例

| 分类 | 写法模式 | 示例 |
|------|----------|------|
| Added | 新增 <功能>：<入口/触发方式> | 新增会话未读红点：turn 完全结束后显示 |
| Changed | <功能> 改为 <新行为>：<效果> | 加载动画统一为跳动点风格 |
| Deprecated | <功能> 将于 <版本> 移除，请改用 <替代> | 旧 API 将于下版本移除 |
| Removed | 移除 <功能>：<影响/迁移说明> | BREAKING: 移除自更新，升级需手动安装 |
| Fixed | 修复 <问题>：<修复后表现> | 修复杀进程后未读红点丢失 |
| Security | 修复 <漏洞>（CVE-<编号>） | 修复 XX 漏洞（CVE-2026-0000） |

## 更新时机判断

| 场景 | 是否更新 CHANGELOG | 依据 |
|------|-------------------|------|
| beta / dev 预发布 | 否——变更登记待正式版统一汇总 | 规则 1 |
| stable 正式版 | 是 | 规则 1 |
| 仅重构 / CI / 依赖改动且无用户可见变化 | 否——无条目可写 | 规则 4 |
| 版本号变更但内容未达正式版标准 | 否——继续走预发布 | [../workflows/release.md](../workflows/release.md) |

## 规则

| # | 规则 | 违反后果 |
|---|------|----------|
| 1 | **仅正式版更新**：beta/dev 预发布的变更在正式版发布时统一汇总；时机与范围见 [../workflows/release.md](../workflows/release.md) | 预发布频繁更新 → 记录噪音、与版本错位 |
| 2 | **最新在上**：新版本条目插到 `# Changelog` 之下，旧版本依次下移 | 顺序混乱 → 读者找不到最新版本 |
| 3 | **语义化版本**：版本号遵循 SemVer，递进规则（MAJOR/MINOR/PATCH/预发布）见 [../workflows/release.md](../workflows/release.md) §2 | 版本随意 → 依赖方误判兼容性 |
| 4 | 条目面向用户，只写用户可见变化；重构 / CI / 测试 / 依赖升级不写 | 内部噪音 → 记录失去检索价值 |
| 5 | 版本标题格式 `## [<版本号>] - <YYYY-MM-DD>`，日期为正式版发布日期 | 格式漂移 → 人读与解析失败 |
| 6 | 每条一行、动词开头、1-3 句 | 长段落 → 扫描失败 |
| 7 | 与 Release Notes 分工不混用（见下节） | 混用 → 一处维护两处过期 |

## 与 Release Notes 的区别

| 项 | CHANGELOG | Release Notes |
|----|-----------|---------------|
| 更新时机 | 仅正式版 | 每次发版（含预发布） |
| 范围 | last stable → HEAD | last tag → HEAD |
| 篇幅 | 完整运行记录 | 更短更聚焦 |
| 载体 | 仓库 `CHANGELOG.md` | GitHub Release 说明（[./release-notes.md](./release-notes.md)） |

## Related

- 发版权威指南：[../workflows/release.md](../workflows/release.md)
- 发版说明模板：[./release-notes.md](./release-notes.md)
- 版本号与构建命令：../stack/android-kotlin-example.md