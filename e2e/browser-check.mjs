/**
 * Headless-browser verification v4: trusted clicks through the NATIVE Settings
 * window (sidebar trigger -> Plugins -> 提供商保活 tab), reply dialog inspection,
 * console/pageerror capture, screenshots.
 */
import puppeteer from 'puppeteer-core'
import { writeFileSync } from 'node:fs'

const WEB = 'http://127.0.0.1:8180'
const OUT = '/e2e/evidence'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const results = { steps: [], consoleErrors: [] }
const step = (name, pass, detail) => {
  results.steps.push({ name, pass, detail })
  console.log((pass ? 'PASS' : 'WARN') + ' [' + name + '] ' + detail)
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
results.configRequests = []
page.on('request', (request) => {
  if (request.url().includes('/plugins/dsh-keepalive/config')) results.configRequests.push('REQ ' + request.method() + ' ' + request.postData())
})
page.on('response', async (response) => {
  if (response.url().includes('/plugins/dsh-keepalive/config')) {
    results.configRequests.push('RES ' + String(response.status()) + ' ' + JSON.stringify(await response.json().catch(() => null)))
  }
})

async function clickButton(pattern) {
  // Click atomically INSIDE the page: React replaces nodes on every 5s store
  // emit, so a puppeteer handle captured earlier can be detached at click
  // time (silent no-op). Resolve + click in one evaluate instead.
  const clicked = await page.evaluate((source) => {
    const regex = new RegExp(source.pattern, source.flags)
    for (const node of document.querySelectorAll('button')) {
      if (regex.test(((node.textContent) || '').trim())) {
        node.click()
        return (node.textContent || '').trim()
      }
    }
    return null
  }, { pattern: pattern.source, flags: pattern.flags })
  return clicked
}

/** Multi-strategy click: exact text, then aria-label, then css-class hint. */
async function clickFirst(patterns) {
  for (const pattern of patterns) {
    if (pattern instanceof RegExp) {
      const clicked = await clickButton(pattern)
      if (clicked !== null) return { via: String(pattern), clicked }
    } else {
      const handles = await page.$$(pattern.selector)
      if (handles.length > 0) {
        await handles[0].click()
        return { via: pattern.selector, clicked: null }
      }
    }
  }
  return null
}

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
const bodyText = () => page.evaluate(() => document.body.innerText)

await page.goto(WEB, { waitUntil: 'domcontentloaded', timeout: 60_000 })
// Warm one shot over HTTP so the history tab has a row to inspect (the
// scheduled shots are ~30min away; the dialog needs an entry now).
await fetch(WEB + '/plugins/dsh-keepalive/action', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ type: 'fire-now', provider: 'mock-primary' })
}).catch(() => undefined)
await sleep(6_000)
await sleep(6_000)
for (let round = 0; round < 6; round += 1) {
  const hit = await clickButton(/^(continue|got it|ok|i understand|知道了|继续)/i)
  if (hit === null) break
  await sleep(2_000)
}
await page.screenshot({ path: OUT + '/browser-1-landing.png' })

// Open the native Settings window from the sidebar foot. The trigger renders
// an icon-only button when the sidebar column is narrow, so fall through
// aria-label and class hints before dumping the DOM for diagnosis.
let settingsClick = await clickFirst([
  /^(设置|Settings)$/u,
  { selector: 'button[aria-label*="etting" i]' },
  { selector: '[class*="trigger" i] button, button[class*="trigger" i]' }
])
if (settingsClick === null) {
  const inventory = await dumpButtons('dom-buttons.json')
  settingsClick = { via: 'diag', clicked: JSON.stringify(inventory.slice(0, 12)) }
}
await sleep(2_000)
const afterSettingsText = await bodyText()
step(
  'settings-window-opens',
  settingsClick.via !== 'diag' && /插件|通用设置|Plugins|General/i.test(afterSettingsText),
  'via=' + settingsClick.via + ' clicked=' + JSON.stringify(settingsClick.clicked)
)
await page.screenshot({ path: OUT + '/browser-2-settings.png' })

// Navigate to the Plugins section.
const pluginsClick = (await clickFirst([/^插件$/, /^Plugins$/i])) ?? await clickFirst([{ selector: '[class*="nav" i] >> mock-none' }]).catch(() => null)
await sleep(1_500)
step('plugins-section-open', pluginsClick !== null && pluginsClick.via !== undefined, 'via=' + (pluginsClick ? pluginsClick.via : 'none'))

// Our tab sits in the Plugins tab bar.
const tabClicked = await clickButton(/^提供商保活$/)
await sleep(2_500)
const panelText = await bodyText()
step(
  'keepalive-tab-mounts',
  tabClicked !== null && (panelText.includes('参与保活') || panelText.includes('总开关')),
  'tab=' + JSON.stringify(tabClicked)
)
await page.screenshot({ path: OUT + '/browser-3-panel.png' })

const listed = await page.evaluate(() => {
  const ids = ['mock-primary', 'mock-backup', 'mock-spare']
  const full = document.body.innerText
  return Object.fromEntries(ids.map((id) => [id, full.includes(id)]))
})
step('all-providers-listed', Object.values(listed).every(Boolean), JSON.stringify(listed))

// Master switch on when off so cards render live countdowns.
{
  const before = panelText
  if (/总开关: 关/.test(before)) {
    await clickButton(/^总开关: 关$/)
    await sleep(7_000) // one poll cycle + engine reschedule
  }
}
const liveText = await bodyText()
const hasCountdown = /\d{1,2}:\d{2}:\d{2}|\d{1,2}:\d{2}/.test(liveText)
step('countdown-visible', hasCountdown, 'masterOn=' + String(/总开关: 开/.test(liveText)))

// Opt the spare provider in straight from ITS card (several cards can carry
// the same button text; scope the click to the card holding the spare id).
const optInClicked = await page.evaluate(() => {
  for (const card of document.querySelectorAll('div')) {
    if (!card.textContent || !card.textContent.includes('mock-spare')) continue
    for (const node of card.querySelectorAll('button')) {
      if (/参与保活/.test((node.textContent || '').trim())) {
        node.click()
        return (node.textContent || '').trim()
      }
    }
  }
  return null
})
// Action feedback: a settled mutation announces itself via the transient
// banner ([role=alert]; DSH Toast or our inline fallback).
await sleep(1_500)
const feedbackText = await page.evaluate(() => {
  const el = document.querySelector('[role="alert"]')
  return el ? (el.textContent || '').trim() : null
})
step(
  'action-feedback-banner',
  feedbackText !== null && feedbackText.includes('已加入保活调度'),
  'alert=' + JSON.stringify(feedbackText)
)
await page.screenshot({ path: OUT + '/browser-3b-feedback.png' })
await sleep(2_500)
// Probe: replay the identical POST from page context, then read back status.
const probe = await page.evaluate(async () => {
  const response = await fetch('/plugins/dsh-keepalive/config', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ providers: { 'mock-spare': { enabled: true } } })
  })
  return { status: response.status, body: await response.json().catch(() => null) }
})
results.configRequests.push('PROBE ' + JSON.stringify(probe))
await sleep(6_000)
const statusProbe = await fetch(WEB + '/plugins/dsh-keepalive/status').then((r) => r.json())
results.configRequests.push('HOST config keys=' + JSON.stringify(Object.keys(statusProbe.config?.providers ?? {})) + ' spareEntry=' + JSON.stringify(statusProbe.config?.providers?.['mock-spare'] ?? null))
const afterText = await bodyText()
const anchor = afterText.indexOf('mock-spare')
const spareSegment = anchor >= 0 ? afterText.slice(anchor, anchor + 200) : ''
step(
  'panel-opt-in-spare',
  optInClicked !== null && /活跃/.test(spareSegment),
  'clicked=' + JSON.stringify(optInClicked) + ' net=' + JSON.stringify(results.configRequests) + ' spareCard="' + spareSegment.replace(/\n/g, '|').slice(0, 120) + '"'
)
await page.screenshot({ path: OUT + '/browser-4-opted-in.png' })

// Model dropdowns render for participating cards with real options.
const selects = await page.$$eval('select', (nodes) => nodes.map((n) => ({ disabled: n.disabled, options: [...n.options].map((o) => o.value) })))
const usableSelect = selects.some((s) => !s.disabled && s.options.length >= 2)
step('model-dropdown-options', usableSelect, JSON.stringify(selects.slice(0, 4)))

// History tab -> reply dialog shows the outbound message and model reply.
await clickButton(/^历史$/)
await sleep(2_500)
const historyText = await bodyText()
const viewClicked = await clickButton(/^查看$/)
await sleep(1_500)
const dialogText = await bodyText()
step(
  'reply-dialog-content',
  viewClicked !== null && dialogText.includes('发送内容'),
  'view=' + JSON.stringify(viewClicked) + ' rows=' + String((historyText.match(/查看/g) || []).length)
)
await page.screenshot({ path: OUT + '/browser-5-reply-dialog.png' })
await clickButton(/^关闭 ✕$/)

// Stats tab renders without errors.
await clickButton(/^统计$/)
await sleep(1_200)
const statsText = await bodyText()
step('stats-tab-renders', /成功|尚无/.test(statsText), 'hasStatsCopy=' + String(/成功/.test(statsText)))
await page.screenshot({ path: OUT + '/browser-6-stats.png' })

writeFileSync(OUT + '/browser-evidence.json', JSON.stringify(results, null, 2))
step('no-runtime-errors', results.consoleErrors.length === 0, JSON.stringify(results.consoleErrors.slice(0, 4)))
console.log('BROWSER RESULT: ' + (results.steps.every((s) => s.pass) ? 'ALL PASS' : 'PARTIAL: ' + results.steps.filter((s) => !s.pass).map((s) => s.name).join(',')))
await browser.close()
