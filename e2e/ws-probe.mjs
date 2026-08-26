import puppeteer from 'puppeteer-core'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://127.0.0.1:8180', { waitUntil: 'domcontentloaded', timeout: 60000 })
await sleep(5000)
const clickByText = async (re) => {
  const hs = await p.$$('button')
  for (const h of hs) {
    const t = ((await h.evaluate((el) => el.textContent)) || '').trim()
    if (re.test(t)) {
      await h.click()
      return t
    }
  }
  return null
}
console.log('continue:', await clickByText(/continue/i))
await sleep(2000)
console.log('choose:', await clickByText(/choose workspace/i))
await sleep(2500)
const state1 = await p.evaluate(() => ({
  body: document.body.innerText.slice(0, 700),
  btns: [...document.querySelectorAll('button')].map((x) => (x.textContent || '').trim()).filter(Boolean).slice(0, 30)
}))
console.log(JSON.stringify(state1, null, 1))
await p.screenshot({ path: '/e2e/evidence/browser-5-workspace-dialog.png' })
const options = state1.btns.filter((t) => !/cancel|close|settings|new session|choose workspace/i.test(t))
const pick = options.find((t) => /default|create|new|^\+/i.test(t)) ?? options[0]
if (pick !== undefined) {
  console.log('picked:', pick)
  const escaped = pick.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  console.log('pickResult:', await clickByText(new RegExp('^' + escaped + '$', 'i')))
}
await sleep(2500)
await p.screenshot({ path: '/e2e/evidence/browser-6-after-workspace.png' })
console.log('newSession:', await clickByText(/new session|新会话/i))
await sleep(5000)
const finalState = await p.evaluate(() => ({
  ka: /keepalive/i.test(document.body.innerText),
  hits: (document.body.innerText.match(/keepalive[^\n]*/g) || []).slice(0, 3),
  body: document.body.innerText.slice(0, 400)
}))
console.log(JSON.stringify(finalState, null, 1))
await p.screenshot({ path: '/e2e/evidence/browser-7-final.png' })
await b.close()
