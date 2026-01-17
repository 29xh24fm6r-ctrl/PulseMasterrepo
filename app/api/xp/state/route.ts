import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("xp_state")
        .select("*")
        .eq("user_id_uuid", userId)
        .single();

    // If none exists yet, return zeros
    if (error && error.code !== "PGRST116") {
        return NextResponse.json({ error: "xp_state_failed", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({
        state: data ?? { user_id: userId, total_xp: 0, today_xp: 0, streak_days: 0, streak_last_day: null },
    });
}
