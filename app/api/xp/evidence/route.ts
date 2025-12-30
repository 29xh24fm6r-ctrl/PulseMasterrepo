import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { readTraceHeaders, traceFromBody } from "@/lib/executions/traceHeaders";
import { linkArtifact } from "@/lib/executions/artifactLinks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();

    const { user_id, life_event_id, evidence_type, evidence_payload, confidence, source } = body;

    const h = readTraceHeaders(req);
    const b = traceFromBody(body);
    const trace_id = h.traceId ?? b.traceId ?? null;
    const execution_id = h.executionId ?? b.executionId ?? null;

    if (!user_id || !evidence_type || !evidence_payload) {
        return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from("life_evidence")
        .insert({
            user_id,
            life_event_id,
            evidence_type,
            evidence_payload,
            confidence: confidence ?? 1.0,
            source: source ?? "api",
            trace_id,
        })
        .select("id")
        .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    if (trace_id && execution_id) {
        await linkArtifact({
            userId: user_id,
            traceId: trace_id,
            executionId: execution_id,
            executionRunId: body?.execution_run_id ?? null,
            fromType: "execution",
            fromId: execution_id,
            relation: "created",
            meta: { evidence_type },
            toType: "life_evidence",
            toId: data.id,
        });
    }

    return NextResponse.json({ ok: true, evidence_id: data.id });
}
