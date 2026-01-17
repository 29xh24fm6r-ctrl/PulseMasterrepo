import { NextResponse } from "next/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

/**
 * Cron safety model:
 * - This endpoint must be protected via secret header (set in Vercel Cron / GitHub action).
 * - It processes each active user with enabled rules.
 */
export async function POST(req: Request) {
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // active users with at least one enabled rule
    const usersRes = await getSupabaseAdminRuntimeClient()
        .from("inbox_rules")
        .select("user_id_uuid")
        .eq("enabled", true);

    if (usersRes.error) return NextResponse.json({ ok: false, error: usersRes.error.message }, { status: 500 });

    const uniq = Array.from(new Set(((usersRes.data as any) ?? []).map((r: any) => r.user_id_uuid)));

    // For now: do nothing else here to avoid impersonation complexity.
    // Instead, cron triggers will be user-driven (manual run) until we add service-side "process as user".
    return NextResponse.json({ ok: true, usersWithRules: uniq.length, note: "cron hook ready; add per-user processing next" });
}
