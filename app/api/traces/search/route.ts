import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { readTargetUserId } from "@/lib/auth/readTargetUser";
import { opsLimit } from "@/lib/ops/limits";
import { logOpsAudit } from "@/lib/ops/audit";
import { trackRequestEvent } from "@/lib/events/trackRequestEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const t0 = Date.now();
    const targetUserId = readTargetUserId(req);
    const gate = await requireOpsAuth({ targetUserId });

    // Note: requireOpsAuth ensures canon identity exists
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "traces.search");

    const url = new URL(req.url);
    const since = url.searchParams.get("since");
    const until = url.searchParams.get("until");
    const kind = url.searchParams.get("kind");
    const status = url.searchParams.get("status");
    const has_error = url.searchParams.get("has_error");
    const q = url.searchParams.get("q");
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    await logOpsAudit({
        req,
        actorUserId: gate.clerkUserId,
        actorIsAdmin: gate.isAdmin,
        targetUserId: targetUserId ?? null,
        action: "trace.search",
        resourceType: "trace",
        meta: { since, until, kind, status, has_error, q, limit, offset, scoped_user_id: gate.userId },
    });

    const { data, error } = await getSupabaseAdminRuntimeClient().rpc("rpc_trace_search", {
        p_user_id: gate.userId,
        p_since: since ?? null,
        p_until: until ?? null,
        p_kind: kind ?? null,
        p_status: status ?? null,
        p_has_error: has_error == null ? null : has_error === "true",
        p_q: q ?? null,
        p_limit: Math.min(200, Math.max(1, limit)),
        p_offset: Math.max(0, offset),
    });

    if (error) {
        // Track failure
        await trackRequestEvent({
            req,
            userIdUuid: gate.canon.userIdUuid,
            clerkUserId: gate.clerkUserId,
            eventName: "api.traces.search.fail",
            status: 500,
            latencyMs: Date.now() - t0,
            properties: { error: error.message }
        });
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Track success
    await trackRequestEvent({
        req,
        userIdUuid: gate.canon.userIdUuid,
        clerkUserId: gate.clerkUserId,
        eventName: "api.traces.search.success",
        status: 200,
        latencyMs: Date.now() - t0,
        properties: {
            count: data?.length ?? 0,
            target_user: targetUserId
        }
    });

    return NextResponse.json({ ok: true, items: data ?? [], scoped_user_id: gate.userId, is_admin: gate.isAdmin });
}
