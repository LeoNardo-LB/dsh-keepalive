# Spec — 客户端 UI 重写：dsh-client-ui-primitives 全面接入（2026-09-04）

> 状态：active · 批次：docs/journal/2026-09-04-ui-rewrite-dsh-primitives.md
> 范围一句话：CLIENT 展示层推倒重写为宿主原生视觉；HOST 半、store 契约、挂载槽位、功能清单零改动。

## 事实（实证来源）

| # | 事实 | 来源 |
|---|------|------|
| F1 | 宿主令牌系统为 `--dsw-alias-*`（语义层）→ `--dsw-static-*`；旧 UI 引用的 `--dsh-bg/-fg/-border` 宿主未定义，回退 hex 恒生效 → 视觉独立根因 | dsh-client-ui-theme/lib/client.js |
| F2 | `dsh-client-ui-primitives` 仅经运行时模块表供应（boot 表 8 id 之一，dsh 0.1.2-rc.1 实证），不可作为 npm 依赖安装 | dsh-web-frontend dist + profiles/node_modules 死链 |
| F3 | 组件 API 实证：Button(variant primary/ghost/outline/toolbar, size md/sm, icon)、Pill(active)、Input(原生透传)、StateDot(state done/warning/ongoing/error)、Menu(items[{id,label,icon?,danger?,disabled?}],open,anchor,selectedId,onSelect,onClose,portal)、DisclosureRow(icon,title,open,expandable,onToggle,expandOnRowClick,collapsedContent,children)、Modal(open,onClose,title,footer)、RiskConfirmation(open,title,description,acknowledgeLabel,cancelLabel,confirmLabel,acknowledged,onAcknowledgedChange,onCancel,onConfirm)、Toast(text,icon,onDone)、MessageText(text)、Icon*Outline14/16 共 69 个 | npm @deepseek-ai/dsh-client-ui-primitives@0.0.1-rc.1 lib/types + 宿主包调用点 |
| F4 | 宿主 CSS 注入模式：`document.querySelector('style[data-plugin-css=<id>]')` 判重后 createElement('style') 注入 | dsh-client-ui-theme/lib/client.js |
| F5 | `dsh-client-schema-form` 对插件不可用（npx 缓存死链 + 不在模块表 8 id） | profiles/node_modules 符号链接实证 |

## 设计决策（用户已确认）

| # | 决策 | 依据 |
|---|------|------|
| D1 | 样式机制 = 真 CSS 运行时注入（`style[data-plugin-css="dsh-keepalive"]`）+ `--dsw-alias-*` 令牌 + `ka-` 类名前缀；build 脚本加 css→string 模块 | R2-Q1a；伪类/媒体查询 inline 不可表达 |
| D2 | primitives 硬依赖：单一边界守卫（primitives.ts 顶部一次 require + 可用性标志），缺失时整页一个错误态；禁止逐组件兜底 | R2-Q2a；单点实现 |
| D3 | 布尔开关 = Button 状态表达（开=primary+IconCheckOutline14，关=outline） | R2-Q3a |
| D4 | 模型选择 = Menu + selectedId + IconCheck 选中（照抄宿主 model-selection 惯例），anchor 为 ghost Button | R2-Q4a |
| D5 | 历史 = DisclosureRow 逐条就地展开（回复 MessageText 渲染）；统计 = 汇总 Pill + 逐日行；HTML 表格与 ReplyDialog modal 删除 | R2-Q5a |
| D6 | 内容组织 = 单页滚动：提供商常显，历史/统计为默认收起的 DisclosureRow 区块 | R2-Q6a |
| D7 | 全面引入 14/16px 线性图标 | R2-Q7a |
| D8 | 卡片主操作露出（立即发送/启停/恢复），次要操作收进 ellipsis Menu，移除配置走 RiskConfirmation 就地确认 | R2-Q8a |
| D9 | 砍 0.1.1-rc.2 CLIENT 兼容（硬依赖 primitives 的自然后果；HOST 半兼容层不动） | R1-Q4 |
| D10 | i18n 维持硬编码中文（登记技术债，不扩本次 scope） | Round 1 备注 |

## 四态纪律（ui-conventions 第 4 节）

加载中（status null 且无 error）= 文案行；错误 = 文案 + 重试 Button；空（无提供商/无历史）= 引导文案；禁用 = Button disabled（pending 键驱动）。自定义动效为零 → prefers-reduced-motion 天然满足。

## 验收标准

1. BUILD（pnpm -s typecheck）0 错误；TEST（pnpm -s test）58/58；RUN（pnpm -s build）产出 lib/client.js。
2. lib/client.js 含：style[data-plugin-css] 注入、零硬编码回退色（#98c379/#e06c75/#2a2a2a 家族清除）、primitives 的 try/catch 仅存在于 primitives.ts 边界一处（组件层零守卫）。
3. Docker e2e（DSH_VERSION=0.1.2-rc.1）：driver HTTP 断言全过 + browser-check v5（新 UI 选择器）全过 + 零 console/pageerror + 全程截图。
4. 人工清单（manual-ui-checklist）：用户终验倒计时走动、Toast 生命周期、折叠动效。

## 非目标

HOST 半任何文件、src/client/store.ts、src/client/index.tsx 接线、settings.plugins.tab 挂载方式、功能增删。
