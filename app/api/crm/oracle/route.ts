import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/crm/oracle
 * Returns: Relationship Oracle bundle for current user (top N)
 *
 * Notes:
 * - Calls SECURITY DEFINER RPC: public.crm_relationship_oracle_bundle()
 * - Auth enforced by RPC using auth.uid()
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "25", 10), 1), 200);

        const { userId, getToken } = await auth();
        if (!userId) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const token = await getToken({ template: "supabase" });
        if (!token) {
            return NextResponse.json({ ok: false, error: "No Supabase token" }, { status: 401 });
        }

        const supabase = getSupabaseRuntimeClient();

        const { data, error } = await supabase.rpc("crm_relationship_oracle_bundle");

        if (error) {
            return NextResponse.json(
                { ok: false, error: error.message, code: error.code ?? null },
                { status: 500 }
            );
        }

        const rows = (data ?? []).slice(0, limit);

        return NextResponse.json({ ok: true, rows }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message ?? "Unknown error" },
            { status: 500 }
        );
    }
}
