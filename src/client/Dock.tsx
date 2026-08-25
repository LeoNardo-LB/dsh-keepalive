/**
 * Composer dock strip: one-line summary always visible while a conversation
 * is open - master state, next provider countdown, latest result.
 */
import { useEffect, useState } from 'react'
import type { KeepaliveUiState } from './store.ts'
import { countdownMs, formatCountdown } from './store.ts'

export interface DockProps {
  state: KeepaliveUiState
  now: number
  onOpenPanel: () => void
}

const styles: Record<string, React.CSSProperties> = {
  dock: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '2px 10px',
    fontSize: '12px',
    color: 'var(--dsh-fg-muted, #888)',
    borderTop: '1px solid var(--dsh-border, #333)',
    cursor: 'pointer',
    userSelect: 'none'
  },
  dot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  countdown: { fontVariantNumeric: 'tabular-nums' }
}

function dotColor(state: KeepaliveUiState): string {
  if (state.error !== null) return '#e06c75'
  const status = state.status
  if (status === null || !status.enabled) return '#5c6370'
  if (status.paused) return '#e5c07b'
  return '#98c379'
}

export function Dock(props: DockProps): React.ReactNode {
  const [, forceTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const status = props.state.status
  let label = 'keepalive …'
  let countdown: string | null = null
  if (props.state.error !== null) {
    label = 'keepalive: ' + props.state.error
  } else if (status === null) {
    label = 'keepalive: 加载中'
  } else if (!status.enabled) {
    label = 'keepalive: 未启用'
  } else if (status.paused) {
    label = 'keepalive: 已暂停'
  } else {
    const next = status.providers
      .filter((row) => row.nextFireAt !== null)
      .sort((a, b) => (a.nextFireAt ?? 0) - (b.nextFireAt ?? 0))[0]
    if (next !== undefined) {
      countdown = formatCountdown(countdownMs(next.nextFireAt, props.state, props.now))
      label = 'keepalive → ' + next.id
    } else {
      label = 'keepalive: 无活跃提供商'
    }
  }
  const lastOk = status?.providers.some((row) => row.lastResult?.status === 'ok')
  return (
    <div style={styles.dock} onClick={props.onOpenPanel} role="button" tabIndex={0}>
      <span style={{ ...styles.dot, background: dotColor(props.state) }} />
      <span>{label}</span>
      {countdown !== null && <span style={styles.countdown}>{countdown}</span>}
      {lastOk === true && <span title="最近一次发送成功">✓</span>}
      <span style={{ marginLeft: 'auto' }}>打开面板 ▲</span>
    </div>
  )
}
