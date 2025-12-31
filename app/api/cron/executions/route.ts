import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonOk(body: any) {
    return NextResponse.json(body, { status: 200 });
}

export async function GET(req: Request) {
    // Vercel Cron calls GET. (You can also allow POST if you want.)
    const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const holder = `cron:${process.env.VERCEL_REGION ?? "unknown"}:${Date.now()}`;

    // 1) Acquire global lock (TTL 50s, cron runs every 60s)
    const { data: locked, error: lerr } = await supabaseAdmin.rpc("rpc_cron_try_lock", {
        p_key: "executions-cron",
        p_ttl_seconds: 50,
        p_holder: holder,
    });

    if (lerr) return jsonOk({ ok: false, error: `lock error: ${lerr.message}` });
    if (!locked) return jsonOk({ ok: true, skipped: true, reason: "lock held" });

    const now = new Date().toISOString();

    // 2) Find users with ready work (distinct user_id)
    // Ready = queued and run_at <= now and (next_retry_at null OR <= now)
    const { data: rows, error } = await supabaseAdmin
        .from("executions")
        .select("user_id")
        .eq("status", "queued")
        .lte("run_at", now)
        .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
        .limit(2000);

    if (error) return jsonOk({ ok: false, error: error.message });

    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id))).slice(0, 50); // cap per tick
    let ran = 0;
    const results: any[] = [];

    // 3) For each user, run exactly ONE execution per tick (safe + fair)
    for (const userId of userIds) {
        const res = await fetch(new URL("/api/executions/worker", req.url), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ user_id: userId }),
        }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));

        results.push({ user_id: userId, ...res });
        if (res?.ran) ran += 1;
    }

    // 4) Release lock (optional; TTL would expire anyway)
    await supabaseAdmin.rpc("rpc_cron_release_lock", { p_key: "executions-cron" });

    return jsonOk({
        ok: true,
        now,
        users_considered: userIds.length,
        executions_ran: ran,
        results,
    });
}
