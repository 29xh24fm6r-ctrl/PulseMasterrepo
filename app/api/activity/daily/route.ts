import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") ?? "30");

    const supabase = getServiceSupabase();

    // Map Clerk -> identity_users -> UUID
    const { data: iu, error: iuErr } = await supabase
        .from("identity_users")
        .select("id")
        .eq("clerk_user_id", userId)
        .maybeSingle();

    if (iuErr || !iu?.id) {
        return NextResponse.json({ error: "identity_user_not_found" }, { status: 404 });
    }

    const { data, error } = await supabase.rpc("user_daily_activity_rollup_read", {
        p_user_id_uuid: iu.id,
        p_days: Math.max(1, Math.min(days, 365)),
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check freshness (F1)
    // The RPC now returns updated_at (via migration 20260103_update_rollup_read_rpc.sql)
    const rows = data ?? [];
    const today = rows.at(-1);

    // Check if today's row exists and is fresh (within 5 mins)
    // If no row for today, or it's old, we might consider it "processing" if we expect one.
    // For now, simple check: is the *latest* row fresh? 
    // Actually user spec: "today = rows.at(-1); isStale = !today || ... > 5 * 60_000"
    const isStale = !today || (Date.now() - new Date(today.updated_at).getTime() > 5 * 60_000);

    return NextResponse.json({
        user_id_uuid: iu.id,
        days: Math.max(1, Math.min(days, 365)),
        rows: rows,
        status: isStale ? "processing" : "ready",
    });
}
