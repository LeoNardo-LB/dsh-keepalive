/**
 * dsh-keepalive settings page (Settings tab slot): config form, provider
 * cards with model dropdowns, history with reply inspection, daily stats.
 * Presentation only - every reactive fact arrives via props from Bridge.
 */
import { useEffect, useState } from 'react'
import type { KeepaliveConfig, HistoryEntry, ProviderConfig, ProviderStatus } from '../types.ts'
import type { KeepaliveUiState, KeepaliveStore } from './store.ts'
import { countdownMs, formatCountdown } from './store.ts'

export interface SettingsTabProps {
  state: KeepaliveUiState
  store: KeepaliveStore
  now: number
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' },
  headerRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  title: { fontWeight: 600, marginRight: 'auto' },
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
  select: {
    border: '1px solid var(--dsh-border, #444)',
    background: 'var(--dsh-bg-muted, #2a2a2a)',
    color: 'inherit',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '12px',
    maxWidth: '180px'
  },
  card: {
    border: '1px solid var(--dsh-border, #3a3a3a)',
    borderRadius: '8px',
    padding: '10px 12px'
  },
  row: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th: { textAlign: 'left', opacity: 0.7, padding: '3px 8px', borderBottom: '1px solid var(--dsh-border, #3a3a3a)' },
  td: { padding: '3px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  badge: { fontSize: '11px', borderRadius: '10px', padding: '1px 8px' },
  tabRow: { display: 'flex', gap: '6px' },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1100,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modal: {
    width: 'min(720px, 90vw)',
    maxHeight: '80vh',
    overflow: 'auto',
    background: 'var(--dsh-bg, #1e1e1e)',
    color: 'var(--dsh-fg, #ddd)',
    borderRadius: '10px',
    padding: '16px 18px',
    boxShadow: '0 12px 48px rgba(0,0,0,0.5)'
  },
  block: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    border: '1px solid var(--dsh-border, #3a3a3a)',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '12px',
    margin: '4px 0 10px'
  }
}

function badgeFor(registered: boolean, entry: ProviderConfig | undefined, row: ProviderStatus | undefined): React.ReactNode {
  if (!registered) return <span style={{ ...styles.badge, background: 'rgba(92,99,112,0.3)', color: '#888' }}>未注册</span>
  if (entry === undefined) return <span style={{ ...styles.badge, background: 'rgba(92,99,112,0.2)', color: '#999', border: '1px dashed #666' }}>未参与</span>
  if (row?.parked === true) return <span style={{ ...styles.badge, background: 'rgba(224,108,117,0.2)', color: '#e06c75' }}>已停放</span>
  if (entry.enabled !== true) return <span style={{ ...styles.badge, background: 'rgba(92,99,112,0.3)', color: '#888' }}>已禁用</span>
  return <span style={{ ...styles.badge, background: 'rgba(152,195,121,0.2)', color: '#98c379' }}>活跃</span>
}

/** One provider card. Model choice is a dropdown over the live route list. */
function ProviderCard(props: {
  id: string
  name: string
  registered: boolean
  entry: ProviderConfig | undefined
  row: ProviderStatus | undefined
  state: KeepaliveUiState
  store: KeepaliveStore
  now: number
}): React.ReactNode {
  const { id, name, registered, entry, row, state, store, now } = props
  // Dropdown seed = configured value; '' renders/selects the default option.
  const configuredModel = entry?.model ?? ''
  const [modelChoice, setModelChoice] = useState(String(configuredModel))
  useEffect(() => { setModelChoice(String(configuredModel)) }, [configuredModel])
  const modelOptions = state.models?.[id] ?? []
  const saving = modelChoice === String(configuredModel)
  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <strong>{name}</strong>
        <span style={{ opacity: 0.55, fontSize: '11px' }}>{id}</span>
        {badgeFor(registered, entry, row)}
        <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
          {entry !== undefined && entry.enabled === true && row !== undefined && row.nextFireAt !== null
            ? formatCountdown(countdownMs(row.nextFireAt, state, now))
            : '—'}
        </span>
      </div>
      {row !== undefined && entry !== undefined && (
        <div style={{ ...styles.row, opacity: 0.85 }}>
          {row.lastResult === null
            ? '尚无发送记录'
            : '最近: ' + (row.lastResult.status === 'ok' ? '✓ ' : '✗ ') + String(row.lastResult.latencyMs) + 'ms'}
          {(row.consecutiveFailures ?? 0) > 0 && <span>连续失败 {String(row.consecutiveFailures)}</span>}
        </div>
      )}
      <div style={styles.row}>
        {entry === undefined ? (
          <button
            style={{ ...styles.button, color: '#98c379', borderColor: '#98c379' }}
            disabled={!registered}
            title={registered ? '把该提供商加入保活调度' : '该路由当前未注册，无法参与'}
            onClick={() => void store.updateConfig({ providers: { [id]: { enabled: true } } })}
          >
            ＋ 参与保活
          </button>
        ) : (
          <>
            <label>
              保活模型{' '}
              <select
                style={styles.select}
                value={modelChoice}
                onChange={(e) => setModelChoice(e.target.value)}
                disabled={!registered || modelOptions.length === 0}
              >
                <option value="">默认模型</option>
                {modelOptions.map((modelId) => (
                  <option key={modelId} value={modelId}>{modelId}</option>
                ))}
              </select>
            </label>
            {!registered && <span style={{ opacity: 0.55, fontSize: '11px' }}>路由未注册，列表不可用</span>}
            {registered && modelOptions.length === 0 && <span style={{ opacity: 0.55, fontSize: '11px' }}>暂无可用模型</span>}
            <button
              style={{ ...styles.button }}
              disabled={saving || !registered}
              title="选定下拉项后保存"
              onClick={() => void store.updateConfig({ providers: { [id]: { enabled: entry.enabled, ...(modelChoice === '' ? {} : { model: modelChoice }) } } })}
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
                title="清除该提供商的保活配置（列表中仍会显示）"
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
        <input
          type="checkbox"
          checked={config.autoPause.enabled}
          onChange={() => void store.updateConfig({ autoPause: { enabled: !config.autoPause.enabled, threshold: config.autoPause.threshold } })}
        />
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

/** Full outbound message + the model's reply for one shot. */
function ReplyDialog(props: { entry: HistoryEntry; onClose: () => void }): React.ReactNode {
  const { entry, onClose } = props
  return (
    <div style={styles.modalBackdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={styles.modal} role="dialog" aria-label="保活回复详情">
        <div style={styles.row}>
          <strong style={styles.title}>
            {new Date(entry.at).toLocaleString()} · {entry.provider} · {entry.model} ·{' '}
            {entry.status === 'ok' ? '✓ 成功' : '✗ 失败'} · {String(entry.latencyMs)}ms
          </strong>
          <button style={styles.button} onClick={onClose}>关闭 ✕</button>
        </div>
        {entry.error !== undefined && <div style={{ ...styles.block, color: '#e06c75' }}>{entry.error}</div>}
        <div style={{ opacity: 0.7 }}>发送内容</div>
        <div style={styles.block}>{entry.content}</div>
        <div style={{ opacity: 0.7 }}>模型回复{entry.reply === undefined ? '（本条记录早于回复采集，无完整回复）' : ''}</div>
        <div style={styles.block}>{entry.reply !== undefined && entry.reply.length > 0 ? entry.reply : (entry.preview || '（空）')}</div>
      </div>
    </div>
  )
}

export function SettingsTab(props: SettingsTabProps): React.ReactNode {
  const { state, store, now } = props
  const [tab, setTab] = useState<'providers' | 'history' | 'stats'>('providers')
  const [replyEntry, setReplyEntry] = useState<HistoryEntry | null>(null)
  useEffect(() => {
    if (state.models === null) void store.loadModels()
  }, [])
  const status = state.status
  if (status === null) {
    return (
      <div style={styles.root}>
        <div style={styles.row}>{state.error !== null ? '加载失败: ' + state.error : '加载中…'}</div>
        {state.error !== null && <button style={styles.button} onClick={() => void store.refresh()}>重试</button>}
      </div>
    )
  }
  return (
    <div style={styles.root}>
      <div style={styles.headerRow}>
        <span style={styles.title}>提供商保活</span>
        <button style={styles.button} onClick={() => void store.updateConfig({ enabled: !status.config.enabled })}>
          {status.config.enabled ? '总开关: 开' : '总开关: 关'}
        </button>
        {status.paused
          ? <button style={styles.button} onClick={() => void store.act('resume')}>恢复调度</button>
          : <button style={styles.button} onClick={() => void store.act('pause')}>暂停调度</button>}
      </div>
      {state.error !== null && <div style={{ ...styles.row, color: '#e06c75' }}>错误: {state.error}</div>}
      <div style={styles.tabRow}>
        {(['providers', 'history', 'stats'] as const).map((key) => (
          <button
            key={key}
            style={{ ...styles.button, ...(tab === key ? { background: 'rgba(255,255,255,0.08)' } : {}) }}
            onClick={() => { setTab(key); if (key !== 'providers') void store.loadHistory(50) }}
          >
            {key === 'providers' ? '提供商' : key === 'history' ? '历史' : '统计'}
          </button>
        ))}
      </div>
      {tab === 'providers' && (
        <div className="ka-section">
          <div style={styles.row}>配置</div>
          <ConfigForm config={status.config} store={store} />
          <div style={styles.row}>提供商</div>
          {((): React.ReactNode => {
            // Every registered route plus config-only leftovers (stale routes).
            const seen = new Map<string, { id: string; name: string }>()
            for (const available of status.availableProviders) seen.set(available.id, available)
            for (const id of Object.keys(status.config.providers)) {
              if (!seen.has(id)) seen.set(id, { id, name: id })
            }
            const all = [...seen.values()].sort((a, b) => a.id.localeCompare(b.id))
            if (all.length === 0) return <div style={{ ...styles.row, opacity: 0.7 }}>没有可参与的提供商路由</div>
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
          <thead>
            <tr><th style={styles.th}>时间</th><th style={styles.th}>提供商</th><th style={styles.th}>模型</th><th style={styles.th}>结果</th><th style={styles.th}>延迟</th><th style={styles.th}>回复</th></tr>
          </thead>
          <tbody>
            {(state.history?.items ?? []).map((item, index) => (
              <tr key={String(item.at) + '-' + String(index)}>
                <td style={styles.td}>{new Date(item.at).toLocaleTimeString()}</td>
                <td style={styles.td}>{item.provider}</td>
                <td style={styles.td}>{item.model}</td>
                <td style={styles.td}>{item.status === 'ok' ? '✓' : '✗'}</td>
                <td style={styles.td}>{String(item.latencyMs)}ms</td>
                <td style={styles.td}>
                  <button style={styles.button} onClick={() => setReplyEntry(item)}>查看</button>
                </td>
              </tr>
            ))}
            {(state.history?.items ?? []).length === 0 && (
              <tr><td style={styles.td} colSpan={6}>尚无发送记录</td></tr>
            )}
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
      {replyEntry !== null && <ReplyDialog entry={replyEntry} onClose={() => setReplyEntry(null)} />}
    </div>
  )
}
