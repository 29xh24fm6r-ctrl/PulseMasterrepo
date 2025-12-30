import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { bumpScore } from "@/lib/work/scoreboard";

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));

    const inboxItemId = body?.inboxItemId as string | undefined;
    if (!inboxItemId) return NextResponse.json({ ok: false, error: "Missing inboxItemId" }, { status: 400 });

    const patch: any = {
        triage_status: "done",
        triaged_at: new Date().toISOString(),
        is_unread: false,
    };

    if (body.archive === true) patch.is_archived = true;

    const upd = await supabaseAdmin
        .from("inbox_items")
        .update(patch)
        .eq("id", inboxItemId)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .select("*")
        .single();

    if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });

    await supabaseAdmin.from("inbox_triage_events").insert({
        user_id_uuid: gate.canon.userIdUuid,
        inbox_item_id: inboxItemId,
        event_type: "set_status",
        from_value: null,
        to_value: "done",
        meta: { source: "quick_complete", archive: body.archive === true },
    });

    await bumpScore({ userIdUuid: gate.canon.userIdUuid, field: "inbox_done_count" });

    return NextResponse.json({ ok: true, item: upd.data });
}
