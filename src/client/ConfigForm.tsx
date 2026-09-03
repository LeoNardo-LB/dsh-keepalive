/**
 * Global config form (spec D3/D6): numeric inputs over the host Input,
 * the auto-park boolean as a stateful Button, save via primary Button.
 * Presentation only; every mutation goes through the store.
 */
import { useEffect, useState } from 'react'
import { U } from './primitives.ts'
import type { KeepaliveStore } from './store.ts'
import type { KeepaliveConfig } from '../types.ts'

export function ConfigForm(props: { config: KeepaliveConfig; store: KeepaliveStore; pending: Record<string, true> }): React.ReactNode {
  const { config, store } = props
  const [interval, setIntervalValue] = useState(String(config.intervalMinutes))
  const [jitter, setJitter] = useState(String(config.jitterPercent))
  const [threshold, setThreshold] = useState(String(config.autoPause.threshold))
  useEffect(() => {
    setIntervalValue(String(config.intervalMinutes))
    setJitter(String(config.jitterPercent))
    setThreshold(String(config.autoPause.threshold))
  }, [config])
  const autoParkOn = config.autoPause.enabled === true
  return (
    <div className="ka-form-row">
      <label className="ka-field">
        基准间隔(分)
        <U.Input data-ka="cfg-interval" value={interval} inputMode="numeric" onChange={(e) => { setIntervalValue(e.target.value) }} />
      </label>
      <label className="ka-field">
        抖动%
        <U.Input data-ka="cfg-jitter" value={jitter} inputMode="numeric" onChange={(e) => { setJitter(e.target.value) }} />
      </label>
      <label className="ka-field">
        停放阈值
        <U.Input data-ka="cfg-threshold" value={threshold} inputMode="numeric" onChange={(e) => { setThreshold(e.target.value) }} />
      </label>
      <U.Button
        data-ka="cfg-autopark"
        variant={autoParkOn ? 'primary' : 'outline'}
        size="sm"
        icon={autoParkOn ? <U.IconCheckOutline14 size={14} /> : undefined}
        onClick={() => { void store.updateConfig({ autoPause: { enabled: !autoParkOn, threshold: config.autoPause.threshold } }) }}
      >
        自动停放{autoParkOn ? '开' : '关'}
      </U.Button>
      <U.Button
        data-ka="cfg-save"
        variant="primary"
        size="sm"
        disabled={props.pending['config'] === true}
        onClick={() => {
          void store.updateConfig(
            {
              intervalMinutes: Number(interval),
              jitterPercent: Number(jitter),
              autoPause: { enabled: config.autoPause.enabled, threshold: Number(threshold) }
            },
            { key: 'config', ok: '已保存配置' }
          )
        }}
      >
        {props.pending['config'] === true ? '保存中…' : '保存'}
      </U.Button>
    </div>
  )
}
