import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { revalidateCRM } from "@/lib/crm/revalidateCRM";
import { logActivityEvent } from "@/lib/activity/log";

type Body = {
    contact_id: string; // uuid
    type: string;
    channel?: string | null;
    happened_at?: string | null; // ISO
    summary?: string | null;
    body?: string | null;
    metadata?: Record<string, any> | null;
};

export async function POST(req: Request) {
    try {
        const auth = await requireOpsAuth();
        if (!auth.ok || !auth.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const owner_user_id = auth.userId;

        const body = (await req.json()) as Body;

        if (!body?.contact_id) {
            return NextResponse.json({ error: "contact_id is required" }, { status: 400 });
        }
        if (!body?.type || body.type.trim().length === 0) {
            return NextResponse.json({ error: "type is required" }, { status: 400 });
        }

        const sb = getSupabaseAdminRuntimeClient();

        const { data, error } = await sb.rpc("crm_interaction_add", {
            p_owner_user_id: owner_user_id,
            p_contact_id: body.contact_id,
            p_type: body.type,
            p_channel: body.channel ?? null,
            p_happened_at: body.happened_at ? new Date(body.happened_at).toISOString() : null,
            p_summary: body.summary ?? null,
            p_metadata: body.metadata ?? {},
        });

        if (error) {
            return NextResponse.json({ error: "rpc_failed", details: error.message }, { status: 500 });
        }

        // Live refresh for Interactions + Person Detail
        revalidateCRM(body.contact_id);

        // Canon Event Logging (feeds Momentum)
        await logActivityEvent({
            user_id: owner_user_id,
            source: "crm",
            event_type: "crm_interaction_created",
            title: `Interaction: ${body.type}`,
            detail: body.summary || body.body,
            payload: { interaction_id: data, contact_id: body.contact_id, type: body.type, channel: body.channel }
        });

        return NextResponse.json({ interaction_id: data }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { error: "unhandled", details: e?.message ?? String(e) },
            { status: 500 }
        );
    }
}
