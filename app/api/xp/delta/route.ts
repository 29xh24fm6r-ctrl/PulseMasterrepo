import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfDayISO(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString();
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    const at = url.searchParams.get("at") ?? new Date().toISOString();

    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });

    const sod = startOfDayISO(new Date(at));

    // Pull ledger rows since start of day, aggregate by xp_type
    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("xp_ledger")
        .select("xp_type,amount,created_at")
        .eq("user_id", user_id)
        .gte("created_at", sod)
        .lt("created_at", at);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const delta: Record<string, number> = {};
    let total = 0;

    for (const r of data ?? []) {
        const k = r.xp_type as string;
        const a = Number(r.amount ?? 0);
        delta[k] = (delta[k] ?? 0) + a;
        total += a;
    }

    return NextResponse.json({ ok: true, window_start: sod, window_end: at, total, delta });
}
