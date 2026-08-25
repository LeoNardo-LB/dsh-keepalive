# 手动发版步骤模板（Release Runbook）

> 发版脚本不可用时的逐项执行清单。正常发版走脚本（[release.md](../workflows/release.md) §1）；本清单仅应急。

## Use when

- 发版脚本不可用、需手动发版时

## 步骤（按序执行，每步有完成判据）

| # | 步骤 | 动作 | 完成判据 |
|---|------|------|----------|
| 1 | bump 版本 | 运行 scripts/release-version.sh <版本文件> next/dev/beta/stable（相位阶梯见 [release.md](../workflows/release.md) §2.1） | 版本文件已按阶梯更新且 validate 通过 |
| 2 | Release Notes | 按 [release-notes.md](./release-notes.md) 撰写（版本摘要 + 分类条目） | 说明非空且含摘要 |
| 3 | commit | 提交版本文件与 Release Notes | 变更有追溯，回滚有依据 |
| 4 | build | 执行 RUN（完整构建命令，定义于 [stack-profile.md](../stack/stack-profile.md) §5，带超时）；**版本号已更新后才构建** | 构建成功、产物产出 |
| 5 | push | 推送分支 | CI 触发 |
| 6 | tag | 创建带注释 tag v<版本> | tag 存在 |
| 7 | push tag | 推送 tag | CI 构建触发 |
| 8 | CI 构建 | 等待 CI 完成并按 [release.md](../workflows/release.md) §10 验证；CI 不可用时可本地创建 Release | 产物与 Release 存在 |
| 9 | 验证 | 按 [release.md](../workflows/release.md) §10 发版后验证清单逐项核对 | 全部通过 |

违反后果：跳过任一步骤 → 版本号/tag/Release/产物四者不一致。

## Related

- 发版权威指南（规则）：[../workflows/release.md](../workflows/release.md)
- Release Notes 模板：[release-notes.md](./release-notes.md)
- CHANGELOG 模板：[changelog.md](./changelog.md)