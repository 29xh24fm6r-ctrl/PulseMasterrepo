import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { evaluateEvidenceAndIssue } from "@/lib/xp/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();
    const { user_id, evidence_id } = body ?? {};

    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });
    if (!evidence_id) return NextResponse.json({ ok: false, error: "evidence_id required" }, { status: 400 });

    const { data: evidence, error } = await supabaseAdmin
        .from("life_evidence")
        .select("*")
        .eq("id", evidence_id)
        .eq("user_id", user_id)
        .single();

    if (error || !evidence) {
        return NextResponse.json({ ok: false, error: error?.message ?? "evidence not found" }, { status: 404 });
    }

    try {
        const out = await evaluateEvidenceAndIssue(user_id, evidence as any);
        return NextResponse.json({ ok: true, ...out });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? "evaluation failed" }, { status: 500 });
    }
}
