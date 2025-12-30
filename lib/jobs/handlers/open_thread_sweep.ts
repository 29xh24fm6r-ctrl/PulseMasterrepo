// lib/jobs/handlers/open_thread_sweep.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { VOICE_PROFILES } from "@/lib/ai/voiceProfiles";
import { generateAiFollowupDraft } from "@/lib/ai/followupDraft";
import { logThreadEvent } from "@/lib/ai/openThreads";

type JobContext = {
    supabaseAdmin: SupabaseClient;
    now: () => Date;
    logger: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
};

type JobPayload = {
    user_id_uuid: string;
    max_threads?: number; // default 20
    wait_days?: number;   // default 3 (waiting on them)
    nudge_cooldown_days?: number; // default 4
    mode?: "draft" | "queued"; // default draft
};

function daysAgoISO(now: Date, days: number) {
    const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return d.toISOString();
}

export async function openThreadSweepHandler(ctx: JobContext, payload: JobPayload) {
    const { supabaseAdmin, now, logger } = ctx;
    if (!payload?.user_id_uuid) throw new Error("open_thread_sweep: payload.user_id_uuid is required");

    const nowDt = now();
    const maxThreads = Math.max(1, Math.min(payload.max_threads ?? 20, 100));
    const waitDays = Math.max(1, Math.min(payload.wait_days ?? 3, 30));
    const cooldownDays = Math.max(1, Math.min(payload.nudge_cooldown_days ?? 4, 60));
    const mode = payload.mode ?? "draft";

    const waitBefore = daysAgoISO(nowDt, waitDays);
    const cooldownBefore = daysAgoISO(nowDt, cooldownDays);

    logger.info("[open_thread_sweep] start", { user_id_uuid: payload.user_id_uuid, waitDays, cooldownDays, maxThreads });

    const { data: threads, error } = await supabaseAdmin
        .from("open_threads")
        .select("*")
        .eq("user_id_uuid", payload.user_id_uuid)
        .eq("status", "open")
        .lte("last_outgoing_at", waitBefore)
        .or(`last_nudge_at.is.null,last_nudge_at.lte.${cooldownBefore}`)
        .order("last_outgoing_at", { ascending: true })
        .limit(maxThreads);

    if (error) throw error;

    let nudged = 0;

    for (const t of threads ?? []) {
        const counterpart_email = t.counterpart_email;
        if (!counterpart_email) continue;

        // Idempotency: skip if outbox already has a nudge for this thread
        const { data: existing, error: exErr } = await supabaseAdmin
            .from("email_outbox")
            .select("id")
            .eq("user_id_uuid", payload.user_id_uuid)
            .contains("meta", { kind: "open_thread_nudge", thread_id: t.id })
            .limit(1);

        if (exErr) throw exErr;
        if (existing && existing.length > 0) continue;

        const voice = VOICE_PROFILES.pulse_matt_default;

        // Create a super-light AI nudge. We pass open_thread to keep it grounded.
        let subject = `Re: ${String(t.context?.topic ?? "Quick follow-up")}`.slice(0, 300);
        let body_text =
            `Hi ${t.counterpart_name ?? "there"},\n\n` +
            `Quick nudge on this — any update on your end when you get a second?\n\n` +
            `Thanks,\nMatt`;

        const envAiEnabled = String(process.env.FOLLOWUP_AI_ENABLED || "").toLowerCase() === "true";
        if (envAiEnabled) {
            try {
                const ai = await generateAiFollowupDraft({
                    sender_email: counterpart_email,
                    sender_name: t.counterpart_name ?? null,
                    subject: String(t.context?.topic ?? ""),
                    snippet: String(t.context?.last_discussed ?? ""),
                    voice,
                    crm: null,
                    open_thread: {
                        thread_id: t.id,
                        thread_key: t.thread_key,
                        counterpart_email: t.counterpart_email,
                        counterpart_name: t.counterpart_name,
                        status: t.status,
                        context: t.context ?? {},
                        last_incoming_at: t.last_incoming_at,
                        last_outgoing_at: t.last_outgoing_at,
                        last_nudge_at: t.last_nudge_at,
                    },
                    prompt_version: "followup_v3_voice_crm_threads",
                });
                subject = ai.subject;
                body_text = ai.body_text;
            } catch (e: any) {
                logger.warn("[open_thread_sweep] AI nudge failed; fallback", { thread_id: t.id, err: e?.message ?? String(e) });
            }
        }

        const outboxRow: any = {
            user_id_uuid: payload.user_id_uuid,
            to_email: counterpart_email,
            subject,
            body: body_text, // Use 'body' to be safe, assuming db column is 'body' or mapper handles it
            status: mode === "queued" ? "queued" : "draft",
            meta: {
                kind: "open_thread_nudge",
                thread_id: t.id,
                thread_key: t.thread_key,
                topic: t.context?.topic ?? null,
            },
        };

        const { error: insErr } = await supabaseAdmin.from("email_outbox").insert(outboxRow);
        if (insErr) throw insErr;

        await supabaseAdmin.from("open_threads").update({ last_nudge_at: nowDt.toISOString() }).eq("id", t.id);

        await logThreadEvent({
            supabaseAdmin,
            user_id_uuid: payload.user_id_uuid,
            thread_id: t.id,
            event_type: "nudged",
            meta: { mode },
        });

        nudged++;
    }

    logger.info("[open_thread_sweep] done", { user_id_uuid: payload.user_id_uuid, nudged });
    return { ok: true, nudged };
}
