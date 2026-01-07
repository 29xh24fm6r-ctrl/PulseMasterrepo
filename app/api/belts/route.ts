import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });

    const { data, error } = await (supabaseAdmin as any).from("v_xp_totals").select("*").eq("user_id", user_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const { data: tracks, error: e2 } = await (supabaseAdmin as any).from("belt_tracks").select("*").eq("is_active", true);
    if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

    const totals: Record<string, number> = {};
    for (const r of (data as any) ?? []) totals[r.xp_type] = r.total;

    // For each track, pick the highest belt_level <= total
    const out: any[] = [];
    for (const t of tracks ?? []) {
        const xpTotal = totals[t.xp_type] ?? 0;
        const { data: levelRows, error: e3 } = await (supabaseAdmin as any)
            .from("belt_levels")
            .select("*")
            .eq("track_id", t.id)
            .lte("min_total", xpTotal)
            .order("min_total", { ascending: false })
            .limit(1);

        if (e3) return NextResponse.json({ ok: false, error: e3.message }, { status: 500 });

        const lvl = (levelRows ?? [])[0] ?? null;
        out.push({
            track_key: t.key,
            track_name: t.name,
            xp_type: t.xp_type,
            xp_total: xpTotal,
            level: lvl?.level ?? 1,
            level_name: lvl?.name ?? "White",
            next_threshold: null, // optional future enhancement
        });
    }

    return NextResponse.json({ ok: true, belts: out });
}
