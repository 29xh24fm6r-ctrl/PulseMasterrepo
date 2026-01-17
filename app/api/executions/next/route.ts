import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    if (!user_id) return NextResponse.json({ ok: false, error: "user_id required" }, { status: 400 });

    const now = new Date().toISOString();

    // next eligible queued OR running/claimed (so UI reflects reality)
    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("executions")
        .select("id,kind,payload,run_at,priority,status,attempts,max_attempts,next_retry_at,last_error,created_at")
        .eq("user_id", user_id)
        .in("status", ["queued", "claimed", "running"])
        .order("status", { ascending: false }) // running > claimed > queued (roughly)
        .order("priority", { ascending: false })
        .order("run_at", { ascending: true })
        .limit(1);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const item = (data ?? [])[0] ?? null;

    return NextResponse.json({
        ok: true,
        now,
        next: item,
    });
}
