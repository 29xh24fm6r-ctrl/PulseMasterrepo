import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { suggestTriage } from "@/lib/inbox/triageSuggest";

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 200);

    const itemsRes = await getSupabaseAdminRuntimeClient()
        .from("inbox_items")
        .select("*")
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .eq("is_archived", false)
        .eq("is_unread", true)
        .order("received_at", { ascending: false, nullsFirst: false })
        .limit(limit);

    if (itemsRes.error) return NextResponse.json({ ok: false, error: itemsRes.error.message }, { status: 500 });

    const items = itemsRes.data ?? [];
    let updated = 0;

    for (const item of items) {
        const s = suggestTriage(item);

        // Only write suggestions if not already triaged / suggested
        const patch: any = {
            triage_status: item.triage_status ?? "new",
            triage_priority: item.triage_priority ?? "normal",
            triage_meta: { ...(item.triage_meta ?? {}), triage_reason: s.reason },
        };

        // If still "new", apply suggested status/priority/action
        if ((item.triage_status ?? "new") === "new") {
            patch.triage_status = s.triage_status;
            patch.triage_priority = s.triage_priority;
            patch.suggested_action = s.suggested_action;
            patch.suggested_due_at = s.suggested_due_at;
        }

        const upd = await getSupabaseAdminRuntimeClient()
            .from("inbox_items")
            .update(patch)
            .eq("id", item.id)
            .eq("user_id_uuid", gate.canon.userIdUuid);

        if (!upd.error) updated += 1;
    }

    return NextResponse.json({ ok: true, scanned: items.length, updated });
}
