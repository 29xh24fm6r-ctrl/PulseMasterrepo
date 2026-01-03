import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOpsAuth } from "@/lib/auth/opsAuth";

export async function POST() {
    // Ops only (canon pattern)
    await requireOpsAuth();

    const supabase = supabaseAdmin;

    // Call existing RPC
    const { error } = await supabase.rpc("user_daily_activity_rollup_refresh");
    if (error) {
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({ ok: true });
}
