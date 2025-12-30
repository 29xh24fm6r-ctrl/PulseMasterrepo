type Bucket = {
    count: number;
    resetAt: number;
};

const buckets = new Map<string, Bucket>();

function nowMs() {
    return Date.now();
}


const RULES: Record<string, { limit: number; windowMs: number }> = {
    // Ops Limits (strict)
    "ops:traces.search": { limit: 20, windowMs: 60_000 },
    "ops:traces.get": { limit: 30, windowMs: 60_000 },
    "ops:traces.artifacts": { limit: 30, windowMs: 60_000 },
    "ops:traces.links": { limit: 30, windowMs: 60_000 },
    "ops:traces.replay": { limit: 6, windowMs: 60_000 },
    "ops:executions.cancel": { limit: 10, windowMs: 60_000 },
    "ops:executions.why": { limit: 30, windowMs: 60_000 },
    "ops:executions.upcoming": { limit: 60, windowMs: 60_000 },
    "ops:executions.worker": { limit: 30, windowMs: 60_000 },
    "ops:ops.blast_radius": { limit: 30, windowMs: 60_000 },
    "ops:ops.drift": { limit: 30, windowMs: 60_000 },

    // Public API Limits
    "tasks.triage": { limit: 12, windowMs: 60_000 },
    "tasks.action": { limit: 60, windowMs: 60_000 },
    "quests.today": { limit: 30, windowMs: 60_000 },
    "quests.claim": { limit: 20, windowMs: 60_000 },

    // Add other defaults if needed
    "default": { limit: 60, windowMs: 60_000 },
};

/**
 * In-memory rate limiter (per instance).
 */
export async function rateLimitOrThrow(userId: string, keyOrBucket: string) {
    const rule = RULES[keyOrBucket] ?? RULES["default"];
    const key = `${userId}:${keyOrBucket}`;

    const t = nowMs();
    const b = buckets.get(key);

    if (!b || t >= b.resetAt) {
        buckets.set(key, { count: 1, resetAt: t + rule.windowMs });
        return;
    }

    b.count += 1;
    if (b.count > rule.limit) {
        const retryInMs = Math.max(0, b.resetAt - t);
        const err = new Error("rate_limited");
        (err as any).code = "RATE_LIMITED";
        (err as any).retry_in_ms = retryInMs;
        throw err;
    }
}


/**
 * Hard timeout wrapper for external calls (e.g. OpenAI).
 */
export async function withTimeout<T>(p: Promise<T>, ms: number, name = "timeout"): Promise<T> {
    let timer: any;
    const timeout = new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error(name)), ms);
    });
    try {
        return await Promise.race([p, timeout]);
    } finally {
        clearTimeout(timer);
    }
}

export function jsonError(status: number, code: string, detail?: string, extra?: Record<string, any>) {
    return Response.json({ error: code, detail, ...(extra ?? {}) }, { status });
}
