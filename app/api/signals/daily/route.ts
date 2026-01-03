import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { withOpsGuard } from "@/lib/api/opsGuard";

export async function GET(req: Request) {
    const authResult = await requireOpsAuth();
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const { userId: owner_user_id } = authResult;

    const url = new URL(req.url);
    const day = url.searchParams.get("day") ?? new Date().toISOString().slice(0, 10);

    const daysRaw = Number(url.searchParams.get("days") ?? 30);
    const days = Math.max(1, Math.min(daysRaw, 120));

    const topRaw = Number(url.searchParams.get("top") ?? 8);
    const top = Math.max(1, Math.min(topRaw, 25));

    return withOpsGuard(
        req,
        owner_user_id,
        {
            routeKey: "GET:/api/signals/daily",
            windowSeconds: 60,
            limit: 120,
            meta: { day, days, top },
        },
        async () => {
            // Cache fast path
            const { data: cached, error: cacheErr } = await supabaseAdmin.rpc("user_daily_signals_cache_read", {
                p_owner_user_id: owner_user_id,
                p_day: day,
            });
            if (cacheErr) return { status: 500, body: { error: cacheErr.message } };
            if (cached) return { status: 200, body: cached };

            // Fallback compute+write
            const { data: built, error: buildErr } = await supabaseAdmin.rpc("user_daily_signals_cache_build", {
                p_owner_user_id: owner_user_id,
                p_day: day,
                p_days: days,
                p_attrib_top_n: top,
                p_payload_version: 1,
            });
            if (buildErr) return { status: 500, body: { error: buildErr.message } };

            return { status: 200, body: built ?? {} };
        }
    );
}
