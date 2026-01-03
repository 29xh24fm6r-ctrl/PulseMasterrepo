import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Body = {
    contact_id: string;
    kind: "call" | "email" | "meeting" | "text" | "note" | "other";
    occurred_at?: string;
    subject?: string | null;
    body?: string | null;
    channel?: string | null;
    duration_seconds?: number | null;
    sentiment?: number | null; // -5..5
    meta?: Record<string, unknown>;
};

export async function POST(req: Request) {
    const authResult = await requireOpsAuth();
    if (!authResult.ok) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { userId: owner_user_id } = authResult;
    const body = (await req.json()) as Body;

    if (!body?.contact_id || !body?.kind) {
        return NextResponse.json({ error: "contact_id and kind are required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc("crm_interaction_add", {
        p_owner_user_id: owner_user_id,
        p_contact_id: body.contact_id,
        p_kind: body.kind,
        p_occurred_at: body.occurred_at ?? null,
        p_subject: body.subject ?? null,
        p_body: body.body ?? null,
        p_channel: body.channel ?? null,
        p_duration_seconds: body.duration_seconds ?? null,
        p_sentiment: body.sentiment ?? null,
        p_meta: body.meta ?? {},
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result: data?.[0] ?? null });
}
