import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

    const sb = supabaseAdmin;

    // Only cancel if pending or running
    const { error } = await sb
        .from("job_queue")
        .update({
            status: "cancelled",
            last_error: "Cancelled by ops",
        })
        .eq("id", job_id)
        .in("status", ["pending", "running"]);

    if (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({ ok: true });
}
