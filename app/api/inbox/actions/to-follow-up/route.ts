import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { normalizeDueAt, normalizeStatus } from "@/lib/core/normalize";

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));

    const inboxItemId = body?.inboxItemId as string | undefined;
    if (!inboxItemId) return NextResponse.json({ ok: false, error: "Missing inboxItemId" }, { status: 400 });

    const { data: item, error: itemErr } = await getSupabaseAdminRuntimeClient()
        .from("inbox_items")
        .select("*")
        .eq("id", inboxItemId)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .single();

    if (itemErr || !item) return NextResponse.json({ ok: false, error: itemErr?.message ?? "Inbox item not found" }, { status: 404 });

    const status = normalizeStatus(body?.status, ["open", "snoozed", "done"], "open");
    const due_at = normalizeDueAt(body?.dueAt ?? null);

    const title = body?.title ?? item.subject ?? "Follow-up";
    const fuBody = body?.body ?? item.snippet ?? "";

    const { data: followUp, error: fuErr } = await getSupabaseAdminRuntimeClient()
        .from("follow_ups")
        .insert({
            user_id_uuid: gate.canon.userIdUuid,
            title,
            body: fuBody,
            status,
            due_at,
            source: "inbox",
            meta: { inbox_item_id: item.id, source: item.source, from_email: item.from_email },
        })
        .select("*")
        .single();

    if (fuErr) return NextResponse.json({ ok: false, error: fuErr.message }, { status: 500 });

    await getSupabaseAdminRuntimeClient().from("inbox_actions").insert({
        user_id_uuid: gate.canon.userIdUuid,
        inbox_item_id: item.id,
        action_type: "create_follow_up",
        target_table: "follow_ups",
        target_id: followUp.id,
        payload: { title, status, due_at },
    });

    // optionally mark read
    await getSupabaseAdminRuntimeClient().from("inbox_items").update({ is_unread: false }).eq("id", item.id).eq("user_id_uuid", gate.canon.userIdUuid);

    return NextResponse.json({ ok: true, followUp });
}
