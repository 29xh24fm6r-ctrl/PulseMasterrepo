import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { computeSnoozeDueAt, SnoozePreset } from "@/lib/work/snooze";

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));

    const id = body?.id as string | undefined;
    const preset = (body?.preset as SnoozePreset | undefined) ?? "tomorrow_morning";
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const due = computeSnoozeDueAt(preset);

    const upd = await getSupabaseAdminRuntimeClient()
        .from("follow_ups")
        .update({ due_at: due, status: "snoozed" })
        .eq("id", id)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .select("*")
        .single();

    if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, followUp: upd.data, due_at: due });
}
