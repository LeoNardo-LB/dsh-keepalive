/**
 * Full-page overlay panel (shell.overlay seat): provider cards with
 * countdown/park/manual buttons, history table, daily stats, and the config
 * form (master switch, interval, jitter, auto-pause, per-provider toggle).
 */
import { useEffect, useState } from 'react'
import type { KeepaliveConfig, ProviderConfig, ProviderStatus } from '../types.ts'
import type { KeepaliveUiState, KeepaliveStore } from './store.ts'
import { countdownMs, formatCountdown } from './store.ts'

export interface PanelProps {
  state: KeepaliveUiState
  store: KeepaliveStore
  now: number
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  panel: {
    width: 'min(860px, 92vw)',
    maxHeight: '86vh',
    overflow: 'auto',
    background: 'var(--dsh-bg, #1e1e1e)',
    color: 'var(--dsh-fg, #ddd)',
    borderRadius: '10px',
    padding: '18px 20px',
    boxShadow: '0 12px 48px rgba(0,0,0,0.5)'
  },
  header: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  title: { fontSize: '16px', fontWeight: 600, flex: 1 },
  section: { margin: '14px 0' },
  sectionTitle: { fontSize: '13px', fontWeight: 600, opacity: 0.8, margin: '10px 0 6px' },
  row: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '4px 0', flexWrap: 'wrap' },
  button: {
    border: '1px solid var(--dsh-border, #444)',
    background: 'transparent',
    color: 'inherit',
    borderRadius: '6px',
    padding: '3px 10px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  input: {
    border: '1px solid var(--dsh-border, #444)',
    background: 'var(--dsh-bg-muted, #2a2a2a)',
    color: 'inherit',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '12px',
    width: '80px'
  },
  card: {
    border: '1px solid var(--dsh-border, #3a3a3a)',
    borderRadius: '8px',
    padding: '10px 12px',
    margin: '6px 0'
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th: { textAlign: 'left', opacity: 0.7, padding: '3px 8px', borderBottom: '1px solid var(--dsh-border, #3a3a3a)' },
  td: { padding: '3px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  badge: { fontSize: '11px', borderRadius: '10px', padding: '1px 8px' }
}

function providerBadge(registered: boolean, entry: ProviderConfig | undefined, row: ProviderStatus | undefined): React.ReactNode {
  if (!registered) {
    return <span style={{ ...styles.badge, background: 'rgba(92,99,112,0.3)', color: '#888' }}>未注册</span>
  }
  if (entry === undefined) {
    return <span style={{ ...styles.badge, background: 'rgba(92,99,112,0.2)', color: '#999', border: '1px dashed #666' }}>未参与</span>
  }
  if (row?.parked === true) {
    return <span style={{ ...styles.badge, background: 'rgba(224,108,117,0.2)', color: '#e06c75' }}>已停放</span>
  }
  if (entry.enabled !== true) {
    return <span style={{ ...styles.badge, background: 'rgba(92,99,112,0.3)', color: '#888' }}>已禁用</span>
  }
  return <span style={{ ...styles.badge, background: 'rgba(152,195,121,0.2)', color: '#98c379' }}>活跃</span>
}

/**
 * One card per provider route. The panel ALWAYS shows every registered route
 * (availableProviders superset); the config entry is only this provider's
 * override - absent means "not participating yet", one click opts in.
 */
function ProviderCard(props: { id: string; name: string; registered: boolean; entry: ProviderConfig | undefined; row: ProviderStatus | undefined; state: KeepaliveUiState; store: KeepaliveStore; now: number }): React.ReactNode {
  const { id, name, registered, entry, row, state, store, now } = props
  // Model box seeds from the CONFIG value (not the resolved one, so "default
  // model" is not silently pinned to an explicit id) and follows external
  // config changes; empty string = use the provider default.
  const configuredModel = entry?.model ?? ''
  const [modelText, setModelText] = useState(String(configuredModel))
  useEffect(() => { setModelText(String(configuredModel)) }, [configuredModel])
  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <strong>{name}</strong>
        <span style={{ opacity: 0.55, fontSize: '11px' }}>{id}</span>
        {providerBadge(registered, entry, row)}
        <span style={{ opacity: 0.7 }}>{row?.model ?? (entry?.model ?? '默认模型')}</span>
        <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
          {entry !== undefined && entry.enabled === true && row !== undefined
            ? formatCountdown(countdownMs(row.nextFireAt, state, now))
            : '—'}
        </span>
      </div>
      {entry !== undefined && row !== undefined && (
        <div style={{ ...styles.row, opacity: 0.85 }}>
          {row.lastResult === null
            ? '尚无发送记录'
            : '最近: ' + (row.lastResult.status === 'ok' ? '✓ ' : '✗ ') + String(row.lastResult.latencyMs) + 'ms'}
          {(row.consecutiveFailures ?? 0) > 0 && <span>连续失败 {String(row.consecutiveFailures)}</span>}
        </div>
      )}
      <div style={styles.row}>
        {entry === undefined ? (
          <span style={{ marginLeft: 'auto' }}>
            <button
              style={{ ...styles.button, color: '#98c379', borderColor: '#98c379' }}
              disabled={!registered}
              title={registered ? '把该提供商加入保活调度' : '该路由当前未注册，无法参与'}
              onClick={() => void store.updateConfig({ providers: { [id]: { enabled: true } } })}
            >
              ＋ 参与保活
            </button>
          </span>
        ) : (
          <>
            <label>保活模型
              <input
                style={{ ...styles.input, width: '150px' }}
                placeholder="默认模型"
                value={modelText}
                onChange={(e) => setModelText(e.target.value)}
              />
            </label>
            <button
              style={styles.button}
              title="空 = 使用该提供商默认模型"
              onClick={() => void store.updateConfig({ providers: { [id]: { enabled: entry.enabled, model: modelText } } })}
            >
              保存模型
            </button>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              {row !== undefined && entry.enabled === true && (
                <button style={styles.button} onClick={() => void store.act('fire-now', id)}>立即发送</button>
              )}
              {row?.parked === true && <button style={styles.button} onClick={() => void store.act('resume-provider', id)}>恢复</button>}
              <button
                style={styles.button}
                onClick={() =>
                  void store.updateConfig({ providers: { [id]: { enabled: entry.enabled !== true, ...(configuredModel === '' ? {} : { model: configuredModel }) } } })
                }
              >
                {entry.enabled === true ? '禁用' : '启用'}
              </button>
              <button
                style={{ ...styles.button, color: '#e06c75', borderColor: '#e06c75' }}
                title="清除该提供商的保活配置（面板中仍会显示）"
                onClick={() => void store.act('remove-provider', id)}
              >
                移除配置
              </button>
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function ConfigForm(props: { config: KeepaliveConfig; store: KeepaliveStore }): React.ReactNode {
  const { config, store } = props
  const [interval, setIntervalValue] = useState(String(config.intervalMinutes))
  const [jitter, setJitter] = useState(String(config.jitterPercent))
  const [threshold, setThreshold] = useState(String(config.autoPause.threshold))
  useEffect(() => {
    setIntervalValue(String(config.intervalMinutes))
    setJitter(String(config.jitterPercent))
    setThreshold(String(config.autoPause.threshold))
  }, [config])
  return (
    <div style={styles.row}>
      <label>基准间隔(分) <input style={styles.input} value={interval} onChange={(e) => setIntervalValue(e.target.value)} /></label>
      <label>抖动% <input style={styles.input} value={jitter} onChange={(e) => setJitter(e.target.value)} /></label>
      <label>停放阈值 <input style={styles.input} value={threshold} onChange={(e) => setThreshold(e.target.value)} /></label>
      <label>
        <input type="checkbox" checked={config.autoPause.enabled} onChange={() => void store.updateConfig({ autoPause: { enabled: !config.autoPause.enabled, threshold: config.autoPause.threshold } })} />
        自动停放
      </label>
      <button
        style={styles.button}
        onClick={() =>
          void store.updateConfig({
            intervalMinutes: Number(interval),
            jitterPercent: Number(jitter),
            autoPause: { enabled: config.autoPause.enabled, threshold: Number(threshold) }
          })
        }
      >
        保存
      </button>
    </div>
  )
}

export function Panel(props: PanelProps): React.ReactNode {
  const { state, store, now } = props
  const [tab, setTab] = useState<'providers' | 'history' | 'stats'>('providers')
  const [, forceTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (state.panelOpen && state.history === null) void store.loadHistory(50)
  }, [state.panelOpen])

  if (!state.panelOpen) return null
  const status = state.status
  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) store.setPanelOpen(false) }}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <span style={styles.title}>dsh-keepalive 提供商保活</span>
          {status !== null && (
            <>
              <button style={styles.button} onClick={() => void store.updateConfig({ enabled: !status.config.enabled })}>
                {status.config.enabled ? '总开关: 开' : '总开关: 关'}
              </button>
              {status.paused
                ? <button style={styles.button} onClick={() => void store.act('resume')}>恢复调度</button>
                : <button style={styles.button} onClick={() => void store.act('pause')}>暂停调度</button>}
            </>
          )}
          <button style={styles.button} onClick={() => store.setPanelOpen(false)}>关闭 ✕</button>
        </div>
        {state.error !== null && <div style={{ ...styles.row, color: '#e06c75' }}>错误: {state.error}</div>}
        {status === null ? (
          <div style={styles.row}>加载中…</div>
        ) : (
          <>
            <div style={styles.row}>
              {(['providers', 'history', 'stats'] as const).map((key) => (
                <button key={key} style={{ ...styles.button, ...(tab === key ? { background: 'rgba(255,255,255,0.08)' } : {}) }} onClick={() => { setTab(key); if (key !== 'providers') void store.loadHistory(50) }}>
                  {key === 'providers' ? '提供商' : key === 'history' ? '历史' : '统计'}
                </button>
              ))}
            </div>
            {tab === 'providers' && (
              <div className="ka-section">
                <div style={styles.sectionTitle}>配置</div>
                <ConfigForm config={status.config} store={store} />
                <div style={styles.sectionTitle}>提供商</div>
                {((): React.ReactNode => {
                  // Every registered route, plus config-only leftovers (stale
                  // routes) marked unregistered - the panel is the FULL list.
                  const seen = new Map<string, { id: string; name: string }>()
                  for (const available of status.availableProviders) seen.set(available.id, available)
                  for (const id of Object.keys(status.config.providers)) {
                    if (!seen.has(id)) seen.set(id, { id, name: id })
                  }
                  const all = [...seen.values()].sort((a, b) => a.id.localeCompare(b.id))
                  return all.map((provider) => (
                    <ProviderCard
                      key={provider.id}
                      id={provider.id}
                      name={provider.name}
                      registered={status.availableProviders.some((available) => available.id === provider.id)}
                      entry={status.config.providers[provider.id]}
                      row={status.providers.find((row) => row.id === provider.id)}
                      state={state}
                      store={store}
                      now={now}
                    />
                  ))
                })()}
              </div>
            )}
            {tab === 'history' && (
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>时间</th><th style={styles.th}>提供商</th><th style={styles.th}>结果</th><th style={styles.th}>延迟</th><th style={styles.th}>内容</th></tr></thead>
                <tbody>
                  {(state.history?.items ?? []).map((item, index) => (
                    <tr key={String(item.at) + '-' + String(index)}>
                      <td style={styles.td}>{new Date(item.at).toLocaleTimeString()}</td>
                      <td style={styles.td}>{item.provider}</td>
                      <td style={styles.td}>{item.status === 'ok' ? '✓' : '✗ ' + (item.error ?? '')}</td>
                      <td style={styles.td}>{String(item.latencyMs)}ms</td>
                      <td style={styles.td}>{item.content}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'stats' && (
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>日期</th><th style={styles.th}>成功</th><th style={styles.th}>失败</th><th style={styles.th}>平均延迟</th></tr></thead>
                <tbody>
                  {Object.entries(state.history?.dailyStats ?? {}).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([day, stat]) => (
                    <tr key={day}>
                      <td style={styles.td}>{day}</td>
                      <td style={styles.td}>{String(stat.success)}</td>
                      <td style={styles.td}>{String(stat.fail)}</td>
                      <td style={styles.td}>{stat.success > 0 ? String(Math.round(stat.latencyTotalMs / stat.success)) + 'ms' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  )
}
