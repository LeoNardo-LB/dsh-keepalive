/**
 * E2E driver: asserts the seven spec verification points against the running
 * dsh web instance and the two mock providers. Exits non-zero on the FIRST
 * failed scenario; evidence JSON is appended per scenario for the runbook.
 */
import { appendFileSync, writeFileSync } from 'node:fs'

const WEB = 'http://127.0.0.1:8180'
const MOCK_PRIMARY = 'http://127.0.0.1:9201'
const MOCK_BACKUP = 'http://127.0.0.1:9202'
const EVIDENCE = '/e2e/evidence/driver-evidence.json'
writeFileSync(EVIDENCE, '')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(name, fn, timeoutMs = 30_000, everyMs = 500) {
  const startedAt = Date.now()
  for (;;) {
    const value = await fn().catch(() => undefined)
    if (value !== undefined && value !== false) return value
    if (Date.now() - startedAt > timeoutMs) throw new Error('waitFor timeout: ' + name)
    await sleep(everyMs)
  }
}

async function status() {
  const response = await fetch(WEB + '/plugins/dsh-keepalive/status')
  if (!response.ok) throw new Error('status ' + String(response.status))
  return response.json()
}

async function act(type, provider) {
  const response = await fetch(WEB + '/plugins/dsh-keepalive/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type, ...(provider === undefined ? {} : { provider }) })
  })
  return { ok: response.ok, body: await response.json().catch(() => null) }
}

async function history(limit = 50) {
  const response = await fetch(WEB + '/plugins/dsh-keepalive/history?limit=' + String(limit))
  if (!response.ok) throw new Error('history ' + String(response.status))
  return response.json()
}

async function mockLog(base) {
  const response = await fetch(base + '/__log')
  return response.json()
}

async function setMockMode(base, mode) {
  const response = await fetch(base + '/__mode?m=' + mode)
  return response.json()
}

const results = []
function record(scenario, pass, detail) {
  results.push({ scenario, pass, detail })
  appendFileSync(EVIDENCE, JSON.stringify({ scenario, pass, detail, at: new Date().toISOString() }) + '\n')
  console.log((pass ? 'PASS' : 'FAIL') + ' [' + scenario + '] ' + detail)
  if (!pass) process.exitCode = 1
}

// Wait for the webserver to come up.
await waitFor('webserver up', async () => (await fetch(WEB).catch(() => null)) !== null, 60_000)

// S1: plugin routes exist and status carries both providers (build+runtime).
{
  const snapshot = await waitFor('status with providers', async () => {
    const body = await status()
    return body.providers !== undefined && body.providers.length >= 2 ? body : undefined
  })
  const ids = snapshot.providers.map((row) => row.id).sort()
  record('s1-routes', ids.includes('mock-backup') && ids.includes('mock-primary'), 'providers: ' + ids.join(','))
}

// S2: fire-now reaches the mock provider and lands in history (telemetry).
{
  const before = (await mockLog(MOCK_PRIMARY)).length
  const fired = await act('fire-now', 'mock-primary')
  const shot = await waitFor('history entry after fire-now', async () => {
    const body = await history()
    const entry = body.items.find((item) => item.provider === 'mock-primary')
    return entry === undefined ? undefined : entry
  })
  const after = (await mockLog(MOCK_PRIMARY)).length
  const request = (await mockLog(MOCK_PRIMARY))[after - 1]
  const messageOk = typeof request?.body?.messages === 'object' && request.body.messages.length > 0
  const contentOk = (() => {
    const last = request?.body?.messages?.[request.body.messages.length - 1]?.content
    const text = typeof last === 'string' ? last : Array.isArray(last) ? last[0]?.text : ''
    return typeof text === 'string' && /20[0-9]{2}-/.test(text) && /[0-9a-f]{8}$/.test(text)
  })()
  record(
    's2-fire-now',
    fired.ok && after === before + 1 && shot.status === 'ok' && messageOk && contentOk,
    'http=' + String(after === before + 1) + ' history=' + shot.status + ' msgShape=' + String(messageOk && contentOk) + ' error=' + String(shot.error ?? 'none')
  )
}

// S3: nextFireAt matches actual shot timing within tolerance (cross-check).
{
  const snapshot = await status()
  const row = snapshot.providers.find((p) => p.id === 'mock-backup')
  const nextFireAt = row?.nextFireAt
  const before = (await mockLog(MOCK_BACKUP)).length
  if (nextFireAt === null || nextFireAt === undefined) {
    record('s3-timing', false, 'no nextFireAt for mock-backup')
  } else {
    const wait = Math.max(0, nextFireAt - Date.now()) + 3_000
    await sleep(Math.min(wait, 95_000))
    const after = (await mockLog(MOCK_BACKUP)).length
    const hit = after > before
    const requests = await mockLog(MOCK_BACKUP)
    const delta = requests[after - 1] !== undefined ? Math.abs(requests[after - 1].at - nextFireAt) : -1
    record('s3-timing', hit && delta >= -100 && delta < 6_000, 'scheduledShotDeltaMs=' + String(delta))
  }
}

// S4: pause/resume reflect in status within one poll window (runtime).
{
  await act('pause')
  let snapshot = await status()
  const pausedOk = snapshot.paused === true && snapshot.providers.every((p) => p.nextFireAt === null)
  await act('resume')
  snapshot = await status()
  const resumedOk = snapshot.paused === false && snapshot.providers.some((p) => p.nextFireAt !== null)
  record('s4-pause-resume', pausedOk && resumedOk, 'paused=' + String(pausedOk) + ' resumed=' + String(resumedOk))
}

// S5: auto-park after consecutive failures (telemetry via status).
{
  await setMockMode(MOCK_BACKUP, 'fail')
  for (let index = 0; index < 5; index += 1) {
    const fired = await act('fire-now', 'mock-backup')
    if (!fired.ok) break
  }
  const row = await waitFor('parked', async () => {
    const body = await status()
    const entry = body.providers.find((p) => p.id === 'mock-backup')
    return entry !== undefined && entry.parked ? entry : undefined
  })
  const before = (await mockLog(MOCK_BACKUP)).length
  await act('fire-now', 'mock-backup') // parked: refused
  const after = (await mockLog(MOCK_BACKUP)).length
  const refusedOk = after === before
  await act('resume-provider', 'mock-backup')
  await setMockMode(MOCK_BACKUP, 'ok')
  record('s5-park', row.parked && refusedOk, 'parked=' + String(row.parked) + ' parkedFireRefused=' + String(refusedOk))
}

// S6: catch-up exactly once after restart (handled by runbook restart step).
{
  const snapshot = await status()
  const anyNext = snapshot.providers.some((p) => p.nextFireAt !== null)
  record('s6-scheduled', anyNext, 'nextFireAt present after resume: ' + String(anyNext))
}

// S7: silence - no session files created by keepalive activity (telemetry).
{
  const { readdirSync } = await import('node:fs')
  let sessionCount = 0
  try {
    sessionCount = readdirSync('/e2e/dsh-home/sessions').length
  } catch {
    sessionCount = 0
  }
  const log = await fetch(WEB + '/plugins/dsh-keepalive/history?limit=1').then((r) => r.json())
  const historyHasShots = log.items.length > 0
  record('s7-silent', sessionCount === 0 && historyHasShots, 'sessions=' + String(sessionCount) + ' historyShots=' + String(historyHasShots))
}

// S8: full provider visibility + per-provider opt-in (the panel contract:
// every registered route is listed even when not participating; one config
// POST opts it in and the engine schedules it).
{
  const before = await status()
  const available = before.availableProviders.map((p) => p.id).sort()
  const spareVisible = available.includes('mock-spare')
  const spareConfigured = before.config.providers['mock-spare'] !== undefined
  const response = await fetch(WEB + '/plugins/dsh-keepalive/config', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ providers: { 'mock-spare': { enabled: true } } })
  })
  const optInOk = response.ok
  const row = await waitFor('spare scheduled', async () => {
    const body = await status()
    const entry = body.providers.find((p) => p.id === 'mock-spare')
    return entry !== undefined && entry.nextFireAt !== null ? entry : undefined
  })
  const fired = await act('fire-now', 'mock-spare')
  const spareLog = await fetch('http://127.0.0.1:9203/__log').then((r) => r.json())
  const hit = spareLog.length === 1
  record(
    's8-provider-opt-in',
    spareVisible && !spareConfigured && optInOk && row.nextFireAt !== null && fired.ok && hit,
    'visible=' + String(spareVisible) + ' preConfigured=' + String(spareConfigured) + ' optIn=' + String(optInOk) + ' scheduled=' + String(row.nextFireAt !== null) + ' firedHttp=' + String(hit)
  )
}

console.log(results.every((r) => r.pass) ? 'ALL SCENARIOS PASS' : 'SOME SCENARIOS FAILED')
