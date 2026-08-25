/**
 * HTTP face under /plugins/dsh-keepalive/*: read-only status/history plus
 * config writes and manual actions. Native node:http handlers; the host
 * webserver's loopback trust fence is the security boundary, but every body
 * is still validated as untrusted input (trust-boundary rule).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { clampIntervalMinutes } from './interval.ts'
import type { Engine } from './engine.ts'
import type { KeepaliveConfig, ProviderConfig, StatusSnapshot } from './types.ts'

export const ROUTE_PREFIX = '/plugins/dsh-keepalive'

export interface RoutesDeps {
  engine: Engine
  config: () => KeepaliveConfig
  /** Update the settings user layer (partial patch). */
  updateConfig: (patch: object) => Promise<void>
  /** Newest-first history entries. */
  history: (limit: number, provider: string | undefined) => unknown[]
  /** Daily stat buckets keyed by day. */
  dailyStats: () => Record<string, unknown>
  logger: { warn: (message: string) => void }
  now: () => number
}

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>

/** The four route handlers keyed by their URL suffix. */
export interface RouteHandlers {
  status: Handler
  history: Handler
  config: Handler
  action: Handler
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(payload)
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer))
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (raw.length === 0) return {}
  return JSON.parse(raw)
}

function parseProviders(raw: unknown): Record<string, ProviderConfig> | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: Record<string, ProviderConfig> = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === null || typeof value !== 'object') return undefined
    const entry = value as Record<string, unknown>
    const model = entry.model
    out[id] = {
      enabled: entry.enabled !== false,
      model: typeof model === 'string' && model.length > 0 ? model : null
    }
  }
  return out
}

function parseIntOr(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Build the four route handlers; registration happens in index.ts. */
export function createRoutes(deps: RoutesDeps): RouteHandlers {
  async function status(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    const cfg = deps.config()
    const snapshot: StatusSnapshot = {
      enabled: cfg.enabled,
      config: cfg,
      providers: deps.engine.snapshot(),
      now: deps.now(),
      paused: deps.engine.isPaused()
    } as StatusSnapshot & { paused: boolean }
    sendJson(res, 200, snapshot)
  }

  async function history(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const limit = Math.min(500, Math.max(1, parseIntOr(url.searchParams.get('limit'), 50)))
    const providerParam = url.searchParams.get('provider')
    const provider = providerParam !== null && providerParam.length > 0 ? providerParam : undefined
    sendJson(res, 200, { items: deps.history(limit, provider), dailyStats: deps.dailyStats() })
  }

  async function config(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body: unknown
    try {
      body = await readJsonBody(req)
    } catch {
      sendJson(res, 400, { error: 'invalid JSON body' })
      return
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(res, 400, { error: 'body must be an object' })
      return
    }
    const patch: Record<string, unknown> = {}
    const raw = body as Record<string, unknown>
    if (raw.enabled !== undefined) {
      if (typeof raw.enabled !== 'boolean') {
        sendJson(res, 400, { error: 'enabled must be boolean' })
        return
      }
      patch.enabled = raw.enabled
    }
    if (raw.intervalMinutes !== undefined) {
      if (typeof raw.intervalMinutes !== 'number' || !Number.isFinite(raw.intervalMinutes)) {
        sendJson(res, 400, { error: 'intervalMinutes must be a number' })
        return
      }
      patch.intervalMinutes = clampIntervalMinutes(raw.intervalMinutes)
    }
    if (raw.jitterPercent !== undefined) {
      if (typeof raw.jitterPercent !== 'number' || raw.jitterPercent < 0 || raw.jitterPercent > 100) {
        sendJson(res, 400, { error: 'jitterPercent must be within 0-100' })
        return
      }
      patch.jitterPercent = raw.jitterPercent
    }
    if (raw.providers !== undefined) {
      const providers = parseProviders(raw.providers)
      if (providers === undefined) {
        sendJson(res, 400, { error: 'providers must be a map of provider config objects' })
        return
      }
      patch.providers = providers
    }
    try {
      await deps.updateConfig(patch)
      sendJson(res, 200, { ok: true })
    } catch (error) {
      deps.logger.warn('dsh-keepalive: config update failed: ' + String(error))
      sendJson(res, 500, { error: 'config update failed' })
    }
  }

  async function action(req: IncomingMessage, res: ServerResponse): Promise<void> {
    let body: unknown
    try {
      body = await readJsonBody(req)
    } catch {
      sendJson(res, 400, { error: 'invalid JSON body' })
      return
    }
    if (body === null || typeof body !== 'object') {
      sendJson(res, 400, { error: 'body must be an object' })
      return
    }
    const raw = body as Record<string, unknown>
    const type = raw.type
    const provider = typeof raw.provider === 'string' ? raw.provider : undefined
    try {
      if (type === 'pause') {
        deps.engine.pause()
      } else if (type === 'resume') {
        deps.engine.resume()
      } else if (type === 'fire-now') {
        if (provider === undefined) {
          sendJson(res, 400, { error: 'fire-now requires provider' })
          return
        }
        const result = await deps.engine.fireNow(provider)
        if (result === undefined) {
          sendJson(res, 409, { error: 'provider not fireable (unknown, paused, or parked)' })
          return
        }
        sendJson(res, 200, { ok: true, result })
        return
      } else if (type === 'resume-provider') {
        if (provider === undefined) {
          sendJson(res, 400, { error: 'resume-provider requires provider' })
          return
        }
        deps.engine.resumeProvider(provider)
      } else {
        sendJson(res, 400, { error: 'unknown action type' })
        return
      }
      sendJson(res, 200, { ok: true })
    } catch (error) {
      deps.logger.warn('dsh-keepalive: action failed: ' + String(error))
      sendJson(res, 500, { error: 'action failed' })
    }
  }

  return {
    status,
    history,
    config,
    action
  }
}
