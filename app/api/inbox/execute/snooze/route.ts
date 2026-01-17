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

    const inboxItemId = body?.inboxItemId as string | undefined;
    const preset = (body?.preset as SnoozePreset | undefined) ?? "tomorrow_morning";

    if (!inboxItemId) return NextResponse.json({ ok: false, error: "Missing inboxItemId" }, { status: 400 });

    const due = computeSnoozeDueAt(preset);

    const upd = await getSupabaseAdminRuntimeClient()
        .from("inbox_items")
        .update({
            triage_status: "waiting",
            suggested_due_at: due,
            triaged_at: new Date().toISOString(),
            is_unread: false,
        })
        .eq("id", inboxItemId)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .select("*")
        .single();

    if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });

    await getSupabaseAdminRuntimeClient().from("inbox_triage_events").insert({
        user_id_uuid: gate.canon.userIdUuid,
        inbox_item_id: inboxItemId,
        event_type: "set_status",
        from_value: null,
        to_value: "waiting",
        meta: { source: "snooze", preset, due },
    });

    return NextResponse.json({ ok: true, item: upd.data, due_at: due });
}
