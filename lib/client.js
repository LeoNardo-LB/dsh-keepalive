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
var import_react = require("react");

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

// src/client/SettingsTab.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var DshToast = null;
try {
  const mod = require("@deepseek-ai/dsh-client-ui-primitives");
  DshToast = mod.Toast ?? null;
} catch {
}
var styles = {
  root: { display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" },
  headerRow: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  title: { fontWeight: 600, marginRight: "auto" },
  button: {
    border: "1px solid var(--dsh-border, #444)",
    background: "transparent",
    color: "inherit",
    borderRadius: "6px",
    padding: "3px 10px",
    fontSize: "12px",
    cursor: "pointer"
  },
  input: {
    border: "1px solid var(--dsh-border, #444)",
    background: "var(--dsh-bg-muted, #2a2a2a)",
    color: "inherit",
    borderRadius: "6px",
    padding: "3px 8px",
    fontSize: "12px",
    width: "80px"
  },
  select: {
    border: "1px solid var(--dsh-border, #444)",
    background: "var(--dsh-bg-muted, #2a2a2a)",
    color: "inherit",
    borderRadius: "6px",
    padding: "3px 8px",
    fontSize: "12px",
    maxWidth: "180px"
  },
  card: {
    border: "1px solid var(--dsh-border, #3a3a3a)",
    borderRadius: "8px",
    padding: "10px 12px"
  },
  row: { display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", flexWrap: "wrap" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "12px" },
  th: { textAlign: "left", opacity: 0.7, padding: "3px 8px", borderBottom: "1px solid var(--dsh-border, #3a3a3a)" },
  td: { padding: "3px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  badge: { fontSize: "11px", borderRadius: "10px", padding: "1px 8px" },
  tabRow: { display: "flex", gap: "6px" },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1100,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  modal: {
    width: "min(720px, 90vw)",
    maxHeight: "80vh",
    overflow: "auto",
    background: "var(--dsh-bg, #1e1e1e)",
    color: "var(--dsh-fg, #ddd)",
    borderRadius: "10px",
    padding: "16px 18px",
    boxShadow: "0 12px 48px rgba(0,0,0,0.5)"
  },
  block: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    border: "1px solid var(--dsh-border, #3a3a3a)",
    borderRadius: "6px",
    padding: "8px 10px",
    fontSize: "12px",
    margin: "4px 0 10px"
  }
};
function badgeFor(registered, entry, row) {
  if (!registered) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...styles.badge, background: "rgba(92,99,112,0.3)", color: "#888" }, children: "\u672A\u6CE8\u518C" });
  if (entry === void 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...styles.badge, background: "rgba(92,99,112,0.2)", color: "#999", border: "1px dashed #666" }, children: "\u672A\u53C2\u4E0E" });
  if (row?.parked === true) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...styles.badge, background: "rgba(224,108,117,0.2)", color: "#e06c75" }, children: "\u5DF2\u505C\u653E" });
  if (entry.enabled !== true) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...styles.badge, background: "rgba(92,99,112,0.3)", color: "#888" }, children: "\u5DF2\u7981\u7528" });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...styles.badge, background: "rgba(152,195,121,0.2)", color: "#98c379" }, children: "\u6D3B\u8DC3" });
}
function FlashView(props) {
  const { flash, store } = props;
  const [fallbackVisible, setFallbackVisible] = (0, import_react.useState)(false);
  const seq = flash?.seq ?? null;
  (0, import_react.useEffect)(() => {
    if (seq === null || DshToast !== null) return;
    setFallbackVisible(true);
    const timer = setTimeout(() => {
      setFallbackVisible(false);
      store.clearFlash(seq);
    }, 4e3);
    return () => clearTimeout(timer);
  }, [seq]);
  if (flash === null) return null;
  const text = (flash.kind === "ok" ? "\u2713 " : "\u2717 ") + flash.text;
  if (DshToast !== null) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DshToast, { text, onDone: () => store.clearFlash(flash.seq) }, flash.seq);
  }
  if (!fallbackVisible) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      role: "alert",
      style: {
        position: "fixed",
        top: "14px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1200,
        background: "var(--dsh-bg, #1e1e1e)",
        color: flash.kind === "ok" ? "#98c379" : "#e06c75",
        border: "1px solid var(--dsh-border, #444)",
        borderRadius: "8px",
        padding: "8px 14px",
        fontSize: "13px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
      },
      children: text
    },
    flash.seq
  );
}
function ProviderCard(props) {
  const { id, name, registered, entry, row, state, store, now } = props;
  const configuredModel = entry?.model ?? "";
  const [modelChoice, setModelChoice] = (0, import_react.useState)(String(configuredModel));
  (0, import_react.useEffect)(() => {
    setModelChoice(String(configuredModel));
  }, [configuredModel]);
  const modelOptions = state.models?.[id] ?? [];
  const saving = modelChoice === String(configuredModel);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: name }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { opacity: 0.55, fontSize: "11px" }, children: id }),
      badgeFor(registered, entry, row),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: "auto", fontVariantNumeric: "tabular-nums" }, children: entry !== void 0 && entry.enabled === true && row !== void 0 && row.nextFireAt !== null ? formatCountdown(countdownMs(row.nextFireAt, state, now)) : "\u2014" })
    ] }),
    row !== void 0 && entry !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...styles.row, opacity: 0.85 }, children: [
      row.lastResult === null ? "\u5C1A\u65E0\u53D1\u9001\u8BB0\u5F55" : "\u6700\u8FD1: " + (row.lastResult.status === "ok" ? "\u2713 " : "\u2717 ") + String(row.lastResult.latencyMs) + "ms",
      (row.consecutiveFailures ?? 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        "\u8FDE\u7EED\u5931\u8D25 ",
        String(row.consecutiveFailures)
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.row, children: entry === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        style: { ...styles.button, color: "#98c379", borderColor: "#98c379" },
        disabled: !registered || state.pending["optin:" + id] === true,
        title: registered ? "\u628A\u8BE5\u63D0\u4F9B\u5546\u52A0\u5165\u4FDD\u6D3B\u8C03\u5EA6" : "\u8BE5\u8DEF\u7531\u5F53\u524D\u672A\u6CE8\u518C\uFF0C\u65E0\u6CD5\u53C2\u4E0E",
        onClick: () => void store.updateConfig({ providers: { [id]: { enabled: true } } }, { key: "optin:" + id, ok: "\u5DF2\u52A0\u5165\u4FDD\u6D3B\u8C03\u5EA6" }),
        children: state.pending["optin:" + id] === true ? "\u52A0\u5165\u4E2D\u2026" : "\uFF0B \u53C2\u4E0E\u4FDD\u6D3B"
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u4FDD\u6D3B\u6A21\u578B",
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "select",
          {
            style: styles.select,
            value: modelChoice,
            onChange: (e) => setModelChoice(e.target.value),
            disabled: !registered || modelOptions.length === 0,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u9ED8\u8BA4\u6A21\u578B" }),
              modelOptions.map((modelId) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: modelId, children: modelId }, modelId))
            ]
          }
        )
      ] }),
      !registered && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { opacity: 0.55, fontSize: "11px" }, children: "\u8DEF\u7531\u672A\u6CE8\u518C\uFF0C\u5217\u8868\u4E0D\u53EF\u7528" }),
      registered && modelOptions.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { opacity: 0.55, fontSize: "11px" }, children: "\u6682\u65E0\u53EF\u7528\u6A21\u578B" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          style: { ...styles.button },
          disabled: saving || !registered || state.pending["model:" + id] === true,
          title: "\u9009\u5B9A\u4E0B\u62C9\u9879\u540E\u4FDD\u5B58",
          onClick: () => void store.updateConfig({ providers: { [id]: { enabled: entry.enabled, ...modelChoice === "" ? {} : { model: modelChoice } } } }, { key: "model:" + id, ok: "\u5DF2\u4FDD\u5B58\u4FDD\u6D3B\u6A21\u578B" }),
          children: state.pending["model:" + id] === true ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u6A21\u578B"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { marginLeft: "auto", display: "flex", gap: "6px" }, children: [
        row !== void 0 && entry.enabled === true && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            style: styles.button,
            disabled: state.pending["fire:" + id] === true,
            onClick: () => void store.act("fire-now", id, { key: "fire:" + id, ok: "\u5DF2\u89E6\u53D1\u7ACB\u5373\u53D1\u9001" }),
            children: state.pending["fire:" + id] === true ? "\u53D1\u9001\u4E2D\u2026" : "\u7ACB\u5373\u53D1\u9001"
          }
        ),
        row?.parked === true && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            style: styles.button,
            disabled: state.pending["resume:" + id] === true,
            onClick: () => void store.act("resume-provider", id, { key: "resume:" + id, ok: "\u5DF2\u6062\u590D\u8BE5\u63D0\u4F9B\u5546" }),
            children: state.pending["resume:" + id] === true ? "\u5904\u7406\u4E2D\u2026" : "\u6062\u590D"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            style: styles.button,
            disabled: state.pending["toggle:" + id] === true,
            onClick: () => void store.updateConfig(
              { providers: { [id]: { enabled: entry.enabled !== true, ...configuredModel === "" ? {} : { model: configuredModel } } } },
              { key: "toggle:" + id, ok: entry.enabled === true ? "\u5DF2\u7981\u7528\u8BE5\u63D0\u4F9B\u5546" : "\u5DF2\u542F\u7528\u8BE5\u63D0\u4F9B\u5546" }
            ),
            children: state.pending["toggle:" + id] === true ? "\u5207\u6362\u4E2D\u2026" : entry.enabled === true ? "\u7981\u7528" : "\u542F\u7528"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            style: { ...styles.button, color: "#e06c75", borderColor: "#e06c75" },
            disabled: state.pending["remove:" + id] === true,
            title: "\u6E05\u9664\u8BE5\u63D0\u4F9B\u5546\u7684\u4FDD\u6D3B\u914D\u7F6E\uFF08\u5217\u8868\u4E2D\u4ECD\u4F1A\u663E\u793A\uFF09",
            onClick: () => void store.act("remove-provider", id, { key: "remove:" + id, ok: "\u5DF2\u79FB\u9664\u8BE5\u63D0\u4F9B\u5546\u914D\u7F6E" }),
            children: state.pending["remove:" + id] === true ? "\u79FB\u9664\u4E2D\u2026" : "\u79FB\u9664\u914D\u7F6E"
          }
        )
      ] })
    ] }) })
  ] });
}
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.row, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u57FA\u51C6\u95F4\u9694(\u5206) ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { style: styles.input, value: interval, onChange: (e) => setIntervalValue(e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u6296\u52A8% ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { style: styles.input, value: jitter, onChange: (e) => setJitter(e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u505C\u653E\u9608\u503C ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { style: styles.input, value: threshold, onChange: (e) => setThreshold(e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "checkbox",
          checked: config.autoPause.enabled,
          onChange: () => void store.updateConfig({ autoPause: { enabled: !config.autoPause.enabled, threshold: config.autoPause.threshold } })
        }
      ),
      "\u81EA\u52A8\u505C\u653E"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        style: styles.button,
        disabled: props.pending["config"] === true,
        onClick: () => void store.updateConfig(
          {
            intervalMinutes: Number(interval),
            jitterPercent: Number(jitter),
            autoPause: { enabled: config.autoPause.enabled, threshold: Number(threshold) }
          },
          { key: "config", ok: "\u5DF2\u4FDD\u5B58\u914D\u7F6E" }
        ),
        children: props.pending["config"] === true ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58"
      }
    )
  ] });
}
function ReplyDialog(props) {
  const { entry, onClose } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.modalBackdrop, onClick: (e) => {
    if (e.target === e.currentTarget) onClose();
  }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.modal, role: "dialog", "aria-label": "\u4FDD\u6D3B\u56DE\u590D\u8BE6\u60C5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { style: styles.title, children: [
        new Date(entry.at).toLocaleString(),
        " \xB7 ",
        entry.provider,
        " \xB7 ",
        entry.model,
        " \xB7",
        " ",
        entry.status === "ok" ? "\u2713 \u6210\u529F" : "\u2717 \u5931\u8D25",
        " \xB7 ",
        String(entry.latencyMs),
        "ms"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.button, onClick: onClose, children: "\u5173\u95ED \u2715" })
    ] }),
    entry.error !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...styles.block, color: "#e06c75" }, children: entry.error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { opacity: 0.7 }, children: "\u53D1\u9001\u5185\u5BB9" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.block, children: entry.content }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { opacity: 0.7 }, children: [
      "\u6A21\u578B\u56DE\u590D",
      entry.reply === void 0 ? "\uFF08\u672C\u6761\u8BB0\u5F55\u65E9\u4E8E\u56DE\u590D\u91C7\u96C6\uFF0C\u65E0\u5B8C\u6574\u56DE\u590D\uFF09" : ""
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.block, children: entry.reply !== void 0 && entry.reply.length > 0 ? entry.reply : entry.preview || "\uFF08\u7A7A\uFF09" })
  ] }) });
}
function SettingsTab(props) {
  const { state, store, now } = props;
  const [tab, setTab] = (0, import_react.useState)("providers");
  const [replyEntry, setReplyEntry] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (state.models === null) void store.loadModels();
  }, []);
  const status = state.status;
  if (status === null) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.root, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.row, children: state.error !== null ? "\u52A0\u8F7D\u5931\u8D25: " + state.error : "\u52A0\u8F7D\u4E2D\u2026" }),
      state.error !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.button, onClick: () => void store.refresh(), children: "\u91CD\u8BD5" })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.root, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlashView, { flash: state.flash, store }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.headerRow, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.title, children: "\u63D0\u4F9B\u5546\u4FDD\u6D3B" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          style: styles.button,
          disabled: state.pending["master"] === true,
          onClick: () => void store.updateConfig(
            { enabled: !status.config.enabled },
            { key: "master", ok: status.config.enabled ? "\u5DF2\u5173\u95ED\u4FDD\u6D3B" : "\u5DF2\u5F00\u542F\u4FDD\u6D3B" }
          ),
          children: state.pending["master"] === true ? "\u5207\u6362\u4E2D\u2026" : status.config.enabled ? "\u603B\u5F00\u5173: \u5F00" : "\u603B\u5F00\u5173: \u5173"
        }
      ),
      status.paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.button, disabled: state.pending["resume"] === true, onClick: () => void store.act("resume", void 0, { key: "resume", ok: "\u5DF2\u6062\u590D\u8C03\u5EA6" }), children: state.pending["resume"] === true ? "\u5904\u7406\u4E2D\u2026" : "\u6062\u590D\u8C03\u5EA6" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.button, disabled: state.pending["pause"] === true, onClick: () => void store.act("pause", void 0, { key: "pause", ok: "\u5DF2\u6682\u505C\u8C03\u5EA6" }), children: state.pending["pause"] === true ? "\u5904\u7406\u4E2D\u2026" : "\u6682\u505C\u8C03\u5EA6" })
    ] }),
    state.error !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { ...styles.row, color: "#e06c75" }, children: [
      "\u9519\u8BEF: ",
      state.error
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.tabRow, children: ["providers", "history", "stats"].map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        style: { ...styles.button, ...tab === key ? { background: "rgba(255,255,255,0.08)" } : {} },
        onClick: () => {
          setTab(key);
          if (key !== "providers") void store.loadHistory(50);
        },
        children: key === "providers" ? "\u63D0\u4F9B\u5546" : key === "history" ? "\u5386\u53F2" : "\u7EDF\u8BA1"
      },
      key
    )) }),
    tab === "providers" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "ka-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.row, children: "\u914D\u7F6E" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfigForm, { config: status.config, store, pending: state.pending }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.row, children: "\u63D0\u4F9B\u5546" }),
      (() => {
        const seen = /* @__PURE__ */ new Map();
        for (const available of status.availableProviders) seen.set(available.id, available);
        for (const id of Object.keys(status.config.providers)) {
          if (!seen.has(id)) seen.set(id, { id, name: id });
        }
        const all = [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
        if (all.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...styles.row, opacity: 0.7 }, children: "\u6CA1\u6709\u53EF\u53C2\u4E0E\u7684\u63D0\u4F9B\u5546\u8DEF\u7531" });
        return all.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
      })()
    ] }),
    tab === "history" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { style: styles.table, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: styles.th, children: "\u65F6\u95F4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: styles.th, children: "\u63D0\u4F9B\u5546" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: styles.th, children: "\u6A21\u578B" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: styles.th, children: "\u7ED3\u679C" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: styles.th, children: "\u5EF6\u8FDF" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: styles.th, children: "\u56DE\u590D" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [
        (state.history?.items ?? []).map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: styles.td, children: new Date(item.at).toLocaleTimeString() }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: styles.td, children: item.provider }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: styles.td, children: item.model }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: styles.td, children: item.status === "ok" ? "\u2713" : "\u2717" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { style: styles.td, children: [
            String(item.latencyMs),
            "ms"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: styles.td, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.button, onClick: () => setReplyEntry(item), children: "\u67E5\u770B" }) })
        ] }, String(item.at) + "-" + String(index))),
        (state.history?.items ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: styles.td, colSpan: 6, children: "\u5C1A\u65E0\u53D1\u9001\u8BB0\u5F55" }) })
      ] })
    ] }),
    tab === "stats" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { style: styles.table, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: styles.th, children: "\u65E5\u671F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: styles.th, children: "\u6210\u529F" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: styles.th, children: "\u5931\u8D25" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: styles.th, children: "\u5E73\u5747\u5EF6\u8FDF" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: Object.entries(state.history?.dailyStats ?? {}).sort((a, b) => a[0] < b[0] ? 1 : -1).map(([day, stat]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: styles.td, children: day }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: styles.td, children: String(stat.success) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: styles.td, children: String(stat.fail) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: styles.td, children: stat.success > 0 ? String(Math.round(stat.latencyTotalMs / stat.success)) + "ms" : "-" })
      ] }, day)) })
    ] }),
    replyEntry !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReplyDialog, { entry: replyEntry, onClose: () => setReplyEntry(null) })
  ] });
}

// src/client/store-instance.ts
function createStore2() {
  return createStore(window.fetch.bind(window), Date.now);
}

// src/client/index.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
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
          return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SettingsTabBridge, { store });
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SettingsTab, { state, store: props.store, now });
}

		return module.exports;
	}
});
