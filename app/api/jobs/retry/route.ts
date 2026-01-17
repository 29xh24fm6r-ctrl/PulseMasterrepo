import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export const runtime = "nodejs";

export async function POST(req: Request) {
    await requireOpsAuth();
    const { job_id } = await req.json();

    if (!job_id) {
        return NextResponse.json(
            { error: "job_id required" },
            { status: 400 }
        );
    }

    const sb = getSupabaseAdminRuntimeClient();

    const { error } = await sb
        .from("job_queue")
        .update({
            status: "pending",
            attempts: 0,
            next_run_at: null,
            last_error: null,
        })
        .eq("id", job_id);

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({ ok: true });
}
