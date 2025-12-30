import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();
    const { user_id, kind, payload, run_at, priority, dedupe_key, max_attempts } = body ?? {};

    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });
    if (!kind) return NextResponse.json({ ok: false, error: "kind required" }, { status: 400 });

    // Admin insert (bypasses RLS) — safe because server is authoritative
    const { data, error } = await supabaseAdmin
        .from("executions")
        .insert({
            user_id,
            kind,
            payload: payload ?? {},
            run_at: run_at ?? new Date().toISOString(),
            priority: priority ?? 0,
            dedupe_key: dedupe_key ?? null,
            max_attempts: max_attempts ?? 5,
            status: "queued",
        })
        .select("id")
        .single();

    // If dedupe_key already exists, unique constraint will error.
    // To keep this route idempotent, fallback to select existing row by dedupe_key.
    if (error) {
        if (String(error.message).toLowerCase().includes("duplicate key")) {
            const { data: existing } = await supabaseAdmin
                .from("executions")
                .select("id")
                .eq("user_id", user_id)
                .eq("dedupe_key", dedupe_key)
                .single();

            if (existing?.id) return NextResponse.json({ ok: true, execution_id: existing.id, deduped: true });
        }

        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, execution_id: data.id, deduped: false });
}
