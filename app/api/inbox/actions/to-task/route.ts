import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeDueAt, normalizeStatus } from "@/lib/core/normalize";

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));

    const inboxItemId = body?.inboxItemId as string | undefined;
    if (!inboxItemId) return NextResponse.json({ ok: false, error: "Missing inboxItemId" }, { status: 400 });

    const { data: item, error: itemErr } = await supabaseAdmin
        .from("inbox_items")
        .select("*")
        .eq("id", inboxItemId)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .single();

    if (itemErr || !item) return NextResponse.json({ ok: false, error: itemErr?.message ?? "Inbox item not found" }, { status: 404 });

    const status = normalizeStatus(body?.status, ["open", "in_progress", "blocked", "done", "archived"], "open");
    const due_at = normalizeDueAt(body?.dueAt ?? null);

    const title = body?.title ?? item.subject ?? "Task";

    const { data: task, error: tErr } = await supabaseAdmin
        .from("tasks")
        .insert({
            user_id_uuid: gate.canon.userIdUuid,
            title,
            status,
            due_at,
            meta: { inbox_item_id: item.id, source: item.source, from_email: item.from_email },
        })
        .select("*")
        .single();

    if (tErr) return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });

    await supabaseAdmin.from("inbox_actions").insert({
        user_id_uuid: gate.canon.userIdUuid,
        inbox_item_id: item.id,
        action_type: "create_task",
        target_table: "tasks",
        target_id: task.id,
        payload: { title, status, due_at },
    });

    await supabaseAdmin.from("inbox_items").update({ is_unread: false }).eq("id", item.id).eq("user_id_uuid", gate.canon.userIdUuid);

    return NextResponse.json({ ok: true, task });
}
