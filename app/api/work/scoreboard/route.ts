import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const res = await supabaseAdmin
        .from("work_scoreboard_days")
        .select("*")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .order("day", { ascending: false })
        .limit(14);

    if (res.error) return NextResponse.json({ ok: false, error: res.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, days: res.data ?? [] });
}
