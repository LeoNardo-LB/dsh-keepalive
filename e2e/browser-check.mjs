/**
 * Headless-browser verification v5: the rebuilt primitives UI. Trusted
 * clicks through the NATIVE Settings window (sidebar -> Plugins -> 提供商保活),
 * then through the new component set: data-ka hooks + ka-* classes + portal
 * menu rows. Console/pageerror capture + screenshots at every stage.
 */
import puppeteer from 'puppeteer-core'
import { readFileSync, writeFileSync } from 'node:fs'

const WEB = 'http://127.0.0.1:8180'
// dsh 0.1.2 gates the web app behind a boot token (driver's plugin routes are
// unfenced; the app index is not). Exchange the printed token for the auth
// cookie by landing on /?token=... once.
const bootToken = (() => {
  const log = readFileSync('/e2e/evidence/dsh-web.log', 'utf8')
  const match = log.match(/token=([A-Za-z0-9_-]+)/)
  return match === null ? null : match[1]
})()
const OUT = '/e2e/evidence'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const results = { steps: [], consoleErrors: [] }
let failed = 0
const step = (name, pass, detail) => {
  results.steps.push({ name, pass, detail })
  if (!pass) failed += 1
  console.log((pass ? 'PASS' : 'FAIL') + ' [' + name + '] ' + detail)
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900', '--lang=zh-CN']
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' })
page.on('pageerror', (error) => results.consoleErrors.push('PAGEERROR: ' + String(error).slice(0, 300)))
page.on('console', (message) => {
  if (message.type() === 'error') results.consoleErrors.push('CONSOLE: ' + message.text().slice(0, 300))
})

/**
 * Click with a REAL trusted mouse event (puppeteer ElementHandle.click): host
 * triggers often listen to pointerdown, which synthetic .click() never fires.
 * Falls back to an in-page click when the handle detaches mid-flight.
 */
async function clickIn(scopeSelector, pattern, { menuItems = false } = {}) {
  const handle = await page.evaluateHandle(({ scopeSelector, source, flags, menuItems }) => {
    const regex = new RegExp(source, flags)
    const scope = menuItems
      ? document
      : (scopeSelector === null ? document : document.querySelector(scopeSelector))
    const pool = menuItems
      ? scope.querySelectorAll('[role="menuitem"], [class*="menu" i] [class*="item" i], [class*="menu" i] button')
      : (scope ?? document).querySelectorAll('button, [class*="row" i], [class*="title" i]')
    for (const node of pool) {
      if (regex.test(((node.textContent) || '').trim())) return node
    }
    return null
  }, { scopeSelector, source: pattern.source, flags: pattern.flags, menuItems })
  const element = handle.asElement()
  if (element === null) return null
  const text = await element.evaluate((node) => ((node.textContent) || '').trim().slice(0, 60))
  try {
    await element.click()
  } catch {
    try { await element.evaluate((node) => { node.click(); return null }) } catch { return text }
  }
  return text
}

const bodyText = () => page.evaluate(() => document.body.innerText)

/** Dump every visible button for offline diagnosis on failure. */
async function dumpButtons(name) {
  const buttons = await page.$$eval('button', (nodes) =>
    nodes.map((node) => ({
      text: ((node.textContent) || '').trim().slice(0, 60),
      aria: node.getAttribute('aria-label'),
      cls: (node.className || '').toString().slice(0, 80)
    }))
  )
  writeFileSync(OUT + '/' + name, JSON.stringify(buttons, null, 2))
  return buttons
}
async function dumpBody(name) {
  writeFileSync(OUT + '/' + name, (await bodyText()).slice(0, 3000))
}

if (bootToken === null) {
  console.log('FAIL [auth-token] no boot token found in /e2e/evidence/dsh-web.log')
  process.exit(1)
}
await page.goto(WEB + '/?token=' + bootToken, { waitUntil: 'domcontentloaded', timeout: 60_000 })
// Warm one shot over HTTP so history has a row to inspect immediately.
await fetch(WEB + '/plugins/dsh-keepalive/action', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ type: 'fire-now', provider: 'mock-primary' })
}).catch(() => undefined)
await sleep(6_000)
await sleep(6_000)
for (let round = 0; round < 6; round += 1) {
  const hit = await clickIn(null, /^(continue|got it|ok|i understand|知道了|继续)/i)
  if (hit === null) break
  await sleep(2_000)
}
await page.screenshot({ path: OUT + '/browser-1-landing.png' })

// dsh 0.1.2 boots into the workspace chooser: choose a directory (Home ->
// Open), then the Standard seat, to reach the main app.
{
  const chooserText = await bodyText()
  if (/Choose a workspace/.test(chooserText)) {
    await page.evaluate(() => {
      const node = document.querySelector('button[aria-label="Choose workspace"]')
      if (node) node.click()
      return null
    })
    await sleep(1_500)
    const home = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('button, [role="button"], li, [class*="entry" i], [class*="row" i]')]
      const node = nodes.find((n) => ((n.textContent) || '').trim() === 'Home')
      if (node) { node.click(); return 'home' }
      return null
    })
    await sleep(1_000)
    const open = await clickIn(null, /^Open$/)
    await sleep(2_500)
    writeFileSync(OUT + '/dom-ws-after-open.txt', (await bodyText()).slice(0, 3000))
    let seat = null
    const entered = /Describe what you want|Send message/.test(await bodyText())
    if (!entered) {
      seat = await clickIn(null, /^Standard mode$/)
      await sleep(4_000)
    }
    // Dismiss any leftover popover so it cannot swallow the next click.
    await page.keyboard.press('Escape')
    await sleep(600)
    await page.keyboard.press('Escape')
    await sleep(400)
    writeFileSync(OUT + '/dom-after-workspace.txt', (await bodyText()).slice(0, 3000))
    results.workspacePick = { home, open, seat, entered }
  }
}

// Open the native Settings window from the sidebar foot. Text first, then
// the aria-label fallback; dump the DOM for diagnosis when it fails.
let settingsClick = await clickIn(null, /^(设置|Settings)$/u)
if (settingsClick === null) {
  settingsClick = await page.evaluate(() => {
    const node = document.querySelector('button[aria-label*="etting" i]')
    if (node) { node.click(); return node.getAttribute('aria-label') }
    return null
  })
}
await sleep(2_500)
const afterSettingsText = await bodyText()
if (!/插件|通用设置|Plugins|General/i.test(afterSettingsText)) {
  await dumpButtons('dom-buttons.json')
  await dumpBody('dom-body.txt')
}
step('settings-window-opens', settingsClick !== null && /插件|通用设置|Plugins|General/i.test(afterSettingsText), 'clicked=' + JSON.stringify(settingsClick))
await page.screenshot({ path: OUT + '/browser-2-settings.png' })

const pluginsClick = await clickIn(null, /^(插件|Plugins)$/u)
await sleep(1_500)
step('plugins-section-open', pluginsClick !== null, 'clicked=' + JSON.stringify(pluginsClick))

const tabClicked = await clickIn(null, /^提供商保活$/u)
await sleep(2_500)
const rootPresent = await page.evaluate(() => document.querySelector('[data-ka="root"]') !== null)
const panelText = await bodyText()
step('keepalive-tab-mounts', tabClicked !== null && rootPresent, 'tab=' + JSON.stringify(tabClicked) + ' dataKaRoot=' + String(rootPresent))
step('primitives-gate-passed', !/宿主未供应 UI 组件模块/.test(panelText), 'gateError=' + String(/宿主未供应/.test(panelText)))
step('stylesheet-injected', await page.evaluate(() => document.querySelector('style[data-plugin-css="dsh-keepalive"]') !== null), 'styleTag present')
await page.screenshot({ path: OUT + '/browser-3-panel.png' })

const listed = await page.evaluate(() => {
  const ids = ['mock-primary', 'mock-backup', 'mock-spare']
  const full = document.body.innerText
  return Object.fromEntries(ids.map((id) => [id, full.includes(id)]))
})
step('all-providers-listed', Object.values(listed).every(Boolean), JSON.stringify(listed))

// Master switch on when off so cards render live countdowns.
{
  const masterText = await page.evaluate(() => {
    const node = document.querySelector('[data-ka="master"]')
    return node ? (node.textContent || '').trim() : null
  })
  if (masterText !== null && /保活已停用/.test(masterText)) {
    await clickIn(null, /保活已停用/)
    await sleep(7_000) // one poll cycle + engine reschedule
  }
}
let liveText = await bodyText()
let hasCountdown = /\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2}/.test(liveText)
for (let round = 0; round < 10 && !hasCountdown; round += 1) {
  await sleep(1_500)
  liveText = await bodyText()
  hasCountdown = /\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2}/.test(liveText)
}
step('countdown-visible', hasCountdown, 'masterOn=' + String(/保活已开启/.test(liveText)))
await page.screenshot({ path: OUT + '/browser-3b-countdown.png' })

// Opt the spare provider in from ITS card. The driver suite (s8) may have
// already opted it in over HTTP, so remove it first and let the poll settle.
const removedSpare = await page.evaluate(async () => {
  const response = await fetch('/plugins/dsh-keepalive/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'remove-provider', provider: 'mock-spare' })
  })
  return response.status
})
await sleep(7_000)
const optInClicked = await clickIn('[data-ka-card="mock-spare"]', /参与保活/)
await sleep(1_500)
const feedbackText = await bodyText()
step('action-feedback-toast', feedbackText.includes('已加入保活调度'), 'bodyHasToast=' + String(feedbackText.includes('已加入保活调度')))
await sleep(2_500)
const afterText = await bodyText()
const anchor = afterText.indexOf('mock-spare')
const spareSegment = anchor >= 0 ? afterText.slice(anchor, anchor + 200) : ''
step('panel-opt-in-spare', optInClicked !== null && /活跃/.test(spareSegment), 'clicked=' + JSON.stringify(optInClicked) + ' spareCard="' + spareSegment.replace(/\n/g, '|').slice(0, 120) + '"')
await page.screenshot({ path: OUT + '/browser-4-opted-in.png' })

// Model picker: Menu opens, lists the mock model, selection saves.
const modelClicked = await page.evaluate(() => {
  const node = document.querySelector('[data-ka-card="mock-primary"] [data-ka="model-menu"]')
  if (node) { node.click(); return (node.textContent || '').trim().slice(0, 40) }
  return null
})
await sleep(800)
const menuHasModel = await bodyText().then((t) => t.includes('mock-keepalive-model'))
const itemClicked = await clickIn(null, /^mock-keepalive-model$/, { menuItems: true })
await sleep(600)
const saveClicked = await clickIn('[data-ka-card="mock-primary"]', /保存模型/)
await sleep(1_500)
const afterModelText = await bodyText()
step(
  'model-menu-select-save',
  modelClicked !== null && menuHasModel && itemClicked !== null && saveClicked !== null && afterModelText.includes('已保存保活模型'),
  'menu=' + JSON.stringify(modelClicked) + ' listed=' + String(menuHasModel) + ' item=' + JSON.stringify(itemClicked) + ' save=' + JSON.stringify(saveClicked) + ' toast=' + String(afterModelText.includes('已保存保活模型'))
)
await page.screenshot({ path: OUT + '/browser-4b-model-menu.png' })

// History section: expand, then expand one entry row in place.
const histToggle = await page.evaluate(() => {
  const section = document.querySelector('.ka-history-section')
  if (section === null) return null
  const node = [...section.querySelectorAll('button, [class*="row" i], [class*="title" i]')].find((n) => /历史（/.test((n.textContent || '').trim()))
  if (node) { node.click(); return (node.textContent || '').trim().slice(0, 40) }
  return null
})
await sleep(2_500)
const entryToggle = await page.evaluate(() => {
  const row = document.querySelector('.ka-history-entry')
  if (row === null) return null
  const node = [...row.querySelectorAll('button, [class*="row" i], [class*="title" i]')].find((n) => /·/.test((n.textContent || '').trim()))
  if (node) { node.click(); return (node.textContent || '').trim().slice(0, 60) }
  return null
})
await sleep(1_200)
const detailText = await bodyText()
step(
  'history-inline-reply',
  histToggle !== null && entryToggle !== null && detailText.includes('发送内容') && detailText.includes('模型回复'),
  'section=' + JSON.stringify(histToggle) + ' entry=' + JSON.stringify(entryToggle) + ' detail=' + String(detailText.includes('发送内容'))
)
await page.screenshot({ path: OUT + '/browser-5-history-inline.png' })

// Stats section expands with per-day numbers.
const statsToggle = await page.evaluate(() => {
  const section = document.querySelector('.ka-stats-section')
  if (section === null) return null
  const node = [...section.querySelectorAll('button, [class*="row" i], [class*="title" i]')].find((n) => /统计/.test((n.textContent || '').trim()))
  if (node) { node.click(); return (node.textContent || '').trim().slice(0, 40) }
  return null
})
await sleep(1_200)
const statsText = await bodyText()
const statRows = await page.evaluate(() => document.querySelectorAll('[data-ka="stat-row"]').length)
const dailyProbe = await page.evaluate(async () => {
  const response = await fetch('/plugins/dsh-keepalive/history?limit=50')
  const body = await response.json().catch(() => null)
  return body === null ? null : body.dailyStats
})
step('stats-section-renders', statsToggle !== null && statRows > 0, 'toggle=' + JSON.stringify(statsToggle) + ' rows=' + String(statRows) + ' daily=' + JSON.stringify(dailyProbe))
await page.screenshot({ path: OUT + '/browser-6-stats.png' })

// Secondary menu: removal flows through RiskConfirmation and cancels cleanly.
const moreClicked = await page.evaluate(() => {
  const node = document.querySelector('[data-ka-card="mock-backup"] [data-ka="more-menu"]')
  if (node) { node.click(); return 'more' }
  return null
})
await sleep(800)
const removeClicked = await clickIn(null, /移除配置/, { menuItems: true })
await sleep(800)
const confirmText = await bodyText()
const riskShown = confirmText.includes('移除该提供商的保活配置')
let cancelled = false
if (riskShown) {
  const cancel = await clickIn(null, /^取消$/)
  await sleep(600)
  cancelled = (await bodyText()).includes('移除该提供商的保活配置') === false
}
step('risk-confirmation-flow', moreClicked !== null && removeClicked !== null && riskShown && cancelled, 'more=' + String(moreClicked !== null) + ' item=' + JSON.stringify(removeClicked) + ' risk=' + String(riskShown) + ' cancelled=' + String(cancelled))
await page.screenshot({ path: OUT + '/browser-7-risk-confirm.png' })

// Config form present with numeric fields (global config unchanged).
const cfgOk = await page.evaluate(() => {
  const fields = ['cfg-interval', 'cfg-jitter', 'cfg-threshold', 'cfg-autopark', 'cfg-save']
  return fields.map((id) => [id, document.querySelector('[data-ka="' + id + '"]') !== null])
})
step('config-form-present', cfgOk.every(([, ok]) => ok), JSON.stringify(cfgOk.filter(([, ok]) => !ok).map(([id]) => id)))
await page.screenshot({ path: OUT + '/browser-8-final.png' })

writeFileSync(OUT + '/browser-evidence.json', JSON.stringify(results, null, 2))
step('no-runtime-errors', results.consoleErrors.length === 0, JSON.stringify(results.consoleErrors.slice(0, 4)))
console.log('BROWSER RESULT: ' + (failed === 0 ? 'ALL PASS' : 'FAILED: ' + failed))
await browser.close()
process.exit(failed === 0 ? 0 : 1)
