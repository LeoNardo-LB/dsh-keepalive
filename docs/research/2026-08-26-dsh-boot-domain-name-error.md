# dsh web 启动崩溃：storage domain 名含连字符 调查报告

> 日期 2026-08-26 · 状态 已结论 · 批次 journal/2026-08-25-plugin-bootstrap.md

## 结论摘要

1. 根因不在源码：`src/domain.ts:32` 早已是合法的 `dsh_keepalive`；根因是**宿主机编译产物 `lib/domain.js:25` 仍是旧名 `dsh-keepalive`**（8-25 20:15 全量构建后从未重建），dsh 经 profile `link:` 直链加载 lib/，模块加载期 `defineDomain` 校验失败即 throw。
2. 8-25 没炸是因为全部验证在 Docker 内从 src 重建（e2e/Dockerfile:11），宿主 lib/ 停留在修复前；8-26 是宿主机首次加载该插件。
3. 修复 = workspace 执行 `pnpm -s build` 重建 lib/ 并提交；宿主机无任何旧存储数据（`~/.dsh/storages` 无该域文件），改名零数据损失。
4. loader entry 名（npm 包名 `dsh-keepalive`）与 storage domain 名是两套规则：前者仅查 id 重复、按 ESM 包名 import，连字符合法；后者受 `UNIT_NAME_RE` 约束（文件名 + SQL 标识符双安全），禁止连字符。

## 根因链与证据

启动 → 崩溃链（逐步文件:行号）：

1. `dsh web` boot：dsh-app-boot/lib/index.js:1175 置 stage `plugin tree failed to load`，:1176 mountRootInclude 应用配置树，:1187 包装最终错误。
2. 配置树组成：`~/.dsh/profiles/web/package.json:5` `"dsh-keepalive": "link:/home/leo-tkp/workspace/dsh-keepalive"` + :15 bundles 列表；插件自带 cordis.patch.yml:3-5 以 `{id, name} = 'dsh-keepalive'` insert 插件行（bundle 层）。
3. loader 应用条目：cordis-plugin-loader/lib/index.js:87 `create(options)` → 按包名动态 import（:268-272）；失败经 :297-300 `updateError` 包装为 `failed to import loader entry dsh-keepalive (dsh-keepalive)`；外层 include 条目（name=`cordis:include`）再包为 `failed to apply loader entry include`。
4. import 解析：插件 package.json:7 `main = lib/index.js`；lib/index.js:7 `import { keepaliveDomain } from './domain.js'`。
5. **throw 点**：lib/domain.js:24-25 顶层执行 `defineDomain({ name: 'dsh-keepalive', ... })`；dsh-storage-domain/lib/index.js:62 `if (!UNIT_NAME_RE.test(spec.name)) throw`（模块加载期 fail-loud，设计注释见 :50-57）。
6. 正则来源与用途：dsh-storage/lib/index.js:80 `UNIT_NAME_RE = /^[a-z][a-z0-9_]*$/`，:79 注释「safe as a file name and as a SQL identifier segment without escaping」。domain 名经 json 后端落盘为 `$DSH_HOME/storages/<name>.json`（dsh-storage-json/lib/index.js:262；root 由 dsh-web-app/cordis.patch.yml:54-57 `dshHomePath('storages')` 指定）。

## 时间线（为何 8-26 才炸）

| 时间（+0800，git 时钟） | 事件 | 证据 |
|---|---|---|
| 8-25 20:05 | commit 26d2a74 引入 storage domain（旧名 dsh-keepalive） | .git/logs/HEAD:3；CHANGELOG.md:11 |
| 8-25 ~20:15 | 宿主全量构建 lib/（含旧名），此后未再重建 | journal :20 |
| 8-25 20:22 | commit 43a0196 fix(domain) 域名改 dsh_keepalive，仅改 src | .git/logs/HEAD:9；journal :24（20:26 容器第 2 轮暴露同错） |
| 8-25 20:29-20:35 | E2E 3/4 轮全绿：Docker 内 `COPY . .` + `pnpm run build` 从 src 重建，未触碰宿主 lib/ | e2e/Dockerfile:10-11；journal :26-27 |
| 8-26 | 宿主首次 `dsh web` 经 link: 加载插件 → 读到旧 lib/domain.js → 崩 | 报错栈 lib/domain.js:24 |

旁证：`~/.dsh/storages/` 仅有 workspace.json、session_projcache.json（无 keepalive 域文件）；`~/.dsh/settings.yaml` 无 dsh-keepalive namespace → 插件此前从未在宿主成功运行。[推断·高] profile 的 link/bundle 于 8-25 深夜之后才首次随宿主 `dsh web` 生效；profile 目录非 git 仓库，精确时刻无法取证 [未确认]。

## 修复方案

**推荐域名：维持 `dsh_keepalive`（src 已就位，无需另选）。** 官方惯例佐证「包名连字符 + 域名下划线/单词」：dsh-message-feedback（包）→ 域 `message_feedback`（lib/types/spec.js:68）；dsh-workspace → 域 `workspace`（lib/types/spec.js:55）。嫌 `dsh_` 前缀冗余可改 `keepalive`，但无必要。

改动点清单：

1. **必须**：在 workspace 执行 `pnpm -s build`（stack-profile.md:61 RUN，超时 300s）→ `tsc -p tsconfig.build.json`（outDir=lib，tsconfig.build.json:5）重生成 lib/domain.js；随后将 lib/ 一并提交（lib/ 受 git 跟踪；上次 fix commit 未带上——漏提交或漏重建，效果一致 [推断·高]）。
2. **可选**：CHANGELOG.md:11 与 docs/specs/2026-08-25-keepalive-v1.md:74、:108 的「域 dsh-keepalive」字样更新为 dsh_keepalive（纯文档）。
3. **禁止改**（与 storage 域名无关的 `dsh-keepalive`）：package.json:2 包名；cordis.patch.yml:4-5 loader entry；src/index.ts:23 插件 name、:35 settings namespace；src/routes.ts:12 HTTP 前缀；src/client/store.ts:79-139 fetch 路径；各日志前缀与 UI 文案。

数据迁移评估：**无需迁移、零丢失**。宿主 `~/.dsh/storages` 无旧域文件；E2E 数据在容器 `/e2e/dsh-home`（Dockerfile:16）随容器丢弃。机制上 rename 也无内置支持：json 后端要求文件头 `name === descriptor.name`（dsh-storage-json/lib/index.js:96），改名即新开空 unit；version 仅做同名校验（:98），不是迁移通道。未来真要迁：手工复制 `<old>.json` → `<new>.json` 并改文件头 name 字段即可。

风险评估：低。重建仅影响 lib/；域名 / namespace / HTTP 面 / 前端互不重叠；重启补发依赖的 nextFireAt 存于域 global（src/domain.ts:34-37），旧数据本就不存在。loader entry 名合法性：cordis-plugin-loader 仅查 id 重复（lib/index.js:81）并按 ESM 包名 import（:268-272）；本 profile 已加载 `dsh-llm-failover`、`dsh-turn-notify` 及 `@deepseek-ai/*` 作用域条目，均为连字符/作用域名 → loader 层不适用 UNIT_NAME_RE，两层规则不同源。

## 遗留问题

1. 「宿主 lib/ 与 src 脱同步」是流程缺口：E2E 在容器内构建，宿主产物过期无感知。建议 backlog 登记：交付前加宿主 `pnpm -s build` 门禁，或编辑协议明确「改 src 必重建 lib 并同 commit」。
2. [未确认] profile link/bundle 加入时刻（profile 无 git）；可查 `~/.dsh/profiles/web/pnpm-lock.yaml` 修改时间佐证。
3. CHANGELOG/specs 中旧域名描述未同步（见改动点 2）。
