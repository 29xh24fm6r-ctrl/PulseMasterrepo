import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { readTargetUserId } from "@/lib/auth/readTargetUser";
import { opsLimit } from "@/lib/ops/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") ?? 8);

    const targetUserId = readTargetUserId(req);
    const gate = await requireOpsAuth({ targetUserId });
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "executions.upcoming");

    const { data, error } = await supabaseAdmin
        .from("executions")
        .select("id,kind,payload,run_at,priority,status,attempts,max_attempts,next_retry_at,last_error,dedupe_key,created_at,updated_at,cancel_reason")
        .eq("user_id", gate.userId)
        .in("status", ["queued", "claimed", "running"])
        .order("priority", { ascending: false })
        .order("run_at", { ascending: true })
        .limit(Math.min(25, Math.max(1, limit)));

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, items: data ?? [] });
}
