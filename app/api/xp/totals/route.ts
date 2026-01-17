import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });

    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("v_xp_totals")
        .select("*")
        .eq("user_id", user_id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // return in a nice dict shape
    const totals: Record<string, number> = {};
    for (const row of data ?? []) totals[row.xp_type] = row.total;

    return NextResponse.json({ ok: true, totals });
}
