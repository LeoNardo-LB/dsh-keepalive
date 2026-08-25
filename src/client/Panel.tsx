/**
 * Full-page overlay panel (shell.overlay seat): provider cards with
 * countdown/park/manual buttons, history table, daily stats, and the config
 * form (master switch, interval, jitter, auto-pause, per-provider toggle).
 */
import { useEffect, useState } from 'react'
import type { KeepaliveConfig, ProviderStatus } from '../types.ts'
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

function statusBadge(row: ProviderStatus): React.ReactNode {
  if (row.parked) {
    return <span style={{ ...styles.badge, background: 'rgba(224,108,117,0.2)', color: '#e06c75' }}>已停放</span>
  }
  if (!row.enabled) {
    return <span style={{ ...styles.badge, background: 'rgba(92,99,112,0.3)', color: '#888' }}>已禁用</span>
  }
  return <span style={{ ...styles.badge, background: 'rgba(152,195,121,0.2)', color: '#98c379' }}>活跃</span>
}

function ProviderCard(props: { row: ProviderStatus; state: KeepaliveUiState; store: KeepaliveStore; now: number }): React.ReactNode {
  const { row, state, store, now } = props
  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <strong>{row.id}</strong>
        {statusBadge(row)}
        <span style={{ opacity: 0.7 }}>{row.model ?? '模型未解析'}</span>
        <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
          {formatCountdown(countdownMs(row.nextFireAt, state, now))}
        </span>
      </div>
      <div style={{ ...styles.row, opacity: 0.85 }}>
        {row.lastResult === null
          ? '尚无发送记录'
          : '最近: ' + (row.lastResult.status === 'ok' ? '✓ ' : '✗ ') + String(row.lastResult.latencyMs) + 'ms'}
        {row.consecutiveFailures > 0 && <span>连续失败 {String(row.consecutiveFailures)}</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button style={styles.button} onClick={() => void store.act('fire-now', row.id)}>立即发送</button>
          {row.parked && <button style={styles.button} onClick={() => void store.act('resume-provider', row.id)}>恢复</button>}
          <button
            style={styles.button}
            onClick={() =>
              void store.updateConfig({
                providers: { ...state.status?.config.providers, [row.id]: { ...row, enabled: !row.enabled } }
              })
            }
          >
            {row.enabled ? '禁用' : '启用'}
          </button>
        </span>
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
                {status.providers.map((row) => <ProviderCard key={row.id} row={row} state={state} store={store} now={now} />)}
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
