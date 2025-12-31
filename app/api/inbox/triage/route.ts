import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));

    const id = body?.id as string | undefined;
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const patch: any = {};
    const events: Array<{ event_type: string; from_value?: string | null; to_value?: string | null; meta?: any }> = [];

    // Fetch current for audit diff
    const curRes = await supabaseAdmin
        .from("inbox_items")
        .select("triage_status, triage_priority, suggested_action")
        .eq("id", id)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .single();

    if (curRes.error) return NextResponse.json({ ok: false, error: curRes.error.message }, { status: 404 });

    const cur = curRes.data;

    if (body.triage_status !== undefined && body.triage_status !== cur.triage_status) {
        patch.triage_status = body.triage_status;
        events.push({ event_type: "set_status", from_value: cur.triage_status, to_value: body.triage_status });
    }
    if (body.triage_priority !== undefined && body.triage_priority !== cur.triage_priority) {
        patch.triage_priority = body.triage_priority;
        events.push({ event_type: "set_priority", from_value: cur.triage_priority, to_value: body.triage_priority });
    }
    if (body.suggested_action !== undefined && body.suggested_action !== cur.suggested_action) {
        patch.suggested_action = body.suggested_action;
        events.push({ event_type: "set_suggestion", from_value: cur.suggested_action, to_value: body.suggested_action });
    }
    if (body.suggested_due_at !== undefined) patch.suggested_due_at = body.suggested_due_at;
    if (body.triage_meta !== undefined) patch.triage_meta = body.triage_meta;

    patch.triaged_at = new Date().toISOString();

    const upd = await supabaseAdmin
        .from("inbox_items")
        .update(patch)
        .eq("id", id)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .select("*")
        .single();

    if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });

    if (events.length) {
        await supabaseAdmin.from("inbox_triage_events").insert(
            events.map((e) => ({
                user_id_uuid: gate.canon.userIdUuid,
                inbox_item_id: id,
                ...e,
                meta: e.meta ?? {},
            }))
        );
    }

    return NextResponse.json({ ok: true, item: upd.data });
}
