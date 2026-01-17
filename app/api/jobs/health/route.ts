import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export const runtime = "nodejs";

export async function GET() {
    await requireOpsAuth();
    const sb = getSupabaseAdminRuntimeClient();

    // Parallel fetch: health counts + worker heartbeat
    const [{ data: counts }, { data: hb }] = await Promise.all([
        sb.rpc("job_health_counts"),
        sb
            .from("job_worker_heartbeat")
            .select("last_seen_at")
            .order("last_seen_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    const lastSeen = hb?.last_seen_at
        ? new Date(hb.last_seen_at).getTime()
        : 0;

    // Alive if seen in last 60s
    const worker_alive =
        lastSeen > 0 && Date.now() - lastSeen < 60_000;

    return NextResponse.json({
        ...counts,
        worker_alive,
        worker_last_seen_at: hb?.last_seen_at ?? null,
    });
}
