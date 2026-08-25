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
  Dock: () => Dock,
  Panel: () => Panel,
  apply: () => apply,
  countdownMs: () => countdownMs,
  createInitialUiState: () => createInitialUiState,
  createStore: () => createStore2,
  formatCountdown: () => formatCountdown,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var React = __toESM(require("react"), 1);

// src/client/Dock.tsx
var import_react = require("react");

// src/client/store.ts
var POLL_INTERVAL_MS = 5e3;
function createInitialUiState() {
  return { status: null, history: null, skewMs: 0, error: null, panelOpen: false };
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
function createStore(fetchLike, now, pollMs = POLL_INTERVAL_MS) {
  let state = createInitialUiState();
  const listeners = /* @__PURE__ */ new Set();
  let pollTimer = null;
  let inFlightPoll = false;
  function set(next) {
    state = { ...state, ...next };
    for (const listener of listeners) listener(state);
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
    setPanelOpen(open) {
      set({ panelOpen: open });
    },
    async updateConfig(patch) {
      try {
        const response = await fetchLike("/plugins/dsh-keepalive/config", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch)
        });
        if (!response.ok) throw new Error("config " + String(response.status));
        await pollStatus();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },
    async act(type, provider) {
      try {
        const response = await fetchLike("/plugins/dsh-keepalive/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type, ...provider === void 0 ? {} : { provider } })
        });
        if (!response.ok) throw new Error("action " + String(response.status));
        await pollStatus();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) });
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
    }
  };
}

// src/client/Dock.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var styles = {
  dock: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "2px 10px",
    fontSize: "12px",
    color: "var(--dsh-fg-muted, #888)",
    borderTop: "1px solid var(--dsh-border, #333)",
    cursor: "pointer",
    userSelect: "none"
  },
  dot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  countdown: { fontVariantNumeric: "tabular-nums" }
};
function dotColor(state) {
  if (state.error !== null) return "#e06c75";
  const status = state.status;
  if (status === null || !status.enabled) return "#5c6370";
  if (status.paused) return "#e5c07b";
  return "#98c379";
}
function Dock(props) {
  const [, forceTick] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => {
    const timer = setInterval(() => forceTick((n) => n + 1), 1e3);
    return () => clearInterval(timer);
  }, []);
  const status = props.state.status;
  let label = "keepalive \u2026";
  let countdown = null;
  if (props.state.error !== null) {
    label = "keepalive: " + props.state.error;
  } else if (status === null) {
    label = "keepalive: \u52A0\u8F7D\u4E2D";
  } else if (!status.enabled) {
    label = "keepalive: \u672A\u542F\u7528";
  } else if (status.paused) {
    label = "keepalive: \u5DF2\u6682\u505C";
  } else {
    const next = status.providers.filter((row) => row.nextFireAt !== null).sort((a, b) => (a.nextFireAt ?? 0) - (b.nextFireAt ?? 0))[0];
    if (next !== void 0) {
      countdown = formatCountdown(countdownMs(next.nextFireAt, props.state, props.now));
      label = "keepalive \u2192 " + next.id;
    } else {
      label = "keepalive: \u65E0\u6D3B\u8DC3\u63D0\u4F9B\u5546";
    }
  }
  const lastOk = status?.providers.some((row) => row.lastResult?.status === "ok");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.dock, onClick: props.onOpenPanel, role: "button", tabIndex: 0, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...styles.dot, background: dotColor(props.state) } }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
    countdown !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.countdown, children: countdown }),
    lastOk === true && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { title: "\u6700\u8FD1\u4E00\u6B21\u53D1\u9001\u6210\u529F", children: "\u2713" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: "auto" }, children: "\u6253\u5F00\u9762\u677F \u25B2" })
  ] });
}

// src/client/Panel.tsx
var import_react2 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
var styles2 = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1e3,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  panel: {
    width: "min(860px, 92vw)",
    maxHeight: "86vh",
    overflow: "auto",
    background: "var(--dsh-bg, #1e1e1e)",
    color: "var(--dsh-fg, #ddd)",
    borderRadius: "10px",
    padding: "18px 20px",
    boxShadow: "0 12px 48px rgba(0,0,0,0.5)"
  },
  header: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" },
  title: { fontSize: "16px", fontWeight: 600, flex: 1 },
  section: { margin: "14px 0" },
  sectionTitle: { fontSize: "13px", fontWeight: 600, opacity: 0.8, margin: "10px 0 6px" },
  row: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", padding: "4px 0", flexWrap: "wrap" },
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
  card: {
    border: "1px solid var(--dsh-border, #3a3a3a)",
    borderRadius: "8px",
    padding: "10px 12px",
    margin: "6px 0"
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "12px" },
  th: { textAlign: "left", opacity: 0.7, padding: "3px 8px", borderBottom: "1px solid var(--dsh-border, #3a3a3a)" },
  td: { padding: "3px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  badge: { fontSize: "11px", borderRadius: "10px", padding: "1px 8px" }
};
function statusBadge(row) {
  if (row.parked) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { ...styles2.badge, background: "rgba(224,108,117,0.2)", color: "#e06c75" }, children: "\u5DF2\u505C\u653E" });
  }
  if (!row.enabled) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { ...styles2.badge, background: "rgba(92,99,112,0.3)", color: "#888" }, children: "\u5DF2\u7981\u7528" });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { ...styles2.badge, background: "rgba(152,195,121,0.2)", color: "#98c379" }, children: "\u6D3B\u8DC3" });
}
function ProviderCard(props) {
  const { row, state, store, now } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.row, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: row.id }),
      statusBadge(row),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { opacity: 0.7 }, children: row.model ?? "\u6A21\u578B\u672A\u89E3\u6790" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { marginLeft: "auto", fontVariantNumeric: "tabular-nums" }, children: formatCountdown(countdownMs(row.nextFireAt, state, now)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...styles2.row, opacity: 0.85 }, children: [
      row.lastResult === null ? "\u5C1A\u65E0\u53D1\u9001\u8BB0\u5F55" : "\u6700\u8FD1: " + (row.lastResult.status === "ok" ? "\u2713 " : "\u2717 ") + String(row.lastResult.latencyMs) + "ms",
      row.consecutiveFailures > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
        "\u8FDE\u7EED\u5931\u8D25 ",
        String(row.consecutiveFailures)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { marginLeft: "auto", display: "flex", gap: "6px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: styles2.button, onClick: () => void store.act("fire-now", row.id), children: "\u7ACB\u5373\u53D1\u9001" }),
        row.parked && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: styles2.button, onClick: () => void store.act("resume-provider", row.id), children: "\u6062\u590D" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            style: styles2.button,
            onClick: () => void store.updateConfig({
              providers: { ...state.status?.config.providers, [row.id]: { ...row, enabled: !row.enabled } }
            }),
            children: row.enabled ? "\u7981\u7528" : "\u542F\u7528"
          }
        )
      ] })
    ] })
  ] });
}
function ConfigForm(props) {
  const { config, store } = props;
  const [interval, setIntervalValue] = (0, import_react2.useState)(String(config.intervalMinutes));
  const [jitter, setJitter] = (0, import_react2.useState)(String(config.jitterPercent));
  const [threshold, setThreshold] = (0, import_react2.useState)(String(config.autoPause.threshold));
  (0, import_react2.useEffect)(() => {
    setIntervalValue(String(config.intervalMinutes));
    setJitter(String(config.jitterPercent));
    setThreshold(String(config.autoPause.threshold));
  }, [config]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.row, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
      "\u57FA\u51C6\u95F4\u9694(\u5206) ",
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { style: styles2.input, value: interval, onChange: (e) => setIntervalValue(e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
      "\u6296\u52A8% ",
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { style: styles2.input, value: jitter, onChange: (e) => setJitter(e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
      "\u505C\u653E\u9608\u503C ",
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { style: styles2.input, value: threshold, onChange: (e) => setThreshold(e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { type: "checkbox", checked: config.autoPause.enabled, onChange: () => void store.updateConfig({ autoPause: { enabled: !config.autoPause.enabled, threshold: config.autoPause.threshold } }) }),
      "\u81EA\u52A8\u505C\u653E"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "button",
      {
        style: styles2.button,
        onClick: () => void store.updateConfig({
          intervalMinutes: Number(interval),
          jitterPercent: Number(jitter),
          autoPause: { enabled: config.autoPause.enabled, threshold: Number(threshold) }
        }),
        children: "\u4FDD\u5B58"
      }
    )
  ] });
}
function Panel(props) {
  const { state, store, now } = props;
  const [tab, setTab] = (0, import_react2.useState)("providers");
  const [, forceTick] = (0, import_react2.useState)(0);
  (0, import_react2.useEffect)(() => {
    const timer = setInterval(() => forceTick((n) => n + 1), 1e3);
    return () => clearInterval(timer);
  }, []);
  (0, import_react2.useEffect)(() => {
    if (state.panelOpen && state.history === null) void store.loadHistory(50);
  }, [state.panelOpen]);
  if (!state.panelOpen) return null;
  const status = state.status;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: styles2.overlay, onClick: (e) => {
    if (e.target === e.currentTarget) store.setPanelOpen(false);
  }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.panel, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles2.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: styles2.title, children: "dsh-keepalive \u63D0\u4F9B\u5546\u4FDD\u6D3B" }),
      status !== null && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: styles2.button, onClick: () => void store.updateConfig({ enabled: !status.config.enabled }), children: status.config.enabled ? "\u603B\u5F00\u5173: \u5F00" : "\u603B\u5F00\u5173: \u5173" }),
        status.paused ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: styles2.button, onClick: () => void store.act("resume"), children: "\u6062\u590D\u8C03\u5EA6" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: styles2.button, onClick: () => void store.act("pause"), children: "\u6682\u505C\u8C03\u5EA6" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: styles2.button, onClick: () => store.setPanelOpen(false), children: "\u5173\u95ED \u2715" })
    ] }),
    state.error !== null && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { ...styles2.row, color: "#e06c75" }, children: [
      "\u9519\u8BEF: ",
      state.error
    ] }),
    status === null ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: styles2.row, children: "\u52A0\u8F7D\u4E2D\u2026" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: styles2.row, children: ["providers", "history", "stats"].map((key) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: { ...styles2.button, ...tab === key ? { background: "rgba(255,255,255,0.08)" } : {} }, onClick: () => {
        setTab(key);
        if (key !== "providers") void store.loadHistory(50);
      }, children: key === "providers" ? "\u63D0\u4F9B\u5546" : key === "history" ? "\u5386\u53F2" : "\u7EDF\u8BA1" }, key)) }),
      tab === "providers" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "ka-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: styles2.sectionTitle, children: "\u914D\u7F6E" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ConfigForm, { config: status.config, store }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: styles2.sectionTitle, children: "\u63D0\u4F9B\u5546" }),
        status.providers.map((row) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ProviderCard, { row, state, store, now }, row.id))
      ] }),
      tab === "history" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { style: styles2.table, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: styles2.th, children: "\u65F6\u95F4" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: styles2.th, children: "\u63D0\u4F9B\u5546" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: styles2.th, children: "\u7ED3\u679C" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: styles2.th, children: "\u5EF6\u8FDF" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: styles2.th, children: "\u5185\u5BB9" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: (state.history?.items ?? []).map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: styles2.td, children: new Date(item.at).toLocaleTimeString() }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: styles2.td, children: item.provider }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: styles2.td, children: item.status === "ok" ? "\u2713" : "\u2717 " + (item.error ?? "") }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("td", { style: styles2.td, children: [
            String(item.latencyMs),
            "ms"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: styles2.td, children: item.content })
        ] }, String(item.at) + "-" + String(index))) })
      ] }),
      tab === "stats" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { style: styles2.table, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: styles2.th, children: "\u65E5\u671F" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: styles2.th, children: "\u6210\u529F" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: styles2.th, children: "\u5931\u8D25" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: styles2.th, children: "\u5E73\u5747\u5EF6\u8FDF" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: Object.entries(state.history?.dailyStats ?? {}).sort((a, b) => a[0] < b[0] ? 1 : -1).map(([day, stat]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: styles2.td, children: day }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: styles2.td, children: String(stat.success) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: styles2.td, children: String(stat.fail) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: styles2.td, children: stat.success > 0 ? String(Math.round(stat.latencyTotalMs / stat.success)) + "ms" : "-" })
        ] }, day)) })
      ] })
    ] })
  ] }) });
}

// src/client/store-instance.ts
function createStore2() {
  return createStore(window.fetch.bind(window), Date.now);
}

// src/client/index.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
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
      "conversation.composer.dock",
      () => scope.slots.register(
        { name: "conversation.composer.dock", id: "dsh-keepalive-dock", order: 90, inject: () => ({}) },
        function KeepaliveDock() {
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(DockBridge, { store });
        }
      )
    );
    scope.slots.inject(
      "shell.overlay",
      () => scope.slots.register(
        { name: "shell.overlay", id: "dsh-keepalive-panel", order: 90, inject: () => ({}) },
        function KeepaliveOverlay() {
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(PanelBridge, { store });
        }
      )
    );
  });
}
function DockBridge(props) {
  const [state, setState] = React.useState(props.store.getSnapshot());
  React.useEffect(() => props.store.subscribe(setState), [props.store]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Dock, { state, now: Date.now(), onOpenPanel: () => props.store.setPanelOpen(true) });
}
function PanelBridge(props) {
  const [state, setState] = React.useState(props.store.getSnapshot());
  React.useEffect(() => props.store.subscribe(setState), [props.store]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Panel, { state, store: props.store, now: Date.now() });
}

		return module.exports;
	}
});
