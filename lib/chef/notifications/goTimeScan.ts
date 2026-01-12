import { supabaseAdmin } from "@/lib/supabase/admin";

export async function runChefGoTimeScan(args: {
    owner_user_id?: string;
    lookback_minutes?: number;  // default 120
    lookahead_minutes?: number; // default 10
}) {
    const sb = supabaseAdmin();
    const lookback = args.lookback_minutes ?? 120;
    const lookahead = args.lookahead_minutes ?? 10;

    const now = new Date();
    const min = new Date(now.getTime() - lookback * 60 * 1000).toISOString();
    const max = new Date(now.getTime() + lookahead * 60 * 1000).toISOString();

    let q = sb
        .from("chef_cook_plans")
        .select("id, owner_user_id, title, start_cook_at, status")
        .in("status", ["scheduled", "rescheduled"])
        .gte("start_cook_at", min)
        .lte("start_cook_at", max)
        .order("start_cook_at", { ascending: true });

    if (args.owner_user_id) q = q.eq("owner_user_id", args.owner_user_id);

    const { data: plans, error } = await q;
    if (error) throw error;

    let created = 0;

    for (const p of plans ?? []) {
        const dedupe_key = `go_time:${p.id}`;

        const { error: insErr } = await sb.from("chef_notifications").insert({
            owner_user_id: p.owner_user_id,
            type: "go_time",
            title: "Chef: Start cooking now",
            body: p.title,
            dedupe_key,
            cook_plan_id: p.id,
            execution_id: null,
        });

        if (!insErr) created += 1;
        else {
            const msg = String((insErr as any).message || "").toLowerCase();
            if (!msg.includes("duplicate")) throw insErr;
        }
    }

    return { scanned: plans?.length ?? 0, created };
}
