/**
 * dsh-keepalive browser half: one shared polling store; a summary strip on
 * conversation.composer.dock and a full panel on shell.overlay. No host
 * events consumed - everything flows through the plugin's own HTTP face.
 *
 * @module dsh-keepalive/client
 */
import * as React from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { Dock } from './Dock.tsx'
import { Panel } from './Panel.tsx'
import { createStore } from './store-instance.ts'
import type { KeepaliveStore } from './store.ts'

export { countdownMs, createInitialUiState, formatCountdown } from './store.ts'
export { createStore } from './store-instance.ts'
export { Dock } from './Dock.tsx'
export { Panel } from './Panel.tsx'
export type { KeepaliveStore, KeepaliveUiState } from './store.ts'

/** Required client services: the slot registry. */
export const inject = ['slots']

/** Shared module-level store so both seats see one state. */
let shared: KeepaliveStore | null = null

function sharedStore(): KeepaliveStore {
  if (shared === null) shared = createStore()
  return shared
}

/**
 * Client plugin body: start polling and register both seats through
 * declaration-aware inject wrappers (idempotent across re-registration).
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const store = sharedStore()
  ctx.effect(() => {
    store.start()
    return () => store.stop()
  }, 'dsh-keepalive: poll loop')

  ctx.inject(['slots'], (scope: ClientContext) => {
    scope.slots.inject('conversation.composer.dock', () =>
      scope.slots.register(
        { name: 'conversation.composer.dock', id: 'dsh-keepalive-dock', order: 90, inject: () => ({}) },
        function KeepaliveDock(): React.ReactNode {
          return <DockBridge store={store} />
        }
      )
    )
    scope.slots.inject('shell.overlay', () =>
      scope.slots.register(
        { name: 'shell.overlay', id: 'dsh-keepalive-panel', order: 90, inject: () => ({}) },
        function KeepaliveOverlay(): React.ReactNode {
          return <PanelBridge store={store} />
        }
      )
    )
  })
}

/** Bridge components keep the seat components stable while binding the store. */
function DockBridge(props: { store: KeepaliveStore }): React.ReactNode {
  const [state, setState] = React.useState(props.store.getSnapshot())
  React.useEffect(() => props.store.subscribe(setState), [props.store])
  return <Dock state={state} now={Date.now()} onOpenPanel={() => props.store.setPanelOpen(true)} />
}

function PanelBridge(props: { store: KeepaliveStore }): React.ReactNode {
  const [state, setState] = React.useState(props.store.getSnapshot())
  React.useEffect(() => props.store.subscribe(setState), [props.store])
  return <Panel state={state} store={props.store} now={Date.now()} />
}
