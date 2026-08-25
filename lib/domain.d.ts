import { z as zod } from 'zod';
/** The keepalive domain: name is the unit name under $DSH_HOME/storages. */
export declare const keepaliveDomain: {
    name: string;
    version: number;
    global: {
        schema: zod.ZodObject<{
            nextFireAt: zod.ZodRecord<zod.ZodString, zod.ZodNumber>;
        }, zod.core.$strip>;
        initial: {
            nextFireAt: {};
        };
    };
    tables: {
        history: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<string, {
            provider: string;
            model: string;
            status: "ok" | "fail";
            latencyMs: number;
            content: string;
            preview: string;
            at: number;
            error?: string | undefined;
        }>;
        stats: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<string, {
            success: number;
            fail: number;
            latencyTotalMs: number;
        }>;
    };
};
//# sourceMappingURL=domain.d.ts.map