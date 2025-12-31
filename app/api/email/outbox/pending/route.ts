import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/email/outbox/pending
 * Returns emails awaiting approval (pending) + deferred items (optional UI display).
 */
export async function GET() {
    try {
        // NOTE: If you have per-user scoping (recommended), add `.eq("user_id", <authUserId>)` here.
        const { data, error } = await supabaseAdmin
            .from("email_outbox")
            .select(
                "id,to_email,to_name,subject,body,status,approval_status,approved_at,dismissed_at,defer_until,created_at,updated_at"
            )
            .in("approval_status", ["pending", "deferred"])
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) {
            return NextResponse.json(
                { ok: false, error: "OUTBOX_FETCH_FAILED", detail: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ ok: true, items: data ?? [] });
    } catch (err: any) {
        return NextResponse.json(
            { ok: false, error: "OUTBOX_FETCH_FAILED", detail: err?.message ?? String(err) },
            { status: 500 }
        );
    }
}
