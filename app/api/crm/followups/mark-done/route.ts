import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { revalidateCRM } from "@/lib/crm/revalidateCRM";

type Body = {
    followup_id: string; // uuid
    contact_id: string; // required so we can revalidate the correct Person Detail cache
    done_at?: string | null; // ISO
    outcome?: string | null;
    notes?: string | null;
};

export async function POST(req: Request) {
    try {
        const auth = await requireOpsAuth();
        if (!auth.ok || !auth.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const owner_user_id = auth.userId;

        const body = (await req.json()) as Body;

        if (!body?.followup_id) {
            return NextResponse.json({ error: "followup_id is required" }, { status: 400 });
        }
        if (!body?.contact_id) {
            return NextResponse.json({ error: "contact_id is required" }, { status: 400 });
        }

        const sb = supabaseAdmin;

        const { error } = await sb.rpc("crm_followup_mark_done", {
            p_owner_user_id: owner_user_id,
            p_followup_id: body.followup_id,
            p_done_at: body.done_at ? new Date(body.done_at).toISOString() : null,
            p_outcome: body.outcome ?? null,
            p_notes: body.notes ?? null,
        });

        if (error) {
            return NextResponse.json({ error: "rpc_failed", details: error.message }, { status: 500 });
        }

        // Live refresh for Followups + Person Detail
        revalidateCRM(body.contact_id);

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { error: "unhandled", details: e?.message ?? String(e) },
            { status: 500 }
        );
    }
}
