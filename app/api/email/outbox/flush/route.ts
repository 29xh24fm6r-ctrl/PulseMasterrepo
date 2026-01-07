import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { readTraceHeaders, traceFromBody } from "@/lib/executions/traceHeaders";
import { linkArtifact } from "@/lib/executions/artifactLinks";
import { Resend } from "resend";
import { logActivityEvent } from "@/lib/activity/log";
import { bumpScore } from "@/lib/work/scoreboard";
import { logActivity } from "@/lib/activity/logActivity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Instantiate Resend client
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Pulse OS <onboarding@resend.dev>"; // Fallback default

type SendEmailOptions = {
    to: string;
    toName?: string | null;
    subject?: string | null;
    text?: string | null;
    html?: string | null;
    replyTo?: string | null;
    headers?: Record<string, string> | null;
};

// Local helper to match the user's pattern
async function sendEmail({ to, subject, text, html, replyTo, headers }: SendEmailOptions) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("Missing RESEND_API_KEY");
    }

    // Construct payload
    const payload: any = {
        from: FROM_EMAIL,
        to,
        subject: subject ?? "(No Subject)",
        text: text ?? "",
    };

    if (html) payload.html = html;
    if (replyTo) payload.reply_to = replyTo;
    if (headers) payload.headers = headers;

    return await resend.emails.send(payload);
}

/**
 * POST /api/email/outbox/flush
 * Sends ONLY approved + not-deferred emails.
 * Never sends pending/deferred/dismissed.
 */
export async function POST(req: Request) {
    const nowIso = new Date().toISOString();
    let traceId: string | null = null;
    let executionId: string | null = null;

    try {
        const body = await req.json();
        const { traceId: t, executionId: e } = traceFromBody(body);
        traceId = t;
        executionId = e;
    } catch {
        // body might be empty if called without payload
    }

    try {
        // 1. SELECT GATED ROWS
        const { data: toSend, error } = await supabaseAdmin
            .from("email_outbox")
            .select("*")
            .eq("approval_status", "approved")
            .or(`defer_until.is.null,defer_until.lte.${nowIso}`)
            .in("status", ["queued", "pending", "ready"])
            // Oldest first
            .order("created_at", { ascending: true })
            .limit(25);

        if (error) {
            return NextResponse.json(
                { ok: false, error: "OUTBOX_FLUSH_FETCH_FAILED", detail: error.message },
                { status: 500 }
            );
        }

        const rows = toSend ?? [];
        const results: any[] = [];

        // 2. PROCESS LOOP
        for (const row of rows) {
            // Lock row as processing
            await supabaseAdmin
                .from("email_outbox")
                .update({ status: "sending", updated_at: new Date().toISOString() })
                .eq("id", row.id);

            try {
                // Send
                const resp = await sendEmail({
                    to: row.to_email,
                    toName: row.to_name,
                    subject: row.subject,
                    text: row.body,
                    html: row.body_html ?? undefined,
                    replyTo: row.reply_to ?? undefined,
                    headers: row.headers ?? undefined,
                });

                // Handle Resend response structure
                // success response usually has { data: { id: ... }, error: null }
                // but the SDK return type might differ slightly based on version.
                // We'll treat a successful promise resolution as success unless logic dictates otherwise.

                let providerMessageId = null;
                if (resp && resp.data && resp.data.id) {
                    providerMessageId = resp.data.id;
                } else if (resp && (resp as any).id) {
                    // Direct id property in some versions (cast to any to bypass strict type check)
                    providerMessageId = (resp as any).id;
                }

                if (resp.error) {
                    throw new Error(resp.error.message || "Resend API returned error");
                }

                // Mark Sent
                await supabaseAdmin
                    .from("email_outbox")
                    .update({
                        status: "sent",
                        provider_message_id: providerMessageId,
                        last_error: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", row.id);

                await logActivity({
                    userId: row.user_id_uuid,
                    eventName: "email.sent",
                    source: "flush",
                    entityType: "email",
                    entityId: row.id,
                    metadata: { provider_message_id: providerMessageId }
                });

                await logActivityEvent({
                    source: "flush",
                    event_type: "email.sent",
                    title: "Email sent",
                    detail: `Sent outbox ${row.id}`,
                    payload: { outbox_id: row.id, provider_message_id: providerMessageId ?? null },
                });

                results.push({ id: row.id, ok: true, provider_message_id: providerMessageId });

                if (traceId && executionId) {
                    await linkArtifact({
                        userId: row.user_id_uuid,
                        traceId,
                        executionId,
                        fromType: "execution",
                        fromId: executionId,
                        relation: "sent",
                        toType: "email_outbox",
                        toId: row.id
                    });
                }
            } catch (err: any) {
                console.error(`Flush error for ${row.id}:`, err);
                // Mark Failed
                await supabaseAdmin
                    .from("email_outbox")
                    .update({
                        status: "failed",
                        last_error: String(err?.message ?? err),
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", row.id);

                await logActivityEvent({
                    source: "flush",
                    event_type: "email.send_failed",
                    title: "Email send failed",
                    detail: String(err?.message ?? err),
                    payload: { outbox_id: row.id },
                });

                results.push({ id: row.id, ok: false, error: String(err?.message ?? err) });
            }
        }

        return NextResponse.json({ ok: true, processed: rows.length, results });
    } catch (err: any) {
        return NextResponse.json(
            { ok: false, error: "OUTBOX_FLUSH_FAILED", detail: err?.message ?? String(err) },
            { status: 500 }
        );
    }
}
