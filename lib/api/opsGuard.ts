import { supabaseAdmin } from "@/lib/supabase/admin";

type GuardOpts = {
    routeKey: string;           // "GET:/api/signals/daily"
    windowSeconds: number;      // e.g. 60
    limit: number;              // e.g. 120
    meta?: Record<string, any>; // safe primitives only
};

export async function withOpsGuard<T>(
    req: Request,
    ownerUserId: string,
    opts: GuardOpts,
    handler: () => Promise<{ status: number; body: any }>
): Promise<Response> {
    const start = Date.now();
    const method = req.method || "GET";
    const url = new URL(req.url);
    const path = url.pathname;

    // Rate limit check (atomic)
    const { data: rl, error: rlErr } = await supabaseAdmin.rpc("ops_rate_limit_check", {
        p_owner_user_id: ownerUserId,
        p_route_key: opts.routeKey,
        p_window_seconds: opts.windowSeconds,
        p_limit: opts.limit,
    });

    if (rlErr) {
        // Fail-open would hide issues; fail-closed is safer for ops endpoints.
        return new Response(JSON.stringify({ error: "rate_limit_check_failed" }), { status: 500 });
    }

    const row = Array.isArray(rl) ? rl[0] : rl;
    const allowed = Boolean(row?.allowed);
    const remaining = Number(row?.remaining ?? 0);
    const resetAt = String(row?.reset_at ?? "");

    if (!allowed) {
        // Audit deny
        await safeAudit(req, ownerUserId, opts.routeKey, 429, Date.now() - start, {
            ...(opts.meta ?? {}),
            rate_limited: true,
            remaining,
            reset_at: resetAt,
        });

        return new Response(JSON.stringify({ error: "rate_limited", remaining, reset_at: resetAt }), {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "X-RateLimit-Remaining": String(remaining),
                "X-RateLimit-Reset": resetAt,
            },
        });
    }

    // Execute handler
    let result: { status: number; body: any };
    try {
        result = await handler();
    } catch (e: any) {
        const dur = Date.now() - start;
        await safeAudit(req, ownerUserId, opts.routeKey, 500, dur, {
            ...(opts.meta ?? {}),
            error: e?.message ?? "unknown",
        });
        return new Response(JSON.stringify({ error: "internal_error" }), { status: 500 });
    }

    const dur = Date.now() - start;

    await safeAudit(req, ownerUserId, opts.routeKey, result.status, dur, {
        ...(opts.meta ?? {}),
        remaining,
        reset_at: resetAt,
    });

    return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": resetAt,
        },
    });
}

async function safeAudit(
    req: Request,
    ownerUserId: string,
    routeKey: string,
    status: number,
    durationMs: number,
    meta: Record<string, any>
) {
    try {
        const method = req.method || "GET";
        const url = new URL(req.url);
        const path = url.pathname;

        const requestId = req.headers.get("x-request-id") ?? null;
        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            req.headers.get("x-real-ip") ??
            null;
        const userAgent = req.headers.get("user-agent") ?? null;

        await supabaseAdmin.rpc("ops_audit_append", {
            p_owner_user_id: ownerUserId,
            p_route_key: routeKey,
            p_method: method,
            p_path: path,
            p_status: status,
            p_duration_ms: Math.max(0, Math.floor(durationMs)),
            p_request_id: requestId,
            p_ip: ip,
            p_user_agent: userAgent,
            p_meta: meta ?? {},
        });
    } catch {
        // never block response on audit
    }
}
