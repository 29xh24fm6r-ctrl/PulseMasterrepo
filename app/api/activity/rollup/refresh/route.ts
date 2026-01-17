import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { requireOpsAuth } from "@/lib/auth/opsAuth";

export async function POST() {
    // Ops only (canon pattern)
    await requireOpsAuth();

    const supabase = getSupabaseAdminRuntimeClient();

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
