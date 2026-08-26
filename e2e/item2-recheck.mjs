/**
 * Item 2 recheck: read the dock strip ELEMENT's innerText (not body) so flex
 * child newlines cannot split the countdown from the label.
 */
import puppeteer from 'puppeteer-core'
const WEB = 'http://127.0.0.1:8180'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
async function clickButton(pattern) {
  const handles = await page.$$('button')
  for (const handle of handles) {
    const text = ((await handle.evaluate((el) => el.textContent)) || '').trim()
    if (pattern.test(text)) {
      await handle.click()
      return text
    }
  }
  return null
}
await page.goto(WEB, { waitUntil: 'domcontentloaded', timeout: 60_000 })
await sleep(6_000)
for (let i = 0; i < 6; i++) {
  if ((await clickButton(/^(continue|got it|ok)/i)) === null) break
  await sleep(2_000)
}
await clickButton(/e2e-keepalive-ws/)
await sleep(2_500)
await clickButton(/new session/i)
await sleep(5_000)
await page.evaluate(() => {
  const targets = [...document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]')]
  targets[targets.length - 1]?.focus()
})
await page.keyboard.type('item2', { delay: 15 })
await page.keyboard.press('Enter')
await sleep(9_000)

const dockText = () =>
  page.evaluate(() => {
    // The dock format is unique: "keepalive → <provider> <mm:ss>". Anchor on
    // the arrow so sidebar session rows ("hello keepalive 17:29") cannot match.
    const candidates = [...document.querySelectorAll('div,span')].filter((el) =>
      /keepalive\s*→/.test(el.textContent || '') && /\d{1,2}:\d{2}/.test(el.textContent || '')
    )
    if (candidates.length === 0) return null
    const tightest = candidates.reduce((a, b) => ((a.textContent || '').length <= (b.textContent || '').length ? a : b))
    return (tightest.textContent || '').slice(0, 80)
  })

const samples = []
for (let i = 0; i < 100; i++) {
  const text = await dockText()
  const match = text !== null ? text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/) : null
  if (match === null) {
    samples.push(null)
  } else {
    const h = Number(match[1])
    const m = Number(match[2])
    const sec = match[3] === undefined ? 0 : Number(match[3])
    samples.push(h * 3600 + m * 60 + sec)
  }
  await sleep(1_000)
}
const valid = samples.filter((s) => s !== null)
let resets = 0
let jumps = 0
for (let i = 1; i < valid.length; i++) {
  const delta = valid[i - 1] - valid[i]
  if (delta < 0) resets += 1
  else if (delta > 2) jumps += 1
}
console.log('samples: ' + String(valid.length) + '/100  shotCompletions(resets): ' + String(resets) + '  irregularJumps(>2s): ' + String(jumps))
console.log('sample tail: ' + JSON.stringify(valid.slice(-12)))
console.log(resets >= 1 && jumps === 0 ? 'ITEM2 PASS' : 'ITEM2 CHECK: resets=' + String(resets) + ' jumps=' + String(jumps))
await browser.close()
