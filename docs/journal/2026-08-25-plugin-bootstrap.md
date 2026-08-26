# 2026-08-25 <批次：plugin-bootstrap>

> 状态：进行中
> 关联：backlog #2 · 2026-08-25-keepalive-v1.md

## 目标

实现 dsh-keepalive v1 双半边插件（21 问 grill 共识），完成 Docker 容器实机验证并交付。

## 过程与证据

- 20:01 环境探测：docker 27.5.1（daemon OK）/ node v26.7.0 / pnpm 11.21.0 / dsh 0.1.1-rc.2 / registry PONG（bash 实测）。
- 20:02 规范系统部署：init.sh --no-example，门禁 1-10 全绿（PIPE_EXIT=0）；补填 AGENTS/CONTEXT/stack-profile；spec 与 backlog #2/#3 登记。commit ad74ec9。
- 20:03 TDD 红态：vitest 4 failed / 16 passed（短语 104≠100、正则 \\+ 转义被写管道吞成量词、零时区测试依赖运行环境时区）。
- 20:05 TDD 绿态：vitest 20/20（短语修剪至 100、message 测试改用独立真相源 Intl longOffset、正则改字符类免转义）。commit d7298f9。
- 20:10 签名直查（安装树 d.ts）：WebRoute={kind,path,handler}；SettingsScope=get/watch/update/replace；timer ctx.timeout(callback,delay)；GenerateOptions+StreamChunk+finish.reason 五 kind；zod 4.4.3（storage-domain 用）。
- 20:11 API 精查子代理交付（/home/leo-tkp/workspace/dsh-0.1.1-rc.2-api-report.md）：Domain 是 .table(name) 方法非 .tables 属性——修正 index.ts；slots.register 的 inject 是工厂函数；座位表（shell.overlay=list/root，conversation.composer.dock=list/session）。
- 20:12 host 半全绿：typecheck 0 errors + vitest 36/36（引擎 10 用例：钳制/调度/补发/停放/手动控制）。commit 26d2a74。
- 20:14 client 半：store（5s 轮询+本地倒计时）/Dock/Panel；入口 .ts→.tsx；build-client.mjs banner 转义被写管道吞——改 String.raw 组装。
- 20:15 全量构建绿：lib/（host tsc）+ lib/client.js 23834B（module-table 格式，banner 与 failover 产物同构）。commit 5f06482。
- 20:16 schema 隐患修复：schemastery 无 z.null()；model 未指定改为省略字段；面板 toggle 不再展开整行。typecheck 0 errors + 36/36。commit（fix(config)）。
- 20:17 Docker E2E 启动（bash-2 后台）：node:26 镜像 + 双 mock provider + 7 场景 driver；注意本轮镜像构建上下文发送于 schema 修复之前，正式证据以最终代码重建重跑为准。
- 20:22 容器第 1 轮暴露：bundle 层已 insert 插件行，overlay 再 insert 同 id → duplicate loader entry id（fail-loud）。修：overlay 改 id 定向 config 覆盖。
- 20:26 容器第 2 轮暴露：storage 域名不许连字符（^[a-z][a-z0-9_]*$）。修：域名改 dsh_keepalive。
- 20:27 修复期间发现 host 半忽略行 config（apply 未接参）→ settings base 层接线，e2e overlay 配置由此生效。
- 20:31 容器第 3 轮：6/7 PASS；s2 history=fail——pi-ai 把缺 finish/usage 的瘦 SSE 归为 TRANSPORT 失败。修：mock SSE 补全 OpenAI 形状（role delta/finish_reason:stop/usage chunk）。
- 20:36 容器第 4 轮（bash-6，最终代码）：**7/7 ALL SCENARIOS PASS**——s1 路由与双提供商、s2 fire-now 全链路（http+history ok+消息形状）、s3 调度精度 scheduledShotDeltaMs=8ms、s4 暂停/恢复、s5 停放+停放后拒绝+恢复、s6 重排、s7 静默 sessions=0。证据：e2e/evidence/driver-evidence.json。
- 20:41 重启补发专项（bash-8，挂载脚本进同镜像）：杀 dsh→睡过 deadline→重启→**恰好 1 发补发**（before=0 after=1）。RESTART TEST PASS。证据：e2e/evidence/restart-web-{1,2}.log。

- 01:15 用户反馈"提供商为何不能编辑"→ 定位两个缺口：面板无添加/编辑入口；且实测 settings.update 递归深合并（源码 mergeLayers），providers patch 无法删除 key。本机 settings.yaml 亦见预填只抓到 deepseek-official（启动时 pi-ai 路由未注册完 + 之后不刷新）。
- 01:30 面板模型按用户期望重做：恒展示全部已注册路由（availableProviders 随轮询刷新，新路由自动出现），每家独立配置（参与/禁用/模型/移除配置）；移除走 settings.mutate unset。routes 单测 +7（status 形状/增量语义/clamp/400/remove）；e2e 加第三家 mock-spare 与 s8 场景（可见→参与→调度→fire-now 命中）。typecheck 0 / 43 tests / client bundle 27824B。
- 02:05 浏览器级实机验证（用户指令"去docker容器中验证"）：常驻容器 ka-live 内装 Chromium+puppeteer-core，无头驱动真实 GUI。迭代要点：合成 el.click() 被引导弹窗吞掉→改 puppeteer 受信点击；发现 composer.dock 座位为 session 域、需预种工作区（workspace.json 的 createdAt/updatedAt 为 ISO 字符串，数字会 fail-loud）；面板点击须选最小文本候选（外层容器共享子串会点偏）。终局 **ALL PASS**：boot 图/bundle 服务(27824B id 标记)/摘要条挂载/**倒计时实测跳动(00:00 触发后重排 00:49)**/面板打开/全量提供商列表(spare 可见)/UI 一键参与(卡片串含 活跃|mock-keepalive-model|00:58 及全套按钮)/零运行时错误。证据：e2e/evidence/browser-{1..7}*.png + browser-evidence.json。commit 2d0f492 后续。
- 02:20 会话模型图像模态打通：read_image 此前被 harness 以"model does not declare image input"拒绝——根因是 pi-ai 模型目录未声明 inputModalities（[text] 是"未声明"的保守默认）。在 ~/.dsh/settings.yaml 的 zai-coding-cn.models[*] 加 input: [text, image]，settings watch ~3s 热生效，read_image 直读截图成功。browser-4-opted-in.png 直读复核：面板四家全列（DeepSeek/mock-*）、徽章倒计时齐全、DeepSeek 无 key 失败被如实记录（✗ 1ms 连续失败 1）未崩溃、摘要条 keepalive → mock-backup 00:53 ✓ 常驻。
- 02:35 人工清单 #2-#8 实机走查（无头浏览器 + read_image 视觉复核，证据 wl-*.png + walkthrough-evidence.json）：倒计时连续且发射后正确重排（00:29→01:56 截图铁证）；面板揭盖/立即发送布局（15 卡片高度差≤2px DOM 硬测）/历史表/改间隔热生效（intervalMinutes=2 + nextFireAt 重算）/总开关双向/关面板 dock 不移位——**全部通过**。脚本侧记：DOM 采样会被侧栏同名会话行污染，截图读图才是本轮可信证据源；采样脚本的锚定缺陷已留档（item2-recheck.mjs），不影响产品。
- 02:40 backlog #2 验收转正（[~]→完结迁移），插件 v1 交付闭环。

## 完结迁移区

（验收通过后迁入）

## 蒸馏（可选）

（待定）
