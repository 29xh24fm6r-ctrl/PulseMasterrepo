import type { JobHandler } from "./types";

export const handleEmailTriage: JobHandler<"email_triage"> = async ({ payload, ctx }) => {
    const log = ctx.logger;

    if (!payload?.user_id_uuid) {
        throw new Error("email_triage payload missing user_id_uuid");
    }

    const limit = Math.min(Math.max(payload.limit ?? 25, 1), 100);

    // 1) Pull candidate emails for triage
    // Using `inbox_items` which contains the triage fields
    let q = ctx.supabaseAdmin
        .from("inbox_items")
        .select("id,user_id_uuid,subject,from_email,snippet,created_at,triage_status")
        .eq("user_id_uuid", payload.user_id_uuid)
        .order("created_at", { ascending: false })
        .limit(limit);

    // Optional filters if `inbox_items` stores these
    // Note: Adjust column names if `inbox_items` uses different names for thread/account tracking
    // For now assuming standard column names or omitting if not strictly in schema we checked
    // checks on migration showed basic fields. We'll stick to safest subset or assume standard inputs.
    // if (payload.account_id) q = q.eq("account_id", payload.account_id); 
    // if (payload.thread_id) q = q.eq("thread_id", payload.thread_id);

    // If not force, only triage items not already triaged
    if (!payload.force) {
        // "new" is the default status in the 20251227 migration
        q = q.in("triage_status", ["new", "waiting"]);
    }

    const { data: items, error: pullErr } = await q;
    if (pullErr) throw new Error(`email_triage pull failed: ${pullErr.message}`);

    if (!items || items.length === 0) {
        log.info("email_triage: nothing to triage", { user_id_uuid: payload.user_id_uuid });
        return { ok: true, output: { triaged: 0 } };
    }

    // 2) Lightweight rule-based triage (NO AI yet) — stable + deterministic
    const updates = items.map((it: any) => {
        const subject = (it.subject ?? "").toLowerCase();
        const snippet = (it.snippet ?? "").toLowerCase();
        const from = (it.from_email ?? "").toLowerCase();

        // Map to allowed enum values: 'new','needs_reply','to_do','waiting','done','ignored'
        let status: "needs_reply" | "to_do" | "ignored" | "done" = "needs_reply";
        let priority: "high" | "normal" | "low" = "normal";

        if (subject.includes("invoice") || subject.includes("payment") || snippet.includes("past due")) {
            status = "to_do";
            priority = "high";
        } else if (
            subject.includes("question") ||
            snippet.includes("?") ||
            snippet.includes("can you") ||
            snippet.includes("please")
        ) {
            status = "needs_reply";
        } else if (
            from.includes("no-reply") ||
            subject.includes("newsletter") ||
            subject.includes("unsubscribe")
        ) {
            status = "ignored";
            priority = "low";
        }

        return {
            id: it.id,
            triage_status: status,
            triage_priority: priority,
            triaged_at: ctx.now().toISOString(),
        };
    });

    // 3) Persist updates
    // Using upsert on id
    const { error: upErr } = await ctx.supabaseAdmin
        .from("inbox_items")
        .upsert(updates, { onConflict: "id" });

    if (upErr) throw new Error(`email_triage update failed: ${upErr.message}`);

    log.info("email_triage: triaged", { user_id_uuid: payload.user_id_uuid, count: updates.length });
    return { ok: true, output: { triaged: updates.length } };
}
