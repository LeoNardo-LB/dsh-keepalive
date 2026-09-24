import { clampIntervalMinutes } from "./interval.js";
export const ROUTE_PREFIX = '/plugins/dsh-keepalive';
function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(payload);
}
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (raw.length === 0)
        return {};
    return JSON.parse(raw);
}
function parseProviders(raw) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
        return undefined;
    const out = {};
    for (const [id, value] of Object.entries(raw)) {
        if (value === null || typeof value !== 'object')
            return undefined;
        const entry = value;
        const model = entry.model;
        out[id] = {
            enabled: entry.enabled !== false,
            ...(typeof model === 'string' && model.length > 0 ? { model } : {})
        };
    }
    return out;
}
function parseIntOr(value, fallback) {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
/** Build the four route handlers; registration happens in index.ts. */
export function createRoutes(deps) {
    async function status(_req, res) {
        const cfg = deps.config();
        sendJson(res, 200, {
            enabled: cfg.enabled,
            config: cfg,
            providers: deps.engine.snapshot(),
            availableProviders: deps.listAvailableProviders(),
            paused: deps.engine.isPaused(),
            now: deps.now()
        });
    }
    async function history(req, res) {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const limit = Math.min(500, Math.max(1, parseIntOr(url.searchParams.get('limit'), 50)));
        const providerParam = url.searchParams.get('provider');
        const provider = providerParam !== null && providerParam.length > 0 ? providerParam : undefined;
        sendJson(res, 200, { items: deps.history(limit, provider), dailyStats: deps.dailyStats() });
    }
    async function config(req, res) {
        let body;
        try {
            body = await readJsonBody(req);
        }
        catch {
            sendJson(res, 400, { error: 'invalid JSON body' });
            return;
        }
        if (body === null || typeof body !== 'object' || Array.isArray(body)) {
            sendJson(res, 400, { error: 'body must be an object' });
            return;
        }
        const patch = {};
        const raw = body;
        if (raw.enabled !== undefined) {
            if (typeof raw.enabled !== 'boolean') {
                sendJson(res, 400, { error: 'enabled must be boolean' });
                return;
            }
            patch.enabled = raw.enabled;
        }
        if (raw.intervalMinutes !== undefined) {
            if (typeof raw.intervalMinutes !== 'number' || !Number.isFinite(raw.intervalMinutes)) {
                sendJson(res, 400, { error: 'intervalMinutes must be a number' });
                return;
            }
            patch.intervalMinutes = clampIntervalMinutes(raw.intervalMinutes);
        }
        if (raw.jitterPercent !== undefined) {
            if (typeof raw.jitterPercent !== 'number' || raw.jitterPercent < 0 || raw.jitterPercent > 100) {
                sendJson(res, 400, { error: 'jitterPercent must be within 0-100' });
                return;
            }
            patch.jitterPercent = raw.jitterPercent;
        }
        if (raw.autoPause !== undefined) {
            const autoPause = raw.autoPause;
            if (autoPause === null || typeof autoPause !== 'object' || Array.isArray(autoPause)
                || typeof autoPause.enabled !== 'boolean'
                || typeof autoPause.threshold !== 'number'
                || !Number.isFinite(autoPause.threshold)
                || autoPause.threshold < 1) {
                sendJson(res, 400, { error: 'autoPause must be { enabled: boolean, threshold: number >= 1 }' });
                return;
            }
            const { enabled, threshold } = autoPause;
            patch.autoPause = { enabled, threshold: Math.floor(threshold) };
        }
        if (raw.providers !== undefined) {
            const providers = parseProviders(raw.providers);
            if (providers === undefined) {
                sendJson(res, 400, { error: 'providers must be a map of provider config objects' });
                return;
            }
            patch.providers = providers;
        }
        try {
            await deps.updateConfig(patch);
            sendJson(res, 200, { ok: true });
        }
        catch (error) {
            deps.logger.warn('dsh-keepalive: config update failed: ' + String(error));
            sendJson(res, 500, { error: 'config update failed' });
        }
    }
    async function action(req, res) {
        let body;
        try {
            body = await readJsonBody(req);
        }
        catch {
            sendJson(res, 400, { error: 'invalid JSON body' });
            return;
        }
        if (body === null || typeof body !== 'object') {
            sendJson(res, 400, { error: 'body must be an object' });
            return;
        }
        const raw = body;
        const type = raw.type;
        const provider = typeof raw.provider === 'string' ? raw.provider : undefined;
        try {
            if (type === 'pause') {
                deps.engine.pause();
            }
            else if (type === 'resume') {
                deps.engine.resume();
            }
            else if (type === 'fire-now') {
                if (provider === undefined) {
                    sendJson(res, 400, { error: 'fire-now requires provider' });
                    return;
                }
                const result = await deps.engine.fireNow(provider);
                if (result === undefined) {
                    sendJson(res, 409, { error: 'provider not fireable (unknown, paused, or parked)' });
                    return;
                }
                sendJson(res, 200, { ok: true, result });
                return;
            }
            else if (type === 'resume-provider') {
                if (provider === undefined) {
                    sendJson(res, 400, { error: 'resume-provider requires provider' });
                    return;
                }
                deps.engine.resumeProvider(provider);
            }
            else if (type === 'remove-provider') {
                if (provider === undefined) {
                    sendJson(res, 400, { error: 'remove-provider requires provider' });
                    return;
                }
                // Removal cannot ride the config endpoint: settings merge is
                // recursive, so a providers patch can never delete a key. This is
                // the single sanctioned delete path (settings mutate/unset).
                await deps.removeProvider(provider);
                await deps.engine.reschedule();
            }
            else {
                sendJson(res, 400, { error: 'unknown action type' });
                return;
            }
            sendJson(res, 200, { ok: true });
        }
        catch (error) {
            deps.logger.warn('dsh-keepalive: action failed: ' + String(error));
            sendJson(res, 500, { error: 'action failed' });
        }
    }
    /** Per-provider model id lists for dropdown selection (never free text). */
    async function models(_req, res) {
        const modelMap = {};
        for (const provider of deps.listAvailableProviders()) {
            try {
                const ids = await deps.listModels(provider.id);
                modelMap[provider.id] = Array.isArray(ids) ? ids : [];
            }
            catch (error) {
                // One broken route must not fail the whole listing for the others.
                deps.logger.warn('dsh-keepalive: listModels failed for "' + provider.id + '": ' + String(error));
                modelMap[provider.id] = [];
            }
        }
        sendJson(res, 200, { models: modelMap });
    }
    return {
        status,
        history,
        config,
        action,
        models
    };
}
//# sourceMappingURL=routes.js.map