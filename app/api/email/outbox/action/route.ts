import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { logActivityEvent } from "@/lib/activity/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
    outbox_id: z.string().min(1),
    action: z.enum(["approve", "defer", "dismiss"]),
    // Optional fields:
    defer_until: z.string().datetime().optional(), // ISO string
    note: z.string().max(2000).optional(),
});

function isoNow() {
    return new Date().toISOString();
}

function defaultDeferUntilIso(hours = 24) {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d.toISOString();
}

/**
 * POST /api/email/outbox/action
 * Body: { outbox_id, action, defer_until?, note? }
 *
 * This ONLY changes approval state. It does not send email.
 * Sending remains controlled by your existing "flush" route/process.
 */
export async function POST(req: Request) {
    try {
        const raw = await req.json().catch(() => null);
        const parsed = BodySchema.safeParse(raw);

        if (!parsed.success) {
            return NextResponse.json(
                { ok: false, error: "INVALID_BODY", issues: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { outbox_id, action, defer_until, note } = parsed.data;

        // Fetch first to ensure it exists
        const { data: row, error: getErr } = await getSupabaseAdminRuntimeClient()
            .from("email_outbox")
            .select("id,approval_status,status")
            .eq("id", outbox_id)
            .maybeSingle();

        if (getErr) {
            return NextResponse.json(
                { ok: false, error: "OUTBOX_GET_FAILED", detail: getErr.message },
                { status: 500 }
            );
        }
        if (!row) {
            return NextResponse.json({ ok: false, error: "OUTBOX_NOT_FOUND" }, { status: 404 });
        }

        if (action === "approve") {
            const { data, error } = await getSupabaseAdminRuntimeClient()
                .from("email_outbox")
                .update({
                    approval_status: "approved",
                    approved_at: isoNow(),
                    decision_note: note ?? null,
                    // IMPORTANT: keep status untouched unless you have a known pipeline.
                    // If your sender expects status='queued', uncomment next line:
                    // status: "queued",
                })
                .eq("id", outbox_id)
                .select()
                .single();

            if (error) {
                return NextResponse.json(
                    { ok: false, error: "OUTBOX_APPROVE_FAILED", detail: error.message },
                    { status: 500 }
                );
            }

            await logActivityEvent({
                source: "email",
                event_type: "email.approved",
                title: "Email approved",
                detail: `Outbox ${outbox_id} approved`,
                payload: { outbox_id },
            });

            return NextResponse.json({ ok: true, item: data });
        }

        if (action === "dismiss") {
            const { data, error } = await getSupabaseAdminRuntimeClient()
                .from("email_outbox")
                .update({
                    approval_status: "dismissed",
                    dismissed_at: isoNow(),
                    decision_note: note ?? null,
                })
                .eq("id", outbox_id)
                .select()
                .single();

            if (error) {
                return NextResponse.json(
                    { ok: false, error: "OUTBOX_DISMISS_FAILED", detail: error.message },
                    { status: 500 }
                );
            }

            await logActivityEvent({
                source: "email",
                event_type: "email.dismissed",
                title: "Email dismissed",
                detail: `Outbox ${outbox_id} dismissed`,
                payload: { outbox_id },
            });

            return NextResponse.json({ ok: true, item: data });
        }

        // defer
        const until = defer_until ?? defaultDeferUntilIso(24);

        const { data, error } = await getSupabaseAdminRuntimeClient()
            .from("email_outbox")
            .update({
                approval_status: "deferred",
                defer_until: until,
                decision_note: note ?? null,
            })
            .eq("id", outbox_id)
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { ok: false, error: "OUTBOX_DEFER_FAILED", detail: error.message },
                { status: 500 }
            );
        }

        await logActivityEvent({
            source: "email",
            event_type: "email.deferred",
            title: "Email deferred",
            detail: `Deferred until ${until}`,
            payload: { outbox_id, defer_until: until },
        });

        return NextResponse.json({ ok: true, item: data });
    } catch (err: any) {
        return NextResponse.json(
            { ok: false, error: "OUTBOX_ACTION_FAILED", detail: err?.message ?? String(err) },
            { status: 500 }
        );
    }
}
