import puppeteer from 'puppeteer-core'
const WEB = 'http://127.0.0.1:8180'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto(WEB, { waitUntil: 'domcontentloaded', timeout: 90_000 })
await sleep(6_000)
const clickButton = async (re) => {
  const hs = await p.$$('button')
  for (const h of hs) {
    const t = ((await h.evaluate((el) => el.textContent)) || '').trim()
    if (re.test(t)) { await h.click(); return t }
  }
  return null
}
for (let i = 0; i < 6; i++) { if ((await clickButton(/^(continue|got it|ok)/i)) === null) break; await sleep(2_000) }
await clickButton(/e2e-keepalive-ws/)
await sleep(2_000)
await clickButton(/new session/i)
await sleep(5_000)
const snap = async () =>
  p.evaluate(() => {
    const candidates = [...document.querySelectorAll('div,span')].filter((el) =>
      /keepalive\s*→/.test(el.textContent || '') && /\d{1,2}:\d{2}/.test(el.textContent || '')
    )
    if (candidates.length === 0) return { text: null, html: null }
    const tightest = candidates.reduce((a, b) => ((a.textContent || '').length <= (b.textContent || '').length ? a : b))
    return { text: (tightest.textContent || '').slice(0, 90), children: [...tightest.children].map((c) => (c.textContent || '').trim()).slice(0, 6) }
  })
const s1 = await snap()
console.log('S1:', JSON.stringify(s1))
await sleep(2_000)
const s2 = await snap()
console.log('S2:', JSON.stringify(s2))
const status = await fetch(WEB + '/plugins/dsh-keepalive/status').then((r) => r.json())
console.log('STATUS:', JSON.stringify({
  intervalMinutes: status.config.intervalMinutes,
  enabled: status.enabled,
  providers: status.providers.map((row) => ({ id: row.id, nextFireAt: row.nextFireAt, parked: row.parked })),
  now: status.now
}))
await p.screenshot({ path: '/e2e/evidence/dock-diag.png' })
await b.close()
