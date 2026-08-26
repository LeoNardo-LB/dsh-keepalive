/**
 * Headless-browser verification v3: trusted clicks, console/pageerror capture,
 * composer-driven session activation, panel opt-in flow, screenshots.
 */
import puppeteer from 'puppeteer-core'
import { writeFileSync } from 'node:fs'

const WEB = 'http://127.0.0.1:8180'
const OUT = '/e2e/evidence'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const results = { steps: [], consoleErrors: [] }
const keepaliveResponses = []
const step = (name, pass, detail) => {
  results.steps.push({ name, pass, detail })
  console.log((pass ? 'PASS' : 'WARN') + ' [' + name + '] ' + detail)
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
page.on('pageerror', (error) => results.consoleErrors.push('PAGEERROR: ' + String(error).slice(0, 300)))
page.on('console', (message) => {
  if (message.type() === 'error') results.consoleErrors.push('CONSOLE: ' + message.text().slice(0, 300))
})

async function clickButton(pattern) {
  const handles = await page.$$('button')
  for (const handle of handles) {
    const text = ((await handle.evaluate((element) => element.textContent)) || '').trim()
    if (pattern.test(text)) {
      await handle.click()
      return text
    }
  }
  return null
}
const bodyText = () => page.evaluate(() => document.body.innerText)

await page.goto(WEB, { waitUntil: 'domcontentloaded', timeout: 60_000 })
await sleep(6_000)
for (let round = 0; round < 6; round += 1) {
  const hit = await clickButton(/^(continue|got it|ok|i understand)/i)
  if (hit === null) break
  await sleep(2_000)
}
await clickButton(/e2e-keepalive-ws/)
await sleep(2_500)
await clickButton(/new session/i)
await sleep(5_000)

// Drive the composer: type a short prompt and send it so a live conversation
// view mounts (session-scoped seats render inside it).
const typed = await page.evaluate(() => {
  const targets = [...document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]')]
  const target = targets[targets.length - 1]
  if (target === undefined) return false
  target.focus()
  return true
})
let sent = false
if (typed) {
  await page.keyboard.type('hello keepalive', { delay: 20 })
  await sleep(300)
  await page.keyboard.press('Enter')
  sent = true
  await sleep(9_000)
}
step('composer-driven', typed && sent, 'typed=' + String(typed))
const midText = await bodyText()
step('dock-mounted', /keepalive → |打开面板/.test(midText), 'dockText=' + JSON.stringify((midText.match(/keepalive[^\n]*/g) || []).slice(0, 3)))
await page.screenshot({ path: OUT + '/browser-2-conversation.png' })

// Countdown ticks.
const sampleTick = () => page.evaluate(() => document.body.innerText.match(/\d{1,2}:\d{2}(?::\d{2})?/g) || [])
const ticksBefore = await sampleTick()
await sleep(2_100)
const ticksMid = await sampleTick()
await sleep(2_100)
const ticksAfter = await sampleTick()
// A shot firing mid-sample resets the countdown, so any change across the
// three windows proves ticking; three identical windows would be suspect.
const changed = JSON.stringify(ticksBefore) !== JSON.stringify(ticksMid) || JSON.stringify(ticksMid) !== JSON.stringify(ticksAfter)
step('countdown-ticks', changed, 'windows=' + JSON.stringify([ticksBefore.slice(0, 3), ticksMid.slice(0, 3), ticksAfter.slice(0, 3)]))

// Open overlay via dock. Pick the TIGHTEST matching candidate: outer
// wrappers share the substring and clicking their center misses the strip.
let opened = false
{
  const candidates = await page.$$('div,span')
  let best = null
  let bestLength = Number.MAX_SAFE_INTEGER
  for (const handle of candidates) {
    const text = ((await handle.evaluate((element) => element.textContent)) || '')
    if (!text.includes('打开面板')) continue
    if (text.length < bestLength) {
      best = handle
      bestLength = text.length
      if (bestLength <= 8) break
    }
  }
  if (best !== null) {
    await best.click()
    opened = true
  }
}
await sleep(1_500)
const panelText = await bodyText()
step('panel-opens', opened && (panelText.includes('参与保活') || panelText.includes('总开关')), 'clickedDock=' + String(opened))
await page.screenshot({ path: OUT + '/browser-3-panel.png' })

const listed = await page.evaluate(() => {
  const ids = ['mock-primary', 'mock-backup', 'mock-spare']
  const full = document.body.innerText
  return Object.fromEntries(ids.map((id) => [id, full.includes(id)]))
})
step('all-providers-listed', Object.values(listed).every(Boolean), JSON.stringify(listed))

const optInClicked = await clickButton(/参与保活/)
await sleep(7_000)
const afterText = await bodyText()
// Cards render the provider ID - anchor the acceptance check to it.
const anchor = afterText.indexOf('mock-spare')
const spareSegment = anchor >= 0 ? afterText.slice(anchor, anchor + 200) : ''
step(
  'panel-opt-in-spare',
  optInClicked !== null && /活跃/.test(spareSegment),
  'clicked=' + JSON.stringify(optInClicked) + ' spareCard="' + spareSegment.replace(/\n/g, '|').slice(0, 120) + '"'
)
await page.screenshot({ path: OUT + '/browser-4-opted-in.png' })

results.keepaliveResponses = keepaliveResponses.slice(0, 10)
writeFileSync(OUT + '/browser-evidence.json', JSON.stringify(results, null, 2))
step('no-runtime-errors', results.consoleErrors.length === 0, JSON.stringify(results.consoleErrors.slice(0, 4)))
console.log('BROWSER RESULT: ' + (results.steps.every((s) => s.pass) ? 'ALL PASS' : 'PARTIAL: ' + results.steps.filter((s) => !s.pass).map((s) => s.name).join(',')))
await browser.close()
