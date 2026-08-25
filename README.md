# dsh-keepalive

DSH（DeepSeek Harness）提供商保活插件：为每个模型提供商维护**独立随机抖动定时器**，到点向该提供商静默发送一条拟人保活消息（中文短语 + ISO8601 时间戳 + 随机十六进制串），在 Web GUI 提供状态面板、发送历史、按天统计与完整配置能力。

## 特性

- **独立错峰调度**：每提供商独立定时器，实际间隔 = 基准间隔 × (1 ± 抖动%) 均匀分布；从上次发送**完成**时刻起算。
- **拟人消息**：100 条固定中文口语短语（不重复洗牌）+ 带时区 ISO8601 时间戳 + 8 位随机 hex。
- **静默**：不创建会话、不产生任何模型可见事件；痕迹只在插件自己的存储与面板里。
- **成本控制**：`maxTokens: 1`，读完整个流即止；每提供商可单独指定保活模型（默认用该提供商第一个模型）。
- **失败处理**：单次失败不重试（等下个周期）；连续 N 次失败自动**停放**（阈值可配，可关），面板手动恢复。
- **重启补发**：进程重启/休眠后发现错过排定时刻 → 5 秒后补发一发再正常续排。
- **Web 面板**：composer 上方常驻摘要条（倒计时 + 最近结果）+ 全页面板（提供商卡片 / 历史 / 统计 / 配置表单 / 立即发送 / 暂停恢复）。
- **零上游修改**：不 patch DSH 安装树；面板经插件自注册的 HTTP 路由同源轮询，升级免疫。

## 安装

### 从 GitHub（推荐生产用法）

```bash
dsh plugin --profile web add github:<你的账号>/dsh-keepalive
```

包内 `dsh.bundle` 清单会把插件自动 reconcile 进 profile 的 bundle 层；client 构建产物（`lib/client.js`）已提交，目标机无需构建链。安装后重启 `dsh web`。

### 本地开发挂载

在 `~/.dsh/profiles/web/cordis.patch.yml` 追加（指向本仓库 checkout）：

```yaml
- insert:
    - id: dsh-keepalive
      name: 'dsh-keepalive'   # 需能在 $DSH_HOME/profiles/node_modules 解析到本包
```

或直接 `dsh plugin --profile web add /path/to/dsh-keepalive`。修改文件后用户补丁 watch 会热重载。

## 首次使用

1. 启动 `dsh web`，打开 Web GUI。
2. composer 上方出现 keepalive 摘要条，点击打开面板。
3. 首次运行总开关为**关**，提供商列表已预填当前全部已注册路由——确认/勾选后打开总开关即开始保活。

## 配置（`$DSH_HOME/settings.yaml` 的 `dsh-keepalive` 节，热生效）

| 键 | 默认 | 说明 |
|---|---|---|
| enabled | false | 总开关 |
| intervalMinutes | 30 | 基准间隔（分钟），下限钳制 1 |
| jitterPercent | 20 | ±抖动百分比（0-100） |
| autoPause.enabled | true | 连续失败自动停放 |
| autoPause.threshold | 5 | 停放阈值 |
| providers.<id>.enabled | true | 该提供商是否参与 |
| providers.<id>.model | （省略） | 该提供商的保活模型；省略 = 默认模型 |

## 开发

```bash
pnpm install && pnpm approve-builds esbuild
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run（36 单测）
pnpm build       # host tsc 产物 + client esbuild bundle
bash e2e/run-docker.sh   # Docker 容器完整实机验证（7 场景 driver）
```

架构与决策记录见 `docs/specs/2026-08-25-keepalive-v1.md`；开发规范系统在 `ai-dev-guide/`。

## 已知限制（v1）

- 保活生命周期 = `dsh web` 进程生命周期（DSH 无 daemon）；进程停止期间无保活，重启后补发一发。
- 不做原生 Settings→Plugins 卡片（配置只在插件面板）。
- 保活消息固定中文短语库（100 条，改短语 = 改代码）。

## License

MIT
