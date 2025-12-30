import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") ?? "30");

    const supabase = await createClient();

    // Auth is handled by RLS in the RPC (uses auth.uid())
    const { data, error } = await supabase.rpc("user_daily_activity_rollup_read", {
        p_days: days,
    });

    if (error) {
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({ ok: true, data });
}
