/**
 * One provider card (spec D4/D7/D8): StateDot + Pill status, live countdown,
 * the model picker as a host-style Menu, primary actions exposed, secondary
 * actions behind an ellipsis Menu, removal behind an inline RiskConfirmation.
 */
import { useEffect, useState } from 'react'
import { U } from './primitives.ts'
import { countdownMs, formatCountdown } from './store.ts'
import type { KeepaliveStore, KeepaliveUiState } from './store.ts'
import type { ProviderConfig, ProviderStatus } from '../types.ts'

interface CardStatus {
  dot: 'done' | 'warning' | 'ongoing' | 'error' | null
  pillText: string
  pillClass: string
}

function cardStatus(registered: boolean, entry: ProviderConfig | undefined, row: ProviderStatus | undefined): CardStatus {
  if (!registered) return { dot: null, pillText: '未注册', pillClass: 'ka-pill-dim' }
  if (entry === undefined) return { dot: null, pillText: '未参与', pillClass: 'ka-pill-dim' }
  if (row?.parked === true) return { dot: 'warning', pillText: '已停放', pillClass: 'ka-pill-warn' }
  if (entry.enabled !== true) return { dot: null, pillText: '已禁用', pillClass: 'ka-pill-dim' }
  return { dot: 'ongoing', pillText: '活跃', pillClass: 'ka-pill-ok' }
}

export function ProviderCard(props: {
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
  const configuredModel = entry?.model ?? ''
  const [modelChoice, setModelChoice] = useState(String(configuredModel))
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  useEffect(() => { setModelChoice(String(configuredModel)) }, [configuredModel])
  const modelOptions = state.models?.[id] ?? []
  const modelSaving = modelChoice === String(configuredModel)
  const status = cardStatus(registered, entry, row)
  const enabled = entry?.enabled === true
  const countdown = entry !== undefined && enabled && row !== undefined && row.nextFireAt !== null
    ? formatCountdown(countdownMs(row.nextFireAt, state, now))
    : '—'
  const modelItems = [
    { id: '', label: '默认模型' },
    ...modelOptions.map((modelId) => ({ id: modelId, label: modelId }))
  ]
  return (
    <div className="ka-card" data-ka-card={id}>
      <div className="ka-card-head">
        {status.dot !== null && <U.StateDot state={status.dot} />}
        <span className="ka-card-name">{name}</span>
        <span className="ka-card-id">{id}</span>
        <U.Pill className={status.pillClass} active={status.dot === 'ongoing'}>{status.pillText}</U.Pill>
        <span className="ka-countdown ka-num" data-ka="countdown">{countdown}</span>
      </div>
      {row !== undefined && entry !== undefined && (
        <div className="ka-card-meta">
          {row.lastResult === null
            ? <span>尚无发送记录</span>
            : (
              <span>
                最近 <span className={row.lastResult.status === 'ok' ? 'ka-ok' : 'ka-err'}>{row.lastResult.status === 'ok' ? '成功' : '失败'} · {String(row.lastResult.latencyMs)}ms</span>
              </span>
            )}
          {(row.consecutiveFailures ?? 0) > 0 && <span className="ka-warn">连续失败 {String(row.consecutiveFailures)}</span>}
        </div>
      )}
      <div className="ka-card-actions">
        {entry === undefined ? (
          <U.Button
            data-ka="optin"
            variant="outline"
            size="sm"
            icon={<U.IconPlusOutline16 size={14} />}
            disabled={!registered || state.pending['optin:' + id] === true}
            title={registered ? '把该提供商加入保活调度' : '该路由当前未注册，无法参与'}
            onClick={() => { void store.updateConfig({ providers: { [id]: { enabled: true } } }, { key: 'optin:' + id, ok: '已加入保活调度' }) }}
          >
            {state.pending['optin:' + id] === true ? '加入中…' : '参与保活'}
          </U.Button>
        ) : (
          <>
            <span className="ka-model-label">保活模型</span>
            <U.Menu
              open={modelMenuOpen}
              anchor={
                <U.Button
                  data-ka="model-menu"
                  variant="ghost"
                  size="sm"
                  disabled={!registered || modelOptions.length === 0}
                  icon={<U.IconChevronDownOutline14 size={14} />}
                  onClick={() => { setModelMenuOpen(!modelMenuOpen) }}
                  title={registered ? (modelOptions.length === 0 ? '暂无可用模型' : '选择保活模型') : '路由未注册，列表不可用'}
                >
                  {modelChoice === '' ? '默认模型' : modelChoice}
                </U.Button>
              }
              items={modelItems}
              selectedId={modelChoice}
              onSelect={(itemId) => { setModelChoice(itemId); setModelMenuOpen(false) }}
              onClose={() => { setModelMenuOpen(false) }}
              portal
            />
            <U.Button
              data-ka="model-save"
              variant="ghost"
              size="sm"
              disabled={modelSaving || !registered || state.pending['model:' + id] === true}
              onClick={() => {
                void store.updateConfig(
                  { providers: { [id]: { enabled: entry.enabled, ...(modelChoice === '' ? {} : { model: modelChoice }) } } },
                  { key: 'model:' + id, ok: '已保存保活模型' }
                )
              }}
            >
              {state.pending['model:' + id] === true ? '保存中…' : '保存模型'}
            </U.Button>
            <span className="ka-actions-secondary">
              {row !== undefined && enabled && (
                <U.Button
                  data-ka="fire-now"
                  variant="ghost"
                  size="sm"
                  icon={<U.IconSendOutline16 size={14} />}
                  disabled={state.pending['fire:' + id] === true}
                  onClick={() => { void store.act('fire-now', id, { key: 'fire:' + id, ok: '已触发立即发送' }) }}
                >
                  {state.pending['fire:' + id] === true ? '发送中…' : '立即发送'}
                </U.Button>
              )}
              {row?.parked === true && (
                <U.Button
                  data-ka="resume-provider"
                  variant="ghost"
                  size="sm"
                  icon={<U.IconPlayOutline16 size={14} />}
                  disabled={state.pending['resume:' + id] === true}
                  onClick={() => { void store.act('resume-provider', id, { key: 'resume:' + id, ok: '已恢复该提供商' }) }}
                >
                  {state.pending['resume:' + id] === true ? '处理中…' : '恢复'}
                </U.Button>
              )}
              <U.Button
                data-ka="toggle-provider"
                variant="ghost"
                size="sm"
                disabled={state.pending['toggle:' + id] === true}
                onClick={() => {
                  void store.updateConfig(
                    { providers: { [id]: { enabled: entry.enabled !== true, ...(configuredModel === '' ? {} : { model: configuredModel }) } } },
                    { key: 'toggle:' + id, ok: entry.enabled === true ? '已禁用该提供商' : '已启用该提供商' }
                  )
                }}
              >
                {state.pending['toggle:' + id] === true ? '切换中…' : entry.enabled === true ? '禁用' : '启用'}
              </U.Button>
              <U.Menu
                open={moreOpen}
                anchor={
                  <U.Button
                    data-ka="more-menu"
                    variant="ghost"
                    size="sm"
                    aria-label={'更多操作 ' + id}
                    icon={<U.IconEllipsisOutline16 size={14} />}
                    onClick={() => { setMoreOpen(!moreOpen) }}
                  />
                }
                items={[{ id: 'remove', label: '移除配置', icon: <U.IconTrashOutline16 size={14} />, danger: true }]}
                onSelect={() => { setMoreOpen(false); setAcknowledged(false); setConfirming(true) }}
                onClose={() => { setMoreOpen(false) }}
                align="end"
                portal
              />
            </span>
          </>
        )}
      </div>
      {entry !== undefined && confirming && (
        <U.RiskConfirmation
          open
          title="移除该提供商的保活配置"
          description={'将清除 ' + id + ' 的保活配置；提供商列表仍会显示该路由。'}
          acknowledgeLabel="我确认要移除该配置"
          cancelLabel="取消"
          confirmLabel={state.pending['remove:' + id] === true ? '移除中…' : '移除'}
          acknowledged={acknowledged}
          disabled={state.pending['remove:' + id] === true}
          onAcknowledgedChange={setAcknowledged}
          onCancel={() => { setConfirming(false); setAcknowledged(false) }}
          onConfirm={() => {
            setConfirming(false); setAcknowledged(false)
            void store.act('remove-provider', id, { key: 'remove:' + id, ok: '已移除该提供商配置' })
          }}
        />
      )}
    </div>
  )
}
