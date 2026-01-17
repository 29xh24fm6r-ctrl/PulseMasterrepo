import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const body = await req.json();
    const { user_id, quest_keys, at } = body ?? {};

    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });
    if (!Array.isArray(quest_keys) || quest_keys.length === 0) {
        return NextResponse.json({ ok: false, error: "quest_keys required" }, { status: 400 });
    }

    // Compute checkpoints (server-derived)
    const results: any[] = [];
    for (const key of quest_keys) {
        const { data: checkpointId, error } = await getSupabaseAdminRuntimeClient().rpc("rpc_compute_quest_checkpoint", {
            p_quest_key: key,
            p_at: at ?? new Date().toISOString(),
        });

        if (error) {
            results.push({ quest_key: key, ok: false, error: error.message });
            continue;
        }

        const { data: row, error: e2 } = await getSupabaseAdminRuntimeClient()
            .from("quest_checkpoints")
            .select("*")
            .eq("id", checkpointId)
            .eq("user_id", user_id)
            .single();

        if (e2) {
            results.push({ quest_key: key, ok: false, error: e2.message });
            continue;
        }

        results.push({ quest_key: key, ok: true, checkpoint: row });
    }

    return NextResponse.json({ ok: true, results });
}
