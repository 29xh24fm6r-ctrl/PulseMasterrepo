import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { bumpScore } from "@/lib/work/scoreboard";

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const upd = await getSupabaseAdminRuntimeClient()
        .from("follow_ups")
        .update({ status: "done" })
        .eq("id", id)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .select("*")
        .single();

    if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });

    await bumpScore({ userIdUuid: gate.canon.userIdUuid, field: "followups_done_count" });

    return NextResponse.json({ ok: true, followUp: upd.data });
}
