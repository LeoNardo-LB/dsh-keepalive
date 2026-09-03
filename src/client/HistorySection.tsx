/**
 * History + daily stats as collapsed DisclosureRow sections (spec D5/D6):
 * one row per shot, reply inspected by expanding the row in place — no table,
 * no modal. Both sections lazily pull history on first expand.
 */
import { useEffect, useState } from 'react'
import { U } from './primitives.ts'
import type { KeepaliveStore, KeepaliveUiState } from './store.ts'
import type { HistoryEntry } from '../types.ts'

function EntryRow(props: { entry: HistoryEntry; open: boolean; onToggle: () => void }): React.ReactNode {
  const { entry, open, onToggle } = props
  const ok = entry.status === 'ok'
  return (
    <U.DisclosureRow
      className="ka-history-entry"
      icon={<U.StateDot state={ok ? 'done' : 'error'} />}
      title={new Date(entry.at).toLocaleTimeString() + ' · ' + entry.provider + ' · ' + entry.model}
      open={open}
      expandable
      onToggle={onToggle}
      expandOnRowClick
      collapsedContent={<span className={ok ? 'ka-ok' : 'ka-err'}>{ok ? '成功' : '失败'} · {String(entry.latencyMs)}ms</span>}
    >
      <div className="ka-reply-detail">
        {entry.error !== undefined && <div className="ka-err">{entry.error}</div>}
        <div className="ka-detail-label">发送内容</div>
        <div className="ka-detail-block">{entry.content}</div>
        <div className="ka-detail-label">模型回复{entry.reply === undefined ? '（本条记录早于回复采集，无完整回复）' : ''}</div>
        <div className="ka-detail-block">
          {entry.reply !== undefined && entry.reply.length > 0 ? <U.MessageText text={entry.reply} /> : (entry.preview || '（空）')}
        </div>
      </div>
    </U.DisclosureRow>
  )
}

export function HistorySection(props: { state: KeepaliveUiState; store: KeepaliveStore }): React.ReactNode {
  const { state, store } = props
  const [historyOpen, setHistoryOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [openAt, setOpenAt] = useState<number | null>(null)
  useEffect(() => {
    if ((historyOpen || statsOpen) && state.history === null) void store.loadHistory(50)
  }, [historyOpen, statsOpen])
  const items = state.history?.items ?? []
  const daily = Object.entries(state.history?.dailyStats ?? {}).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  const totalSuccess = daily.reduce((sum, [, stat]) => sum + stat.success, 0)
  const totalFail = daily.reduce((sum, [, stat]) => sum + stat.fail, 0)
  return (
    <div className="ka-disclosure-group">
      <U.DisclosureRow
        className="ka-history-section"
        icon={<U.IconClockOutline16 size={14} />}
        title={'历史（' + String(items.length) + '）'}
        open={historyOpen}
        expandable
        onToggle={() => { setHistoryOpen(!historyOpen) }}
        expandOnRowClick
      >
        {items.length === 0
          ? <div className="ka-empty">尚无发送记录</div>
          : (
            <div className="ka-entry-list">
              {items.map((entry, index) => (
                <EntryRow
                  key={String(entry.at) + '-' + String(index)}
                  entry={entry}
                  open={openAt === entry.at}
                  onToggle={() => { setOpenAt(openAt === entry.at ? null : entry.at) }}
                />
              ))}
            </div>
          )}
      </U.DisclosureRow>
      <U.DisclosureRow
        className="ka-stats-section"
        icon={<U.IconCheckOutline16 size={14} />}
        title="统计"
        open={statsOpen}
        expandable
        onToggle={() => { setStatsOpen(!statsOpen) }}
        expandOnRowClick
        collapsedContent={<span className="ka-dim">成功 {String(totalSuccess)} · 失败 {String(totalFail)}</span>}
      >
        {daily.length === 0
          ? <div className="ka-empty">尚无统计数据</div>
          : daily.map(([day, stat]) => (
            <div className="ka-stat-row" key={day} data-ka="stat-row">
              <span className="ka-stat-day ka-num">{day}</span>
              <span className="ka-ok ka-num">成功 {String(stat.success)}</span>
              <span className="ka-err ka-num">失败 {String(stat.fail)}</span>
              <span className="ka-dim ka-num">{stat.success > 0 ? '均延迟 ' + String(Math.round(stat.latencyTotalMs / stat.success)) + 'ms' : '—'}</span>
            </div>
          ))}
      </U.DisclosureRow>
    </div>
  )
}
