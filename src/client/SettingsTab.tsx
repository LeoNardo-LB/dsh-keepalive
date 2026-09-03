/**
 * dsh-keepalive settings tab, rebuilt on the host primitives (spec D1-D8):
 * single scrolling page — header + config + provider cards always visible,
 * history/stats as collapsed disclosures. Presentation only; every reactive
 * fact arrives via props from the bridge and the polling store.
 */
import { useEffect } from 'react'
import { P, U } from './primitives.ts'
import { injectStyles } from './styles.ts'
import { ConfigForm } from './ConfigForm.tsx'
import { ProviderCard } from './ProviderCard.tsx'
import { HistorySection } from './HistorySection.tsx'
import type { KeepaliveStore, KeepaliveUiState } from './store.ts'

injectStyles()

export interface SettingsTabProps {
  state: KeepaliveUiState
  store: KeepaliveStore
  now: number
}

function ToastHost(props: { flash: KeepaliveUiState['flash']; store: KeepaliveStore }): React.ReactNode {
  const { flash, store } = props
  if (flash === null) return null
  return <U.Toast key={flash.seq} text={(flash.kind === 'ok' ? '✓ ' : '✗ ') + flash.text} onDone={() => { store.clearFlash(flash.seq) }} />
}

export function SettingsTab(props: SettingsTabProps): React.ReactNode {
  const { state, store, now } = props
  useEffect(() => {
    if (state.models === null) void store.loadModels()
  }, [])
  // Hard-dependency gate (spec D2): one error state for the whole tab.
  if (P === null) {
    return (
      <div className="ka-root">
        <div className="ka-error-row">
          <span>宿主未供应 UI 组件模块（@deepseek-ai/dsh-client-ui-primitives），无法渲染保活面板。请使用 dsh 0.1.2-rc.1 或更新版本。</span>
        </div>
      </div>
    )
  }
  const status = state.status
  if (status === null) {
    return (
      <div className="ka-root">
        <div className="ka-loading-row">{state.error !== null ? '加载失败: ' + state.error : '加载中…'}</div>
        {state.error !== null && (
          <div className="ka-error-row">
            <P.Button data-ka="retry" variant="outline" size="sm" icon={<P.IconRefreshOutline16 size={14} />} onClick={() => { void store.refresh() }}>重试</P.Button>
          </div>
        )}
      </div>
    )
  }
  const enabled = status.config.enabled === true
  const paused = status.paused === true
  return (
    <div className="ka-root" data-ka="root">
      <ToastHost flash={state.flash} store={store} />
      <div className="ka-header">
        <P.StateDot state={enabled ? 'ongoing' : 'done'} />
        <span className="ka-title">提供商保活</span>
        <span className="ka-header-actions">
          <P.Button
            data-ka="master"
            variant={enabled ? 'primary' : 'outline'}
            size="sm"
            icon={enabled ? <P.IconCheckOutline14 size={14} /> : undefined}
            disabled={state.pending['master'] === true}
            onClick={() => { void store.updateConfig({ enabled: !enabled }, { key: 'master', ok: enabled ? '已关闭保活' : '已开启保活' }) }}
          >
            {state.pending['master'] === true ? '切换中…' : enabled ? '保活已开启' : '保活已停用'}
          </P.Button>
          {paused
            ? (
              <P.Button data-ka="resume" variant="ghost" size="sm" icon={<P.IconPlayOutline16 size={14} />} disabled={state.pending['resume'] === true} onClick={() => { void store.act('resume', undefined, { key: 'resume', ok: '已恢复调度' }) }}>
                {state.pending['resume'] === true ? '处理中…' : '恢复调度'}
              </P.Button>
            )
            : (
              <P.Button data-ka="pause" variant="ghost" size="sm" icon={<P.IconPauseOutline16 size={14} />} disabled={state.pending['pause'] === true} onClick={() => { void store.act('pause', undefined, { key: 'pause', ok: '已暂停调度' }) }}>
                {state.pending['pause'] === true ? '处理中…' : '暂停调度'}
              </P.Button>
            )}
        </span>
      </div>
      {state.error !== null && (
        <div className="ka-error-row">
          <span>错误: {state.error}</span>
          <P.Button variant="ghost" size="sm" onClick={() => { void store.refresh() }}>刷新</P.Button>
        </div>
      )}
      <div className="ka-section-title">全局配置</div>
      <ConfigForm config={status.config} store={store} pending={state.pending} />
      <div className="ka-section-title">提供商</div>
      {((): React.ReactNode => {
        // Every registered route plus config-only leftovers (stale routes).
        const seen = new Map<string, { id: string; name: string }>()
        for (const available of status.availableProviders) seen.set(available.id, available)
        for (const id of Object.keys(status.config.providers)) {
          if (!seen.has(id)) seen.set(id, { id, name: id })
        }
        const all = [...seen.values()].sort((a, b) => a.id.localeCompare(b.id))
        if (all.length === 0) return <div className="ka-empty">没有可参与的提供商路由</div>
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
      <HistorySection state={state} store={store} />
    </div>
  )
}
