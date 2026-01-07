import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireOpsAuth } from "@/lib/auth/opsAuth";

export async function GET(req: Request) {
    try {
        const auth = await requireOpsAuth();
        if (!auth.ok || !auth.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const owner_user_id = auth.userId;

        const { searchParams } = new URL(req.url);
        const domain = searchParams.get("domain");
        const days = parseInt(searchParams.get("days") ?? "30");

        const sb = supabaseAdmin;

        const { data, error } = await sb.rpc("momentum_history_read", {
            p_owner_user_id: owner_user_id,
            p_domain_slug: domain ?? null,
            p_days: days,
        });

        if (error) {
            console.error("momentum_history_read failed:", error);
            return NextResponse.json({ error: "rpc_failed", details: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 200 });

    } catch (e: any) {
        return NextResponse.json(
            { error: "unhandled", details: e?.message ?? String(e) },
            { status: 500 }
        );
    }
}
