import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const authResult = await requireOpsAuth();
    if (!authResult.ok) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const { userId } = authResult;

    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") ?? "30");

    const supabase = supabaseAdmin;

    // Passing p_user_id (ops pattern) - hoping RPC supports it or we need to update RPC
    const { data, error } = await supabase.rpc("user_daily_activity_rollup_read", {
        p_user_id: userId,
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
