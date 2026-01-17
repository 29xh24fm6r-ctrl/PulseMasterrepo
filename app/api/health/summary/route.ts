import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function GET(req: Request) {
    const gate = await requireOpsAuth();
    if (!gate.ok) {
        return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
    }

    const core = await getSupabaseAdminRuntimeClient().from("health_core_summary").select("*").single();
    const rls = await getSupabaseAdminRuntimeClient().from("health_rls_status").select("*");

    if (core.error) return NextResponse.json({ ok: false, error: core.error.message }, { status: 500 });
    if (rls.error) return NextResponse.json({ ok: false, error: rls.error.message }, { status: 500 });

    const fails = await getSupabaseAdminRuntimeClient().from("health_recent_failures").select("*").limit(100);
    if (fails.error) return NextResponse.json({ ok: false, error: fails.error.message }, { status: 500 });

    return NextResponse.json({ ok: true, core: core.data, rls: rls.data ?? [], fails: fails.data ?? [] });
}
