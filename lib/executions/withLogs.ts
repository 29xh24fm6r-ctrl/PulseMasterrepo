import { execLog } from "./logger";

export async function withExecStep<T>(params: {
    userId: string;
    executionId: string;
    traceId?: string | null;
    step: string;
    meta?: Record<string, any>;
    fn: () => Promise<T>;
}) {
    const { userId, executionId, traceId = null, step, meta, fn } = params;

    const startedAt = Date.now();
    await execLog({ userId, executionId, traceId, message: `step:start ${step}`, meta });

    try {
        const out = await fn();
        const ms = Date.now() - startedAt;
        await execLog({ userId, executionId, traceId, message: `step:ok ${step}`, meta: { ...(meta ?? {}), ms } });
        return out;
    } catch (e: any) {
        const ms = Date.now() - startedAt;
        await execLog({
            userId,
            executionId,
            traceId,
            level: "error",
            message: `step:fail ${step}`,
            meta: { ...(meta ?? {}), ms, error: e?.message ?? String(e) },
        });
        throw e;
    }
}
