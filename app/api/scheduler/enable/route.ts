import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();
    const { user_id, enabled } = body ?? {};

    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });

    const { error } = await supabaseAdmin
        .from("scheduler_targets")
        .upsert({ user_id, is_enabled: enabled ?? true }, { onConflict: "user_id" });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
