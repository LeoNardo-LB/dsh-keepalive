/**
 * Runtime stylesheet injection following the host theme pattern (spec F4):
 * one <style data-plugin-css="dsh-keepalive"> tag, idempotent across plugin
 * reloads. All values ride --dsw-alias-* tokens (spec D1); the sheet lives in
 * keepalive-tab.css and reaches the bundle through the build-time css loader.
 */
import cssText from './keepalive-tab.css'

const STYLE_TAG = 'dsh-keepalive'

export function injectStyles(): void {
  if (typeof document === 'undefined') return
  const selector = 'style[data-plugin-css=' + JSON.stringify(STYLE_TAG) + ']'
  if (document.querySelector(selector) !== null) return
  const style = document.createElement('style')
  style.setAttribute('data-plugin-css', STYLE_TAG)
  style.textContent = cssText
  document.head.append(style)
}
