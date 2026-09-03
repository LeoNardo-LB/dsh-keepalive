window.__ModuleLoader__.load({
	id: "dsh-keepalive",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  SettingsTab: () => SettingsTab,
  apply: () => apply,
  countdownMs: () => countdownMs,
  createInitialUiState: () => createInitialUiState,
  createStore: () => createStore2,
  formatCountdown: () => formatCountdown,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var React = __toESM(require("react"), 1);

// src/client/SettingsTab.tsx
var import_react4 = require("react");

// src/client/primitives.ts
var P = (() => {
  try {
    return require("@deepseek-ai/dsh-client-ui-primitives");
  } catch {
    return null;
  }
})();
var U = P;

// src/client/keepalive-tab.css
var keepalive_tab_default = "/*\n * dsh-keepalive settings tab stylesheet (spec D1).\n * Colors/spacing/shape ride the host --dsw-alias-* token system so light/dark\n * themes follow the host automatically; typography sizes are local tokens\n * because the host token set has no font-size scale.\n */\n\n.ka-root {\n  --ka-fs-base: 13px;\n  --ka-fs-sm: 12px;\n  --ka-fs-caption: 11px;\n  --ka-gap: 8px;\n  font-family: var(--dsw-font-family, inherit);\n  font-size: var(--ka-fs-base);\n  color: var(--dsw-alias-label-primary);\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n\n/* ---------- header ---------- */\n\n.ka-header {\n  display: flex;\n  align-items: center;\n  gap: var(--ka-gap);\n  flex-wrap: wrap;\n}\n\n.ka-title {\n  font-weight: 600;\n  margin-right: auto;\n}\n\n.ka-header-actions {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\n\n/* ---------- shared bits ---------- */\n\n.ka-section-title {\n  font-size: var(--ka-fs-caption);\n  color: var(--dsw-alias-label-caption);\n}\n\n.ka-empty {\n  color: var(--dsw-alias-label-dimmed);\n  font-size: var(--ka-fs-sm);\n  padding: 6px 0;\n}\n\n.ka-error-row {\n  display: flex;\n  align-items: center;\n  gap: var(--ka-gap);\n  color: var(--dsw-alias-state-error-primary);\n  font-size: var(--ka-fs-sm);\n}\n\n.ka-loading-row {\n  color: var(--dsw-alias-label-dimmed);\n}\n\n.ka-ok { color: var(--dsw-alias-state-success-primary); }\n.ka-err { color: var(--dsw-alias-state-error-primary); }\n.ka-warn { color: var(--dsw-alias-state-warn-primary); }\n.ka-dim { color: var(--dsw-alias-label-dimmed); }\n\n.ka-pill-ok { color: var(--dsw-alias-state-success-primary); }\n.ka-pill-warn { color: var(--dsw-alias-state-warn-primary); }\n.ka-pill-err { color: var(--dsw-alias-state-error-primary); }\n.ka-pill-dim { color: var(--dsw-alias-label-dimmed); }\n\n.ka-countdown {\n  margin-left: auto;\n  font-variant-numeric: tabular-nums;\n}\n\n.ka-num { font-variant-numeric: tabular-nums; }\n\n/* ---------- config form ---------- */\n\n.ka-form-row {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  flex-wrap: wrap;\n}\n\n.ka-field {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: var(--ka-fs-sm);\n  color: var(--dsw-alias-label-secondary);\n}\n\n.ka-field input {\n  width: 72px;\n  font-variant-numeric: tabular-nums;\n}\n\n/* ---------- provider cards ---------- */\n\n.ka-card {\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-1);\n  padding: 10px 12px;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n.ka-card:hover { border-color: var(--dsw-alias-border-l2); }\n\n.ka-card-head {\n  display: flex;\n  align-items: center;\n  gap: var(--ka-gap);\n  flex-wrap: wrap;\n}\n\n.ka-card-name { font-weight: 600; }\n\n.ka-card-id {\n  font-size: var(--ka-fs-caption);\n  color: var(--dsw-alias-label-dimmed);\n}\n\n.ka-card-meta {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  flex-wrap: wrap;\n  font-size: var(--ka-fs-sm);\n  color: var(--dsw-alias-label-secondary);\n}\n\n.ka-card-actions {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  flex-wrap: wrap;\n}\n\n.ka-card-actions .ka-actions-secondary { margin-left: auto; display: flex; gap: 6px; align-items: center; }\n\n.ka-model-label {\n  font-size: var(--ka-fs-sm);\n  color: var(--dsw-alias-label-secondary);\n}\n\n/* ---------- history / stats disclosure ---------- */\n\n.ka-disclosure-group {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.ka-history-section, .ka-stats-section { padding: 2px 0; }\n\n.ka-entry-list {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  padding: 4px 0 4px 4px;\n}\n\n.ka-reply-detail {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 6px 0 6px 4px;\n}\n\n.ka-detail-label {\n  font-size: var(--ka-fs-caption);\n  color: var(--dsw-alias-label-caption);\n}\n\n.ka-detail-block {\n  white-space: pre-wrap;\n  word-break: break-word;\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 6px;\n  background: var(--dsw-alias-bg-layer-2);\n  padding: 8px 10px;\n  font-size: var(--ka-fs-sm);\n  margin: 2px 0 6px;\n}\n\n.ka-stat-row {\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  padding: 3px 0;\n  font-size: var(--ka-fs-sm);\n}\n\n.ka-stat-row .ka-stat-day { color: var(--dsw-alias-label-dimmed); min-width: 86px; }\n\n.ka-stat-summary {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex-wrap: wrap;\n  padding: 4px 0;\n}\n";

// src/client/styles.ts
var STYLE_TAG = "dsh-keepalive";
function injectStyles() {
  if (typeof document === "undefined") return;
  const selector = "style[data-plugin-css=" + JSON.stringify(STYLE_TAG) + "]";
  if (document.querySelector(selector) !== null) return;
  const style = document.createElement("style");
  style.setAttribute("data-plugin-css", STYLE_TAG);
  style.textContent = keepalive_tab_default;
  document.head.append(style);
}

// src/client/ConfigForm.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
function ConfigForm(props) {
  const { config, store } = props;
  const [interval, setIntervalValue] = (0, import_react.useState)(String(config.intervalMinutes));
  const [jitter, setJitter] = (0, import_react.useState)(String(config.jitterPercent));
  const [threshold, setThreshold] = (0, import_react.useState)(String(config.autoPause.threshold));
  (0, import_react.useEffect)(() => {
    setIntervalValue(String(config.intervalMinutes));
    setJitter(String(config.jitterPercent));
    setThreshold(String(config.autoPause.threshold));
  }, [config]);
  const autoParkOn = config.autoPause.enabled === true;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ka-form-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ka-field", children: [
      "\u57FA\u51C6\u95F4\u9694(\u5206)",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(U.Input, { "data-ka": "cfg-interval", value: interval, inputMode: "numeric", onChange: (e) => {
        setIntervalValue(e.target.value);
      } })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ka-field", children: [
      "\u6296\u52A8%",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(U.Input, { "data-ka": "cfg-jitter", value: jitter, inputMode: "numeric", onChange: (e) => {
        setJitter(e.target.value);
      } })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "ka-field", children: [
      "\u505C\u653E\u9608\u503C",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(U.Input, { "data-ka": "cfg-threshold", value: threshold, inputMode: "numeric", onChange: (e) => {
        setThreshold(e.target.value);
      } })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      U.Button,
      {
        "data-ka": "cfg-autopark",
        variant: autoParkOn ? "primary" : "outline",
        size: "sm",
        icon: autoParkOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(U.IconCheckOutline14, { size: 14 }) : void 0,
        onClick: () => {
          void store.updateConfig({ autoPause: { enabled: !autoParkOn, threshold: config.autoPause.threshold } });
        },
        children: [
          "\u81EA\u52A8\u505C\u653E",
          autoParkOn ? "\u5F00" : "\u5173"
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      U.Button,
      {
        "data-ka": "cfg-save",
        variant: "primary",
        size: "sm",
        disabled: props.pending["config"] === true,
        onClick: () => {
          void store.updateConfig(
            {
              intervalMinutes: Number(interval),
              jitterPercent: Number(jitter),
              autoPause: { enabled: config.autoPause.enabled, threshold: Number(threshold) }
            },
            { key: "config", ok: "\u5DF2\u4FDD\u5B58\u914D\u7F6E" }
          );
        },
        children: props.pending["config"] === true ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58"
      }
    )
  ] });
}

// src/client/ProviderCard.tsx
var import_react2 = require("react");

// src/client/store.ts
var POLL_INTERVAL_MS = 5e3;
function createInitialUiState() {
  return { status: null, history: null, skewMs: 0, error: null, models: null, flash: null, pending: {} };
}
function countdownMs(nextFireAt, state, nowMs) {
  if (nextFireAt === null) return null;
  const adjusted = nextFireAt - state.skewMs;
  return Math.max(0, adjusted - nowMs);
}
function formatCountdown(ms) {
  if (ms === null) return "--:--";
  const totalSeconds = Math.floor(ms / 1e3);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => String(value).padStart(2, "0");
  return hours > 0 ? String(hours) + ":" + pad(minutes) + ":" + pad(seconds) : pad(minutes) + ":" + pad(seconds);
}
var flashSeq = 0;
function createStore(fetchLike, now, pollMs = POLL_INTERVAL_MS) {
  let state = createInitialUiState();
  const listeners = /* @__PURE__ */ new Set();
  let pollTimer = null;
  let inFlightPoll = false;
  function set(next) {
    state = { ...state, ...next };
    for (const listener of listeners) listener(state);
  }
  function beginPending(key) {
    if (key === void 0) return void 0;
    set({ pending: { ...state.pending, [key]: true } });
    return () => {
      const next = { ...state.pending };
      delete next[key];
      set({ pending: next });
    };
  }
  function flashFor(meta, error) {
    if (error === void 0 && meta?.ok === void 0 && meta?.key === void 0) return;
    flashSeq += 1;
    if (error === void 0) {
      set({ flash: { seq: flashSeq, kind: "ok", text: meta?.ok ?? "\u5DF2\u5B8C\u6210" } });
      return;
    }
    const detail = error instanceof Error ? error.message : String(error);
    set({ flash: { seq: flashSeq, kind: "err", text: (meta?.ok ?? "\u64CD\u4F5C") + "\u5931\u8D25: " + detail } });
  }
  async function pollStatus() {
    if (inFlightPoll) return;
    inFlightPoll = true;
    try {
      const response = await fetchLike("/plugins/dsh-keepalive/status");
      if (!response.ok) throw new Error("status " + String(response.status));
      const body = await response.json();
      set({ status: body, skewMs: now() - body.now, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      inFlightPoll = false;
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (pollTimer !== null) return;
      void pollStatus();
      pollTimer = setInterval(() => void pollStatus(), pollMs);
    },
    stop() {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    },
    refresh: pollStatus,
    async updateConfig(patch, meta) {
      const release = beginPending(meta?.key);
      try {
        const response = await fetchLike("/plugins/dsh-keepalive/config", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch)
        });
        if (!response.ok) throw new Error("config " + String(response.status));
        await pollStatus();
        flashFor(meta, void 0);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        flashFor(meta, error);
      } finally {
        release?.();
      }
    },
    async act(type, provider, meta) {
      const release = beginPending(meta?.key);
      try {
        const response = await fetchLike("/plugins/dsh-keepalive/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type, ...provider === void 0 ? {} : { provider } })
        });
        if (!response.ok) throw new Error("action " + String(response.status));
        await pollStatus();
        flashFor(meta, void 0);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
        flashFor(meta, error);
      } finally {
        release?.();
      }
    },
    async loadHistory(limit) {
      try {
        const response = await fetchLike("/plugins/dsh-keepalive/history?limit=" + String(limit));
        if (!response.ok) throw new Error("history " + String(response.status));
        const body = await response.json();
        set({ history: body, error: null });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },
    async loadModels() {
      try {
        const response = await fetchLike("/plugins/dsh-keepalive/models");
        if (!response.ok) throw new Error("models " + String(response.status));
        const body = await response.json();
        set({ models: body.models, error: null });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },
    clearFlash(seq) {
      if (state.flash?.seq !== seq) return;
      set({ flash: null });
    }
  };
}

// src/client/ProviderCard.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function cardStatus(registered, entry, row) {
  if (!registered) return { dot: null, pillText: "\u672A\u6CE8\u518C", pillClass: "ka-pill-dim" };
  if (entry === void 0) return { dot: null, pillText: "\u672A\u53C2\u4E0E", pillClass: "ka-pill-dim" };
  if (row?.parked === true) return { dot: "warning", pillText: "\u5DF2\u505C\u653E", pillClass: "ka-pill-warn" };
  if (entry.enabled !== true) return { dot: null, pillText: "\u5DF2\u7981\u7528", pillClass: "ka-pill-dim" };
  return { dot: "ongoing", pillText: "\u6D3B\u8DC3", pillClass: "ka-pill-ok" };
}
function ProviderCard(props) {
  const { id, name, registered, entry, row, state, store, now } = props;
  const configuredModel = entry?.model ?? "";
  const [modelChoice, setModelChoice] = (0, import_react2.useState)(String(configuredModel));
  const [modelMenuOpen, setModelMenuOpen] = (0, import_react2.useState)(false);
  const [moreOpen, setMoreOpen] = (0, import_react2.useState)(false);
  const [confirming, setConfirming] = (0, import_react2.useState)(false);
  const [acknowledged, setAcknowledged] = (0, import_react2.useState)(false);
  (0, import_react2.useEffect)(() => {
    setModelChoice(String(configuredModel));
  }, [configuredModel]);
  const modelOptions = state.models?.[id] ?? [];
  const modelSaving = modelChoice === String(configuredModel);
  const status = cardStatus(registered, entry, row);
  const enabled = entry?.enabled === true;
  const countdown = entry !== void 0 && enabled && row !== void 0 && row.nextFireAt !== null ? formatCountdown(countdownMs(row.nextFireAt, state, now)) : "\u2014";
  const modelItems = [
    { id: "", label: "\u9ED8\u8BA4\u6A21\u578B" },
    ...modelOptions.map((modelId) => ({ id: modelId, label: modelId }))
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ka-card", "data-ka-card": id, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ka-card-head", children: [
      status.dot !== null && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(U.StateDot, { state: status.dot }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "ka-card-name", children: name }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "ka-card-id", children: id }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(U.Pill, { className: status.pillClass, active: status.dot === "ongoing", children: status.pillText }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "ka-countdown ka-num", "data-ka": "countdown", children: countdown })
    ] }),
    row !== void 0 && entry !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ka-card-meta", children: [
      row.lastResult === null ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u5C1A\u65E0\u53D1\u9001\u8BB0\u5F55" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
        "\u6700\u8FD1 ",
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: row.lastResult.status === "ok" ? "ka-ok" : "ka-err", children: [
          row.lastResult.status === "ok" ? "\u6210\u529F" : "\u5931\u8D25",
          " \xB7 ",
          String(row.lastResult.latencyMs),
          "ms"
        ] })
      ] }),
      (row.consecutiveFailures ?? 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "ka-warn", children: [
        "\u8FDE\u7EED\u5931\u8D25 ",
        String(row.consecutiveFailures)
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "ka-card-actions", children: entry === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      U.Button,
      {
        "data-ka": "optin",
        variant: "outline",
        size: "sm",
        icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(U.IconPlusOutline16, { size: 14 }),
        disabled: !registered || state.pending["optin:" + id] === true,
        title: registered ? "\u628A\u8BE5\u63D0\u4F9B\u5546\u52A0\u5165\u4FDD\u6D3B\u8C03\u5EA6" : "\u8BE5\u8DEF\u7531\u5F53\u524D\u672A\u6CE8\u518C\uFF0C\u65E0\u6CD5\u53C2\u4E0E",
        onClick: () => {
          void store.updateConfig({ providers: { [id]: { enabled: true } } }, { key: "optin:" + id, ok: "\u5DF2\u52A0\u5165\u4FDD\u6D3B\u8C03\u5EA6" });
        },
        children: state.pending["optin:" + id] === true ? "\u52A0\u5165\u4E2D\u2026" : "\u53C2\u4E0E\u4FDD\u6D3B"
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "ka-model-label", children: "\u4FDD\u6D3B\u6A21\u578B" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        U.Menu,
        {
          open: modelMenuOpen,
          anchor: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            U.Button,
            {
              "data-ka": "model-menu",
              variant: "ghost",
              size: "sm",
              disabled: !registered || modelOptions.length === 0,
              icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(U.IconChevronDownOutline14, { size: 14 }),
              onClick: () => {
                setModelMenuOpen(!modelMenuOpen);
              },
              title: registered ? modelOptions.length === 0 ? "\u6682\u65E0\u53EF\u7528\u6A21\u578B" : "\u9009\u62E9\u4FDD\u6D3B\u6A21\u578B" : "\u8DEF\u7531\u672A\u6CE8\u518C\uFF0C\u5217\u8868\u4E0D\u53EF\u7528",
              children: modelChoice === "" ? "\u9ED8\u8BA4\u6A21\u578B" : modelChoice
            }
          ),
          items: modelItems,
          selectedId: modelChoice,
          onSelect: (itemId) => {
            setModelChoice(itemId);
            setModelMenuOpen(false);
          },
          onClose: () => {
            setModelMenuOpen(false);
          },
          portal: true
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        U.Button,
        {
          "data-ka": "model-save",
          variant: "ghost",
          size: "sm",
          disabled: modelSaving || !registered || state.pending["model:" + id] === true,
          onClick: () => {
            void store.updateConfig(
              { providers: { [id]: { enabled: entry.enabled, ...modelChoice === "" ? {} : { model: modelChoice } } } },
              { key: "model:" + id, ok: "\u5DF2\u4FDD\u5B58\u4FDD\u6D3B\u6A21\u578B" }
            );
          },
          children: state.pending["model:" + id] === true ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u6A21\u578B"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "ka-actions-secondary", children: [
        row !== void 0 && enabled && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          U.Button,
          {
            "data-ka": "fire-now",
            variant: "ghost",
            size: "sm",
            icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(U.IconSendOutline16, { size: 14 }),
            disabled: state.pending["fire:" + id] === true,
            onClick: () => {
              void store.act("fire-now", id, { key: "fire:" + id, ok: "\u5DF2\u89E6\u53D1\u7ACB\u5373\u53D1\u9001" });
            },
            children: state.pending["fire:" + id] === true ? "\u53D1\u9001\u4E2D\u2026" : "\u7ACB\u5373\u53D1\u9001"
          }
        ),
        row?.parked === true && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          U.Button,
          {
            "data-ka": "resume-provider",
            variant: "ghost",
            size: "sm",
            icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(U.IconPlayOutline16, { size: 14 }),
            disabled: state.pending["resume:" + id] === true,
            onClick: () => {
              void store.act("resume-provider", id, { key: "resume:" + id, ok: "\u5DF2\u6062\u590D\u8BE5\u63D0\u4F9B\u5546" });
            },
            children: state.pending["resume:" + id] === true ? "\u5904\u7406\u4E2D\u2026" : "\u6062\u590D"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          U.Button,
          {
            "data-ka": "toggle-provider",
            variant: "ghost",
            size: "sm",
            disabled: state.pending["toggle:" + id] === true,
            onClick: () => {
              void store.updateConfig(
                { providers: { [id]: { enabled: entry.enabled !== true, ...configuredModel === "" ? {} : { model: configuredModel } } } },
                { key: "toggle:" + id, ok: entry.enabled === true ? "\u5DF2\u7981\u7528\u8BE5\u63D0\u4F9B\u5546" : "\u5DF2\u542F\u7528\u8BE5\u63D0\u4F9B\u5546" }
              );
            },
            children: state.pending["toggle:" + id] === true ? "\u5207\u6362\u4E2D\u2026" : entry.enabled === true ? "\u7981\u7528" : "\u542F\u7528"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          U.Menu,
          {
            open: moreOpen,
            anchor: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              U.Button,
              {
                "data-ka": "more-menu",
                variant: "ghost",
                size: "sm",
                "aria-label": "\u66F4\u591A\u64CD\u4F5C " + id,
                icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(U.IconEllipsisOutline16, { size: 14 }),
                onClick: () => {
                  setMoreOpen(!moreOpen);
                }
              }
            ),
            items: [{ id: "remove", label: "\u79FB\u9664\u914D\u7F6E", icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(U.IconTrashOutline16, { size: 14 }), danger: true }],
            onSelect: () => {
              setMoreOpen(false);
              setAcknowledged(false);
              setConfirming(true);
            },
            onClose: () => {
              setMoreOpen(false);
            },
            align: "end",
            portal: true
          }
        )
      ] })
    ] }) }),
    entry !== void 0 && confirming && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      U.RiskConfirmation,
      {
        open: true,
        title: "\u79FB\u9664\u8BE5\u63D0\u4F9B\u5546\u7684\u4FDD\u6D3B\u914D\u7F6E",
        description: "\u5C06\u6E05\u9664 " + id + " \u7684\u4FDD\u6D3B\u914D\u7F6E\uFF1B\u63D0\u4F9B\u5546\u5217\u8868\u4ECD\u4F1A\u663E\u793A\u8BE5\u8DEF\u7531\u3002",
        acknowledgeLabel: "\u6211\u786E\u8BA4\u8981\u79FB\u9664\u8BE5\u914D\u7F6E",
        cancelLabel: "\u53D6\u6D88",
        confirmLabel: state.pending["remove:" + id] === true ? "\u79FB\u9664\u4E2D\u2026" : "\u79FB\u9664",
        acknowledged,
        disabled: state.pending["remove:" + id] === true,
        onAcknowledgedChange: setAcknowledged,
        onCancel: () => {
          setConfirming(false);
          setAcknowledged(false);
        },
        onConfirm: () => {
          setConfirming(false);
          setAcknowledged(false);
          void store.act("remove-provider", id, { key: "remove:" + id, ok: "\u5DF2\u79FB\u9664\u8BE5\u63D0\u4F9B\u5546\u914D\u7F6E" });
        }
      }
    )
  ] });
}

// src/client/HistorySection.tsx
var import_react3 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
function EntryRow(props) {
  const { entry, open, onToggle } = props;
  const ok = entry.status === "ok";
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    U.DisclosureRow,
    {
      className: "ka-history-entry",
      icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(U.StateDot, { state: ok ? "done" : "error" }),
      title: new Date(entry.at).toLocaleTimeString() + " \xB7 " + entry.provider + " \xB7 " + entry.model,
      open,
      expandable: true,
      onToggle,
      expandOnRowClick: true,
      collapsedContent: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: ok ? "ka-ok" : "ka-err", children: [
        ok ? "\u6210\u529F" : "\u5931\u8D25",
        " \xB7 ",
        String(entry.latencyMs),
        "ms"
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ka-reply-detail", children: [
        entry.error !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ka-err", children: entry.error }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ka-detail-label", children: "\u53D1\u9001\u5185\u5BB9" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ka-detail-block", children: entry.content }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ka-detail-label", children: [
          "\u6A21\u578B\u56DE\u590D",
          entry.reply === void 0 ? "\uFF08\u672C\u6761\u8BB0\u5F55\u65E9\u4E8E\u56DE\u590D\u91C7\u96C6\uFF0C\u65E0\u5B8C\u6574\u56DE\u590D\uFF09" : ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ka-detail-block", children: entry.reply !== void 0 && entry.reply.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(U.MessageText, { text: entry.reply }) : entry.preview || "\uFF08\u7A7A\uFF09" })
      ] })
    }
  );
}
function HistorySection(props) {
  const { state, store } = props;
  const [historyOpen, setHistoryOpen] = (0, import_react3.useState)(false);
  const [statsOpen, setStatsOpen] = (0, import_react3.useState)(false);
  const [openAt, setOpenAt] = (0, import_react3.useState)(null);
  (0, import_react3.useEffect)(() => {
    if ((historyOpen || statsOpen) && state.history === null) void store.loadHistory(50);
  }, [historyOpen, statsOpen]);
  const items = state.history?.items ?? [];
  const daily = Object.entries(state.history?.dailyStats ?? {}).sort((a, b) => a[0] < b[0] ? 1 : -1);
  const totalSuccess = daily.reduce((sum, [, stat]) => sum + stat.success, 0);
  const totalFail = daily.reduce((sum, [, stat]) => sum + stat.fail, 0);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ka-disclosure-group", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      U.DisclosureRow,
      {
        className: "ka-history-section",
        icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(U.IconClockOutline16, { size: 14 }),
        title: "\u5386\u53F2\uFF08" + String(items.length) + "\uFF09",
        open: historyOpen,
        expandable: true,
        onToggle: () => {
          setHistoryOpen(!historyOpen);
        },
        expandOnRowClick: true,
        children: items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ka-empty", children: "\u5C1A\u65E0\u53D1\u9001\u8BB0\u5F55" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ka-entry-list", children: items.map((entry, index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          EntryRow,
          {
            entry,
            open: openAt === entry.at,
            onToggle: () => {
              setOpenAt(openAt === entry.at ? null : entry.at);
            }
          },
          String(entry.at) + "-" + String(index)
        )) })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      U.DisclosureRow,
      {
        className: "ka-stats-section",
        icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(U.IconCheckOutline16, { size: 14 }),
        title: "\u7EDF\u8BA1",
        open: statsOpen,
        expandable: true,
        onToggle: () => {
          setStatsOpen(!statsOpen);
        },
        expandOnRowClick: true,
        collapsedContent: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "ka-dim", children: [
          "\u6210\u529F ",
          String(totalSuccess),
          " \xB7 \u5931\u8D25 ",
          String(totalFail)
        ] }),
        children: daily.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "ka-empty", children: "\u5C1A\u65E0\u7EDF\u8BA1\u6570\u636E" }) : daily.map(([day, stat]) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "ka-stat-row", "data-ka": "stat-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "ka-stat-day ka-num", children: day }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "ka-ok ka-num", children: [
            "\u6210\u529F ",
            String(stat.success)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "ka-err ka-num", children: [
            "\u5931\u8D25 ",
            String(stat.fail)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "ka-dim ka-num", children: stat.success > 0 ? "\u5747\u5EF6\u8FDF " + String(Math.round(stat.latencyTotalMs / stat.success)) + "ms" : "\u2014" })
        ] }, day))
      }
    )
  ] });
}

// src/client/SettingsTab.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
injectStyles();
function ToastHost(props) {
  const { flash, store } = props;
  if (flash === null) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(U.Toast, { text: (flash.kind === "ok" ? "\u2713 " : "\u2717 ") + flash.text, onDone: () => {
    store.clearFlash(flash.seq);
  } }, flash.seq);
}
function SettingsTab(props) {
  const { state, store, now } = props;
  (0, import_react4.useEffect)(() => {
    if (state.models === null) void store.loadModels();
  }, []);
  if (P === null) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ka-root", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ka-error-row", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\u5BBF\u4E3B\u672A\u4F9B\u5E94 UI \u7EC4\u4EF6\u6A21\u5757\uFF08@deepseek-ai/dsh-client-ui-primitives\uFF09\uFF0C\u65E0\u6CD5\u6E32\u67D3\u4FDD\u6D3B\u9762\u677F\u3002\u8BF7\u4F7F\u7528 dsh 0.1.2-rc.1 \u6216\u66F4\u65B0\u7248\u672C\u3002" }) }) });
  }
  const status = state.status;
  if (status === null) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ka-root", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ka-loading-row", children: state.error !== null ? "\u52A0\u8F7D\u5931\u8D25: " + state.error : "\u52A0\u8F7D\u4E2D\u2026" }),
      state.error !== null && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ka-error-row", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(P.Button, { "data-ka": "retry", variant: "outline", size: "sm", icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(P.IconRefreshOutline16, { size: 14 }), onClick: () => {
        void store.refresh();
      }, children: "\u91CD\u8BD5" }) })
    ] });
  }
  const enabled = status.config.enabled === true;
  const paused = status.paused === true;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ka-root", "data-ka": "root", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ToastHost, { flash: state.flash, store }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ka-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(P.StateDot, { state: enabled ? "ongoing" : "done" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "ka-title", children: "\u63D0\u4F9B\u5546\u4FDD\u6D3B" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "ka-header-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          P.Button,
          {
            "data-ka": "master",
            variant: enabled ? "primary" : "outline",
            size: "sm",
            icon: enabled ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(P.IconCheckOutline14, { size: 14 }) : void 0,
            disabled: state.pending["master"] === true,
            onClick: () => {
              void store.updateConfig({ enabled: !enabled }, { key: "master", ok: enabled ? "\u5DF2\u5173\u95ED\u4FDD\u6D3B" : "\u5DF2\u5F00\u542F\u4FDD\u6D3B" });
            },
            children: state.pending["master"] === true ? "\u5207\u6362\u4E2D\u2026" : enabled ? "\u4FDD\u6D3B\u5DF2\u5F00\u542F" : "\u4FDD\u6D3B\u5DF2\u505C\u7528"
          }
        ),
        paused ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(P.Button, { "data-ka": "resume", variant: "ghost", size: "sm", icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(P.IconPlayOutline16, { size: 14 }), disabled: state.pending["resume"] === true, onClick: () => {
          void store.act("resume", void 0, { key: "resume", ok: "\u5DF2\u6062\u590D\u8C03\u5EA6" });
        }, children: state.pending["resume"] === true ? "\u5904\u7406\u4E2D\u2026" : "\u6062\u590D\u8C03\u5EA6" }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(P.Button, { "data-ka": "pause", variant: "ghost", size: "sm", icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(P.IconPauseOutline16, { size: 14 }), disabled: state.pending["pause"] === true, onClick: () => {
          void store.act("pause", void 0, { key: "pause", ok: "\u5DF2\u6682\u505C\u8C03\u5EA6" });
        }, children: state.pending["pause"] === true ? "\u5904\u7406\u4E2D\u2026" : "\u6682\u505C\u8C03\u5EA6" })
      ] })
    ] }),
    state.error !== null && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "ka-error-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { children: [
        "\u9519\u8BEF: ",
        state.error
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(P.Button, { variant: "ghost", size: "sm", onClick: () => {
        void store.refresh();
      }, children: "\u5237\u65B0" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ka-section-title", children: "\u5168\u5C40\u914D\u7F6E" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ConfigForm, { config: status.config, store, pending: state.pending }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ka-section-title", children: "\u63D0\u4F9B\u5546" }),
    (() => {
      const seen = /* @__PURE__ */ new Map();
      for (const available of status.availableProviders) seen.set(available.id, available);
      for (const id of Object.keys(status.config.providers)) {
        if (!seen.has(id)) seen.set(id, { id, name: id });
      }
      const all = [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
      if (all.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "ka-empty", children: "\u6CA1\u6709\u53EF\u53C2\u4E0E\u7684\u63D0\u4F9B\u5546\u8DEF\u7531" });
      return all.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        ProviderCard,
        {
          id: provider.id,
          name: provider.name,
          registered: status.availableProviders.some((available) => available.id === provider.id),
          entry: status.config.providers[provider.id],
          row: status.providers.find((row) => row.id === provider.id),
          state,
          store,
          now
        },
        provider.id
      ));
    })(),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(HistorySection, { state, store })
  ] });
}

// src/client/store-instance.ts
function createStore2() {
  return createStore(window.fetch.bind(window), Date.now);
}

// src/client/index.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var inject = ["slots"];
var shared = null;
function sharedStore() {
  if (shared === null) shared = createStore2();
  return shared;
}
function apply(ctx) {
  const store = sharedStore();
  ctx.effect(() => {
    store.start();
    return () => store.stop();
  }, "dsh-keepalive: poll loop");
  ctx.inject(["slots"], (scope) => {
    scope.slots.inject(
      "settings.plugins.tab",
      () => scope.slots.register(
        { name: "settings.plugins.tab", id: "keepalive", order: 20, label: () => "\u63D0\u4F9B\u5546\u4FDD\u6D3B" },
        function KeepaliveSettingsTab() {
          return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SettingsTabBridge, { store });
        }
      )
    );
  });
}
function SettingsTabBridge(props) {
  const [state, setState] = React.useState(props.store.getSnapshot());
  React.useEffect(() => props.store.subscribe(setState), [props.store]);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1e3);
    return () => clearInterval(timer);
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SettingsTab, { state, store: props.store, now });
}

		return module.exports;
	}
});
