import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { readTargetUserId } from "@/lib/auth/readTargetUser";
import { opsLimit } from "@/lib/ops/limits";
import { logOpsAudit } from "@/lib/ops/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const trace_id = url.searchParams.get("trace_id");
    if (!trace_id) return NextResponse.json({ ok: false, error: "trace_id required" }, { status: 400 });

    const targetUserId = readTargetUserId(req);
    const gate = await requireOpsAuth({ targetUserId });
    if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

    await opsLimit(gate.clerkUserId, "traces.artifacts");

    await logOpsAudit({
        req,
        actorUserId: gate.clerkUserId,
        actorIsAdmin: gate.isAdmin,
        targetUserId: targetUserId ?? null,
        action: "trace.artifacts",
        resourceType: "trace",
        resourceId: trace_id,
        meta: { scoped_user_id: gate.userId },
    });

    const { data: evidence, error: e1 } = await getSupabaseAdminRuntimeClient()
        .from("life_evidence")
        .select("id,evidence_type,evidence_payload,confidence,source,created_at,trace_id")
        .eq("user_id", gate.userId)
        .eq("trace_id", trace_id)
        .order("created_at", { ascending: true })
        .limit(200);

    if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });

    let tasks: any[] = [];
    {
        const { data, error } = await getSupabaseAdminRuntimeClient()
            .from("tasks")
            .select("id,title,status,priority,due_at,created_at,trace_id")
            .eq("user_id", gate.userId)
            .eq("trace_id", trace_id)
            .order("created_at", { ascending: true })
            .limit(300);
        if (!error) tasks = data ?? [];
    }

    let outbox: any[] = [];
    {
        const { data, error } = await getSupabaseAdminRuntimeClient()
            .from("email_outbox")
            .select("id,to_email,subject,status,provider_message_id,created_at,trace_id")
            .eq("user_id", gate.userId)
            .eq("trace_id", trace_id)
            .order("created_at", { ascending: true })
            .limit(300);
        if (!error) outbox = data ?? [];
    }

    return NextResponse.json({ ok: true, trace_id, evidence: evidence ?? [], tasks, outbox, scoped_user_id: gate.userId });
}
