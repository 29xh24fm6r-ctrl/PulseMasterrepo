import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Body = { followup_id: string };

export async function POST(req: Request) {
    const authResult = await requireOpsAuth();
    if (!authResult.ok) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { userId: owner_user_id } = authResult;
    const body = (await req.json()) as Body;

    if (!body?.followup_id) {
        return NextResponse.json({ error: "followup_id is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.rpc("crm_followup_mark_done", {
        p_owner_user_id: owner_user_id,
        p_followup_id: body.followup_id,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
