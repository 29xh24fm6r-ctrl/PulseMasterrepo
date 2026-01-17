import "server-only";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function ensureOutboxForReplyDraft(args: {
    userIdUuid: string;
    draftId: string;
    to: string;
    subject: string;
    body: string;
    sendAt?: string | null;
}) {
    // load draft
    const draftRes = await getSupabaseAdminRuntimeClient()
        .from("reply_drafts")
        .select("*")
        .eq("id", args.draftId)
        .eq("user_id_uuid", args.userIdUuid)
        .single();

    if (draftRes.error) throw new Error(draftRes.error.message);
    const draft = draftRes.data;

    // if already linked to outbox, return it
    if (draft.outbox_id) {
        const out = await getSupabaseAdminRuntimeClient().from("email_outbox").select("*").eq("id", draft.outbox_id).single();
        if (!out.error && out.data) return { outbox: out.data, reused: true };
    }

    // create outbox row
    const outboxIns = await getSupabaseAdminRuntimeClient()
        .from("email_outbox")
        .insert({
            user_id_uuid: args.userIdUuid,
            to_email: args.to,
            subject: args.subject,
            body: args.body,
            status: args.sendAt ? "scheduled" : "queued",
            send_at: args.sendAt ?? null,
            meta: { source: "reply_draft", reply_draft_id: args.draftId, inbox_item_id: draft.inbox_item_id },
        })
        .select("*")
        .single();

    if (outboxIns.error) throw new Error(outboxIns.error.message);

    // link draft
    const upd = await getSupabaseAdminRuntimeClient()
        .from("reply_drafts")
        .update({
            to_email: args.to,
            send_at: args.sendAt ?? null,
            outbox_id: outboxIns.data.id,
            status: "ready",
        })
        .eq("id", args.draftId)
        .eq("user_id_uuid", args.userIdUuid);

    if (upd.error) throw new Error(upd.error.message);

    return { outbox: outboxIns.data, reused: false };
}
