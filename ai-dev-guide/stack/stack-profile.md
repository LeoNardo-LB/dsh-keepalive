# 栈档案（Stack Profile）

> 本项目的语言与框架事实档案——全系统**唯一**的栈相关真相源。
> 其他文档只引用本文件，不重复版本号与命令。

## Use when

- 不确定构建命令、依赖版本、目录约定、平台约束时
- 新会话开始时快速对齐栈事实
- 评估技术栈更换时

## 填写规则

| # | 规则 |
|---|------|
| 1 | 单一真相源：依赖/编译版本以构建文件为准，本档案只记「哪个文件是真相源」，不复制版本号 |
| 2 | 每节给出精确可执行命令（含 flags 与超时）；命令符号 BUILD/TEST/RUN 在 §5 定义，全系统引用此处 |
| 3 | 目录约定写「事实」：哪个目录放什么、依赖方向 |
| 4 | 红线（版本/代理/签名）标注 ⚠，它们属于 AGENTS.md 内联候选 |

## 1. 语言与运行时

| 项 | 内容 | 真相源 |
|----|------|--------|
| 语言/版本 | TypeScript（仅可擦除语法：禁 enum/namespace）+ Node ESM | package.json + tsconfig.json |
| 工具链约束 | ⚠ 宿主半类型解析依赖安装版 dsh 的 @deepseek-ai/* peer（pnpm 链接）；生产安装不走构建链（client 产物入库） | package.json peerDependencies |
| 平台 | 开发 Linux 本机；实机验证 Docker 容器内 node | docker/Dockerfile |

## 2. UI 框架与架构范式

| 项 | 内容 |
|----|------|
| 框架/组件库 | React 18（不直接依赖：CLIENT 半组件经 DSH client runtime 的 slots 系统注册，peer 提供 react） |
| 分层与依赖方向 | CLIENT（slots UI）→ 同源 HTTP 轮询 → HOST 路由 → 引擎；引擎不感知 UI |
| DI | Cordis inject 声明（宿主半 export const inject = [...]；客户端半 dsh.client.inject 清单） |
| 状态管理 | 配置 = settings namespace `dsh-keepalive`；运行时 = 引擎内存态唯一真相；历史 = storageDomain KV |

## 3. 网络与数据

| 项 | 内容 |
|----|------|
| HTTP/事件流 | ⚠ HOST 经 ctx.webServer.register 提供只读状态/历史 + 配置写入/动作端点；CLIENT 同源 fetch 5s 轮询 + 本地倒计时（无 WS 推送，不 patch 上游转发数组） |
| 本地存储 | 配置 → $DSH_HOME/settings.yaml（settings 服务）；历史/统计 → $DSH_HOME/storages（storageDomain JSON） |
| 序列化 | JSON（路由响应与存储一律 JSON） |

## 4. 测试栈

| 层 | 框架与位置 |
|----|-----------|
| 单元 | vitest（src/**/*.test.ts；纯逻辑：间隔计算/消息构造/短语库/历史修剪） |
| 集成 | Docker 容器内真实 dsh web 挂载插件（docker/ 验证脚本） |
| UI/E2E | Docker 实机：curl 断言路由 + 浏览器人工清单（时间性现象走人工维度） |

> 各层覆盖要求与纪律见 [test-strategy.md](../standards/test-strategy.md)。

## 5. 构建与打包（命令符号定义处）

```
BUILD   # pnpm -s typecheck（tsc --noEmit，双 tsconfig），超时 120s
TEST    # pnpm -s test（vitest run，全量强制重跑），超时 300s
RUN     # pnpm -s build（宿主半 tsc 产物 + CLIENT 半 bundle 到 dist-client/），超时 300s
```

三个符号是全系统文档引用命令的唯一词根；具体命令、flags、超时只在此处定义。

| 项 | 内容 |
|----|------|
| 多环境/多包 | 单包双入口（. 宿主半 / ./client 客户端半） |
| 产物输出 | dist/（宿主半）+ dist-client/client.js（lazy-CJS factory bundle，git 提交以支持免构建安装） |
| 禁止事项 | 无超时裸跑长时间构建；版本号修改前构建 |

## 6. 签名与发布

| 项 | 内容 |
|----|------|
| 版本文件 | ⚠ package.json version（相位管理见 [release.md](../workflows/release.md) §2.2，走 ai-dev-guide/scripts/release-version.sh） |
| 密钥/证书 | 无签名；API key 一律经 dsh credentials/环境变量，不入本仓库 |
| 发布渠道 | GitHub 仓库（dsh plugin --profile web add github:OWNER/dsh-keepalive） |
| 发布验证 | 全新容器内按 README 安装步骤实机冒烟 |

## 7. 平台与网络约束

| 项 | 内容 |
|----|------|
| 网络/代理 | ⚠ npm registry 直连（已验证可达）；Docker 构建需能拉 node 镜像与装 @deepseek-ai/dsh |
| 环境依赖 | dsh 0.1.1-rc.x（Cordis 插件契约）；Docker daemon（实机验证） |

## 8. 平台硬约束（语言无关，换栈仍在）

| 约束 | 一句话规则 | 典型翻车点 |
|------|-----------|-----------|
| UI 状态更新 | CLIENT 组件状态只在 React 渲染流内更新（轮询数据 setState） | 轮询回调直接改外部可变对象 → UI 不刷新 |
| 生命周期感知 | 所有副作用经 fiber 生命周期回卷（ctx.effect / slots 注销） | 定时器/路由句柄泄漏到 dispose 之后 |
| 进程死亡与状态恢复 | 引擎重启后从持久化 nextFireAt 判断补发，历史不丢 | 瞬时内存态当持久态 |
| 信任边界 | dsh webserver 只信 loopback；插件路由不做自身鉴权，依赖宿主栅栏 | 误以为路由私有而放松输入校验 |
| 后台执行限制 | 保活生命周期 = dsh web 进程生命周期（无 daemon） | 误以为 dsh 停了保活还在 |
| 序列化兼容 | 存储与路由载荷只用 JSON 安全类型 | Date 对象直接进 JSON → 变字符串 |

## 9. 框架替换指南

本档案的核心价值：换技术栈时，这是一份可执行的替换清单——逐节重填本档案各节，更新 AGENTS.md 构建命令与架构概览两段，试点 BUILD+TEST+RUN 后铺开，并登记替换记录（[adr.md](../templates/adr.md)）。

## 10. 本项目红线补充

- 短语库是 100 条固定常量（src/phrases.ts），运行期不可变；改短语 = 改代码 + 全量测试。
- 时间一律 Date.now() 毫秒 epoch；持久化时另存 ISO 字符串仅供展示。
- 间隔/钳制计算只经 src/interval.ts 纯函数；其他模块禁止内联算术。

## Related

- 目录约定与承重规则：[../standards/architecture.md](../standards/architecture.md)
- 测试各层定义：[../standards/test-strategy.md](../standards/test-strategy.md)
- 发版流程：[../workflows/release.md](../workflows/release.md)
