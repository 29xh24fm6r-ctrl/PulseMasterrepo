import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
    const authResult = await requireOpsAuth();
    if (!authResult.ok) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { userId: owner_user_id } = authResult;

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? "20"), 100));

    const { data, error } = await supabaseAdmin.rpc("crm_oracle_bundle", {
        p_owner_user_id: owner_user_id,
        p_limit: limit,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? { due_followups: [], at_risk_contacts: [] });
}
