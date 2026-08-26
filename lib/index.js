import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { Config } from "./config.js";
import { createEngine } from "./engine.js";
import { createKeeper } from "./keeper.js";
import { ROUTE_PREFIX, createRoutes } from "./routes.js";
import { appendHistory, bumpDailyStats, pruneDailyStats } from "./history.js";
import { keepaliveDomain } from "./domain.js";
export const name = 'dsh-keepalive';
/** Host services required before activation (fail-loud when missing). */
export const inject = ['llm', 'settings', 'storageDomain', 'webServer', 'timer'];
export { Config };
/** History ring cap (spec: keep the most recent 500 shots). */
const HISTORY_LIMIT = 500;
/** Daily stat horizon in days (spec: 90). */
const STATS_KEEP_DAYS = 90;
const NAMESPACE = settingsNamespace('dsh-keepalive');
function localDay(at) {
    const date = new Date(at);
    const pad = (value) => String(value).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}
/** Sequential history key counter keeps ring keys unique per process. */
let historySeq = 0;
/**
 * Install dsh-keepalive. The composition-layer entry config flows in as the
 * settings namespace base layer (below user settings): dev overlays seed
 * defaults, the user document stays the live-adjustable truth. Async init
 * runs as a guarded background task so the plugin activates synchronously;
 * failures log loudly instead of throwing into the fiber.
 */
export function apply(ctx, config = {}) {
    const logger = {
        info: (message) => ctx.logger.info(message),
        warn: (message) => ctx.logger.warn(message)
    };
    const init = async () => {
        const scope = ctx.settings.register(NAMESPACE, Config, { base: config });
        // First run: prefill the provider map with every registered route so the
        // user only flips the master switch (master stays OFF until confirmed).
        if (Object.keys(scope.get().providers ?? {}).length === 0) {
            const routes = ctx.llm.listProviders();
            const providers = {};
            for (const route of routes)
                providers[route.id] = { enabled: true };
            if (Object.keys(providers).length > 0)
                await scope.update({ providers });
        }
        const domain = (await ctx.storageDomain.open(keepaliveDomain));
        ctx.effect(() => () => void Promise.resolve(domain.close()).catch(() => undefined));
        const historyTable = domain.table('history');
        const statsTable = domain.table('stats');
        const onShot = (provider, model, result, at) => {
            const entry = {
                provider,
                model,
                status: result.status,
                latencyMs: result.latencyMs,
                content: result.content,
                preview: result.preview,
                at,
                ...(result.error === undefined ? {} : { error: result.error })
            };
            historySeq += 1;
            const key = String(at) + '-' + String(historySeq);
            void historyTable.put(key, entry)
                .then(() => {
                // Ring prune: drop oldest beyond the cap.
                if (historyTable.size > HISTORY_LIMIT) {
                    const all = [...historyTable.entries()].sort((a, b) => a[1].at - b[1].at);
                    const excess = historyTable.size - HISTORY_LIMIT;
                    for (let index = 0; index < excess; index += 1) {
                        const oldest = all[index];
                        if (oldest === undefined)
                            break;
                        void historyTable.delete(oldest[0]);
                    }
                }
            })
                .catch((error) => logger.warn('dsh-keepalive: history persist failed: ' + String(error)));
            const day = localDay(at);
            void statsTable
                .update(day, (current) => bumpDailyStats({ [day]: current }, day, entry.status, entry.latencyMs)[day])
                .catch((error) => logger.warn('dsh-keepalive: stats persist failed: ' + String(error)));
        };
        const persistNextFire = (map) => {
            void domain.global.set({ nextFireAt: map }).catch((error) => logger.warn('dsh-keepalive: nextFire persist failed: ' + String(error)));
        };
        const resolveModel = async (provider) => {
            const configured = scope.get().providers[provider]?.model;
            if (typeof configured === 'string' && configured.length > 0)
                return configured;
            const models = await ctx.llm.listModels(provider);
            return models[0]?.id ?? null;
        };
        const keeper = createKeeper((options) => ctx.llm.stream(options), Math.random, Date.now);
        const engine = createEngine({
            scheduler: { timeout: (callback, delay) => ctx.timeout(callback, delay) },
            keeper,
            resolveModel,
            config: () => scope.get(),
            onShot,
            persistNextFire,
            loadNextFire: () => domain.global.get().nextFireAt ?? null,
            logger,
            now: Date.now,
            rand: Math.random
        });
        await engine.start();
        const routes = createRoutes({
            engine,
            config: () => scope.get(),
            updateConfig: (patch) => scope.update(patch),
            // Recursive-merge settings cannot delete keys via update; removal is a
            // path-addressed unset on the user layer through the provider's mutate.
            removeProvider: (id) => ctx.settings.mutate(NAMESPACE, [{ op: 'unset', path: ['providers', id] }]),
            listAvailableProviders: () => ctx.llm.listProviders().map((route) => ({ id: route.id, name: route.name })),
            history: (limit, provider) => {
                let items = [...historyTable.entries()]
                    .map(([, entry]) => entry)
                    .sort((a, b) => b.at - a.at);
                if (provider !== undefined)
                    items = items.filter((entry) => entry.provider === provider);
                return items.slice(0, limit);
            },
            dailyStats: () => {
                const today = localDay(Date.now());
                const pruned = pruneDailyStats(Object.fromEntries(statsTable.entries()), today, STATS_KEEP_DAYS);
                for (const day of Object.keys(pruned))
                    void statsTable.put(day, pruned[day]);
                return pruned;
            },
            logger,
            now: Date.now
        });
        ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: ROUTE_PREFIX + '/status', handler: routes.status }), 'dsh-keepalive: status route');
        ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: ROUTE_PREFIX + '/history', handler: routes.history }), 'dsh-keepalive: history route');
        ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: ROUTE_PREFIX + '/config', handler: routes.config }), 'dsh-keepalive: config route');
        ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: ROUTE_PREFIX + '/action', handler: routes.action }), 'dsh-keepalive: action route');
        const disposeWatch = scope.watch(() => {
            void engine.reschedule().catch((error) => logger.warn('dsh-keepalive: reschedule failed: ' + String(error)));
        });
        ctx.effect(() => disposeWatch, 'dsh-keepalive: settings watch');
        ctx.effect(() => () => engine.dispose(), 'dsh-keepalive: engine dispose');
        logger.info('dsh-keepalive: host half active');
    };
    void init().catch((error) => {
        ctx.logger.error('dsh-keepalive: initialization failed: ' + String(error));
    });
}
//# sourceMappingURL=index.js.map