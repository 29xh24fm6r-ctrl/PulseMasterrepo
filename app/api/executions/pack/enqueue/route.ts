import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();
    const { user_id } = body ?? {};
    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });

    const now = new Date();
    const inSeconds = (s: number) => new Date(Date.now() + s * 1000).toISOString();

    const rows = [
        // Keep inbox tidy
        {
            user_id,
            kind: "inbox.triage",
            payload: { mode: "inbox", limit: 10 },
            run_at: inSeconds(10),
            priority: 8,
            dedupe_key: "pack.inbox.triage",
            max_attempts: 5,
            status: "queued",
        },

        // Flush email outbox
        {
            user_id,
            kind: "email.flush",
            payload: { limit: 25 },
            run_at: inSeconds(15),
            priority: 7,
            dedupe_key: "pack.email.flush",
            max_attempts: 5,
            status: "queued",
        },

        // Refresh quest checkpoints (derived) + emit quest.completed evidence + bonus XP
        {
            user_id,
            kind: "quest.refresh_today",
            payload: {
                questKeys: ["daily_workout", "deep_work", "discipline_20"],
                emitCompletionEvidence: true,
            },
            run_at: inSeconds(20),
            priority: 6,
            dedupe_key: "pack.quest.refresh_today",
            max_attempts: 5,
            status: "queued",
        },
    ];

    // Insert idempotently (dedupe_key unique constraint prevents duplicates)
    const inserted: string[] = [];
    const deduped: string[] = [];
    for (const r of rows) {
        const { data, error } = await getSupabaseAdminRuntimeClient()
            .from("executions")
            .insert(r)
            .select("id")
            .single();

        if (error) {
            if (String(error.message).toLowerCase().includes("duplicate key")) {
                deduped.push(r.dedupe_key);
                continue;
            }
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }
        inserted.push(data.id);
    }

    return NextResponse.json({ ok: true, inserted, deduped });
}
