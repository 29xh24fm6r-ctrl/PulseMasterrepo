import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { ensureOutboxForReplyDraft } from "@/services/email/replyDraftSend";

export async function POST(req: Request) {
    const gate = await requireOpsAuth();

    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const body = await req.json().catch(() => ({}));

    const draftId = body?.draftId as string | undefined;
    const sendAt = (body?.sendAt as string | null | undefined) ?? null;

    if (!draftId) return NextResponse.json({ ok: false, error: "Missing draftId" }, { status: 400 });

    // pull draft + inbox item to get recipient
    const draftRes = await getSupabaseAdminRuntimeClient()
        .from("reply_drafts")
        .select("id, inbox_item_id, subject, body, outbox_id")
        .eq("id", draftId)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .single();

    if (draftRes.error) return NextResponse.json({ ok: false, error: draftRes.error.message }, { status: 404 });

    const inboxRes = await getSupabaseAdminRuntimeClient()
        .from("inbox_items")
        .select("from_email")
        .eq("id", draftRes.data.inbox_item_id)
        .eq("user_id_uuid", gate.canon.userIdUuid)
        .single();

    if (inboxRes.error || !inboxRes.data?.from_email) {
        return NextResponse.json({ ok: false, error: "Inbox item missing from_email" }, { status: 400 });
    }

    const ensured = await ensureOutboxForReplyDraft({
        userIdUuid: gate.canon.userIdUuid,
        draftId,
        to: inboxRes.data.from_email,
        subject: draftRes.data.subject ?? "(no subject)",
        body: draftRes.data.body ?? "",
        sendAt,
    });

    return NextResponse.json({ ok: true, outbox: ensured.outbox, reused: ensured.reused });
}
