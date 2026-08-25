/**
 * Browser-bound store construction: window fetch + wall clock. Kept separate
 * from store.ts so node tests can construct stores with injected fakes.
 */
import { createStore as createKeepaliveStore } from './store.ts'
import type { KeepaliveStore } from './store.ts'

/** Create the browser store bound to window.fetch and Date.now. */
export function createStore(): KeepaliveStore {
  return createKeepaliveStore(window.fetch.bind(window), Date.now)
}
