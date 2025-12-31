import type { SupabaseClient } from "@supabase/supabase-js";

import { generateAiFollowupDraft } from "@/lib/ai/followupDraft";
import { VOICE_PROFILES } from "@/lib/ai/voiceProfiles";
import { crmLookupByEmail } from "@/lib/ai/crmEnrich";
import { upsertOpenThread, logThreadEvent } from "@/lib/ai/openThreads";

type JobContext = {
    supabaseAdmin: SupabaseClient;
    now: () => Date;
    logger: {
        info: (...args: any[]) => void;
        warn: (...args: any[]) => void;
        error: (...args: any[]) => void;
    };
};

type JobPayload = {
    user_id_uuid: string;
    limit?: number; // default 10
    // "draft" (recommended) creates drafts in email_outbox. "queued" would enqueue for sending.
    mode?: "draft" | "queued";
    // only consider messages newer than this many days (default 21)
    since_days?: number;
    use_ai?: boolean; // default true when FOLLOWUP_AI_ENABLED=true
};

function daysAgoISO(now: Date, days: number) {
    const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return d.toISOString();
}

function cleanEmailFromSender(senderRaw: string | null | undefined): string | null {
    if (!senderRaw) return null;
    // Handles: "Name <email@x.com>" or plain "email@x.com"
    const m = senderRaw.match(/<([^>]+)>/);
    const email = (m?.[1] ?? senderRaw).trim();
    return email.includes("@") ? email : null;
}

function buildDraft(opts: {
    senderName?: string | null;
    senderEmail: string;
    subject?: string | null;
    snippet?: string | null;
}) {
    const senderName = (opts.senderName ?? "").trim();
    const greetingName = senderName || opts.senderEmail.split("@")[0] || "there";
    const subj = (opts.subject ?? "").trim();

    const subject = subj
        ? subj.toLowerCase().startsWith("re:")
            ? subj
            : `Re: ${subj}`
        : "Re: Quick follow-up";

    const snippet = (opts.snippet ?? "").trim();
    const snippetLine = snippet ? `\n\n—\nContext I’m replying to:\n"${snippet}"\n—\n` : "";

    const body_text =
        `Hi ${greetingName},\n\n` +
        `Quick follow-up here — wanted to make sure you saw my note and see what the best next step is on your end.\n\n` +
        `If it’s easier, I can also jump on a quick call.\n\n` +
        `Thanks,\n` +
        `Pulse\n` +
        snippetLine;

    return { subject, body_text };
}

function pickVoiceFromCrm(crm: any | null) {
    const rel = String(crm?.relationship_type ?? crm?.relationship ?? crm?.type ?? "").toLowerCase();
    if (rel.includes("family")) return VOICE_PROFILES.pulse_matt_family;
    if (rel.includes("friend")) return VOICE_PROFILES.pulse_matt_friend;
    if (rel.includes("client") || rel.includes("customer")) return VOICE_PROFILES.pulse_matt_client;
    return VOICE_PROFILES.pulse_matt_default;
}

/**
 * followup_suggest
 */
export async function followupSuggestHandler(ctx: JobContext, payload: JobPayload) {
    const { supabaseAdmin, now, logger } = ctx;

    if (!payload?.user_id_uuid) {
        throw new Error("followup_suggest: payload.user_id_uuid is required");
    }

    const limit = Math.max(1, Math.min(payload.limit ?? 10, 50));
    const mode: "draft" | "queued" = payload.mode ?? "draft";
    const sinceDays = Math.max(1, Math.min(payload.since_days ?? 21, 365));
    const sinceISO = daysAgoISO(now(), sinceDays);

    const envAiEnabled = String(process.env.FOLLOWUP_AI_ENABLED || "").toLowerCase() === "true";
    const useAi = payload.use_ai ?? true;
    const aiEnabled = envAiEnabled && useAi;

    // ⚙️ CONFIG
    const INBOX_TABLE = "inbox_items";
    const OUTBOX_TABLE = "email_outbox";

    const INBOX_USER_COL = "user_id_uuid";
    const INBOX_TRIAGE_COL = "triage_status"; // optional
    const INBOX_CREATED_COL = "created_at";

    // sender fields (at least one must exist in your schema)
    const INBOX_FROM_EMAIL_COL_CANDIDATES = ["from_email", "from_address", "from", "sender_email", "sender"];
    const INBOX_FROM_NAME_COL_CANDIDATES = ["from_name", "sender_name", "senderName", "name_from"];

    const INBOX_SUBJECT_COL = "subject";
    const INBOX_SNIPPET_COL = "snippet";

    // "already suggested" markers
    const INBOX_FOLLOWUP_SUGGESTED_AT_COL = "followup_suggested_at";
    const INBOX_FOLLOWUP_STATUS_COL = "followup_status";

    // outbox fields
    const OUTBOX_USER_COL = "user_id_uuid";
    const OUTBOX_TO_COL_CANDIDATES = ["to_email", "to", "recipient_email"];
    const OUTBOX_SUBJECT_COL = "subject";
    // Pulled from reverse-engineering flush route: 'body' is the text column
    const OUTBOX_BODY_COL_CANDIDATES = ["body", "body_text", "text_body"];
    const OUTBOX_STATUS_COL = "status";
    const OUTBOX_META_COL = "meta";

    logger.info("[followup_suggest] start", {
        user_id_uuid: payload.user_id_uuid,
        limit,
        mode,
        since_days: sinceDays,
        aiEnabled
    });

    // Pull inbox candidates
    const { data: inbox, error: inboxErr } = await supabaseAdmin
        .from(INBOX_TABLE)
        .select("*")
        .eq(INBOX_USER_COL, payload.user_id_uuid)
        .gte(INBOX_CREATED_COL, sinceISO)
        .order(INBOX_CREATED_COL, { ascending: false })
        .limit(limit * 3);

    if (inboxErr) {
        logger.error("[followup_suggest] inbox query failed", inboxErr);
        throw inboxErr;
    }

    const candidates = (inbox ?? [])
        .filter((row: any) => {
            // If triage_status exists, prefer rows that look actionable
            const ts = row?.[INBOX_TRIAGE_COL];
            if (ts && typeof ts === "string") {
                const v = ts.toLowerCase();
                // allow these to pass
                if (
                    v.includes("follow") ||
                    v.includes("reply") ||
                    v.includes("to_do") ||
                    v.includes("todo") ||
                    v.includes("action") ||
                    v.includes("triaged")
                ) {
                    // ok
                } else {
                    // If triage status is something like "done"/"archived", skip
                    if (v.includes("done") || v.includes("archive")) return false;
                }
            }

            // Skip if already suggested (if column exists)
            if (row?.[INBOX_FOLLOWUP_SUGGESTED_AT_COL]) return false;
            if (row?.[INBOX_FOLLOWUP_STATUS_COL] && String(row[INBOX_FOLLOWUP_STATUS_COL]).toLowerCase().includes("suggest")) {
                return false;
            }

            return true;
        })
        .slice(0, limit);

    if (candidates.length === 0) {
        logger.info("[followup_suggest] no candidates; no-op", { user_id_uuid: payload.user_id_uuid });
        return { ok: true, action: "noop_no_candidates", suggested: 0 };
    }

    // Helper: get best matching value for a set of possible column names
    const pickFirst = (row: any, cols: string[]) => {
        for (const c of cols) {
            if (row && row[c] != null && String(row[c]).trim() !== "") return row[c];
        }
        return null;
    };

    let suggested = 0;
    let skippedExisting = 0;
    let skippedNoEmail = 0;

    for (const item of candidates) {
        const inboxItemId = item?.id ?? item?.inbox_item_id ?? null;
        if (!inboxItemId) continue;

        // Idempotency: skip if outbox already has a draft for this inbox item
        const { data: existingOutbox, error: existingOutboxErr } = await supabaseAdmin
            .from(OUTBOX_TABLE)
            .select("id")
            .eq(OUTBOX_USER_COL, payload.user_id_uuid)
            .contains(OUTBOX_META_COL, { source_inbox_item_id: inboxItemId })
            .limit(1);

        if (existingOutboxErr) {
            logger.error("[followup_suggest] outbox existing check failed", existingOutboxErr);
            throw existingOutboxErr;
        }

        if (existingOutbox && existingOutbox.length > 0) {
            skippedExisting++;
            // best-effort update to prevent re-scan
            const patch: any = { [INBOX_FOLLOWUP_SUGGESTED_AT_COL]: now().toISOString() };
            if (INBOX_FOLLOWUP_STATUS_COL) patch[INBOX_FOLLOWUP_STATUS_COL] = "suggested";

            // We swallow error here in case column doesn't exist
            await supabaseAdmin.from(INBOX_TABLE).update(patch).eq("id", inboxItemId);
            continue;
        }

        const fromRaw = pickFirst(item, INBOX_FROM_EMAIL_COL_CANDIDATES);
        const senderEmail = cleanEmailFromSender(fromRaw);
        if (!senderEmail) {
            skippedNoEmail++;
            continue;
        }

        const senderName = pickFirst(item, INBOX_FROM_NAME_COL_CANDIDATES);
        const subj = item?.[INBOX_SUBJECT_COL] ?? null;
        const snip = item?.[INBOX_SNIPPET_COL] ?? null;

        const thread_key = `email:${inboxItemId}`;
        const thread = await upsertOpenThread({
            supabaseAdmin,
            user_id_uuid: payload.user_id_uuid,
            thread_key,
            counterpart_email: senderEmail,
            counterpart_name: senderName ? String(senderName) : null,
            contextPatch: {
                topic: subj ? String(subj).slice(0, 140) : null,
                last_discussed: snip ? String(snip).slice(0, 200) : null,
                waiting_on: "them",
            },
            // This is a follow-up suggestion, so it's an outgoing intent
            last_outgoing_at: now().toISOString(),
        });

        await logThreadEvent({
            supabaseAdmin,
            user_id_uuid: payload.user_id_uuid,
            thread_id: thread.thread_id,
            event_type: "draft_suggested",
            meta: { source_inbox_item_id: inboxItemId },
        });

        let draftSubject: string;
        let draftBody: string;
        let aiMeta: any = null;
        let crm: any = null;
        let voice = VOICE_PROFILES.pulse_matt_default;

        if (aiEnabled) {
            try {
                // Try CRM lookup
                try {
                    crm = await crmLookupByEmail({
                        supabaseAdmin,
                        user_id_uuid: payload.user_id_uuid,
                        email: senderEmail,
                    });
                    voice = pickVoiceFromCrm(crm);
                } catch (e: any) {
                    logger.warn("[followup_suggest] CRM enrich failed (non-fatal)", { inboxItemId, err: e?.message ?? String(e) });
                }

                const ai = await generateAiFollowupDraft({
                    sender_email: senderEmail,
                    sender_name: senderName ? String(senderName) : null,
                    subject: subj ? String(subj) : null,
                    snippet: snip ? String(snip) : null,
                    voice,
                    crm,
                    open_thread: thread,
                    prompt_version: "followup_v3_voice_crm_threads",
                });

                draftSubject = ai.subject;
                draftBody = ai.body_text;
                aiMeta = ai.meta;
            } catch (e: any) {
                logger.warn("[followup_suggest] AI draft failed; falling back", {
                    inboxItemId,
                    err: e?.message ?? String(e),
                });
                const fallback = buildDraft({
                    senderName: senderName ? String(senderName) : null,
                    senderEmail,
                    subject: subj ? String(subj) : null,
                    snippet: snip ? String(snip) : null,
                });
                draftSubject = fallback.subject;
                draftBody = fallback.body_text;
            }
        } else {
            const fallback = buildDraft({
                senderName: senderName ? String(senderName) : null,
                senderEmail,
                subject: subj ? String(subj) : null,
                snippet: snip ? String(snip) : null,
            });
            draftSubject = fallback.subject;
            draftBody = fallback.body_text;
        }

        const toCol = OUTBOX_TO_COL_CANDIDATES[0];
        const bodyCol = OUTBOX_BODY_COL_CANDIDATES[0];

        const outboxRow: any = {
            [OUTBOX_USER_COL]: payload.user_id_uuid,
            [toCol]: senderEmail,
            [OUTBOX_SUBJECT_COL]: draftSubject,
            [bodyCol]: draftBody,
            [OUTBOX_STATUS_COL]: mode === "queued" ? "queued" : "draft",
            [OUTBOX_META_COL]: {
                kind: "followup_suggest",
                source_inbox_item_id: inboxItemId,
                source_inbox_created_at: item?.[INBOX_CREATED_COL] ?? null,
                source_inbox_subject: subj ?? null,
                thread: { id: thread.thread_id, key: thread.thread_key, status: thread.status },
                voice: { id: voice.id, name: voice.name },
                crm: crm
                    ? {
                        contact_id: crm.contact_id ?? null,
                        full_name: crm.full_name ?? null,
                        company: crm.company ?? null,
                        title: crm.title ?? null,
                        account_stage: crm.account_stage ?? null,
                        last_interaction_at: crm.last_interaction_at ?? null,
                    }
                    : null,
                ai: aiMeta
                    ? {
                        enabled: true,
                        ...aiMeta,
                    }
                    : { enabled: false },
            },
        };

        const { error: insErr } = await supabaseAdmin.from(OUTBOX_TABLE).insert(outboxRow);
        if (insErr) {
            logger.error("[followup_suggest] outbox insert failed", { inboxItemId, insErr });
            throw insErr;
        }

        // Mark inbox item as suggested (best-effort)
        const updatePatch: any = {
            [INBOX_FOLLOWUP_SUGGESTED_AT_COL]: now().toISOString(),
        };
        if (INBOX_FOLLOWUP_STATUS_COL) updatePatch[INBOX_FOLLOWUP_STATUS_COL] = "suggested";

        // Swallow error if columns missing
        const { error: markErr } = await supabaseAdmin.from(INBOX_TABLE).update(updatePatch).eq("id", inboxItemId);
        if (markErr) {
            logger.warn("[followup_suggest] failed to mark inbox item suggested (non-fatal)", markErr);
        }

        suggested++;
    }

    logger.info("[followup_suggest] done", {
        user_id_uuid: payload.user_id_uuid,
        suggested,
        skippedExisting,
        skippedNoEmail,
    });

    return {
        ok: true,
        action: "suggested",
        suggested,
        skippedExisting,
        skippedNoEmail,
    };
}
