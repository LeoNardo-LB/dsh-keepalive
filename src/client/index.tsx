/**
 * dsh-keepalive browser half: one shared polling store surfaced as a page in
 * the native Settings window (settings.plugins.tab). No conversation-flow
 * seats anymore - all control lives where DSH users configure things.
 *
 * @module dsh-keepalive/client
 */
import * as React from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { SettingsTab } from './SettingsTab.tsx'
import { createStore } from './store-instance.ts'
import type { KeepaliveStore } from './store.ts'

export { countdownMs, createInitialUiState, formatCountdown } from './store.ts'
export { createStore } from './store-instance.ts'
export { SettingsTab } from './SettingsTab.tsx'
export type { KeepaliveStore, KeepaliveUiState } from './store.ts'
export type { SettingsTabProps } from './SettingsTab.tsx'

/** Required client services: the slot registry. */
export const inject = ['slots']

/** Shared module-level store so every mount sees one state. */
let shared: KeepaliveStore | null = null

function sharedStore(): KeepaliveStore {
  if (shared === null) shared = createStore()
  return shared
}

/**
 * Client plugin body: start polling and register the Settings tab through a
 * declaration-aware inject wrapper (waits for the plugins section to declare
 * the tab list, rolls back with it).
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const store = sharedStore()
  ctx.effect(() => {
    store.start()
    return () => store.stop()
  }, 'dsh-keepalive: poll loop')

  ctx.inject(['slots'], (scope: ClientContext) => {
    scope.slots.inject('settings.plugins.tab', () =>
      scope.slots.register(
        { name: 'settings.plugins.tab', id: 'keepalive', order: 20, label: () => '提供商保活' },
        function KeepaliveSettingsTab(): React.ReactNode {
          return <SettingsTabBridge store={store} />
        }
      )
    )
  })
}

/** Bridge keeps SettingsTab stable while binding the shared store. */
function SettingsTabBridge(props: { store: KeepaliveStore }): React.ReactNode {
  const [state, setState] = React.useState(props.store.getSnapshot())
  React.useEffect(() => props.store.subscribe(setState), [props.store])
  // Per-second clock tick so countdowns decrease between 5s store polls.
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return <SettingsTab state={state} store={props.store} now={now} />
}
